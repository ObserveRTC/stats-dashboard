import type { QualitySample, QualityState } from '../api/types';

interface HistoryEvent {
  timestamp: number;
  event: string;
}
import type { ClientSample } from '../schema/ClientSample.ts';
import { getTrackAttachments } from '../schema/clientSampleParse.ts';
import { buildMonotonicTimestamps } from './statsProcessor.ts';

/** RTP stat row as a loose record for quality classifiers. */
function rtpAsRecord(rtp: object): Record<string, unknown> {
  return rtp as Record<string, unknown>;
}

export const QUALITY_COLORS: Record<QualityState, string> = {
  good: 'var(--success)',
  degraded: '#fbbf24',
  'high-jitter': '#fde047',
  'packet-loss': '#f87171',
  freezing: 'var(--danger)',
};

/** Colors for qualityLimitationReason states (outbound video). */
export const QUALITY_LIMITATION_COLORS: Record<string, string> = {
  none: 'var(--success)',
  bandwidth: '#f59e0b',
  cpu: '#ef4444',
  other: '#8b5cf6',
};

/** Human-readable labels for qualityLimitationReason states. */
export const QUALITY_LIMITATION_LABELS: Record<string, string> = {
  none: 'None',
  bandwidth: 'Bandwidth',
  cpu: 'CPU',
  other: 'Other',
};

export const QUALITY_STATE_PRIORITY: Record<QualityState, number> = {
  good: 0,
  degraded: 1,
  'high-jitter': 2,
  'packet-loss': 3,
  freezing: 4,
};

/** Common screen share label patterns (case-insensitive substring match). */
const SCREEN_SHARE_LABELS = ['screen'];

/** Check whether a producer/consumer label indicates a screen share track. */
export function isScreenShareLabel(label: string | undefined | null): boolean {
  if (!label) return false;
  const lower = label.toLowerCase();
  return SCREEN_SHARE_LABELS.some((s) => lower.includes(s));
}

