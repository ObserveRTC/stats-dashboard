/**
 * The digest: a period already added up, and where it is kept.
 *
 *   <tenant>/<digests>/<YYYY-MM>/<YYYY-MM-DD>.json   one day
 *   <tenant>/<digests>/<YYYY-MM>.json                one month
 *
 * **Read by this dashboard, written by something else.** Whatever produces them
 * — a queue-driven worker, a scheduled job, a script somebody runs by hand —
 * lives outside this repository and is free to change. The only coupling is the
 * key layout and the document shape in this file, and `docs/storage-layout.md`
 * states both for whoever is writing them.
 *
 * Nothing here is derived at read time. Asking "what happened today" is one
 * GET, and asking "what happened in October" is one GET, and neither depends on
 * how many calls there were — that is the entire point of this root existing
 * beside the samples. There is no code in this repository that turns a
 * `CallSummary` into a digest: a second implementation of the arithmetic would
 * be a second answer to every question, and the one that renders is the one
 * that would be wrong.
 *
 * Nothing has to exist, either. A period with no digest is a normal state and
 * the dashboard reports exactly that rather than going off to count calls.
 *
 * ## The month folder, and the month object beside it
 *
 * Days live in a folder named after their month, so listing `2026-10/` says
 * which days have been digested — the natural way to find the gap after an
 * outage. The month's own roll-up sits beside that folder rather than inside
 * it, so that listing contains days and nothing else: a reader iterating a
 * month's days never has to recognise and skip a differently-shaped object in
 * the middle of them.
 *
 * The day is spelled out in full inside the month folder — `2026-10/2026-10-03.json`
 * rather than `2026-10/03.json` — so a key is self-describing in a log line or
 * a bucket browser, and so a day object moved or copied out of its folder is
 * still unambiguous.
 *
 * ## Stored numbers, not stored prose
 *
 * `DigestDocument` carries figures and ids only. No labels, no colours, no
 * formatted strings, no tooltip copy. Those belong to whatever renders it and
 * are built by `digestView` in `utils/digestModel.ts`.
 *
 * The temptation is real — writing the finished stat cards would make the page
 * trivial — and it is a trap: storage is append-only in practice, so a label
 * written into an object in October is still there next year, and changing a
 * word in a tooltip would mean rewriting every digest ever made. Worse, the two
 * producers of a period's figures would have to agree on wording as well as on
 * arithmetic.
 *
 * ## `version`, and what a reader does with it
 *
 * Bumped when a field's *meaning* changes, not when one is added. A reader
 * ignores unknown fields and treats a higher version as unreadable rather than
 * guessing, because the one thing worse than an empty digest is a confidently
 * wrong one.
 */

export const DIGEST_VERSION = 1;

/** Which period one document covers. */
export type DigestPeriodKind = 'day' | 'month';

/**
 * One call, as a digest records it.
 *
 * A flattened reading of the call's merged summary — enough to list it, rank it
 * and open it, and not a copy of the summary. The summary stays in the sample
 * root where the call page reads it; duplicating it here would double the
 * bytes, and make a digest something a retention sweep has to think about.
 */
export interface DigestCall {
  callId: string;
  /** Which room to open. A row without one is listed but not clickable. */
  roomId?: string;
  /** Call start, epoch ms. */
  startedAt?: number;
  durationMs: number | null;
  /** Clients that joined over the call. Adds across calls. */
  clients: number | null;
  /**
   * Most clients present at once in this call, or null when nobody counted.
   *
   * Stored per call, not just as the period's maximum, because the fold is
   * incremental: `totals.busiestCall` is recomputed from these rows every time
   * a call is added, and a maximum cannot be recomputed from a maximum once a
   * row changes. Keeping the peak per row is what lets a re-processed call
   * replace its old contribution exactly.
   */
  peak: number | null;
  issues: number;
  /** Clients whose media was relayed through TURN. */
  turnClients: number;
  /** The call's representative score, 1–5, or null when it carried none. */
  score: number | null;
  /** How many score samples are behind `score`. The weight, for re-rolling. */
  scoreSamples: number;
  sfuIds: string[];
}

/**
 * The period's figures.
 *
 * What adds and what does not is the substance of this type, so each field says
 * which it is. Getting it wrong is how a digest ends up lying confidently:
 * summing peaks or averaging averages both produce a plausible number.
 */
