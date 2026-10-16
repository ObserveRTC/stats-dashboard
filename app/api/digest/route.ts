import { NextResponse } from 'next/server';

import {
  loadCallDigest,
  loadPeriodSummary,
  reportingDay,
  reportingMonth,
} from '@/lib/digestStore';
import { SUPPORTED_SCHEMA_VERSION, type ReadResult } from '@/digest/server';

/**
 * Saved digests, read from the digest root.
 *
 *   GET /api/digest?day=YYYY-MM-DD      one reporting day's summary
 *   GET /api/digest?month=YYYY-MM       one month's summary
 *   GET /api/digest?callId=<uuid>       one call's digest
 *
 * Defaults to today's day summary, in UTC, which is the contract's reporting
 * day and not the viewer's.
 *
 * ## Why the read state is in the body with a 200
 *
 * A missing digest is not an HTTP error. It is the normal case for every call
 * recorded before this feature existed, and the page stays useful without one:
 * the call investigator reads the sample archive directly. Answering 404 would
 * make the browser's own error handling the arbiter of a product state, and
 * every caller would then have to special-case a 404 back into "fine, show the
 * notice".
 *
 * So the HTTP status says whether the request was answerable, and `state` says
 * what the answer was. The one case that does get a non-200 is a malformed
 * request, because that is the caller's bug and not a state of the data.
 */
export const dynamic = 'force-dynamic';

const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

/**
 * Validate by round-tripping through `Date`, not by trusting the pattern.
 *
 * `2026-02-31` and `2026-13-01` both match a reasonable regex and neither is a
 * day. Round-tripping catches them without throwing, which matters because the
 * value arrives from a URL somebody can type.
 */
function isRealDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

function isRealMonth(month: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  const parsed = new Date(`${month}-01T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === month;
}

/**
 * Flatten a `ReadResult` into the body shape the UI consumes.
 *
 * `state` is carried through verbatim rather than mapped to a boolean, because
 * the five states need five different things on screen and the UI must not have
 * to reconstruct which one it got from the absence of a value.
 */
function body<T>(result: ReadResult<T>, extra: Record<string, unknown> = {}) {
  if (result.state === 'ready') {
    return { success: true, state: 'ready' as const, document: result.value, ...extra };
  }
  return {
    success: true,
    state: result.state,
    document: null,
    ...(result.reason ? { reason: result.reason } : {}),
    ...(result.state === 'unsupported-version' ? { supportedSchemaVersion: SUPPORTED_SCHEMA_VERSION } : {}),
    ...extra,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get('day');
  const month = params.get('month');
  const callId = params.get('callId');

  const asked = [day, month, callId].filter((v) => v != null).length;
  if (asked > 1) return bad('ask for one of day, month or callId');

  try {
    if (callId != null) {
      return NextResponse.json(body(await loadCallDigest(callId), { callId }));
    }

    if (month != null) {
      if (!isRealMonth(month)) return bad('month must be YYYY-MM');
      return NextResponse.json(
        body(await loadPeriodSummary('month', month), { period: 'month', id: month }),
      );
    }

    // Defaults to today when neither is given, so the landing page needs no
    // date arithmetic of its own to ask its first question.
    const wanted = day ?? reportingDay();
    if (!isRealDay(wanted)) return bad('day must be YYYY-MM-DD');
    return NextResponse.json(
      body(await loadPeriodSummary('day', wanted), {
        period: 'day',
        id: wanted,
        isToday: wanted === reportingDay(),
        currentMonth: reportingMonth(),
      }),
    );
  } catch (err) {
    // The store turns storage failures into a `failed` state, so reaching here
    // is a bug in this route rather than a bad day for the bucket. Logged with
    // the question that caused it, and answered as a failure the UI can show
    // instead of a blank 500 page.
    console.error('[api/digest] %s', err);
    return NextResponse.json(
      { success: false, state: 'failed', document: null, error: 'the digest could not be read' },
      { status: 500 },
    );
  }
}
