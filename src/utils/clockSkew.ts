import type { ClientSample } from '../schema/ClientSample.ts';
import { asClientSamples } from '../schema/clientSampleParse.ts';
import type { ClientEvent, ExtensionStat, PeerConnectionSample } from '../schema/ClientSample.ts';
import { parseJsonPayload } from '../schema/clientSampleParse.ts';
import type { ClockOffsetMode, PaneEntry } from '../api/types.ts';

/** Minimal server-side data needed for clock-skew detection. */
interface ServerDataLike {
  producers?: { id: string; createdAt: number }[];
  consumers?: { id: string; createdAt: number }[];
}
import { tsToMs } from './statsProcessor.ts';

export type { ClockOffsetMode };

export interface ClockSkewResult {
  /** Offset in ms to add to client timestamps to align with server clock. Positive = client is ahead. */
  offsetMs: number;
  /** How many data points were used to compute the offset. */
  sampleCount: number;
}

/** Threshold in ms — offsets smaller than this are considered normal and not flagged. */
export const SKEW_THRESHOLD_MS = 5000;

const REPORT_KEYS = [
  'outboundRtps', 'inboundRtps', 'remoteInboundRtps', 'remoteOutboundRtps',
  'iceCandidatePairs', 'mediaSources', 'audioPlayouts', 'dataChannels',
];

/** Payload fields on client clock — shift when aligning stats to server time. */
const CLIENT_PAYLOAD_TIMESTAMP_KEYS = new Set(['clientTimestamp']);

/**
 * Detect clock skew between client stats timestamps and server-reported timestamps.
 */
export function detectClockSkew(
  serverData: ServerDataLike,
  rawClientStats: ClientSample[] | null,
): ClockSkewResult | null {
  if (!serverData || !rawClientStats || rawClientStats.length === 0) return null;

  const cadenceMs = computeStatsCadence(rawClientStats);

  const producerFirstTs = new Map<string, number>();
  const consumerFirstTs = new Map<string, number>();

  for (const sample of rawClientStats) {
    const sampleMs = tsToMs(sample.timestamp);
    if (!Number.isFinite(sampleMs)) continue;
    for (const pc of sample.peerConnections ?? []) {
      for (const track of pc.outboundTracks ?? []) {
        const pid = track.attachments?.producerId;
        if (typeof pid === 'string' && !producerFirstTs.has(pid)) producerFirstTs.set(pid, sampleMs);
      }
      for (const track of pc.inboundTracks ?? []) {
        const cid = track.attachments?.consumerId;
        if (typeof cid === 'string' && !consumerFirstTs.has(cid)) consumerFirstTs.set(cid, sampleMs);
      }
    }
    if (
      producerFirstTs.size >= (serverData.producers?.length ?? 0) &&
      consumerFirstTs.size >= (serverData.consumers?.length ?? 0)
    ) break;
  }

  const offsets: number[] = [];
  for (const producer of serverData.producers ?? []) {
    const clientMs = producerFirstTs.get(producer.id);
    if (clientMs != null) offsets.push(clientMs - producer.createdAt);
  }
  for (const consumer of serverData.consumers ?? []) {
    const clientMs = consumerFirstTs.get(consumer.id);
    if (clientMs != null) offsets.push(clientMs - consumer.createdAt);
  }

  if (offsets.length === 0) return null;

  offsets.sort((a, b) => a - b);
  const rawMin = offsets[0];
  const corrected = rawMin - cadenceMs / 2;

  return { offsetMs: corrected, sampleCount: offsets.length };
}

function computeStatsCadence(rawStats: ClientSample[]): number {
  if (rawStats.length < 3) return 2000;
  const deltas: number[] = [];
  let prevMs = tsToMs(rawStats[0].timestamp);
  for (let i = 1; i < Math.min(rawStats.length, 20); i++) {
    const ms = tsToMs(rawStats[i].timestamp);
    if (Number.isFinite(ms) && Number.isFinite(prevMs)) {
      const d = ms - prevMs;
      if (d > 0 && d < 30000) deltas.push(d);
    }
    prevMs = ms;
  }
  if (deltas.length === 0) return 2000;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
}

/**
 * Resolve how many ms to subtract from client timestamps for this pane.
 * - auto: apply detected skew when ≥ threshold (default)
 * - manual: use stored clockOffsetMs from "Align clock"
 * - off: no correction (after "Reset")
 */
export function resolveClockOffsetMs(
  pane: Pick<PaneEntry, 'clockOffsetMs' | 'clockOffsetMode'> | null | undefined,
  clockSkew: ClockSkewResult | null,
): number {
  const mode: ClockOffsetMode = pane?.clockOffsetMode ?? 'auto';
  if (mode === 'off') return 0;
  if (mode === 'manual') return pane?.clockOffsetMs ?? 0;
  if (clockSkew && Math.abs(clockSkew.offsetMs) >= SKEW_THRESHOLD_MS) {
    return clockSkew.offsetMs;
  }
  return 0;
}

