import { ClientEventTypes } from '../schema/ClientEventTypes.ts';
import type { ClientSample } from '../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from './statsTypes.ts';
import { asClientSamples, parseClientEventPayload } from '../schema/clientSampleParse.ts';

export interface MediaTrackRecord {
  trackId: string;
  peerConnectionId: string;
  kind: string;
  label?: string;
  status: 'active' | 'removed';
  addedAt?: number;
  removedAt?: number;
  addedPayload?: Record<string, unknown>;
  removedPayload?: Record<string, unknown>;
}

export interface TrackScorePoint {
  timestamp: Date;
  value: number;
}

export interface TrackScoreSeries {
  kind: 'outbound' | 'inbound';
  data: TrackScorePoint[];
}

function eventTimestamp(ev: { timestamp?: number }, sampleTs: number): number {
  return ev.timestamp ?? sampleTs;
}

export function extractMediaTrackEvents(
  clientStats: ClientSample[] | null | undefined,
): MediaTrackRecord[] {
  const samples = asClientSamples(clientStats ?? []);
  const byTrackId = new Map<string, MediaTrackRecord>();

  for (const sample of samples) {
    for (const ev of sample.clientEvents ?? []) {
      const ts = eventTimestamp(ev, sample.timestamp);

      if (ev.type === ClientEventTypes.MEDIA_TRACK_ADDED) {
        const payload = parseClientEventPayload(ev);
        const trackId = String(payload.trackId ?? '');
        if (!trackId) continue;

        const existing = byTrackId.get(trackId);
        byTrackId.set(trackId, {
          trackId,
          peerConnectionId: String(payload.peerConnectionId ?? existing?.peerConnectionId ?? ''),
          kind: String(payload.kind ?? existing?.kind ?? 'unknown'),
          label: typeof payload.label === 'string' ? payload.label : existing?.label,
          status: existing?.status === 'removed' ? 'removed' : 'active',
          addedAt: ts,
          removedAt: existing?.removedAt,
          addedPayload: payload,
          removedPayload: existing?.removedPayload,
        });
        continue;
      }

      if (ev.type === ClientEventTypes.MEDIA_TRACK_REMOVED) {
        const payload = parseClientEventPayload(ev);
        const trackId = String(payload.trackId ?? '');
        if (!trackId) continue;

        const existing = byTrackId.get(trackId);
        if (existing) {
          existing.status = 'removed';
          existing.removedAt = ts;
          existing.removedPayload = payload;
          if (!existing.label && typeof payload.label === 'string') existing.label = payload.label;
        } else {
          byTrackId.set(trackId, {
            trackId,
            peerConnectionId: String(payload.peerConnectionId ?? ''),
            kind: String(payload.kind ?? 'unknown'),
            label: typeof payload.label === 'string' ? payload.label : undefined,
            status: 'removed',
            removedAt: ts,
            removedPayload: payload,
          });
        }
      }
    }
  }

  return [...byTrackId.values()].sort((a, b) => {
    const aTs = a.addedAt ?? a.removedAt ?? 0;
    const bTs = b.addedAt ?? b.removedAt ?? 0;
    return aTs - bTs;
  });
}

function trackScoreKey(peerConnectionKey: string, trackId: string): string {
  return `${peerConnectionKey}:${trackId}`;
}

function findTrackScoreEntry(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  track: Pick<MediaTrackRecord, 'trackId' | 'peerConnectionId'>,
) {
  const perTrack = processedStats?.scores?.perTrack;
  if (!perTrack) return null;

  const { trackId, peerConnectionId } = track;
  if (peerConnectionId) {
    const direct = perTrack[trackScoreKey(peerConnectionId, trackId)];
    if (direct) return direct;
  }

  const matches = Object.entries(perTrack).filter(([key]) => {
    const sep = key.lastIndexOf(':');
    return sep >= 0 && key.slice(sep + 1) === trackId;
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0][1];

  if (peerConnectionId) {
    const pcMatch = matches.find(([key]) => key.startsWith(`${peerConnectionId}:`));
    if (pcMatch) return pcMatch[1];
  }

  return matches[0][1];
}

function collectTrackScoreFromSamples(
  samples: ClientSample[],
  track: Pick<MediaTrackRecord, 'trackId' | 'peerConnectionId'>,
): TrackScorePoint[] {
  const points: TrackScorePoint[] = [];

  for (const sample of samples) {
    for (let pcIndex = 0; pcIndex < (sample.peerConnections?.length ?? 0); pcIndex++) {
      const pc = sample.peerConnections![pcIndex];
      if (track.peerConnectionId && pc.peerConnectionId && pc.peerConnectionId !== track.peerConnectionId) {
        continue;
      }

      for (const outbound of pc.outboundTracks ?? []) {
        if (outbound.id !== track.trackId || outbound.score == null || outbound.score <= 0) continue;
        points.push({ timestamp: new Date(sample.timestamp), value: outbound.score });
      }
      for (const inbound of pc.inboundTracks ?? []) {
        if (inbound.id !== track.trackId || inbound.score == null || inbound.score <= 0) continue;
        points.push({ timestamp: new Date(sample.timestamp), value: inbound.score });
      }
    }
  }

  return points;
}

export function buildTrackScoreSeries(
  clientStats: ClientSample[] | null | undefined,
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  track: MediaTrackRecord,
): TrackScoreSeries | null {
  const entry = findTrackScoreEntry(processedStats, track);
  let data: TrackScorePoint[] = entry?.values
    ?.filter((v) => v.score > 0)
    .map((v) => ({
      timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp),
      value: v.score,
    })) ?? [];

  if (data.length < 2) {
    data = collectTrackScoreFromSamples(asClientSamples(clientStats ?? []), track);
  }

  if (data.length < 2) return null;

  let kind: 'outbound' | 'inbound' = entry?.kind === 'inbound' ? 'inbound' : 'outbound';
  if (!entry) {
    const samples = asClientSamples(clientStats ?? []);
    outer:
    for (const sample of samples) {
      for (const pc of sample.peerConnections ?? []) {
        if (track.peerConnectionId && pc.peerConnectionId && pc.peerConnectionId !== track.peerConnectionId) continue;
        if ((pc.inboundTracks ?? []).some((t) => t.id === track.trackId)) {
          kind = 'inbound';
          break outer;
        }
        if ((pc.outboundTracks ?? []).some((t) => t.id === track.trackId)) {
          kind = 'outbound';
          break outer;
        }
      }
    }
  }

  return { kind, data };
}
