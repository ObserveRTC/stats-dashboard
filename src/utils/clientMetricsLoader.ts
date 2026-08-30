/**
 * Loading one client's stats from the call dashboard, without leaving it.
 *
 * The Load button on a client row does exactly what opening that
 * client's report would do — fetch the `.jsonl`, decompress it, run
 * `processWebRTCStats` — and then stops, deriving the handful of numbers the
 * dashboard shows instead of rendering a page. The expensive half is shared:
 * the samples land in `paneStore`, so the report page afterwards has nothing
 * left to fetch.
 *
 * Loads run in parallel and independently. What makes that safe is the
 * in-flight map below: two clicks on the same row, or a "Load all" while one
 * row is already loading, join the request that is running rather than
 * starting a second fetch of the same object.
 */

import { usePaneStore } from '../stores/paneStore.ts';
import { useClientLoadStore } from '../stores/clientLoadStore.ts';
import { loadClientPane, type DecompressFn } from './clientPaneLoader.ts';
import { processWebRTCStats } from './statsProcessor.ts';
import { buildClientMetrics } from './clientMetrics.ts';

const inFlight = new Map<string, Promise<void>>();

function keyOf(roomId: string, callId: string, clientId: string): string {
  return `${roomId}/${callId}/${clientId}`;
}

/**
 * Derive and store the metrics for a client whose samples are already in
 * the pane store. Separate from the fetch so a client opened on the report
 * page first — and therefore already cached — can be filled in without a
 * network round trip.
 */
function deriveFromCache(clientId: string): boolean {
  const pane = usePaneStore.getState().panes.get(clientId);
  if (!pane) return false;

  const samples = pane.statsData;
  if (!samples || samples.length === 0) {
    useClientLoadStore.getState().markEmpty(clientId);
    return true;
  }

  const processed = processWebRTCStats(samples);
  useClientLoadStore.getState().succeed(clientId, buildClientMetrics(processed, samples));
  return true;
}

/**
 * Load `clientId` into the pane store and record its dashboard metrics.
 *
 * Resolves when the row has settled — loaded, empty or errored — never
 * rejects, because a failed row is a row that says so, not a failed page.
 * Deliberately takes no `AbortSignal`: the load is worth finishing even if the
 * viewer navigates away, since finishing it is what makes the report page
 * instant.
 */
export function loadClientMetrics(
  roomId: string,
  callId: string,
  clientId: string,
  decompress: DecompressFn,
): Promise<void> {
  const key = keyOf(roomId, callId, clientId);
  const running = inFlight.get(key);
  if (running) return running;

  const store = useClientLoadStore.getState();
  const existing = store.entries.get(clientId);
  if (existing && (existing.status === 'loaded' || existing.status === 'empty')) {
    return Promise.resolve();
  }

  store.begin(clientId);

  const task = (async () => {
    try {
      // Already in the pane store — the report page loaded it earlier in the
      // session. Nothing to fetch; only the derivation is missing.
      if (deriveFromCache(clientId)) return;

      const ok = await loadClientPane(roomId, callId, clientId, decompress);
      if (!ok) {
        useClientLoadStore.getState().markEmpty(clientId);
        return;
      }
      if (!deriveFromCache(clientId)) {
        useClientLoadStore.getState().markEmpty(clientId);
      }
    } catch (err) {
      useClientLoadStore
        .getState()
        .fail(clientId, err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
  return task;
}

/**
 * Load several clients at once.
 *
 * `Promise.all` over `loadClientMetrics`, which never rejects — so one
 * client whose object is missing does not cancel the rest, and the caller
 * gets one promise that settles when every row has.
 */
export function loadManyClientMetrics(
  roomId: string,
  callId: string,
  clientIds: string[],
  decompress: DecompressFn,
): Promise<void> {
  return Promise.all(
    clientIds.map((clientId) => loadClientMetrics(roomId, callId, clientId, decompress)),
  ).then(() => undefined);
}
