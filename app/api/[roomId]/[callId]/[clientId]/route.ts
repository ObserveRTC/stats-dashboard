import { NextResponse } from 'next/server';
import { clientStreamKey, clientStreamPath, presignGet, storageConfig } from '@/lib/s3';

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
 * GET /api/:roomId/:callId/:clientId
 *
 * Where to fetch this client's `.jsonl` from. Two answers, one shape:
 *
 *   presigned (default)        a short-lived URL straight to storage. The bytes
 *                              never pass through this server, which is why it
 *                              is the default — but the *browser* has to be able
 *                              to resolve the storage host (S3_PUBLIC_ENDPOINT).
 *   S3_PROXY_STREAMS=true      a same-origin path to the `raw` route beside this
 *                              one. This server reads storage and pipes it, so
 *                              storage needs no public name at all.
 *
 * Both come back as `signedUrl`, and the caller just fetches it — a relative URL
 * resolves against the page's origin, so nothing downstream has to know which
 * mode is on. The field name is now a slight lie in proxy mode; renaming it is a
 * breaking change to a response shape for no behavioural gain.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string; clientId: string }> },
) {
  const { roomId, callId, clientId } = await params;
  try {
    const key = clientStreamKey(roomId, callId, clientId);

    if (!key) return NextResponse.json({ stats: [] }, { status: 400 });

    if (storageConfig().proxyStreams) {
      return NextResponse.json({
        stats: [{ id: clientId, signedUrl: clientStreamPath(roomId, callId, clientId) }],
      });
    }

    const signedUrl = await presignGet(key);
    return NextResponse.json({ stats: [{ id: clientId, signedUrl }] });
  } catch (err) {
    console.error('[api/clientId]', err);
    return NextResponse.json({ stats: [] }, { status: 500 });
  }
}
