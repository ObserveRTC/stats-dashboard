'use client';
import { useEffect, useRef, useCallback } from 'react';

import type { ClientSample } from '../schema/ClientSample.ts';
import { asClientSamples } from '../schema/clientSampleParse.ts';
import { PendingWorkerRequests } from '../utils/workerRequests.ts';

/**
 * The worker replies with the id it was given.
 *
 * That echo is the whole point of this file. Without it, concurrent callers
 * cannot tell whose reply is whose — see the note on `useStatsWorker`.
 */
const workerCode = `
self.onmessage = function(e) {
  var req = e.data || {};
  var id = req.id;
  try {
    const lines = String(req.jsonl == null ? '' : req.jsonl).split('\\n').filter(l => l.trim());
    if (lines.length === 0) { self.postMessage({ id: id, results: [] }); return; }
    let current = JSON.parse(lines[0]);
    const results = [JSON.parse(JSON.stringify(current))];
    for (let i = 1; i < lines.length; i++) {
      const patch = JSON.parse(lines[i]);
      current = applyPatch(current, patch);
      results.push(JSON.parse(JSON.stringify(current)));
    }
    self.postMessage({ id: id, results: results });
  } catch (err) {
    self.postMessage({ id: id, error: err.message });
  }
};
function applyPatch(base, patch) {
  if (patch === null || typeof patch !== 'object') return patch;
  if (Array.isArray(patch)) return patch.map((item, i) => applyPatch(Array.isArray(base) ? base[i] : undefined, item));
  const result = Array.isArray(base) ? [] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) { delete result[key]; }
    else if (typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object' && base[key] !== null) {
      result[key] = applyPatch(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
`;

/**
 * Decompress a client's patch-encoded `.jsonl` into full samples, off the main
 * thread.
 *
 * ## Why requests carry an id
 *
 * There is one worker per mount, shared by every caller, and it used to be
 * addressed with a bare `postMessage(jsonl)` plus a fresh `message` listener
 * per call. A `message` listener is not a reply channel — it fires for *every*
 * message the worker sends. So two overlapping calls both attached a listener,
 * the first reply arrived, and **both** listeners ran on it: each resolved with
 * the first client's samples and then removed itself, and the second client's
 * real reply arrived with nobody listening.
 *
 * With one client loading at a time this never showed. Loading several at once
 * — the call dashboard's "Load all", or the consumer→producer compare walking
 * clients to find a producer's owner — silently gave overlapping callers the
 * same person's stats: identical RTT, loss and issue counts on rows that should
 * differ, in pairs matching whichever loads happened to overlap. Wrong numbers,
 * confidently rendered, with nothing in the console.
 *
 * The fix is a correlation id per request and one long-lived listener holding a
 * map of what is outstanding, so a reply can only resolve the request that
 * asked for it. A reply whose id is not in the map is dropped rather than
 * guessed at.
 *
 * ## What this does not do
 *
 * The worker is single-threaded and handles one message at a time, so parallel
 * calls queue rather than run at once. That is deliberate: the expensive,
 * parallelisable part of loading a client is the fetch, and a pool of workers
 * to overlap the JSON parsing would trade real memory — every sample of every
 * client, materialised — for a saving on a step that is not the bottleneck.
 */
export function useStatsWorker(): (jsonlContent: string) => Promise<ClientSample[]> {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new PendingWorkerRequests<ClientSample[]>());

  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const pending = pendingRef.current;

    const onMessage = (e: MessageEvent) => {
      pending.settle(e.data, asClientSamples);
    };

    const onError = (event: ErrorEvent) => {
      pending.failAll(new Error(event.message || 'Stats worker error'));
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    workerRef.current = worker;

    return () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.terminate();
      workerRef.current = null;
      URL.revokeObjectURL(url);
      pending.failAll(new Error('Stats worker was torn down before the reply arrived.'));
    };
  }, []);

  const decompressStats = useCallback((jsonlContent: string): Promise<ClientSample[]> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('Stats worker is not ready yet.'));

    return new Promise<ClientSample[]>((resolve, reject) => {
      const id = pendingRef.current.open(resolve, reject);
      worker.postMessage({ id, jsonl: jsonlContent });
    });
  }, []);

  return decompressStats;
}
