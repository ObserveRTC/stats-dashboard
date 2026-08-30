'use client';
import { create } from 'zustand';
import type { CallEntry } from '../api/types.ts';

interface CallListState {
  cacheKey: string;
  calls: CallEntry[];
  loading: boolean;

  setCalls: (calls: CallEntry[]) => void;
  setLoading: (loading: boolean) => void;
  setCacheKey: (key: string) => void;
  clearCallData: () => void;
}

export const useCallListStore = create<CallListState>((set) => ({
  cacheKey: '',
  calls: [],
  loading: false,

  setCalls: (calls) => set({ calls }),
  setLoading: (loading) => set({ loading }),
  setCacheKey: (key) => set({ cacheKey: key }),
  clearCallData: () => set({ cacheKey: '', calls: [], loading: false }),
}));