export interface DigestTotals {
  /** Calls that started in the period. Adds. */
  calls: number;
  /** Joins over the period. Adds. */
  joins: number;
  /**
   * The largest single call's peak concurrent clients, or null.
   *
   * Does **not** add: two calls that each peaked at four were not eight people
   * at once unless they overlapped, and a summary does not say whether they
   * did. Rolling a month takes the maximum of its days, which is the same
   * statement one level up.
   */
  busiestCall: number | null;
  /** Issues the clients' own detectors reported. Adds. */
  issues: number;
  /** Clients relayed through TURN. Adds. */
  turnClients: number;
  /** Every call's duration summed — not wall-clock, since calls overlap. Adds. */
  callTimeMs: number;
  /**
   * Sample-weighted mean score over the period, or null when nothing scored.
   *
   * Does not add, and does not average either: a two-minute call is not equal
   * evidence to a two-hour one. `scoreWeight` is carried beside it precisely so
   * a month can be rolled from its days without re-reading a single call —
   * `Σ(score × weight) / Σ(weight)` — which an un-weighted mean of daily means
   * could not do correctly.
   */
  score: number | null;
  /** The total weight behind `score`. Zero when `score` is null. */
  scoreWeight: number;
}

/** One digest object, exactly as stored. */
export interface DigestDocument {
  version: number;
  period: DigestPeriodKind;
  /** `YYYY-MM-DD` for a day, `YYYY-MM` for a month. */
  id: string;
  /** When this object was computed, epoch ms. */
  generatedAt: number;
  totals: DigestTotals;
  /**
   * Calls per bucket: 24 entries for a day (UTC hours), one per day of the
   * month for a month. Always the period's full length, zeros included, so a
   * renderer never has to reconstruct the axis.
   */
  buckets: number[];
  /**
   * A day's calls, newest first.
   *
   * Omitted on a month: a month's worth of calls is unbounded and nobody reads
   * a thousand rows. A month keeps `worst` and the per-day buckets, and a
   * reader wanting the rows fetches the day.
   */
  calls?: DigestCall[];
  /** The lowest-scoring calls of the period, worst first, capped. */
  worst: DigestCall[];
}

/**
 * There is deliberately no "calls I could not read" count here.
 *
 * An earlier draft had one, from when this repository also produced the
 * digests and a nightly pass read whatever it found. Now that producing them is
 * somebody else's job, a field only the producer could fill and only it could
 * define is worse than no field: the dashboard would render a number whose
 * meaning it cannot vouch for, for ever, because storage is append-only in
 * practice. If a producer needs to report incompleteness, it is better added
 * deliberately — with a version bump and a stated meaning — than inherited.
 */
const SUFFIX = '.json';