export function classifyRtpQuality(
  direction: 'send' | 'recv',
  kind: string,
  rtp: Record<string, unknown>,
  prev: Record<string, unknown> | null,
  remoteRtp: Record<string, unknown> | null | undefined,
  timestampMs?: number,
  prevTimestampMs?: number,
  screenShare?: boolean,
): QualityState {
  if (!prev) return 'good';

  // Compute time interval in seconds to normalize deltas into per-second rates.
  // Fall back to 2s (common WebRTC getStats interval) if timestamps are missing.
  const dtSec = (timestampMs != null && prevTimestampMs != null && timestampMs > prevTimestampMs)
    ? (timestampMs - prevTimestampMs) / 1000
    : 2;

  const rate = (curr: number, previous: number) => {
    const delta = Math.max(0, curr - previous);
    return delta / dtSec;
  };

  if (direction === 'send') {
    const nackRate = rate((rtp.nackCount as number) ?? 0, (prev.nackCount as number) ?? 0);
    const remoteJitterMs =
      remoteRtp?.jitter != null ? (remoteRtp.jitter as number) * 1000 : 0;

    if (kind === 'video') {
      const pliRate = rate((rtp.pliCount as number) ?? 0, (prev.pliCount as number) ?? 0);
      const firRate = rate((rtp.firCount as number) ?? 0, (prev.firCount as number) ?? 0);
      const droppedRate = rate((rtp.framesDropped as number) ?? 0, (prev.framesDropped as number) ?? 0);
      const prevFps = prev.framesPerSecond as number | undefined;
      const currFps = rtp.framesPerSecond as number | undefined;

      if (screenShare) {
        // Screen shares legitimately drop to low/zero FPS when the screen is
        // static.  Only flag as freezing if we also see significant packet loss
        // indicators, which would point to a real network issue rather than an
        // idle screen.
        const hasLossSignals = pliRate + firRate > 4 || nackRate > 25;
        const fpsDroppedToZero = (prevFps ?? 0) > 0 && (currFps === 0 || currFps === undefined);
        const fpsDroppedLow = (prevFps ?? 0) > 5 && (currFps ?? 0) < 2;
        if ((fpsDroppedToZero || fpsDroppedLow) && hasLossSignals) return 'freezing';
        // Relaxed thresholds: bursty key frame requests and NACKs are normal
        // when large screen content changes occur.
        if (pliRate + firRate > 6 || nackRate > 30) return 'packet-loss';
        if (remoteJitterMs > 150) return 'high-jitter';
        if (nackRate > 15 || droppedRate > 8) return 'degraded';
      } else {
        const fpsDrop = (prevFps ?? 0) > 0 && (currFps === 0 || currFps === undefined);
        if (fpsDrop) return 'freezing';
        if (pliRate + firRate > 2 || nackRate > 15) return 'packet-loss';
        if (remoteJitterMs > 100) return 'high-jitter';
        if (nackRate > 5 || droppedRate > 3) return 'degraded';
      }
    } else {
      if (nackRate > 10) return 'packet-loss';
      if (remoteJitterMs > 100) return 'high-jitter';
      if (nackRate > 4) return 'degraded';
    }
  }

  if (direction === 'recv') {
    const lostRate = rate((rtp.packetsLost as number) ?? 0, (prev.packetsLost as number) ?? 0);
    const jitterMs = ((rtp.jitter as number) ?? 0) * 1000;

    if (kind === 'video') {
      const freezeRate = rate((rtp.freezeCount as number) ?? 0, (prev.freezeCount as number) ?? 0);
      const droppedRate = rate((rtp.framesDropped as number) ?? 0, (prev.framesDropped as number) ?? 0);

      if (screenShare) {
        // Receiving side: a static screen share produces few/no frames, so
        // browser-reported freezes are expected. Only flag when accompanied
        // by real packet loss.
        if (freezeRate > 0.5 && lostRate > 5) return 'freezing';
        if (lostRate > 20) return 'packet-loss';
        if (jitterMs > 150) return 'high-jitter';
        if (lostRate > 8 || droppedRate > 8) return 'degraded';
      } else {
        if (freezeRate > 0.5) return 'freezing';
        if (lostRate > 10) return 'packet-loss';
        if (jitterMs > 100) return 'high-jitter';
        if (lostRate > 3 || droppedRate > 3) return 'degraded';
      }
    } else {
      const concealRate = rate((rtp.concealmentEvents as number) ?? 0, (prev.concealmentEvents as number) ?? 0);
      if (concealRate > 5) return 'freezing';
      if (lostRate > 10) return 'packet-loss';
      if (jitterMs > 100) return 'high-jitter';
      if (lostRate > 3 || concealRate > 2) return 'degraded';
    }
  }

  return 'good';
}

export function snapshotRtpForQuality(
  rtp: Record<string, unknown>,
  timestampMs?: number
): Record<string, unknown> {
  return {
    nackCount: rtp.nackCount,
    pliCount: rtp.pliCount,
    firCount: rtp.firCount,
    framesDropped: rtp.framesDropped,
    framesPerSecond: rtp.framesPerSecond,
    packetsLost: rtp.packetsLost,
    freezeCount: rtp.freezeCount,
    concealmentEvents: rtp.concealmentEvents,
    _timestamp: timestampMs,
  };
}

export interface StreamWithHistory {
  id: string;
  label?: string;
  history?: HistoryEvent[];
}

export const PAUSE_EVENTS = new Set(['pause', 'producerPaused', 'stopped']);
export const RESUME_EVENTS = new Set(['resume', 'producerResumed', 'started']);

/**
 * Build a function that returns whether a stream is paused at a given timestamp.
 * Walks the history events to determine pause/resume state.
 */
export function buildPauseLookup(
  streams: StreamWithHistory[]
): (id: string, ts: number) => boolean {
  const historyById = new Map<string, HistoryEvent[]>();
  for (const s of streams) {
    if (s.history && s.history.length > 0) {
      historyById.set(s.id, s.history.slice().sort((a, b) => a.timestamp - b.timestamp));
    }
  }

  return (id: string, ts: number): boolean => {
    const history = historyById.get(id);
    if (!history) return false;
    let paused = false;
    for (const h of history) {
      if (h.timestamp > ts) break;
      if (PAUSE_EVENTS.has(h.event)) paused = true;
      else if (RESUME_EVENTS.has(h.event)) paused = false;
    }
    return paused;
  };
}

