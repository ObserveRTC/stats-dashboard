'use client';
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { CopyCsvButton } from './CopyCsvButton.tsx';
import { CopyMetricsCsvButton } from './CopyMetricsCsvButton.tsx';
import type { CsvRow } from '../../utils/csvExport.ts';
import { ScreenshotButton } from './ScreenshotButton.tsx';
import { InfoIcon } from '../help/InfoIcon.tsx';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
  title: ReactNode;
  id?: string;
  /** Hash prefix that identifies children nested inside this section (e.g. "producer/" for a section with id="producers") */
  hashPrefix?: string;
  count?: number;
  defaultOpen?: boolean;
  className?: string;
  onExpand?: () => void;
  /** Optional content rendered between the header and the collapsible body (e.g. a filter input). Only visible when the section is open. */
  filterContent?: ReactNode;
  /** Compact CSV of this section's charted metrics, copied to the clipboard. */
  getCsv?: () => string | null;
  /**
   * The section's underlying samples, copied to the clipboard as CSV.
   *
   * Distinct from `getCsv` on purpose: that one is the charted metrics in a
   * compact shape for pasting into a message, this one is every field the
   * browser reported, for pasting into a spreadsheet. Gathered on click, since
   * a series can run to thousands of rows and most sections are never exported.
   */
  getCsvRows?: () => CsvRow[] | null | undefined;
  /** Hover text for the CSV icon, naming what the copy will contain. */
  csvTitle?: string;
  /** Optional controls rendered in the section header (e.g. bulk actions). */
  headerActions?: ReactNode;
  /**
   * Help topic id, rendered as an `i` beside the title.
   *
   * Sits outside the toggle button rather than inside it: a button inside a
   * button is invalid HTML, and nesting one would make the help icon toggle
   * the section instead of explaining it. An id with no registry entry renders
   * nothing, so a section without an explanation simply has no icon.
   */
  help?: string;
  /**
   * Bump this number to open the section and bring it on screen.
   *
   * For the case where something *else* on the page selects into this section
   * — clicking a point on the quality chart parks the score-reasons browser on
   * that sample, which is no use while the browser is collapsed further down
   * the page. The hash mechanism above does the same job for permalinks, but
   * it rewrites the URL and always scrolls; this does neither unless it has to.
   *
   * A number rather than a boolean because the interesting event is "reveal
   * again", and a boolean that is already true cannot express it.
   */
  revealToken?: number;
  children: ReactNode;
}

function copyPermalink(id: string) {
  const url = new URL(window.location.href);
  url.hash = id;
  navigator.clipboard.writeText(url.toString()).catch(() => {
    // Fallback: update the URL bar so the user can copy manually
    window.location.hash = id;
  });
}

export function CollapsibleSection({
  title,
  id,
  hashPrefix,
  count,
  defaultOpen = false,
  className,
  onExpand,
  filterContent,
  getCsv,
  getCsvRows,
  csvTitle,
  headerActions,
  revealToken,
  help,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hasRendered, setHasRendered] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const openSection = useCallback(() => {
    setOpen(true);
    setHasRendered(true);
    onExpand?.();
  }, [onExpand]);

  useEffect(() => {
    if (!id) return;

    const matchesHash = (hash: string) => {
      if (hash === id) return true;
      if (hash.startsWith(`${id}/`)) return true;
      if (hashPrefix && hash.startsWith(hashPrefix)) return true;
      return false;
    };

    const navigateToHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;
      if (matchesHash(hash)) {
        openSection();
        requestAnimationFrame(() => {
          setTimeout(() => {
            const target = document.getElementById(hash) ?? sectionRef.current;
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        });
      }
    };

    navigateToHash();
    window.addEventListener('hashchange', navigateToHash);
    return () => window.removeEventListener('hashchange', navigateToHash);
  }, [id, hashPrefix, openSection]);

  // Reveal on demand. The initial value is not an event — acting on it would
  // force every section carrying the prop open on mount — so the first run is
  // skipped and only subsequent changes count.
  const revealedOnce = useRef(false);
  useEffect(() => {
    if (revealToken == null) return;
    if (!revealedOnce.current) {
      revealedOnce.current = true;
      return;
    }
    openSection();

    // After the open, so the section has its full height when we measure. Only
    // scrolls when it is actually out of the way: re-scrolling a section the
    // viewer is already reading yanks the page out from under them.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const element = sectionRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const offScreen = rect.top < 0 || rect.top > window.innerHeight - 120;
        if (!offScreen) return;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }, 50);
    });
  }, [revealToken, openSection]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      if (!hasRendered) setHasRendered(true);
      if (onExpand) onExpand();
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    copyPermalink(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div ref={sectionRef} id={id} className={`${styles.section} ${className ?? ''}`}>
      <div className={styles.header}>
        <button
          className={styles.toggle}
          onClick={handleToggle}
          aria-expanded={open}
        >
          <span className={styles.titleRow}>
            <svg
              className={open ? styles.chevronOpen : styles.chevron}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            <span className={styles.title}>
              {title}
            </span>
            {count != null && count > 0 && <span className={styles.count}>{count}</span>}
          </span>
        </button>
        {help && <InfoIcon topic={help} />}
        {hasRendered && open && filterContent}
        {headerActions}
        {getCsv && <CopyCsvButton getText={getCsv} />}
        {getCsvRows && <CopyMetricsCsvButton getRows={getCsvRows} title={csvTitle} />}
        <ScreenshotButton targetRef={sectionRef} className={styles.linkBtn} />
        {id && (
          <button
            className={`${styles.linkBtn} ${copied ? styles.linkBtnCopied : ''}`}
            title="Copy permalink"
            onClick={handleCopyLink}
          >
            {copied ? (
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 005.656 5.656l3-3a4 4 0 00-.225-5.865z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hasRendered && (
        <div className={styles.content} style={open ? undefined : { display: 'none' }}>
          {children}
        </div>
      )}
    </div>
  );
}
