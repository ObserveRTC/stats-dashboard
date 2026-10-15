import { NextResponse } from 'next/server';
import { readCallSummary } from '@/lib/callSummaryStore';

/**
 * Never prerendered.
 *
 * A route handler with no dynamic segment can be evaluated at build time, which
 * in a container image would bake the *build machine's* view of the bucket into
 * the image — normally an empty list, since the build has no credentials. Every
 * response here depends on storage as it is right now.
 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/:roomId/:callId/call-summary
 *
 * One call's summary, merged across however many SFUs saw it.
 *
 * The listing, reading and merging live in `lib/callSummaryStore.ts`, so this
 * file reads as the HTTP wrapper it is: a call's summary is not one object, and
 * which objects it is made of is a storage question rather than a routing one.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string }> },
) {
  const { roomId, callId } = await params;

  let read;
  try {
    read = await readCallSummary(roomId, callId);
  } catch (err) {
    console.error('[api/call-summary] %s/%s failed:', roomId, callId, err);
    return NextResponse.json({ success: false, summary: null }, { status: 500 });
  }

  // A call still running has no summary yet. That is a real state, not an error.
  if (!read) return NextResponse.json({ success: false, summary: null }, { status: 404 });

  const { summary, unreadable } = read;

  if (unreadable > 0) {
    console.warn('[api/call-summary] %s/%s: %d summaries unreadable', roomId, callId, unreadable);
  }

  return NextResponse.json({
    success: true,
    // `missingSources` is carried on the summary itself, not just the envelope,
    // so every reader of a stored summary can tell a complete merge from a
    // short one.
    summary: unreadable > 0 ? { ...summary, missingSources: unreadable } : summary,
    partial: unreadable > 0 ? unreadable : undefined,
  });
}
