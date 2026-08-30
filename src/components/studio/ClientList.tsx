'use client';
import { useCallback, useState } from 'react';
import type { CallSession } from '../../api/types.ts';
import { formatHMS } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { usePaneStore } from '../../stores/paneStore.ts';
import { useCallStore } from '../../stores/callStore.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './ClientList.module.css';

interface ClientListProps {
  session: CallSession;
  onLoadSamples: (clientId: string) => void;
  onDownloadSamples: (clientId: string) => Promise<void>;
}

export function ClientList({ session, onLoadSamples, onDownloadSamples }: ClientListProps) {
  const tz = useTimezoneTick();
  const panes = usePaneStore((s) => s.panes);
  const callSummary = useCallStore((s) => s.callSummary);
  const { clientSessions } = session;
  const [downloading, setDownloading] = useState<string | null>(null);


  const entries = Array.from(clientSessions.entries()).sort((a, b) => {
    const aFirst = a[1].joined ?? Infinity;
    const bFirst = b[1].joined ?? Infinity;
    return aFirst - bFirst;
  });

  const clientLabelMap = session._clientLabelMap || new Map<string, string>();

  const handleCopy = useCallback((cid: string) => {
    navigator.clipboard.writeText(cid);
  }, []);

  const handleDownload = useCallback(async (e: React.MouseEvent, cid: string) => {
    e.stopPropagation();
    setDownloading(cid);
    try {
      await onDownloadSamples(cid);
    } finally {
      setDownloading(null);
    }
  }, [onDownloadSamples]);

  if (entries.length === 0) return null;

  return (
    <CollapsibleSection title="Clients" count={entries.length} defaultOpen>
      {entries.map(([cid, clientSession], idx) => {
        const timelineLabel = clientLabelMap.get(cid) || `C${idx + 1}`;
        const isDownloading = downloading === cid;

        // Prefer stats-derived name (stored in the pane), then the name recorded in
        // call-summary.json, then the API-provided session name.
        const resolvedName =
          panes.get(cid)?.displayName ||
          callSummary?.clients?.[cid]?.displayName ||
          clientSession.displayName ||
          null;
        const isLoaded = panes.has(cid);

        return (
          <div
            key={cid}
            id={`client-row-${cid}`}
            className={styles.row}
            onClick={() => onLoadSamples(cid)}
          >
            <div className={styles.info}>
              <div className={styles.nameRow}>
                {isLoaded && <span className={styles.loadedDot} title="Samples loaded" />}
                <span className={styles.timelineLabel}>{timelineLabel}</span>
                {resolvedName && (
                  <span className={styles.displayName}>{resolvedName}</span>
                )}
                <IdBadge value={cid} />
              </div>
              <div className={styles.journey}>
                <span className={styles.stint}>
                  <span>{formatHMS(clientSession.joined, tz)} – {formatHMS(clientSession.left, tz)}</span>
                </span>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.smallBtn}
                onClick={(e) => { e.stopPropagation(); handleCopy(cid); }}
              >
                Copy ID
              </button>
              <button
                className={styles.smallBtn}
                disabled={isDownloading}
                onClick={(e) => handleDownload(e, cid)}
              >
                {isDownloading ? '…' : '↓ Download'}
              </button>
              <button
                className={styles.loadBtn}
                onClick={(e) => { e.stopPropagation(); onLoadSamples(cid); }}
              >
                Load Samples
              </button>
            </div>
          </div>
        );
      })}
    </CollapsibleSection>
  );
}
