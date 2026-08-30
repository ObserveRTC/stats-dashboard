import { NextResponse } from 'next/server';
import { s3Client, bucketName, listObjects } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  isCallSummaryName,
  mergeCallSummaries,
  normalizeCallSummary,
  sfuIdFromSummaryName,
  type CallSummaryPart,
} from '@/schema/CallSummary';

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
 * A call can be spread across several SFUs, and the observer sits on each one,
 * so the call folder holds one summary per SFU:
 *
 *   <roomId>/<callId>/call-summary.json            ← single-SFU, or legacy
 *   <roomId>/<callId>/call-summary-<sfuId>.json    ← one per SFU
 *
 * No single object is the call. This lists the folder, reads every summary in
 * it, and merges them into the one shape the dashboard consumes (see
 * `schema/CallSummary.ts`). Normalizing and merging here rather than in the
 * browser keeps every consumer on one shape and one merge policy.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string }> },
) {
  const { roomId, callId } = await params;
  const prefix = `${roomId}/${callId}/`;

  let keys: string[];
  try {
    keys = (await listObjects(prefix))
      .map((o) => o.key)
      .filter((key) => isCallSummaryName(key.split('/').at(-1) ?? ''))
      // `call-summary.json` first, then per-SFU parts alphabetically, so the
      // merge order — and therefore `sources` — is stable across requests.
      .sort();
  } catch (err) {
    console.error('[api/call-summary] listing %s failed:', prefix, err);
    return NextResponse.json({ success: false, summary: null }, { status: 500 });
  }

  // A call still running has no summary yet. That is a real state, not an error.
  if (keys.length === 0) return NextResponse.json({ success: false, summary: null }, { status: 404 });

  const parts: CallSummaryPart[] = [];
  let unreadable = 0;

  await Promise.all(
    keys.map(async (key) => {
      const name = key.split('/').at(-1) ?? '';
      try {
        const obj = await s3Client().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
        const text = await obj.Body?.transformToString();
        if (!text) {
          unreadable += 1;
          return;
        }
        const summary = normalizeCallSummary(JSON.parse(text));
        if (!summary) {
          console.warn('[api/call-summary] %s is not an object', key);
          unreadable += 1;
          return;
        }
        parts.push({ summary, key: name, sfuId: sfuIdFromSummaryName(name) });
      } catch (err) {
        // One bad part must not lose the rest of the call: a partial write on
        // one SFU is exactly the case where the other SFUs' summaries matter.
        if (err instanceof SyntaxError) {
          console.warn('[api/call-summary] %s is not valid JSON: %s', key, err.message);
        } else {
          console.warn('[api/call-summary] %s could not be read:', key, err);
        }
        unreadable += 1;
      }
    }),
  );

  if (parts.length === 0) {
    return NextResponse.json({ success: false, summary: null }, { status: unreadable > 0 ? 422 : 404 });
  }

  // Promise.all resolves out of order; sort back to the listing order so
  // `sources` reads the same way every time.
  parts.sort((a, b) => (a.key ?? '').localeCompare(b.key ?? ''));

  const merged = mergeCallSummaries(parts);
  if (unreadable > 0) {
    console.warn(
      '[api/call-summary] %s merged %d of %d summaries',
      prefix,
      parts.length,
      parts.length + unreadable,
    );
  }

  // Carried on the summary itself, not just the envelope, so every reader of a
  // stored summary can tell a complete merge from a short one.
  const summary =
    merged && unreadable > 0 ? { ...merged, missingSources: unreadable } : merged;

  return NextResponse.json({ success: true, summary, partial: unreadable > 0 ? unreadable : undefined });
}
