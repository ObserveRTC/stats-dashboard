/**
 * Client media tracks, tied back to the SFU object they belong to.
 *
 * `ClientSample.peerConnections[].outboundTracks` / `inboundTracks` are the
 * browser's own view of a track: its id, kind, a 1–5 quality score and the
 * free-text `scoreReasons` behind it. They used to be shown as two standalone
 * lists, which meant reading a producer's charts in one section and the score
 * for the very same media in another.
 *
 * Every track carries the id of the SFU object it feeds in its `attachments` —
 * `producerId` going out, `consumerId` coming in — so the two views can be put
 * side by side. That is all this module does: collect the tracks, fold their
 * per-sample scores into a series, and index them by producer and consumer.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import { getTrackAttachments, toReasonList, toReasonMap } from '../schema/clientSampleParse.ts';
import { formatScoreReasons } from './scoreExplanation.ts';
import type { ScoreSample } from './statsTypes.ts';

export type TrackDirection = 'outbound' | 'inbound';

/** One media track as the client reported it, across the whole session. */
export interface ClientTrackView {
  /** `<peerConnectionId>:<trackId>` — unique even when a track spans PCs. */
  key: string;
  peerConnectionId: string;
  trackId: string;
  kind: string;
  direction: TrackDirection;
  /** The producer this outbound track feeds, from `attachments.producerId`. */
  producerId?: string;
  /** The consumer this inbound track renders, from `attachments.consumerId`. */
  consumerId?: string;
  attachments?: Record<string, unknown>;
  /** How many samples mentioned this track. */
  seenCount: number;
  firstSeen: number;
  lastSeen: number;
  /** Most recent score reported for the track. */
  latestScore?: number;
  /** Reasons attached to the most recent score. Normalized to a list. */
  latestScoreReasons?: string[];
  /** Points each of those reasons cost; only on samples from schema ≥3.6. */
  latestScorePenalties?: Record<string, number>;
  /** Score over time; each point keeps the reasons given at that moment. */
  scoreSeries: ScoreSample[];
}

export interface ClientTrackIndex {
  outbound: ClientTrackView[];
  inbound: ClientTrackView[];
  /** Outbound tracks keyed by the producer they feed. */
  byProducerId: Map<string, ClientTrackView[]>;
  /** Inbound tracks keyed by the consumer they render. */
  byConsumerId: Map<string, ClientTrackView[]>;
  /** Outbound tracks whose attachments name no producer. */
  unassociatedOutbound: ClientTrackView[];
  /** Inbound tracks whose attachments name no consumer. */
  unassociatedInbound: ClientTrackView[];
}

const EMPTY_INDEX: ClientTrackIndex = {
  outbound: [],
  inbound: [],
  byProducerId: new Map(),
  byConsumerId: new Map(),
  unassociatedOutbound: [],
  unassociatedInbound: [],
};

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

interface TrackLike {
  id: string;
  kind: string;
  timestamp: number;
  score?: number;
  /**
   * String on schema ≤3.2, `string[]` on 3.3–3.5, `Record<key, points>` from
   * 3.6 — normalized on read.
   */
  scoreReasons?: string | string[] | Record<string, number>;
  attachments?: Record<string, unknown>;
}

function collect(
  samples: ClientSample[] | null | undefined,
  direction: TrackDirection,
): ClientTrackView[] {
  const byKey = new Map<string, ClientTrackView>();
  if (!samples?.length) return [];

  for (const sample of samples) {
    const sampleMs = typeof sample.timestamp === 'number' ? sample.timestamp : Date.now();
    for (const pc of sample.peerConnections ?? []) {
      const peerConnectionId = pc.peerConnectionId ?? '';
      const tracks = (direction === 'outbound' ? pc.outboundTracks : pc.inboundTracks) ?? [];

      for (const raw of tracks as TrackLike[]) {
        if (!raw?.id) continue;
        const key = `${peerConnectionId}:${raw.id}`;
        const att = getTrackAttachments(raw.attachments);

        let view = byKey.get(key);
        if (!view) {
          view = {
            key,
            peerConnectionId,
            trackId: raw.id,
            kind: raw.kind,
            direction,
            producerId: direction === 'outbound' ? att.producerId : undefined,
            consumerId: direction === 'inbound' ? att.consumerId : undefined,
            attachments: raw.attachments,
            seenCount: 0,
            firstSeen: sampleMs,
            lastSeen: sampleMs,
            scoreSeries: [],
          };
          byKey.set(key, view);
        }

        // The id can appear a sample or two after the track itself, so keep
        // taking the first non-empty value rather than trusting sample one.
        if (direction === 'outbound' && !view.producerId && att.producerId) {
          view.producerId = att.producerId;
        }
        if (direction === 'inbound' && !view.consumerId && att.consumerId) {
          view.consumerId = att.consumerId;
        }
        if (raw.attachments && Object.keys(raw.attachments).length > 0) {
          view.attachments = { ...(view.attachments ?? {}), ...raw.attachments };
        }

        view.seenCount += 1;
        view.firstSeen = Math.min(view.firstSeen, sampleMs);
        view.lastSeen = Math.max(view.lastSeen, sampleMs);

        if (typeof raw.score === 'number' && Number.isFinite(raw.score)) {
          const reasons = toReasonList(raw.scoreReasons);
          view.scoreSeries.push({
            timestamp: new Date(sampleMs),
            score: raw.score,
            reasons,
            penalties: toReasonMap(raw.scoreReasons),
          });
          view.latestScore = raw.score;
          view.latestScoreReasons = reasons;
          view.latestScorePenalties = toReasonMap(raw.scoreReasons);
        }
      }
    }
  }

  const out = Array.from(byKey.values());
  for (const view of out) {
    view.scoreSeries.sort((a, b) => tsOf(a.timestamp) - tsOf(b.timestamp));
  }
  return out.sort((a, b) => a.firstSeen - b.firstSeen);
}

function tsOf(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

/** Collect every track in the session and index it by producer / consumer. */
export function buildClientTrackIndex(
  samples: ClientSample[] | null | undefined,
): ClientTrackIndex {
  if (!samples?.length) return EMPTY_INDEX;

  const outbound = collect(samples, 'outbound');
  const inbound = collect(samples, 'inbound');

  const byProducerId = new Map<string, ClientTrackView[]>();
  const byConsumerId = new Map<string, ClientTrackView[]>();
  const unassociatedOutbound: ClientTrackView[] = [];
  const unassociatedInbound: ClientTrackView[] = [];

  for (const track of outbound) {
    if (track.producerId) push(byProducerId, track.producerId, track);
    else unassociatedOutbound.push(track);
  }
  for (const track of inbound) {
    if (track.consumerId) push(byConsumerId, track.consumerId, track);
    else unassociatedInbound.push(track);
  }

  return {
    outbound,
    inbound,
    byProducerId,
    byConsumerId,
    unassociatedOutbound,
    unassociatedInbound,
  };
}

/** Score series in the shape MiniChart plots, carrying reasons as point notes. */
export function trackScoreChartData(
  track: ClientTrackView,
): Array<{ timestamp: Date; value: number; notes?: string[] }> {
  return track.scoreSeries.map((s) => ({
    timestamp: s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp),
    value: s.score,
    notes: formatScoreReasons(s.reasons, s.penalties),
  }));
}
