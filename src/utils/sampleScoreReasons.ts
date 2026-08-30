/**
 * Score reasons per sample, gathered from the components that caused them.
 *
 * client-monitor **4.7.0** stopped shipping the aggregated reasons on the
 * client entry. Before it, a single inbound track pixelating produced
 * `pixelated-video` twice in one sample — once on the track that was actually
 * pixelating, and again on the client entry — which read as though the client
 * itself were the thing degrading, and invited a worse misreading still: the
 * client score is a smoothed weighted aggregate, not `5 - sum(reasons)`, so a
 * recovered client score of ~5 could sit beside an inherited `high-packetloss`
 * and look like a stale reason when it was really a scope error.
 *
 * Now each entity ships only what it is itself responsible for, and the client
 * subtracts nothing of its own — so `ClientSample.scoreReasons` is empty by
 * design, and **the client-level view has to be rebuilt here** by re-aggregating
 * the components of the same sample. No information was lost; it just has to be
 * put back together, which is what this does.
 *
 * Grouping is by exact timestamp: every score in one sample is stamped with
 * that sample's own time by `statsProcessor`, so the client score, its peer
 * connections and its tracks land on the same key without any tolerance
 * window — and a reason can always be traced back to the component that raised
 * it rather than being pooled anonymously.
 */

import { getScoreReasonMeta, type ScoreReasonMeta } from '../schema/ScoreReasons.ts';
import type { ProcessWebRTCStatsResult, ScoreSample } from './statsTypes.ts';

/** Where a reason came from. */
export type ReasonOrigin = 'client' | 'peerConnection' | 'track';

/** One reason, attributed to the component that raised it. */
export interface SampleReason {
  key: string;
  meta: ScoreReasonMeta;
  origin: ReasonOrigin;
  /** The component's id — a peer connection id, or `<pc>:<track>`. */
  entityId: string;
  /** How that component is best named in a list. */
  entityLabel: string;
  /** `inbound` / `outbound` for a track, `send` / `recv` for a peer connection. */
  direction?: string;
  /** Points this reason subtracted, when the wire carried a magnitude. */
  points?: number;
  /** The component's own score at this sample. */
  entityScore?: number;
  /**
   * Permalink target for the section that owns this component, e.g.
   * `consumer/<id>`. The dashboard's collapsible sections open and scroll on a
   * matching hash, so this is what turns "a track raised a reason" into "here
   * is that track" — the step the reader would otherwise do by hand, hunting an
   * id through three collapsed sections.
   *
   * Absent when nothing on the page owns it: a peer connection with no SFU
   * transport, a track whose producer or consumer never appeared.
   */
  targetHash?: string;
  /** What the link leads to, for its title text. */
  targetLabel?: string;
}

/** Everything one sample said about quality. */
export interface SampleScoreEntry {
  timestamp: number;
  /** The client's own score for this sample, when it reported one. */
  clientScore?: number;
  reasons: SampleReason[];
  /** Summed magnitudes, when every reason carried one. */
  totalPoints?: number;
}

