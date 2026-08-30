/**
 * Shared loader for everything that is scoped to a call rather than to one
 * client: the client list, the call summary, and the mediasoup router samples.
 *
 * Both the call dashboard and the per-client report need this. The client
 * report especially — landing directly on `/room/call/client` used to leave
 * `callStore` empty, so the client chips and the whole SFU side of the page
 * had nothing to render.
 *
 * Concurrent callers share one in-flight request per call, and a call already
 * in the store resolves immediately.
 */

import { fetchClients, fetchCallSummary, fetchRouterSample } from '../api/client.ts';
import { useCallStore } from '../stores/callStore.ts';
import { usePaneStore } from '../stores/paneStore.ts';
import { useClientLoadStore } from '../stores/clientLoadStore.ts';
import { buildCallSession } from './callModel.ts';

export interface CallContextResult {
  ok: boolean;
  /** Human-readable reason when `ok` is false. */
  error?: string;
  /** True when the call had no clients at all. */
  emptyCall?: boolean;
}

const inFlight = new Map<string, Promise<CallContextResult>>();

function cacheKeyOf(roomId: string, callId: string): string {
  return `${roomId}/${callId}`;
}

/**
 * Fetch a call's context into the store.
 *
 * Deliberately takes no `AbortSignal`. This runs once per call and is shared by
 * every caller waiting on it, so a signal here would be one caller's — and the
 * first caller unmounting would kill the load for everyone else. What a caller
 * can abandon is its own *wait*; see `ensureCallContext`.
 *
 * The cost of that choice is a load that keeps running after the last waiter
 * left, which is the cheap direction: it finishes into the store, and the next
 * mount finds the call already cached instead of starting over.
 */
async function load(roomId: string, callId: string): Promise<CallContextResult> {
  const key = cacheKeyOf(roomId, callId);

  // The listing and the summary are independent: either can be missing, and
  // each knows something the other does not. The listing is authoritative for
  // which clients and routers actually have files; the summary is where the
  // display names and the call-level aggregates live.
  const [clientsRes, summaryRes] = await Promise.all([
    fetchClients(roomId, callId),
    fetchCallSummary(roomId, callId),
  ]);

  // The listing knows every `call-summary-<sfuId>.json` object that exists,
  // including one whose contents could not be parsed — so it is the better
  // answer for "how many SFUs was this call on", and is folded in.
  // Recorded even when the summary is missing: the raw browser is often the
  // fastest way to find out *why* it is missing.
  useCallStore.getState().setObjectNames(clientsRes.objectNames ?? []);

  const summary = summaryRes.success ? summaryRes.summary : null;
  if (summary) {
    const sfuIds = [...new Set([...(summary.sfuIds ?? []), ...(clientsRes.sfuIds ?? [])])].sort();
    useCallStore
      .getState()
      .setCallSummary(sfuIds.length ? { ...summary, sfuIds } : summary);
  }

  if (!clientsRes.success || clientsRes.clients.length === 0) {
    return { ok: false, emptyCall: true, error: 'No clients found for this call.' };
  }

  // Display names only exist in the summary; fold them into the listing so the
  // client chips and every label downstream read one enriched list.
  const enriched = {
    ...clientsRes,
    clients: clientsRes.clients.map((c) => ({
      ...c,
      displayName: c.displayName ?? summary?.clients?.[c.clientId]?.displayName,
    })),
  };
  useCallStore.getState().setCallSession(buildCallSession(enriched));

  // Router ids from both sources. The listing reflects what is actually stored,
  // the summary may name routers whose sample was never written — try both and
  // let the per-router fetch decide.
  const routerIds = Array.from(
    new Set([...(clientsRes.routerIds ?? []), ...(summary?.routerIds ?? [])]),
  );

  await Promise.all(
    routerIds.map(async (rid) => {
      const routerRes = await fetchRouterSample(roomId, callId, rid);
      if (routerRes.success && routerRes.router) {
        useCallStore.getState().addRouterSample(rid, routerRes.router);
      }
    }),
  );

  useCallStore.getState().setCacheKey(key);
  return { ok: true };
}

/** Resolves `{ok:false, error:'aborted'}` when the caller's signal fires. */
function abortedWhenSignalled(signal: AbortSignal): Promise<CallContextResult> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve({ ok: false, error: 'aborted' });
      return;
    }
    signal.addEventListener('abort', () => resolve({ ok: false, error: 'aborted' }), {
      once: true,
    });
  });
}

/**
 * Make sure `callStore` holds the client list, summary and router samples for
 * this call. Resolves immediately when they are already cached.
 *
 * `signal` abandons **this caller's wait** and nothing else. The load itself is
 * shared and runs to completion.
 *
 * That distinction is the whole point of this function, and getting it wrong is
 * what made the call page come up empty on first open: the shared promise used
 * to be created with the first caller's signal, so React's development
 * double-invoke — mount, unmount, mount — aborted the load during the first
 * mount's cleanup, and the second mount then awaited a promise that was already
 * doomed. It resolved "aborted", nothing reached the store, and the page
 * rendered "No data found" until a manual refresh started over.
 */
export function ensureCallContext(
  roomId: string,
  callId: string,
  signal?: AbortSignal,
): Promise<CallContextResult> {
  if (!roomId || !callId) return Promise.resolve({ ok: false, error: 'Missing room or call id.' });

  const key = cacheKeyOf(roomId, callId);
  if (useCallStore.getState().cacheKey === key) return Promise.resolve({ ok: true });

  let shared = inFlight.get(key);
  if (!shared) {
    shared = load(roomId, callId)
      .catch((err: unknown): CallContextResult => {
        if ((err as Error)?.name === 'AbortError') return { ok: false, error: 'aborted' };
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to load call.' };
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, shared);
  }

  if (!signal) return shared;
  return Promise.race([shared, abortedWhenSignalled(signal)]);
}

/**
 * Drop cached call state when moving to a different call. Safe to call on
 * every navigation — it no-ops while the call id is unchanged.
 */
export function resetCallContextIfChanged(roomId: string, callId: string): void {
  const key = cacheKeyOf(roomId, callId);
  const current = useCallStore.getState().cacheKey;
  if (current && current !== key) {
    useCallStore.getState().clearCall();
    usePaneStore.getState().clearAll();
    // The dashboard's per-client metrics are derived from panes that
    // just went away, so they go with them rather than describing a call
    // nobody is looking at any more.
    useClientLoadStore.getState().clear();
  }
}
