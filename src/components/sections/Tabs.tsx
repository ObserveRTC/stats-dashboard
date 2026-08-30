'use client';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface TabDef {
  /** Stable key, also used in the aria wiring. */
  id: string;
  label: string;
  /** Small count or status shown beside the label. */
  badge?: string | number;
  /** Rendered lazily — the panel is only mounted once its tab is first opened. */
  render: () => ReactNode;
}

interface TabsProps {
  tabs: TabDef[];
  /** id of the tab open on first render. Defaults to the first one. */
  defaultTabId?: string;
  /** Accessible name for the tab strip. */
  label?: string;
}

/**
 * A tab strip with roving focus.
 *
 * Panels mount lazily and stay mounted once opened, so switching back to a tab
 * does not re-run its charts' layout work — d3 renders here are not cheap.
 */
export function Tabs({ tabs, defaultTabId, label = 'Sections' }: TabsProps) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(() => defaultTabId ?? tabs[0]?.id);
  // Panels are mounted on first visit and kept, so returning to a tab is instant.
  const [mounted, setMounted] = useState<Set<string>>(
    () => new Set(activeId ? [activeId] : []),
  );
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const select = useCallback((id: string) => {
    setActiveId(id);
    setMounted((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const delta =
        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      let next: number | null = null;
      if (delta !== 0) next = (index + delta + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next == null) return;

      event.preventDefault();
      const target = tabs[next];
      select(target.id);
      tabRefs.current.get(target.id)?.focus();
    },
    [tabs, select],
  );

  if (tabs.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.tablist} role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) tabRefs.current.set(tab.id, node);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              {tab.label}
              {tab.badge != null && tab.badge !== '' && (
                <span className={styles.badge}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        if (!mounted.has(tab.id)) return null;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={!isActive}
            className={styles.panel}
          >
            {tab.render()}
          </div>
        );
      })}
    </div>
  );
}