function tsOf(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

function shortEntity(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

interface CollectOptions {
  origin: ReasonOrigin;
  entityId: string;
  entityLabel: string;
  direction?: string;
  targetHash?: string;
  targetLabel?: string;
}

function collect(
  into: Map<number, SampleScoreEntry>,
  samples: ScoreSample[] | undefined,
  { origin, entityId, entityLabel, direction, targetHash, targetLabel }: CollectOptions,
): void {
  for (const sample of samples ?? []) {
    const at = tsOf(sample.timestamp);
    if (!Number.isFinite(at)) continue;
    if (!sample.reasons?.length) continue;

    let entry = into.get(at);
    if (!entry) {
      entry = { timestamp: at, reasons: [] };
      into.set(at, entry);
    }

    for (const key of sample.reasons) {
      entry.reasons.push({
        key,
        meta: getScoreReasonMeta(key),
        origin,
        entityId,
        entityLabel,
        direction,
        points: sample.penalties?.[key],
        entityScore: sample.score,
        targetHash,
        targetLabel,
      });
    }
  }
}

/**
 * Every sample, oldest first — including the ones that carried no reason.
 *
 * The list has to be one row per sample, because it is driven by clicking the
 * score chart: drop the quiet samples and the correspondence breaks, so a click
 * on a clean stretch lands on some *other* moment's reasons while the marker
 * says otherwise. A row that says "no reasons" is also an answer — it is how
 * you confirm that a dip in the client score had nothing underneath it.
 *
 * The client score line defines the samples. A timestamp carrying component
 * reasons but no client score still gets a row, since the reasons are real
 * whether or not the client scored that tick.
 */
export function buildSampleScoreReasons(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
): SampleScoreEntry[] {
  const scores = processedStats?.scores;
  if (!scores) return [];

  const byTimestamp = new Map<number, SampleScoreEntry>();

  // Still read, and still correct to read: a client-level penalty added later
  // would land here like any other component's and ship automatically.
  collect(byTimestamp, scores.session, {
    origin: 'client',
    entityId: 'client',
    entityLabel: 'Client',
  });

  for (const [pcId, pc] of Object.entries(scores.perPc ?? {})) {
    collect(byTimestamp, pc.values, {
      origin: 'peerConnection',
      entityId: pcId,
      entityLabel: `PC ${shortEntity(pcId)}`,
      direction: pc.direction,
      // A peer connection is rendered as its transport, which is keyed by the
      // SFU transport id when there is one and by the peer connection id when
      // there is not — the same fallback `TransportSection` itself uses.
      targetHash: `transport/${pcId}`,
      targetLabel: 'transport',
    });
  }

  for (const [trackKey, track] of Object.entries(scores.perTrack ?? {})) {
    const id = track.trackId ?? trackKey;
    const inbound = track.kind === 'inbound';
    // A track has no section of its own: it is rendered inside the consumer
    // that renders it or the producer that sends it, so that is where a click
    // should land. Without the id the track was never matched to one, and the
    // reason stays unlinked rather than pointing somewhere wrong.
    const owner = inbound ? track.consumerId : track.producerId;
    collect(byTimestamp, track.values, {
      origin: 'track',
      entityId: trackKey,
      entityLabel: `${inbound ? 'Inbound' : 'Outbound'} track ${shortEntity(id)}`,
      direction: track.kind,
      targetHash: owner ? `${inbound ? 'consumer' : 'producer'}/${owner}` : undefined,
      targetLabel: inbound ? 'consumer' : 'producer',
    });
  }

  // The client's own score for each sample, whether or not it raised reasons.
  const clientScoreAt = new Map<number, number>();
  for (const sample of scores.session ?? []) {
    const at = tsOf(sample.timestamp);
    if (Number.isFinite(at) && sample.score != null) clientScoreAt.set(at, sample.score);
  }

  // Every sample the client scored, whether or not anything raised a reason.
  for (const sample of scores.session ?? []) {
    const at = tsOf(sample.timestamp);
    if (!Number.isFinite(at)) continue;
    if (!byTimestamp.has(at)) byTimestamp.set(at, { timestamp: at, reasons: [] });
  }

  const out = [...byTimestamp.values()];
  for (const entry of out) {
    entry.clientScore = clientScoreAt.get(entry.timestamp);
    const measured = entry.reasons.filter((r) => typeof r.points === 'number');
    // Only when every reason carried a magnitude — a partial sum would read as
    // the sample's whole cost while silently omitting the reasons that did not.
    if (measured.length > 0 && measured.length === entry.reasons.length) {
      entry.totalPoints = measured.reduce((a, r) => a + (r.points as number), 0);
    }
    entry.reasons.sort(
      (a, b) => (b.points ?? 0) - (a.points ?? 0) || a.meta.label.localeCompare(b.meta.label),
    );
  }

  return out.sort((a, b) => a.timestamp - b.timestamp);
}

/** The entry at or immediately before `at` — what a click on the chart means. */
export function nearestEntryIndex(entries: SampleScoreEntry[], at: number): number {
  if (entries.length === 0) return -1;
  let best = 0;
  let bestDistance = Math.abs(entries[0].timestamp - at);
  for (let i = 1; i < entries.length; i++) {
    const distance = Math.abs(entries[i].timestamp - at);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}
