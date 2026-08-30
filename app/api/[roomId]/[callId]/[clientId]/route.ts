import { NextResponse } from 'next/server';
import { presignGet } from '@/lib/s3';

/**
 * Never prerendered.
 *
 * A route handler with no dynamic segment can be evaluated at build time, which
 * in a container image would bake the *build machine's* view of the bucket into
 * the image — normally an empty list, since the build has no credentials. Every
 * response here depends on storage as it is right now.
 */
export const dynamic = 'force-dynamic';

// GET /api/:roomId/:callId/:clientId
// Returns a short-lived presigned URL the browser uses to fetch the .jsonl directly from storage.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string; clientId: string }> },
) {
  const { roomId, callId, clientId } = await params;
  try {
    const key = `${roomId}/${callId}/${clientId}.jsonl`;
    const signedUrl = await presignGet(key);
    return NextResponse.json({ stats: [{ id: clientId, signedUrl }] });
  } catch (err) {
    console.error('[api/clientId]', err);
    return NextResponse.json({ stats: [] }, { status: 500 });
  }
}