export interface EffectiveClientStats {
  stats: ClientSample[] | null;
  offsetMs: number;
  clockSkew: ClockSkewResult | null;
  hasSignificantSkew: boolean;
}

/** Detect skew and return stats with offset applied (all charts + client recording). */
export function getEffectiveClientStats(
  statsData: ClientSample[] | unknown[] | null | undefined,
  serverData: ServerDataLike | null | undefined,
  pane?: Pick<PaneEntry, 'clockOffsetMs' | 'clockOffsetMode'> | null,
): EffectiveClientStats {
  const raw = asClientSamples(statsData);
  if (!raw.length) {
    return { stats: null, offsetMs: 0, clockSkew: null, hasSignificantSkew: false };
  }
  const clockSkew = serverData ? detectClockSkew(serverData, raw) : null;
  const offsetMs = resolveClockOffsetMs(pane, clockSkew);
  const hasSignificantSkew =
    clockSkew != null && Math.abs(clockSkew.offsetMs) >= SKEW_THRESHOLD_MS;
  const stats = offsetMs !== 0 ? applyClockOffset(raw, offsetMs) : raw;
  return { stats, offsetMs, clockSkew, hasSignificantSkew };
}

function shiftTs(value: unknown, offsetMs: number): unknown {
  if (value == null) return value;
  const ms = typeof value === 'string'
    ? new Date(value).getTime()
    : typeof value === 'number'
      ? value
      : value instanceof Date
        ? value.getTime()
        : NaN;
  if (!Number.isFinite(ms)) return value;
  const shifted = ms - offsetMs;
  if (typeof value === 'string') return new Date(shifted).toISOString();
  if (typeof value === 'number') return shifted;
  return new Date(shifted);
}

function shiftReportItem<T extends { timestamp?: number }>(item: T, offsetMs: number): T {
  if (item.timestamp == null) return item;
  return { ...item, timestamp: shiftTs(item.timestamp, offsetMs) as number };
}

function shiftClientPayload(payload: unknown, offsetMs: number): unknown {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const o = payload as Record<string, unknown>;
  let changed = false;
  const out: Record<string, unknown> = { ...o };
  for (const key of CLIENT_PAYLOAD_TIMESTAMP_KEYS) {
    if (key in out && out[key] != null) {
      out[key] = shiftTs(out[key], offsetMs);
      changed = true;
    }
  }
  return changed ? out : payload;
}

function shiftClientEvent(ev: ClientEvent, offsetMs: number): ClientEvent {
  const next: ClientEvent = { ...ev };
  if (next.timestamp != null) next.timestamp = shiftTs(next.timestamp, offsetMs) as number;
  if (next.payload != null) {
    const parsed = parseJsonPayload(next.payload);
    if (parsed) {
      const shifted = shiftClientPayload(parsed, offsetMs);
      next.payload =
        typeof ev.payload === 'string' ? JSON.stringify(shifted) : (shifted as Record<string, unknown>);
    }
  }
  return next;
}

function shiftExtensionStatsList(extList: ExtensionStat[], offsetMs: number): ExtensionStat[] {
  return extList.map((ext) => {
    if (!ext.payload) return ext;
    const parsed = parseJsonPayload(ext.payload);
    if (parsed?.timestamp != null) {
      const shifted = { ...parsed, timestamp: shiftTs(parsed.timestamp, offsetMs) };
      return {
        ...ext,
        payload:
          typeof ext.payload === 'string'
            ? JSON.stringify(shifted)
            : (shifted as Record<string, unknown>),
      };
    }
    return ext;
  });
}

/**
 * Apply a clock offset to raw client stats samples (WebRTC reports, extension stats,
 * and client-side recording events).
 */
export function applyClockOffset(rawStats: ClientSample[], offsetMs: number): ClientSample[] {
  if (offsetMs === 0) return rawStats;

  return rawStats.map((sample) => {
    if (sample.timestamp == null) return sample;
    const newSample: ClientSample = {
      ...sample,
      timestamp: shiftTs(sample.timestamp, offsetMs) as number,
    };

    if (newSample.peerConnections?.length) {
      newSample.peerConnections = newSample.peerConnections.map((pc) => {
        const newPc = { ...pc } as Record<string, unknown>;
        for (const key of REPORT_KEYS) {
          const arr = newPc[key];
          if (Array.isArray(arr)) {
            newPc[key] = arr.map((item) =>
              item != null && typeof item === 'object' && 'timestamp' in item
                ? shiftReportItem(item as { timestamp?: number }, offsetMs)
                : item,
            );
          }
        }
        if (Array.isArray(pc.extensionStats)) {
          (newPc as PeerConnectionSample).extensionStats = shiftExtensionStatsList(
            pc.extensionStats,
            offsetMs,
          );
        }
        return newPc as typeof pc;
      });
    }

    if (newSample.extensionStats?.length) {
      newSample.extensionStats = shiftExtensionStatsList(newSample.extensionStats, offsetMs);
    }

    if (newSample.clientEvents?.length) {
      newSample.clientEvents = newSample.clientEvents.map((ev) => shiftClientEvent(ev, offsetMs));
    }

    return newSample;
  });
}
