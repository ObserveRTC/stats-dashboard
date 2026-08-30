import { NextResponse } from 'next/server';
import { s3Client, bucketName } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { isCallSummaryName } from '@/schema/CallSummary';

/**
 * Never prerendered.
 *
 * A route handler with no dynamic segment can be evaluated at build time, which
 * in a container image would bake the *build machine's* view of the bucket into
 * the image — normally an empty list, since the build has no credentials. Every
 * response here depends on storage as it is right now.
 */
export const dynamic = 'force-dynamic';

const ROUTER_PREFIX = 'mediasoup-router-';

/**
 * Is this a call-scoped object the browser is allowed to read?
 *
 * The name arrives from the URL, so this is a security boundary, not a tidy-up:
 * without it a crafted name could walk out of the call folder and hand back any
 * object in the bucket. Two rules, both deliberately narrow — an allowlist of
 * shapes rather than a denylist of tricks:
 *
 *   1. No path separators and no dots-only segments, so nothing can traverse.
 *   2. The basename must be one this dashboard writes about: a call summary, or
 *      a router sample. Client `.jsonl` streams are excluded on purpose — they
 *      are large and already served through their own presigned URL.
 */
function isBrowsableObject(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  if (isCallSummaryName(name)) return true;
  return name.startsWith(ROUTER_PREFIX) && name.endsWith('.json');
}

/**
 * GET /api/:roomId/:callId/object/:name
 *
 * The raw JSON of one object in a call folder, for the samples browser on the
 * call page. Raw on purpose: the merged `call-summary` endpoint answers "what
 * was this call", and this one answers "what did *this file* actually say",
 * which is the question you ask when the merge looks wrong.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string; name: string }> },
) {
  const { roomId, callId, name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  if (!isBrowsableObject(name)) {
    return NextResponse.json({ success: false, error: 'Not a browsable object.' }, { status: 400 });
  }

  const key = `${roomId}/${callId}/${name}`;
  try {
    const obj = await s3Client().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
    const text = await obj.Body?.transformToString();
    if (!text) return NextResponse.json({ success: false, error: 'Empty object.' }, { status: 404 });

    // Parsed here rather than in the browser so a corrupt object is reported as
    // corrupt, with its name, instead of throwing inside a render.
    try {
      return NextResponse.json({ success: true, name, size: text.length, data: JSON.parse(text) });
    } catch (err) {
      console.warn('[api/object] %s is not valid JSON: %s', key, (err as Error).message);
      return NextResponse.json(
        { success: false, name, error: 'The object is not valid JSON.' },
        { status: 422 },
      );
    }
  } catch {
    return NextResponse.json({ success: false, name, error: 'Not found.' }, { status: 404 });
  }
}
