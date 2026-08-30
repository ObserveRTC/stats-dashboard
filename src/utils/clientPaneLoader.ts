/**
 * Fetch one client's `.jsonl` stats and put them in the pane store.
 *
 * Extracted from the client report page because the consumer→producer compare
 * needs to load a *different* client's stats on demand, and the search for
 * which client owns a producer may have to walk several of them.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import { fetchClientStats, fetchSignedUrl } from '../api/client.ts';
import { usePaneStore } from '../stores/paneStore.ts';

export type DecompressFn = (jsonl: string) => Promise<ClientSample[]>;

/**
 * Load `clientId` into the pane store unless it is already there.
 * Returns false when the client has no stats object, or the fetch was aborted.
 */
export async function loadClientPane(
  roomId: string,
  callId: string,
  clientId: string,
  decompress: DecompressFn,
  signal?: AbortSignal,
): Promise<boolean> {
  if (usePaneStore.getState().panes.has(clientId)) return true;

  const statsRes = await fetchClientStats(roomId, callId, clientId, signal);
  if (signal?.aborted) return false;
  if (!statsRes.stats || statsRes.stats.length === 0) return false;

  const statsRef = statsRes.stats[0];
  const statsJsonl = await fetchSignedUrl(statsRef.signedUrl, signal);
  if (signal?.aborted || !statsJsonl) return false;

  let statsData: ClientSample[] | null = null;
  try {
    statsData = await decompress(statsJsonl);
  } catch (err) {
    console.warn('[clientPaneLoader] Failed to decompress stats for', clientId, err);
  }

  if (signal?.aborted) return false;
  usePaneStore.getState().addPane(clientId, statsData, statsRef.signedUrl);
  return true;
}
