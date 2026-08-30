/**
 * Why the client's quality score is the number it is.
 *
 * The score itself says how bad things were; it never says what was wrong.
 * `DefaultScoreCalculator` records that separately as reason keys, on the
 * client, on each peer connection and on each track.
 *
 * From client-monitor 4.7.0 the client entry carries **none of its own**: every
 * entity ships only what it is responsible for, and the client score subtracts
 * nothing directly. So `clientPoints` below is normally null on a 4.7 stream,
 * and the account is built from the components — which is where it always
 * belonged. Older streams that still carry the aggregate on the client entry
 * read the same way, they simply attribute more to `client`.
 *
 * This walks all three,
 * counts how often each reason appeared, and assembles the account: how much
 * of the session was below par, which reason dominated, and where the trouble
 * was concentrated.
 *
 * Schema 3.6.0 put the magnitudes on the wire: `scoreReasons` became
 * `Record<reasonKey, pointsSubtracted>`, so for those samples this reports what
 * each reason actually cost rather than only how often it fired. Older samples
 * carry keys alone, and nothing here invents a number for them — when no sample
 * in the window carried magnitudes, `measured` is false and everything falls
 * back to ranking by frequency and by how much a reason is *capable* of costing.
 * A window that mixes vintages counts every occurrence but sums points only
 * from the ticks that reported them, and says so via `measuredTicks`.
 */

import type { ProcessWebRTCStatsResult, ScoreSample } from './statsTypes.ts';
import {
  GROUP_LABELS,
  getScoreReasonMeta,
  isKnownScoreReason,
  type ScoreReasonGroup,
  type ScoreReasonMeta,
} from '../schema/ScoreReasons.ts';

/** The bands the calculator documents for the 0–5 scale. */
export type ScoreBand = 'good' | 'fair' | 'poor' | 'bad' | 'very bad';

export function scoreBand(score: number): ScoreBand {
  if (score >= 4) return 'good';
  if (score >= 3) return 'fair';
  if (score >= 2) return 'poor';
  if (score >= 1) return 'bad';
  return 'very bad';
}

export const BAND_COLORS: Record<ScoreBand, string> = {
  good: 'var(--success)',
  fair: 'var(--warning, #d97706)',
  poor: 'var(--warning, #d97706)',
  bad: 'var(--danger)',
  'very bad': 'var(--danger)',
};

/**
 * Render reason keys for a tooltip or a list, appending what each one cost.
 *
 * Schema ≥3.6 samples carry the magnitude next to the key, and a reader wants
 * to see it: "frozen-video −1.5" answers a question that "frozen-video" alone
 * only raises. Keys from older samples render bare rather than with a fake
 * "−0.0", so the two vintages stay visibly different.
 *
 * A magnitude of 0 renders bare too. observer-js folds a pre-3.6 `string[]`
 * into the record shape with a magnitude of 0 on the way through, so "−0" in a
 * tooltip would far more often mean "this went through the observer from an old
 * client" than "this reason genuinely cost nothing" — and neither is worth the
 * pixels.
 */
export function formatScoreReasons(
  reasons: string[] | undefined,
  penalties: Record<string, number> | undefined,
): string[] {
  if (!reasons?.length) return [];
  if (!penalties) return reasons;

  return reasons.map((key) => {
    const points = penalties[key];
    return typeof points === 'number' && Number.isFinite(points) && points > 0
      ? `${key} \u2212${points.toFixed(points % 1 === 0 ? 0 : 1)}`
      : key;
  });
}

/** Where a reason was raised. */
export type ReasonScope = 'client' | 'peerConnection' | 'track';

export interface ReasonTally {
  meta: ScoreReasonMeta;
  /** Ticks in which this reason appeared, summed over every entity that raised it. */
  occurrences: number;
  /**
   * Points this reason subtracted, summed over every tick that reported a
   * magnitude. `null` when no such tick exists — never 0, which would read as
   * "it cost nothing" rather than "the wire never said".
   */
  points: number | null;
  /** Of `occurrences`, how many carried a magnitude (schema ≥3.6). */
  measuredTicks: number;
  /** Mean points per measured tick, or `null` when none were measured. */
  averagePoints: number | null;
  /** The largest single-tick penalty seen, or `null` when none were measured. */
  peakPoints: number | null;
  /** Distinct entities that ever raised it. */
  entityCount: number;
  /** Share of all reason occurrences, 0–1. */
  share: number;
  scopes: ReasonScope[];
  /** First and last time it was seen. */
  firstSeen: number;
  lastSeen: number;
}

