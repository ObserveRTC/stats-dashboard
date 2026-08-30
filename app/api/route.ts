import { NextResponse } from 'next/server';
import { announceStorageConfig, listObjectsDeep } from '@/lib/s3';

/**
 * Never prerendered.
 *
 * A route handler with no dynamic segment can be evaluated at build time, which
 * in a container image would bake the *build machine's* view of the bucket into
 * the image — normally an empty list, since the build has no credentials. Every
 * response here depends on storage as it is right now.
 */
export const dynamic = 'force-dynamic';

// GET /api — list all rooms with their most recently modified timestamp
export async function GET() {
  announceStorageConfig();
  try {
    const objects = await listObjectsDeep('');

    // Group by first path segment (roomId), track max LastModified
    const roomMap = new Map<string, number>();
    for (const { key, lastModified } of objects) {
      const roomId = key.split('/')[0];
      if (!roomId) continue;
      const ts = lastModified?.getTime() ?? 0;
      roomMap.set(roomId, Math.max(roomMap.get(roomId) ?? 0, ts));
    }

    const rooms = Array.from(roomMap.entries())
      .map(([id, lastModified]) => ({ id, lastModified: lastModified || undefined }))
      .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));

    return NextResponse.json({ success: true, rooms });
  } catch (err) {
    console.error('[api/rooms]', err);
    return NextResponse.json({ success: false, rooms: [] }, { status: 500 });
  }
}
