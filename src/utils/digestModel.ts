/**
 * Reading a digest: validating one, folding a month out of its days, and
 * turning either into something a panel can render.
 *
 *   `rollUpMonth`  day documents  -> a month document
 *   `digestView`   a document     -> labels, colours, formatted values
 *
 * The dashboard does not build digests. Something else writes them — see
 * `docs/storage-layout.md` for the shape it has to write — and everything here
 * takes a `DigestDocument` as given. That is why there is no code in this
 * repository that turns a `CallSummary` into a digest row: a second
 * implementation of the arithmetic is a second answer to every question, and
 * the one that renders is the one that would be wrong.
 *
 * `rollUpMonth` is the one exception, and it only ever reads digests. A month's
 * own roll-up object is written after its days, so there is a window — longer
 * after a backfill — where the days exist and the month does not. Folding them
 * here keeps the month view alive through that window. It adds up day documents
 * and never touches a call.
 *
 * ## What may be added up
 *
 * Periods aggregate unevenly, and pretending otherwise is how a roll-up ends up
 * lying:
 *
 *   - **Counts add.** Calls, joins, issues, TURN users, call time.
 *   - **Peaks do not.** Two calls peaking at four participants each were not
 *     eight people at once unless they overlapped, which nothing records. A
 *     month therefore takes the **maximum** of its days' busiest calls, which
 *     is the same statement one level up.
 *   - **Scores average only by weight.** A quiet day and a busy one are not
 *     equal evidence, so a month's score is `Σ(score × weight) / Σ(weight)`
 *     over its days. `totals.scoreWeight` exists precisely so this is possible
 *     without re-reading a single call. Days carrying no score are excluded
 *     rather than counted as zero, which would drag a month down for the sin of
 *     containing a day nothing could be scored.
 */

import {
  DIGEST_VERSION,
  daysInMonth,
  digestDay,
  type DigestCall,
  type DigestDocument,
  type DigestTotals,
} from '../schema/Digest.ts';
import { qualityColor, POOR_SCORE_THRESHOLD } from './dashboardModel.ts';

/** How many calls a period keeps in its "look here first" list. */
export const WORST_LIMIT = 5;

/* ── month ─────────────────────────────────────────────── */

/** The lowest-scoring calls, worst first, limited. */
function worstOf(calls: readonly DigestCall[], limit = WORST_LIMIT): DigestCall[] {
  return calls
    .filter((c) => c.score != null && c.score < POOR_SCORE_THRESHOLD + 1.5)
    .sort((a, b) => (a.score as number) - (b.score as number))
    .slice(0, limit);
}

/**
 * One month, folded from the day digests that exist.
 *
 * Days that are absent are simply absent: a month missing the 7th reports the
 * other days and a zero bucket on the 7th, rather than refusing to exist.
 * Withholding the month until every day is in would hide a whole month because
 * of one gap.
 *
 * Days belonging to another month are ignored rather than folded in, because a
 * listing is not a promise and an object filed under the wrong key must not
 * silently join a total it does not belong to.
 *
 * Idempotent and order-independent: the month is built from its days rather
 * than added to, so re-folding the same set — in any order — gives the same
 * document.
 *
 * `calls` is deliberately not carried (see `schema/Digest.ts`); the month keeps
 * the worst of its days' worst lists. That is an approximation, and a bounded
 * one: a call bad enough to matter is in its own day's worst list, so the only
 * calls a month can miss are ones that were not among the five worst of their
 * own day — which by construction were not the worst of the month either.
 */
export function rollUpMonth(
  days: readonly DigestDocument[],
  month: string,
  options: { generatedAt?: number } = {},
): DigestDocument {
  const own = days.filter((d) => d.period === 'day' && d.id.startsWith(`${month}-`));

  const totals: DigestTotals = {
    calls: 0,
    joins: 0,
    busiestCall: null,
    issues: 0,
    turnClients: 0,
    callTimeMs: 0,
    score: null,
    scoreWeight: 0,
  };

  let weighted = 0;
  const buckets = Array.from({ length: daysInMonth(month) }, () => 0);

  for (const day of own) {
    totals.calls += day.totals.calls;
    totals.joins += day.totals.joins;
    totals.issues += day.totals.issues;
    totals.turnClients += day.totals.turnClients;
    totals.callTimeMs += day.totals.callTimeMs;

    if (day.totals.busiestCall != null) {
      totals.busiestCall = Math.max(totals.busiestCall ?? 0, day.totals.busiestCall);
    }
    if (day.totals.score != null && day.totals.scoreWeight > 0) {
      weighted += day.totals.score * day.totals.scoreWeight;
      totals.scoreWeight += day.totals.scoreWeight;
    }

    // Day-of-month, from the id rather than from a Date: the id is already the
    // UTC day, and parsing it to re-derive what it says invites a timezone bug.
    const dayOfMonth = Number.parseInt(day.id.slice(8, 10), 10);
    if (dayOfMonth >= 1 && dayOfMonth <= buckets.length) {
      buckets[dayOfMonth - 1] = (buckets[dayOfMonth - 1] ?? 0) + day.totals.calls;
    }
  }

  totals.score = totals.scoreWeight > 0 ? weighted / totals.scoreWeight : null;

  return {
    version: DIGEST_VERSION,
    period: 'month',
    id: month,
    generatedAt: options.generatedAt ?? Date.now(),
    totals,
    buckets,
    worst: worstOf(own.flatMap((d) => d.worst)),
  };
}