export interface GroupTally {
  group: ScoreReasonGroup;
  label: string;
  occurrences: number;
  share: number;
  /** Points attributed to this group, or `null` when nothing was measured. */
  points: number | null;
  /** Share of all measured points, 0–1; `null` when nothing was measured. */
  pointShare: number | null;
}

export interface ScoreExplanation {
  /** Mean of the client's own score samples. */
  average: number | null;
  min: number | null;
  max: number | null;
  band: ScoreBand | null;
  sampleCount: number;
  /** Ticks whose client score fell below 4.0. */
  belowGoodTicks: number;
  /** Ticks whose client score fell below 2.0. */
  badTicks: number;
  /** Reasons, most frequent first. */
  reasons: ReasonTally[];
  /** Where the trouble was concentrated. */
  groups: GroupTally[];
  totalOccurrences: number;
  /** True when at least one sample in the window carried reason magnitudes. */
  measured: boolean;
  /** Points subtracted across every scope and tick that reported a magnitude. */
  totalPoints: number | null;
  /**
   * Points subtracted on the client's own score line — the arithmetic behind
   * the average this box explains, as opposed to the per-PC and per-track
   * lines, which are separate scores of their own.
   */
  clientPoints: number | null;
  /** Client-scope ticks that carried magnitudes. */
  clientMeasuredTicks: number;
  /** Reason keys with no entry in the reference table. */
  unknownKeys: string[];
  /** A short prose account, one sentence per point. */
  narrative: string[];
}

const EMPTY: ScoreExplanation = {
  average: null,
  min: null,
  max: null,
  band: null,
  sampleCount: 0,
  belowGoodTicks: 0,
  badTicks: 0,
  reasons: [],
  groups: [],
  totalOccurrences: 0,
  measured: false,
  totalPoints: null,
  clientPoints: null,
  clientMeasuredTicks: 0,
  unknownKeys: [],
  narrative: [],
};

