'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { JsonTree } from './JsonTree.tsx';
import { formatDateTime } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import styles from './SampleBrowser.module.css';

const VISIBLE = 10;

interface SampleBrowserProps {
  samples: ClientSample[];
  statsUrl?: string | null;
  clientId: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export function SampleBrowser({ samples, statsUrl, clientId }: SampleBrowserProps) {
  const tz = useTimezoneTick();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [windowStart, setWindowStart] = useState(0);
  const total = samples.length;

  const select = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, total - 1));
    setSelectedIdx(clamped);
    setWindowStart((prev) => {
      if (clamped < prev) return clamped;
      if (clamped >= prev + VISIBLE) return clamped - VISIBLE + 1;
      return prev;
    });
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); select(selectedIdx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); select(selectedIdx + 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIdx, select]);

  const handleDownload = useCallback(() => {
    if (!statsUrl) return;
    const a = document.createElement('a');
    a.href = statsUrl;
    a.download = `${clientId}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [statsUrl, clientId]);

  const visibleSamples = samples.slice(windowStart, Math.min(windowStart + VISIBLE, total));
  const selected = samples[selectedIdx];

  return (
    <CollapsibleSection title="Sample Browser" id="sample-browser"
      help="client/sample-browser" count={total} defaultOpen={false}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <button
          className={styles.navBtn}
          onClick={() => select(selectedIdx - 1)}
          disabled={selectedIdx === 0}
          title="Previous sample (←)"
        >‹</button>

        <div className={styles.timeline}>
          {visibleSamples.map((s, i) => {
            const absIdx = windowStart + i;
            const isSelected = absIdx === selectedIdx;
            return (
              <button
                key={absIdx}
                className={`${styles.tick} ${isSelected ? styles.tickSelected : ''}`}
                onClick={() => select(absIdx)}
                title={formatDateTime(s.timestamp, tz)}
              >
                {formatTime(s.timestamp)}
              </button>
            );
          })}
        </div>

        <button
          className={styles.navBtn}
          onClick={() => select(selectedIdx + 1)}
          disabled={selectedIdx >= total - 1}
          title="Next sample (→)"
        >›</button>

        {statsUrl && (
          <button className={styles.downloadBtn} onClick={handleDownload}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1v7M3 6l3 3 3-3M1 11h10"/>
            </svg>
            Download JSONL
          </button>
        )}
      </div>

      {/* ── Scrubber ── */}
      <div className={styles.scrubberWrap}>
        <input
          type="range"
          className={styles.scrubber}
          min={0}
          max={total - 1}
          step={1}
          value={selectedIdx}
          onChange={(e) => select(Number(e.target.value))}
          title={selected ? formatDateTime(selected.timestamp, tz) : ''}
          style={{ '--pct': `${(selectedIdx / Math.max(total - 1, 1)) * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* ── Status bar ── */}
      <div className={styles.statusBar}>
        <span className={styles.counter}>{selectedIdx + 1} / {total}</span>
        <span className={styles.tsLabel}>{selected ? formatDateTime(selected.timestamp, tz) : ''}</span>
      </div>

      {/* ── JSON viewer ── */}
      {selected && (
        <div className={styles.jsonPanel}>
          <div className={styles.jsonHeader}>
            <span className={styles.jsonTitle}>
              <span className={styles.jsonIcon}>{'{}'}</span>
              Sample JSON
            </span>
            <span className={styles.jsonBadge}>{formatDateTime(selected.timestamp, tz)}</span>
          </div>
          <div className={styles.jsonBody}>
            <JsonTree data={selected} defaultOpen={true} isLast={true} />
          </div>
        </div>
      )}

    </CollapsibleSection>
  );
}