/* ── view ──────────────────────────────────────────────── */

export interface DigestStat {
  key: string;
  label: string;
  value: string;
  unit?: string;
  color?: string;
  /**
   * A help-topic id, for the `i` beside the label. Present only where the
   * figure needs more than a sentence — what cannot be added up, and why a
   * weighted score is not an average. The rest carry `hint` alone.
   */
  topic?: string;
  /**
   * Prose shown on hover.
   *
   * Named `hint` rather than `help` on purpose: `help:` in this codebase is a
   * key into the help-topic registry, and `scripts/help.test.ts` reads every
   * one to check it exists. A field holding prose under that name makes the
   * sentence itself look like a missing topic id.
   */
  hint?: string;
}

export interface DigestCallView extends DigestCall {
  scoreColor: string;
}

export interface DigestView {
  period: 'day' | 'month';
  id: string;
  stats: DigestStat[];
  /** The activity strip: one entry per hour of a day, or per day of a month. */
  buckets: number[];
  bucketUnit: 'hour' | 'day';
  calls: DigestCallView[] | null;
  worst: DigestCallView[];
  empty: boolean;
  generatedAt: number;
}

const DASH = '—';

export function compactDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return DASH;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function withColor(call: DigestCall): DigestCallView {
  return {
    ...call,
    scoreColor: call.score == null ? 'var(--text-muted)' : qualityColor(call.score),
  };
}

/**
 * Labels, colours and formatted values for one digest.
 *
 * All of this is built here and none of it is stored. The digest in the bucket
 * holds figures and ids only, so a wording change is a deploy rather than a
 * rewrite of every digest ever written — see the note on stored prose in
 * `schema/Digest.ts`.
 */
export function digestView(doc: DigestDocument): DigestView {
  const { totals } = doc;
  const isDay = doc.period === 'day';
  const period = isDay ? 'day' : 'month';
  const score = totals.score;

  const stats: DigestStat[] = [
    {
      key: 'calls',
      label: 'Calls',
      value: String(totals.calls),
      hint: `Calls that started in this ${period}, UTC. One that began the day before and ran past midnight belongs to the day it began.`,
    },
    {
      key: 'joins',
      label: 'Participants',
      topic: 'digest/participants',
      value: String(totals.joins),
      unit: totals.busiestCall != null ? `(busiest call ${totals.busiestCall})` : undefined,
      hint: `Total joins across the ${period}. The figure in brackets is the largest single call — per-call peaks cannot be added, because two calls peaking at the same number were not that many people at once unless they overlapped.`,
    },
    {
      key: 'quality',
      label: 'Quality',
      topic: 'digest/quality',
      value: score == null ? DASH : score.toFixed(1),
      unit: score == null ? undefined : '/5',
      color: score == null ? 'var(--text-muted)' : qualityColor(score),
      hint: `The ${period}'s score, weighted by each call's sample count so a long call counts for more than a short one. Calls whose summary carries no score are left out rather than counted as zero.`,
    },
    {
      key: 'issues',
      label: 'Issues',
      value: String(totals.issues),
      color: totals.issues > 0 ? 'var(--quality-fair)' : 'var(--quality-good)',
      hint: 'Problems the clients’ own detectors reported, summed over the period. Open a call to see which.',
    },
    {
      key: 'turn',
      label: 'TURN',
      value: String(totals.turnClients),
      hint: 'Clients whose media was relayed rather than sent directly. A cluster of these points at network policy rather than at any one person.',
    },
    {
      key: 'time',
      label: 'Call time',
      value: compactDuration(totals.callTimeMs),
      hint: 'Every call’s duration added together — not wall-clock time, since calls overlap.',
    },
  ];

  return {
    period: doc.period,
    id: doc.id,
    stats,
    buckets: doc.buckets,
    bucketUnit: isDay ? 'hour' : 'day',
    calls: doc.calls ? doc.calls.map(withColor) : null,
    worst: doc.worst.map(withColor),
    empty: totals.calls === 0,
    generatedAt: doc.generatedAt,
  };
}

/** The day before or after a `YYYY-MM-DD`, in UTC. */
export function shiftDay(day: string, days: number): string {
  // Noon rather than midnight so a day never lands on the wrong side of a
  // boundary through a rounding or leap-second surprise.
  return digestDay(new Date(`${day}T12:00:00.000Z`).getTime() + days * 86_400_000);
}