function tsOf(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

interface Accumulator {
  occurrences: number;
  /** Summed magnitudes; meaningful only alongside `measuredTicks > 0`. */
  points: number;
  measuredTicks: number;
  peakPoints: number;
  /** Magnitudes from the client's own score line only. */
  clientPoints: number;
  entities: Set<string>;
  scopes: Set<ReasonScope>;
  firstSeen: number;
  lastSeen: number;
}

function tally(
  acc: Map<string, Accumulator>,
  samples: ScoreSample[] | undefined,
  scope: ReasonScope,
  entityId: string,
): void {
  for (const sample of samples ?? []) {
    const at = tsOf(sample.timestamp);
    for (const key of sample.reasons ?? []) {
      let entry = acc.get(key);
      if (!entry) {
        entry = {
          occurrences: 0,
          points: 0,
          measuredTicks: 0,
          peakPoints: 0,
          clientPoints: 0,
          entities: new Set(),
          scopes: new Set(),
          firstSeen: at,
          lastSeen: at,
        };
        acc.set(key, entry);
      }
      entry.occurrences += 1;
      // A magnitude of exactly 0 still counts as measured: the wire said the
      // reason applied and cost nothing, which is a fact, not a gap.
      const magnitude = sample.penalties?.[key];
      if (typeof magnitude === 'number' && Number.isFinite(magnitude)) {
        entry.points += magnitude;
        entry.measuredTicks += 1;
        entry.peakPoints = Math.max(entry.peakPoints, magnitude);
        if (scope === 'client') entry.clientPoints += magnitude;
      }
      entry.entities.add(`${scope}:${entityId}`);
      entry.scopes.add(scope);
      entry.firstSeen = Math.min(entry.firstSeen, at);
      entry.lastSeen = Math.max(entry.lastSeen, at);
    }
  }
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

export interface BuildScoreExplanationOptions {
  /** Ignore samples before this timestamp — startup ramp distorts the average. */
  warmupEnd?: number;
}

export function buildScoreExplanation(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  options: BuildScoreExplanationOptions = {},
): ScoreExplanation {
  if (!processedStats) return EMPTY;
  const warmupEnd = options.warmupEnd ?? 0;
  const scores = processedStats.scores;
  if (!scores) return EMPTY;

  const clientSamples = (scores.session ?? []).filter(
    (s) => tsOf(s.timestamp) >= warmupEnd && s.score > 0,
  );
  const values = clientSamples.map((s) => s.score);

  const acc = new Map<string, Accumulator>();
  tally(acc, clientSamples, 'client', 'client');
  for (const [pcId, pc] of Object.entries(scores.perPc ?? {})) {
    tally(
      acc,
      (pc.values ?? []).filter((s) => tsOf(s.timestamp) >= warmupEnd),
      'peerConnection',
      pcId,
    );
  }
  for (const [trackKey, track] of Object.entries(scores.perTrack ?? {})) {
    tally(
      acc,
      (track.values ?? []).filter((s) => tsOf(s.timestamp) >= warmupEnd),
      'track',
      trackKey,
    );
  }

  const totalOccurrences = [...acc.values()].reduce((a, e) => a + e.occurrences, 0);
  const measuredTicks = [...acc.values()].reduce((a, e) => a + e.measuredTicks, 0);
  const summedPoints = [...acc.values()].reduce((a, e) => a + e.points, 0);
  // An all-zero window is treated as unmeasured, because observer-js folds a
  // pre-3.6 `string[]` into the record shape with a magnitude of 0 on the way
  // through. A window of nothing but zeroes is therefore indistinguishable
  // from an old client, and ranking by "cost" would rank by nothing at all.
  const measured = measuredTicks > 0 && summedPoints > 0;
  const totalPoints = measured ? summedPoints : null;
  const clientPoints = measured
    ? [...acc.values()].reduce((a, e) => a + e.clientPoints, 0)
    : null;
  const clientMeasuredTicks = measured
    ? clientSamples.filter((s) => s.penalties != null).length
    : 0;

  const reasons: ReasonTally[] = [...acc.entries()]
    .map(([key, entry]) => ({
      meta: getScoreReasonMeta(key),
      occurrences: entry.occurrences,
      points: measured && entry.measuredTicks > 0 ? entry.points : null,
      measuredTicks: measured ? entry.measuredTicks : 0,
      averagePoints:
        measured && entry.measuredTicks > 0 ? entry.points / entry.measuredTicks : null,
      peakPoints: measured && entry.measuredTicks > 0 ? entry.peakPoints : null,
      entityCount: entry.entities.size,
      share: totalOccurrences > 0 ? entry.occurrences / totalOccurrences : 0,
      scopes: [...entry.scopes],
      firstSeen: entry.firstSeen,
      lastSeen: entry.lastSeen,
    }))
    // What the reason actually cost outranks how often it fired, once the wire
    // says so. Without magnitudes, fall back to frequency and then to how much
    // the reason is *capable* of costing, so a rare `frozen-video` outranks an
    // equally rare `high-volatile-bitrate`.
    .sort(
      (a, b) =>
        (b.points ?? -1) - (a.points ?? -1) ||
        b.occurrences - a.occurrences ||
        b.meta.maxPenalty - a.meta.maxPenalty,
    );

  const groupOccurrences = new Map<ScoreReasonGroup, number>();
  const groupPoints = new Map<ScoreReasonGroup, number>();
  for (const reason of reasons) {
    groupOccurrences.set(
      reason.meta.group,
      (groupOccurrences.get(reason.meta.group) ?? 0) + reason.occurrences,
    );
    if (reason.points != null) {
      groupPoints.set(reason.meta.group, (groupPoints.get(reason.meta.group) ?? 0) + reason.points);
    }
  }
  const groups: GroupTally[] = [...groupOccurrences.entries()]
    .map(([group, occurrences]) => ({
      group,
      label: GROUP_LABELS[group],
      occurrences,
      share: totalOccurrences > 0 ? occurrences / totalOccurrences : 0,
      points: groupPoints.has(group) ? (groupPoints.get(group) as number) : null,
      pointShare:
        totalPoints != null && totalPoints > 0 && groupPoints.has(group)
          ? (groupPoints.get(group) as number) / totalPoints
          : null,
    }))
    .sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || b.occurrences - a.occurrences);

  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const belowGoodTicks = values.filter((v) => v < 4).length;
  const badTicks = values.filter((v) => v < 2).length;

  /* ── narrative ── */

  const narrative: string[] = [];
  if (average != null) {
    const band = scoreBand(average);
    narrative.push(
      `The client averaged ${average.toFixed(2)} out of 5 across ${values.length} ${plural(values.length, 'sample')}, which the calculator reads as ${band}.`,
    );
    if (belowGoodTicks === 0) {
      narrative.push('It never dropped out of the good band.');
    } else {
      narrative.push(
        `It sat below the good band (4.0) in ${belowGoodTicks} of them — ${pct(belowGoodTicks / values.length)} of the session` +
          (badTicks > 0 ? `, and below 2.0 in ${badTicks}.` : '.'),
      );
    }
  }

  if (totalOccurrences === 0) {
    narrative.push(
      'No score reasons were recorded, so nothing subtracted from the maximum — either the session was clean, or this client does not send reason keys.',
    );
  } else {
    const top = reasons[0];
    narrative.push(
      `${totalOccurrences} penalty ${plural(totalOccurrences, 'reason was', 'reasons were')} recorded in total, across ${reasons.length} distinct ${plural(reasons.length, 'kind')}.`,
    );

    if (measured && top.points != null) {
      // The wire carried magnitudes, so lead with what things actually cost.
      narrative.push(
        `The biggest contributor was “${top.meta.label}” (\`${top.meta.key}\`), which took off ${top.points.toFixed(1)} ${plural(Math.round(top.points), 'point')} over ${top.occurrences} ${plural(top.occurrences, 'tick')} — ${totalPoints != null && totalPoints > 0 ? `${pct(top.points / totalPoints)} of everything subtracted` : `${pct(top.share)} of everything recorded`}. ${top.meta.meaning}`,
      );
      if (clientPoints != null && clientMeasuredTicks > 0) {
        narrative.push(
          `On the client's own score line, ${clientPoints.toFixed(1)} ${plural(Math.round(clientPoints), 'point')} came off across ${clientMeasuredTicks} ${plural(clientMeasuredTicks, 'tick')} — an average of ${(clientPoints / clientMeasuredTicks).toFixed(2)} per penalised tick, against a ceiling of 5.0.`,
        );
      }
      if (measuredTicks < totalOccurrences) {
        narrative.push(
          `${totalOccurrences - measuredTicks} of those ${plural(totalOccurrences - measuredTicks, 'occurrence')} came from samples written before schema 3.6.0, which carried reason keys without magnitudes — they are counted here but contribute no points.`,
        );
      }
    } else {
      narrative.push(
        `The most frequent was “${top.meta.label}” (\`${top.meta.key}\`), in ${top.occurrences} ${plural(top.occurrences, 'tick')} — ${pct(top.share)} of everything recorded. ${top.meta.meaning}`,
      );
      narrative.push(
        'These samples predate schema 3.6.0, so they name the reasons without saying what each one cost; the ranking above is by how often a reason fired, not by its measured weight.',
      );
    }

    if (groups.length > 1) {
      const lead = groups[0];
      narrative.push(
        lead.pointShare != null
          ? `Trouble was concentrated in ${lead.label.toLowerCase()} (${pct(lead.pointShare)} of all points subtracted).`
          : `Trouble was concentrated in ${lead.label.toLowerCase()} (${pct(lead.share)} of all reasons).`,
      );
    }

    const heaviest = [...reasons].sort((a, b) => b.meta.maxPenalty - a.meta.maxPenalty)[0];
    if (heaviest && heaviest.meta.key !== top.meta.key && heaviest.meta.maxPenalty >= 2) {
      narrative.push(
        `The heaviest penalty present was “${heaviest.meta.label}”, which can subtract up to ${heaviest.meta.maxPenalty.toFixed(1)} points on its own` +
          (heaviest.points != null ? `; here it took ${heaviest.points.toFixed(1)}.` : '.'),
      );
    }
  }

  return {
    average,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    band: average != null ? scoreBand(average) : null,
    sampleCount: values.length,
    belowGoodTicks,
    badTicks,
    reasons,
    groups,
    totalOccurrences,
    measured,
    totalPoints,
    clientPoints,
    clientMeasuredTicks,
    unknownKeys: reasons.filter((r) => !isKnownScoreReason(r.meta.key)).map((r) => r.meta.key),
    narrative,
  };
}
