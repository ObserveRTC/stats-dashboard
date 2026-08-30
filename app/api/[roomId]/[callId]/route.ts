import { NextResponse } from 'next/server';
import { listObjects } from '@/lib/s3';
import { isCallSummaryName, sfuIdFromSummaryName } from '@/schema/CallSummary';

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
 * GET /api/:roomId/:callId
 *
 * Everything that lives in a call folder, split by what it is:
 *
 *   <roomId>/<callId>/<clientId>.jsonl                   → clients
 *   <roomId>/<callId>/mediasoup-router-<routerId>.json   → routerIds
 *   <roomId>/<callId>/call-summary.json                  → (served separately)
 *   <roomId>/<callId>/call-summary-<sfuId>.json          → sfuIds, one per SFU
 *
 * Router ids come from the listing rather than only from the call summaries, so
 * the SFU view still works when they are missing, still being written, or do
 * not list every router.
 *
 * Every `call-summary*` object is excluded from `clients` by name, not by exact
 * match: a call spread across SFUs writes one summary per SFU, and matching
 * only the bare `call-summary.json` would turn each of the others into a
 * phantom client with an SFU id for a client id.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string; callId: string }> },
) {
  const { roomId, callId } = await params;
  try {
    const objects = await listObjects(`${roomId}/${callId}/`);

    const clients: { clientId: string; lastModified?: number }[] = [];
    const routerIds: string[] = [];
    const sfuIds = new Set<string>();
    // Exact object names, so the raw browser lists what the folder really
    // holds rather than reconstructing filenames from ids and guessing whether
    // an un-suffixed `call-summary.json` is among them.
    const objectNames: string[] = [];

    for (const { key, lastModified } of objects) {
      const name = key.split('/').at(-1);
      if (!name) continue;

      if (name.startsWith(ROUTER_PREFIX) && name.endsWith('.json')) {
        routerIds.push(name.slice(ROUTER_PREFIX.length, -'.json'.length));
        objectNames.push(name);
        continue;
      }
      if (isCallSummaryName(name)) {
        const sfuId = sfuIdFromSummaryName(name);
        if (sfuId) sfuIds.add(sfuId);
        objectNames.push(name);
        continue;
      }

      const clientId = name.replace(/\.(jsonl|json)$/, '');
      if (!clientId) continue;
      clients.push({ clientId, lastModified: lastModified?.getTime() });
    }

    clients.sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
    routerIds.sort();

    return NextResponse.json({
      success: true,
      clients,
      routerIds,
      sfuIds: [...sfuIds].sort(),
      // Summaries first, then routers, each alphabetical — the order a reader
      // wants to work down: what the call was, then what each router did.
      objectNames: objectNames.sort((a, b) => {
        const aSummary = isCallSummaryName(a);
        const bSummary = isCallSummaryName(b);
        if (aSummary !== bSummary) return aSummary ? -1 : 1;
        return a.localeCompare(b);
      }),
    });
  } catch (err) {
    console.error('[api/roomId/callId]', err);
    return NextResponse.json(
      { success: false, clients: [], routerIds: [], sfuIds: [], objectNames: [] },
      { status: 500 },
    );
  }
}
