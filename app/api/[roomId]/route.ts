import { NextResponse } from 'next/server';
import { listObjectsDeep } from '@/lib/s3';

/**
 * Never prerendered.
 *
 * A route handler with no dynamic segment can be evaluated at build time, which
 * in a container image would bake the *build machine's* view of the bucket into
 * the image — normally an empty list, since the build has no credentials. Every
 * response here depends on storage as it is right now.
 */
export const dynamic = 'force-dynamic';

// GET /api/:roomId — list calls with their most recently modified timestamp
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  try {
    const objects = await listObjectsDeep(`${roomId}/`);

    // Group by second path segment (callId), track max LastModified
    const callMap = new Map<string, number>();
    for (const { key, lastModified } of objects) {
      const callId = key.split('/')[1];
      if (!callId) continue;
      const ts = lastModified?.getTime() ?? 0;
      callMap.set(callId, Math.max(callMap.get(callId) ?? 0, ts));
    }

    const calls = Array.from(callMap.entries())
      .map(([id, lastModified]) => ({ id, lastModified: lastModified || undefined }))
      .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));

    return NextResponse.json({ success: true, calls });
  } catch (err) {
    console.error('[api/roomId]', err);
    return NextResponse.json({ success: false, calls: [] }, { status: 500 });
  }
}
