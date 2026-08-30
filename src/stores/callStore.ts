'use client';
import { create } from 'zustand';
import type { CallSession, ClientSession, CallSummary, MediasoupRouterSample } from '../api/types.ts';

interface CallState {
  cacheKey: string;
  clientSessions: Map<string, ClientSession>;
  clientMap: Map<string, { statsUrl?: string }>;
  callSession: CallSession | null;
  callSummary: CallSummary | null;
  routerSamples: Map<string, MediasoupRouterSample>;
  /**
   * Basenames of the call-scoped objects in the folder, from the listing.
   *
   * The samples browser lists these rather than reconstructing filenames from
   * router and SFU ids: only the listing knows whether the folder holds an
   * un-suffixed `call-summary.json`, a per-SFU set, or both.
   */
  objectNames: string[];
  /**
   * producerId → clientId, learned as clients are opened. The SFU does not
   * always tag its producers with an owner, so this is how a consumer on one
   * client finds the client on the other end of the stream.
   */
  producerOwners: Map<string, string>;
  loading: boolean;

  setClientSessions: (sessions: Map<string, ClientSession>) => void;
  setClientMap: (map: Map<string, { statsUrl?: string }>) => void;
  setCallSession: (session: CallSession | null) => void;
  setCallSummary: (summary: CallSummary | null) => void;
  addRouterSample: (routerId: string, sample: MediasoupRouterSample) => void;
  /** Record that `clientId` produced each of `producerIds`. Existing entries win. */
  registerProducerOwners: (clientId: string, producerIds: Iterable<string>) => void;
  setLoading: (loading: boolean) => void;
  setCacheKey: (key: string) => void;
  setObjectNames: (names: string[]) => void;
  clearCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  cacheKey: '',
  clientSessions: new Map(),
  clientMap: new Map(),
  callSession: null,
  callSummary: null,
  routerSamples: new Map(),
  objectNames: [],
  producerOwners: new Map(),
  loading: false,

  setClientSessions: (sessions) => set({ clientSessions: sessions }),
  setClientMap: (map) => set({ clientMap: map }),
  setCallSession: (session) => set({ callSession: session }),
  setCallSummary: (summary) => set({ callSummary: summary }),
  setObjectNames: (names) => set({ objectNames: names }),
  addRouterSample: (routerId, sample) =>
    set((s) => ({ routerSamples: new Map(s.routerSamples).set(routerId, sample) })),
  registerProducerOwners: (clientId, producerIds) =>
    set((s) => {
      let changed = false;
      const producerOwners = new Map(s.producerOwners);
      for (const producerId of producerIds) {
        if (!producerOwners.has(producerId)) {
          producerOwners.set(producerId, clientId);
          changed = true;
        }
      }
      return changed ? { producerOwners } : {};
    }),
  setLoading: (loading) => set({ loading }),
  setCacheKey: (key) => set({ cacheKey: key }),
  clearCall: () =>
    set({
      cacheKey: '',
      clientSessions: new Map(),
      clientMap: new Map(),
      callSession: null,
      callSummary: null,
      routerSamples: new Map(),
      objectNames: [],
      producerOwners: new Map(),
    }),
}));