export interface PerStreamQualityResult {
  byProducerId: Map<string, QualitySample[]>;
  byConsumerId: Map<string, QualitySample[]>;
  aggregatedSend: QualitySample[];
  aggregatedRecv: QualitySample[];
}

export function buildPerStreamQuality(
  clientStats: ClientSample[] | null | undefined,
  producers?: StreamWithHistory[],
  consumers?: StreamWithHistory[]
): PerStreamQualityResult {
  const result: PerStreamQualityResult = {
    byProducerId: new Map(),
    byConsumerId: new Map(),
    aggregatedSend: [],
    aggregatedRecv: [],
  };
  if (!clientStats || clientStats.length === 0) {
    return result;
  }

  const monotonicTs = buildMonotonicTimestamps(clientStats);
  const isProducerPaused = buildPauseLookup(producers ?? []);
  const isConsumerPaused = buildPauseLookup(consumers ?? []);

  // Build screen-share lookup from producer/consumer labels
  const screenShareProducers = new Set<string>();
  for (const p of producers ?? []) {
    if (isScreenShareLabel(p.label)) screenShareProducers.add(p.id);
  }
  const screenShareConsumers = new Set<string>();
  for (const c of consumers ?? []) {
    if (isScreenShareLabel((c as StreamWithHistory & { label?: string }).label)) screenShareConsumers.add(c.id);
  }

  const prevOutbound = new Map<string, Record<string, unknown>>();
  const prevInbound = new Map<string, Record<string, unknown>>();

  for (let sIdx = 0; sIdx < clientStats.length; sIdx++) {
    const sample = clientStats[sIdx];
    const ts: number = monotonicTs[sIdx].getTime();
    if (!Number.isFinite(ts)) continue;
    const peerConnections = sample.peerConnections;
    if (!peerConnections || !Array.isArray(peerConnections)) continue;

    let worstSend: QualityState = 'good';
    let worstRecv: QualityState = 'good';
    const producerStates = new Map<string, QualityState>();
    const consumerStates = new Map<string, QualityState>();

    for (const pc of peerConnections) {
      const direction = pc.attachments?.direction;

      if (direction === 'send') {
        const msToTrackId = new Map<string, string>();
        for (const ms of pc.mediaSources ?? []) {
          if (ms.id != null && ms.trackIdentifier != null) {
            msToTrackId.set(ms.id, ms.trackIdentifier);
          }
        }
        // Build mid → mediaSourceId so simulcast layers without mediaSourceId
        // (secondary encodings like r1, r2) can inherit from the primary encoding.
        const midToMsId = new Map<string, string>();
        for (const rtp of pc.outboundRtps ?? []) {
          if (rtp.mid != null && rtp.mediaSourceId != null) {
            midToMsId.set(String(rtp.mid), rtp.mediaSourceId as string);
          }
        }
        const trackToProducer = new Map<string, string>();
        for (const track of pc.outboundTracks ?? []) {
          const { producerId } = getTrackAttachments(track.attachments);
          if (track.id != null && producerId != null) {
            trackToProducer.set(track.id, producerId);
          }
        }
        const riMap = new Map<string, Record<string, unknown>>();
        for (const ri of pc.remoteInboundRtps ?? []) {
          if (ri.id != null) riMap.set(ri.id, rtpAsRecord(ri));
        }

        for (const rtp of pc.outboundRtps ?? []) {
          const ssrcKey = rtp.ssrc ?? rtp.id;
          if (ssrcKey == null) continue;

          const mediaSourceId =
            rtp.mediaSourceId ??
            (rtp.mid != null ? midToMsId.get(String(rtp.mid)) : undefined);
          const trackId =
            rtp.trackIdentifier ??
            (mediaSourceId != null ? msToTrackId.get(mediaSourceId) : undefined);
          const producerId =
            trackId != null ? trackToProducer.get(trackId) : undefined;

          const prev = prevOutbound.get(String(ssrcKey));
          const prevTs = prev?._timestamp as number | undefined;
          const remoteRtp =
            rtp.remoteId != null ? riMap.get(rtp.remoteId) : null;
          const isScreen = producerId != null && screenShareProducers.has(producerId);
          const state = classifyRtpQuality(
            'send',
            rtp.kind ?? 'video',
            rtpAsRecord(rtp),
            prev ?? null,
            remoteRtp ?? null,
            ts,
            prevTs,
            isScreen,
          );
          prevOutbound.set(String(ssrcKey), snapshotRtpForQuality(rtpAsRecord(rtp), ts));

          if (producerId != null) {
            const effectiveState = isProducerPaused(producerId, ts) ? 'good' : state;
            const existing = producerStates.get(producerId) ?? 'good';
            const statePriority = QUALITY_STATE_PRIORITY[effectiveState] ?? 0;
            const existingPriority = QUALITY_STATE_PRIORITY[existing] ?? 0;
            if (statePriority > existingPriority) {
              producerStates.set(producerId, effectiveState);
            }
          }
          const statePriority = QUALITY_STATE_PRIORITY[state] ?? 0;
          const worstSendPriority = QUALITY_STATE_PRIORITY[worstSend] ?? 0;
          if (statePriority > worstSendPriority) {
            worstSend = state;
          }
        }
      }

      if (direction === 'recv') {
        const trackToConsumer = new Map<string, string>();
        for (const track of pc.inboundTracks ?? []) {
          const { consumerId } = getTrackAttachments(track.attachments);
          if (track.id != null && consumerId != null) {
            trackToConsumer.set(track.id, consumerId);
          }
        }

        for (const rtp of pc.inboundRtps ?? []) {
          const ssrcKey = rtp.ssrc ?? rtp.id;
          if (ssrcKey == null) continue;

          const consumerId =
            rtp.trackIdentifier != null
              ? trackToConsumer.get(rtp.trackIdentifier)
              : undefined;

          const prev = prevInbound.get(String(ssrcKey));
          const prevTs = prev?._timestamp as number | undefined;
          const isScreen = consumerId != null && screenShareConsumers.has(consumerId);
          const state = classifyRtpQuality(
            'recv',
            rtp.kind ?? 'video',
            rtpAsRecord(rtp),
            prev ?? null,
            null,
            ts,
            prevTs,
            isScreen,
          );
          prevInbound.set(String(ssrcKey), snapshotRtpForQuality(rtpAsRecord(rtp), ts));

          if (consumerId != null) {
            const effectiveState = isConsumerPaused(consumerId, ts) ? 'good' : state;
            const existing = consumerStates.get(consumerId) ?? 'good';
            const statePriority = QUALITY_STATE_PRIORITY[effectiveState] ?? 0;
            const existingPriority = QUALITY_STATE_PRIORITY[existing] ?? 0;
            if (statePriority > existingPriority) {
              consumerStates.set(consumerId, effectiveState);
            }
          }
          const statePriority = QUALITY_STATE_PRIORITY[state] ?? 0;
          const worstRecvPriority = QUALITY_STATE_PRIORITY[worstRecv] ?? 0;
          if (statePriority > worstRecvPriority) {
            worstRecv = state;
          }
        }
      }
    }

    for (const [pid, state] of producerStates) {
      if (!result.byProducerId.has(pid)) result.byProducerId.set(pid, []);
      result.byProducerId.get(pid)!.push({ timestamp: ts, state });
    }
    for (const [cid, state] of consumerStates) {
      if (!result.byConsumerId.has(cid)) result.byConsumerId.set(cid, []);
      result.byConsumerId.get(cid)!.push({ timestamp: ts, state });
    }

    result.aggregatedSend.push({ timestamp: ts, state: worstSend });
    result.aggregatedRecv.push({ timestamp: ts, state: worstRecv });
  }

  // Ensure all timelines are sorted chronologically (raw stats may be in reverse order)
  const sortByTs = (a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp;
  result.aggregatedSend.sort(sortByTs);
  result.aggregatedRecv.sort(sortByTs);
  for (const arr of result.byProducerId.values()) arr.sort(sortByTs);
  for (const arr of result.byConsumerId.values()) arr.sort(sortByTs);

  return result;
}
