import { listObjects, getSampleJson } from './s3.ts';
import {
  isCallSummaryName,
  mergeCallSummaries,
  normalizeCallSummary,
  sfuIdFromSummaryName,
  type CallSummary,
  type CallSummaryPart,
} from '../schema/CallSummary.ts';

/**
 * Reading one call's summary out of the sample root.
 *
 * A call can be spread across several SFUs, and the observer sits on each one,
 * so the call folder holds one summary per SFU:
 *
 *   <roomId>/<callId>/call-summary.json            ← single-SFU, or legacy
 *   <roomId>/<callId>/call-summary-<sfuId>.json    ← one per SFU
 *
 * No single object is the call. This lists the folder, reads every summary in
 * it, and merges them into the one shape the dashboard consumes.
 *
 * Its own module rather than inline in the route, because listing a folder,
 * reading every part and merging them is the whole of what "a call's summary"
 * means in this codebase, and the route should read as the HTTP wrapper it is.
 */

export interface CallSummaryRead {
  summary: CallSummary;
  /** Summaries that were listed but could not be read or parsed. */
  unreadable: number;
}

/**
 * One call's merged summary, or null when the folder holds none.
 *
 * Null is a real and common state, not an error: a call still running has not
 * been summarized yet. The caller distinguishes it from a failure by the
 * absence of a throw — storage being unreachable still throws.
 */
export async function readCallSummary(
  roomId: string,
  callId: string,
): Promise<CallSummaryRead | null> {
  const prefix = `${roomId}/${callId}/`;

  const keys = (await listObjects(prefix))
    .map((o) => o.key)
    .filter((key) => isCallSummaryName(key.split('/').at(-1) ?? ''))
    // `call-summary.json` first, then per-SFU parts alphabetically, so the
    // merge order — and therefore `sources` — is stable across requests.
    .sort();

  if (keys.length === 0) return null;

  const parts: CallSummaryPart[] = [];
  let unreadable = 0;

  await Promise.all(
    keys.map(async (key) => {
      const name = key.split('/').at(-1) ?? '';
      // A half-written or malformed object is logged and counted by the storage
      // layer and arrives here as `undefined`. One bad part must not lose the
      // rest of the call: a partial write on one SFU is exactly the case where
      // the other SFUs' summaries matter.
      const raw = await getSampleJson(key);
      if (raw === undefined) {
        unreadable += 1;
        return;
      }
      const summary = normalizeCallSummary(raw);
      if (!summary) {
        console.warn('[call-summary] %s is not a summary object', key);
        unreadable += 1;
        return;
      }
      parts.push({ summary, key: name, sfuId: sfuIdFromSummaryName(name) });
    }),
  );

  if (parts.length === 0) return null;

  // Promise.all resolves out of order; sort back to the listing order so
  // `sources` reads the same way every time.
  parts.sort((a, b) => (a.key ?? '').localeCompare(b.key ?? ''));

  const merged = mergeCallSummaries(parts);
  if (!merged) return null;

  return { summary: merged, unreadable };
}
