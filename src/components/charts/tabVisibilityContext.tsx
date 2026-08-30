'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { cachedTabVisibility, type TabVisibility } from '../../utils/tabVisibility.ts';

const EMPTY: TabVisibility = {
  reported: false,
  hidden: [],
  hiddenMs: 0,
  hiddenRatio: null,
  switches: 0,
  hiddenAtStart: false,
};

const TabVisibilityContext = createContext<TabVisibility>(EMPTY);

/**
 * The viewed client's backgrounded stretches, shared with every chart under it.
 *
 * A context rather than a store, and deliberately: the compare modal lives in
 * the app layout, outside any client's subtree, so a chart pinned from another
 * client falls back to the empty default instead of being shaded with the
 * *current* client's background time. Wrong shading is worse than none — it
 * would explain away a real fault on someone else's timeline.
 */
export function TabVisibilityProvider({
  samples,
  sessionStart,
  sessionEnd,
  children,
}: {
  samples: ClientSample[] | null | undefined;
  sessionStart?: number;
  sessionEnd?: number;
  children: ReactNode;
}) {
  const value = useMemo(
    () => cachedTabVisibility(samples, { sessionStart, sessionEnd }),
    [samples, sessionStart, sessionEnd],
  );
  return <TabVisibilityContext.Provider value={value}>{children}</TabVisibilityContext.Provider>;
}

/** Backgrounded stretches for the client whose charts are being drawn. */
export function useTabVisibility(): TabVisibility {
  return useContext(TabVisibilityContext);
}
