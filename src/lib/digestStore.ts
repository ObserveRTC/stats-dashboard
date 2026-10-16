/**
 * Reading saved digests out of the digest root. **Server only.**
 *
 * Three documents, one GET each, at the keys the digest server writes:
 *
 *   digests/calls/<callId>.json
 *   digests/daily-summaries/<yyyy-mm-dd>.json
 *   digests/monthly-summaries/<yyyy-mm>.json
 *
 * ## The dashboard reads; it does not produce
 *
 * Nothing here counts calls, folds days or computes a check. An earlier design
 * had a path that did, for a period nothing had digested yet, and it was a
 * mistake twice over: two implementations of every figure with no way to keep
 * them agreeing, and the page that reports a slow system became the slowest
 * page to load. A period with no summary reports exactly that, and the fix is
 * upstream.
 *
 * That is also why this module is thin to the point of looking pointless. Its
 * whole job is to turn "an object may or may not be there, and may or may not
 * be a document this build understands" into one of five states the UI can
 * render differently. The validation lives in `src/digest/server.ts`.
 */

import { getDigestJson } from './s3.ts';
import {
  parseCallDigest,
  parsePeriodSummary,
  type ReadResult,
} from '../digest/server.ts';
import type { CallDigest, PeriodSummary } from '../digest/types.ts';

const callKey = (callId: string) => `calls/${callId}.json`;
const dayKey = (day: string) => `daily-summaries/${day}.json`;
const monthKey = (month: string) => `monthly-summaries/${month}.json`;

/**
 * A path segment that cannot escape the digest root.
 *
 * These ids arrive from a URL, so this is a boundary and not a formality.
 * `getDigestJson` prefixes but does not normalize, so a `..` segment would
 * otherwise reach outside the root this deployment is confined to.
 */
function isSafeId(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    !value.includes('/') &&
    !value.includes('\\') &&
    value !== '.' &&
    value !== '..' &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

/**
 * Read one object and hand it to a parser.
 *
 * A read that throws becomes `failed` rather than propagating. Storage being
 * unreachable and a digest being absent are different things on screen — one
 * is worth a retry button and the other is not — and an exception here would
 * collapse them into the same 500.
 */
async function read<T>(
  key: string,
  parse: (raw: unknown) => ReadResult<T>,
): Promise<ReadResult<T>> {
  let raw: unknown;
  try {
    raw = await getDigestJson(key);
  } catch (err) {
    // getDigestJson throws on an object that exists and does not parse, which
    // is `invalid`, not `failed`: there is something there and it is wrong.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not valid JSON')) {
      return { state: 'invalid', reason: message };
    }
    console.error('[digest] read failed: %s', message);
    return { state: 'failed', reason: message };
  }
  return parse(raw);
}

export function loadCallDigest(callId: string): Promise<ReadResult<CallDigest>> {
  if (!isSafeId(callId)) {
    return Promise.resolve({ state: 'invalid', reason: 'callId is not a single safe path segment' });
  }
  return read(callKey(callId), parseCallDigest);
}

export function loadDaySummary(day: string): Promise<ReadResult<PeriodSummary>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return Promise.resolve({ state: 'invalid', reason: 'day must be YYYY-MM-DD' });
  }
  return read(dayKey(day), parsePeriodSummary);
}

export function loadMonthSummary(month: string): Promise<ReadResult<PeriodSummary>> {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return Promise.resolve({ state: 'invalid', reason: 'month must be YYYY-MM' });
  }
  return read(monthKey(month), parsePeriodSummary);
}

export function loadPeriodSummary(
  period: 'day' | 'month',
  id: string,
): Promise<ReadResult<PeriodSummary>> {
  return period === 'day' ? loadDaySummary(id) : loadMonthSummary(id);
}

/**
 * The reporting day for a moment, UTC.
 *
 * Exported so a route and a component agree on "today" without either doing
 * date arithmetic. UTC because the contract's reporting day is UTC: a browser
 * in UTC+13 asking for its own "today" would otherwise be handed a day the
 * processor has not folded yet, and read the absence as a quiet day.
 */
export const reportingDay = (at: number | Date = Date.now()): string =>
  new Date(at).toISOString().slice(0, 10);

export const reportingMonth = (at: number | Date = Date.now()): string =>
  new Date(at).toISOString().slice(0, 7);
