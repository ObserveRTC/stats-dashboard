'use client';
import { create } from 'zustand';

/** Display timezone preference for timestamp rendering across the app. */
export type Tz = 'local' | 'utc';

interface TzState {
  tz: Tz;
  toggle: () => void;
  set: (tz: Tz) => void;
}

function persist(tz: Tz) {
  if (typeof localStorage !== 'undefined') localStorage.setItem('tz', tz);
}

export const useTimezoneStore = create<TzState>(() => ({
  tz: 'local' as Tz,
  toggle: () =>
    useTimezoneStore.setState((state) => {
      const next: Tz = state.tz === 'utc' ? 'local' : 'utc';
      persist(next);
      return { tz: next };
    }),
  set: (tz: Tz) => {
    persist(tz);
    useTimezoneStore.setState({ tz });
  },
}));

/** Subscribe a React component to the current timezone so it re-renders on toggle. */
export function useTimezoneTick(): Tz {
  return useTimezoneStore((s) => s.tz);
}
