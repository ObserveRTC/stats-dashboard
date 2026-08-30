'use client';
import { create } from 'zustand';
import type { ClientSample } from '../schema/ClientSample.ts';
import type { ClockOffsetMode, PaneEntry } from '../api/types.ts';
import { extractDisplayName } from '../utils/statsProcessor.ts';

interface EntityRef {
  paneKey: string;
  anchorId: string;
  clientId: string;
}

interface EntityIndex {
  client: Map<string, { paneKey: string }>;
  producer: Map<string, EntityRef>;
  consumer: Map<string, EntityRef>;
  transport: Map<string, EntityRef>;
}

interface PaneState {
  panes: Map<string, PaneEntry>;
  entityIndex: EntityIndex;

  addPane: (key: string, statsData: ClientSample[] | null, statsUrl?: string | null) => void;
  removePane: (key: string) => void;
  updatePane: (key: string, statsData: ClientSample[] | null) => void;
  setClockOffset: (key: string, offsetMs: number, mode?: ClockOffsetMode) => void;
  clearAll: () => void;

  registerEntity: (kind: keyof EntityIndex, id: string, ref: EntityRef | { paneKey: string }) => void;
  removePaneFromIndexes: (paneKey: string) => void;
}

import { PANE_COLORS } from '../constants.ts';

function freshEntityIndex(): EntityIndex {
  return {
    client: new Map(),
    producer: new Map(),
    consumer: new Map(),
    transport: new Map(),
  };
}

export const usePaneStore = create<PaneState>((set, get) => ({
  panes: new Map(),
  entityIndex: freshEntityIndex(),

  addPane: (key, statsData, statsUrl) =>
    set((state) => {
      const panes = new Map(state.panes);
      const displayName = extractDisplayName(statsData);
      if (!panes.has(key)) {
        const color = PANE_COLORS[panes.size % PANE_COLORS.length];
        panes.set(key, { color, statsData, displayName, statsUrl });
      } else {
        const existing = panes.get(key)!;
        panes.set(key, {
          ...existing,
          statsData,
          displayName: displayName ?? existing.displayName,
          statsUrl: statsUrl ?? existing.statsUrl,
        });
      }
      return { panes };
    }),

  removePane: (key) =>
    set((state) => {
      const panes = new Map(state.panes);
      panes.delete(key);
      get().removePaneFromIndexes(key);
      return { panes };
    }),

  updatePane: (key, statsData) =>
    set((state) => {
      const panes = new Map(state.panes);
      const existing = panes.get(key);
      if (existing) {
        panes.set(key, { ...existing, statsData });
      }
      return { panes };
    }),

  setClockOffset: (key, offsetMs, mode = 'manual') =>
    set((state) => {
      const panes = new Map(state.panes);
      const existing = panes.get(key);
      if (existing) {
        panes.set(key, { ...existing, clockOffsetMs: offsetMs, clockOffsetMode: mode });
      }
      return { panes };
    }),

  clearAll: () =>
    set({
      panes: new Map(),
      entityIndex: freshEntityIndex(),
    }),

  registerEntity: (kind, id, ref) =>
    set((state) => {
      const entityIndex = { ...state.entityIndex };
      const map = new Map(entityIndex[kind]);
      map.set(id, ref as EntityRef);
      entityIndex[kind] = map as never;
      return { entityIndex };
    }),

  removePaneFromIndexes: (paneKey) =>
    set((state) => {
      const entityIndex = { ...state.entityIndex };
      for (const kind of ['client', 'producer', 'consumer', 'transport'] as const) {
        const map = new Map(entityIndex[kind]);
        for (const [id, info] of map) {
          if (info.paneKey === paneKey) map.delete(id);
        }
        entityIndex[kind] = map as never;
      }
      return { entityIndex };
    }),
}));
