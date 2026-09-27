import { NextResponse } from 'next/server';
import { clientStreamKey, getObjectStream, storageConfig } from '@/lib/s3';

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
 * GET /api/:roomId/:callId/:clientId/raw
 *
 * The client's `.jsonl`, streamed through this server.
 *
 * The sibling route (`/api/:roomId/:callId/:clientId`) normally answers with a
 * presigned URL and the browser fetches storage directly — which is the right
 * default, since these streams are large and this process has better things to
 * do with its bandwidth. This endpoint is the other half of `S3_PROXY_STREAMS`,
 * for deployments where storage has no name the browser can reach: it is the
 * URL that route hands out when proxying is on.
 *
 * It exists unconditionally rather than behind the flag, because a reader that
 * already holds a proxied URL should keep working across a restart with the flag
 * off — the flag decides what is *advertised*, not what is permitted. What
 * bounds it instead is `S3_PREFIX` and the segment check above: nothing outside
 * the configured folder is reachable through here.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string; clientId: string }> },
) {
  const { roomId, callId, clientId } = await params;
  // Shared with the route that hands out this URL, so the two cannot disagree
  // about which ids are acceptable or what the object is called. A refusal here
  // is 400 rather than 404: a different statement from "looked and found nothing".
  const key = clientStreamKey(roomId, callId, clientId);

  if (!key) {
    return NextResponse.json({ success: false, error: 'Not a readable object.' }, { status: 400 });
  }

  try {
    const object = await getObjectStream(key);

    return new Response(object.body, {
      headers: {
        // The app's own JSONL, whatever storage happens to have recorded as the
        // type: MinIO and S3 will both hand back application/octet-stream for an
        // object uploaded without one.
        'content-type': 'application/x-ndjson; charset=utf-8',
        ...(object.contentLength !== undefined && { 'content-length': String(object.contentLength) }),
        ...(object.etag && { etag: object.etag }),
        ...(object.lastModified && { 'last-modified': object.lastModified.toUTCString() }),
        // A stored session never changes, so it is worth caching — but `private`,
        // because this is served from an origin that may sit behind a shared
        // proxy and the object itself is not public.
        'cache-control': 'private, max-age=300',
      },
    });
  } catch (err) {
    // A 404 is an ordinary state here — a client that never sent a sample has no
    // object — so it is not logged. Anything else is worth a line, with the
    // resolved prefix, since a permission error looks identical from the browser.
    const name = (err as { name?: string })?.name;

    if (name !== 'NoSuchKey' && name !== 'NotFound') {
      console.error('[api/clientId/raw] %s (prefix %s):', key, storageConfig().prefix || '(root)', err);
    }

    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }
}
