'use client';
import { create } from 'zustand';
import type { ClientMetrics } from '../utils/clientMetrics.ts';

/**
 * Per-client load state for the call dashboard.
 *
 * The samples themselves live in `paneStore` — this holds only the *derived*
 * numbers plus what the row needs to show a spinner or an error, so a
 * client loaded here is a client the report page already has cached.
 *
 * Keyed by client id, and every entry is independent: several clients
 * load at once and each row settles on its own.
 */
export type ClientLoadStatus = 'idle' | 'loading' | 'loaded' | 'error' | 'empty';

export interface ClientLoadEntry {
  status: ClientLoadStatus;
  metrics?: ClientMetrics;
  /** Set when `status` is `error`. */
  error?: string;
}

interface ClientState {
  /** Which call these entries belong to, so a different call starts clean. */
  cacheKey: string;
  entries: Map<string, ClientLoadEntry>;

  begin: (clientId: string) => void;
  succeed: (clientId: string, metrics: ClientMetrics) => void;
  /** The client has no stats object at all — a distinct outcome from failure. */
  markEmpty: (clientId: string) => void;
  fail: (clientId: string, error: string) => void;
  /** Drop everything unless `key` is already the current call. */
  resetFor: (key: string) => void;
  clear: () => void;
}

function withEntry(
  entries: Map<string, ClientLoadEntry>,
  clientId: string,
  entry: ClientLoadEntry,
): Map<string, ClientLoadEntry> {
  const next = new Map(entries);
  next.set(clientId, entry);
  return next;
}

export const useClientLoadStore = create<ClientState>((set) => ({
  cacheKey: '',
  entries: new Map(),

  begin: (clientId) =>
    set((s) => ({ entries: withEntry(s.entries, clientId, { status: 'loading' }) })),
  succeed: (clientId, metrics) =>
    set((s) => ({ entries: withEntry(s.entries, clientId, { status: 'loaded', metrics }) })),
  markEmpty: (clientId) =>
    set((s) => ({ entries: withEntry(s.entries, clientId, { status: 'empty' }) })),
  fail: (clientId, error) =>
    set((s) => ({ entries: withEntry(s.entries, clientId, { status: 'error', error }) })),

  resetFor: (key) =>
    set((s) => (s.cacheKey === key ? {} : { cacheKey: key, entries: new Map() })),
  clear: () => set({ cacheKey: '', entries: new Map() }),
}));
