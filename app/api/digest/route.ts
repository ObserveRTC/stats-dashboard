import { NextResponse } from 'next/server';
import { announceStorageConfig } from '@/lib/s3';
import { loadDayDigest, loadMonthDigest } from '@/lib/digestStore';
import { digestDay, isDigestDay, isDigestMonth } from '@/schema/Digest';

/**
 * Never prerendered.
 *
 * A route handler with no dynamic segment can be evaluated at build time, which
 * in a container image would bake the *build machine's* view of the bucket into
 * the image — normally an empty digest, since the build has no credentials.
 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/digest?day=YYYY-MM-DD
 * GET /api/digest?month=YYYY-MM
 *
 * One period's digest, read from the digest root. Defaults to today.
 *
 * `doc` is null when nothing has been written for the period — a normal state,
 * not an error, and not something this endpoint tries to work around by
 * counting calls itself. The dashboard reads digests; producing them is
 * upstream.
 *
 * `day` and `month` are validated by round-tripping through `Date`, not by
 * pattern, so `2026-02-31` is a 400 rather than a read of a key that cannot
 * exist. An unparseable parameter is refused rather than silently replaced with
 * today: a dashboard that answers a different question from the one asked is
 * worse than one that says the question was wrong.
 */
export async function GET(request: Request) {
  announceStorageConfig();

  const params = new URL(request.url).searchParams;
  const day = params.get('day');
  const month = params.get('month');

  if (day != null && month != null) {
    return bad('ask for either a day or a month, not both');
  }
  if (month != null && !isDigestMonth(month)) return bad('month must be YYYY-MM');

  const wantedDay = month == null ? (day ?? digestDay(Date.now())) : null;
  if (wantedDay != null && !isDigestDay(wantedDay)) return bad('day must be YYYY-MM-DD');

  try {
    const result =
      month != null ? await loadMonthDigest(month) : await loadDayDigest(wantedDay as string);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    // Storage being unreachable is the one thing that reaches here: a missing
    // digest and an unparseable one are both handled above as the ordinary
    // states they are.
    console.error('[api/digest] %s failed:', month ?? wantedDay, err);
    return NextResponse.json(
      { success: false, error: 'the digest could not be read from storage' },
      { status: 500 },
    );
  }
}

function bad(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}