function utcDate(at: Date | number): Date {
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Not a date: ${String(at)}`);
  return date;
}

/** `YYYY-MM-DD` for an instant, in UTC. */
export function digestDay(at: Date | number): string {
  return utcDate(at).toISOString().slice(0, 10);
}

/** `YYYY-MM` for an instant, in UTC. */
export function digestMonth(at: Date | number): string {
  return utcDate(at).toISOString().slice(0, 7);
}

/** The month a `YYYY-MM-DD` belongs to. Positional, not parsed. */
export function monthOfDay(day: string): string {
  return day.slice(0, 7);
}

/**
 * `YYYY-MM-DD`, round-tripped. Shape alone is not enough: `2026-02-31` matches
 * the pattern and is not a date. Answers rather than throwing, so a stray key
 * is skipped and a bad query string is a 400 rather than a 500.
 */
export function isDigestDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** `YYYY-MM`, round-tripped, for the same reasons. */
export function isDigestMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === value;
}

/** How many days a `YYYY-MM` has. 28–31, leap years included. */
export function daysInMonth(month: string): number {
  const year = Number.parseInt(month.slice(0, 4), 10);
  const index = Number.parseInt(month.slice(5, 7), 10);
  // Day 0 of the next month is the last day of this one, which is also how
  // February gets its leap day without a rule about leap years.
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

/** The key of one day's digest, relative to the digest root. */
export function digestDayKey(day: string): string {
  return `${monthOfDay(day)}/${day}${SUFFIX}`;
}

/** The key of one month's roll-up, relative to the digest root. */
export function digestMonthKey(month: string): string {
  return `${month}${SUFFIX}`;
}

/** The folder holding one month's days, relative to the digest root. */
export function digestMonthFolder(month: string): string {
  return `${month}/`;
}

/**
 * Read a day-digest key back into its day, or null.
 *
 * Both halves are checked against each other: `2026-10/2026-11-03.json` parses
 * as a shape and is filed in the wrong month, which is a writer bug worth
 * refusing rather than quietly attributing the day to October.
 */
export function parseDigestDayKey(key: string): string | null {
  if (!key.endsWith(SUFFIX)) return null;

  const parts = key.slice(0, -SUFFIX.length).split('/');
  if (parts.length !== 2) return null;

  const [folder, day] = parts as [string, string];
  if (!isDigestMonth(folder) || !isDigestDay(day)) return null;
  if (monthOfDay(day) !== folder) return null;

  return day;
}

/**
 * Validate a stored digest, or null.
 *
 * Strict about the fields the UI does arithmetic on and forgiving about the
 * rest, because the failure modes differ: a missing `totals.calls` makes every
 * figure on the page wrong, while a missing `sfuIds` makes one column empty.
 * So the first is a rejection and the second a default.
 *
 * A document from a future version is rejected outright. Reading it
 * field-by-field would mostly work, which is the problem — "mostly" means one
 * field whose meaning changed is now being rendered as if it had not.
 */
export function normalizeDigest(raw: unknown): DigestDocument | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const doc = raw as Record<string, unknown>;

  const version = typeof doc.version === 'number' ? doc.version : 0;
  if (version !== DIGEST_VERSION) return null;

  const period = doc.period === 'day' || doc.period === 'month' ? doc.period : null;
  if (!period) return null;

  const id = typeof doc.id === 'string' ? doc.id : '';
  const idValid = period === 'day' ? isDigestDay(id) : isDigestMonth(id);
  if (!idValid) return null;

  const totals = normalizeTotals(doc.totals);
  if (!totals) return null;

  const width = period === 'day' ? 24 : daysInMonth(id);

  return {
    version,
    period,
    id,
    generatedAt: num(doc.generatedAt) ?? 0,
    totals,
    buckets: normalizeBuckets(doc.buckets, width),
    ...(Array.isArray(doc.calls) ? { calls: doc.calls.map(normalizeCall) } : {}),
    worst: Array.isArray(doc.worst) ? doc.worst.map(normalizeCall) : [],
  };
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function count(value: unknown): number {
  const n = num(value);
  return n != null && n >= 0 ? n : 0;
}

function normalizeTotals(raw: unknown): DigestTotals | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const score = num(t.score);
  return {
    calls: count(t.calls),
    joins: count(t.joins),
    busiestCall: num(t.busiestCall) ?? null,
    issues: count(t.issues),
    turnClients: count(t.turnClients),
    callTimeMs: count(t.callTimeMs),
    score: score ?? null,
    // A score with no weight behind it cannot be re-rolled, so the weight
    // defaults to 1 rather than 0: one unit of evidence, which is what an
    // un-weighted writer meant.
    scoreWeight: score == null ? 0 : (num(t.scoreWeight) ?? 1),
  };
}

/**
 * Exactly `width` buckets, whatever arrived.
 *
 * Padded and truncated rather than rejected, because the axis is presentation:
 * a document whose buckets are short is still worth rendering, and a renderer
 * that has to handle a short array handles it by drawing nothing where the data
 * should be — which looks like a quiet day rather than a bad object.
 */
function normalizeBuckets(raw: unknown, width: number): number[] {
  const source = Array.isArray(raw) ? raw : [];
  return Array.from({ length: width }, (_, i) => count(source[i]));
}

function normalizeCall(raw: unknown): DigestCall {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const roomId = typeof c.roomId === 'string' && c.roomId !== '' ? c.roomId : undefined;
  const score = num(c.score);
  return {
    callId: typeof c.callId === 'string' ? c.callId : '',
    ...(roomId ? { roomId } : {}),
    ...(num(c.startedAt) != null ? { startedAt: num(c.startedAt) } : {}),
    durationMs: num(c.durationMs) ?? null,
    clients: num(c.clients) ?? null,
    peak: num(c.peak) ?? null,
    issues: count(c.issues),
    turnClients: count(c.turnClients),
    score: score ?? null,
    scoreSamples: score == null ? 0 : (count(c.scoreSamples) || 1),
    sfuIds: Array.isArray(c.sfuIds) ? c.sfuIds.filter((s): s is string => typeof s === 'string') : [],
  };
}
