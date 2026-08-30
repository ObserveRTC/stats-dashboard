'use client';
import { useRouter } from 'next/navigation';
import { useCallStore } from '../../stores/callStore.ts';
import { usePaneStore } from '../../stores/paneStore.ts';
import styles from './ClientBar.module.css';

interface ClientBarProps {
  roomId: string;
  callId: string;
  currentClientId: string;
  /** Display name extracted from the currently loaded client's stats attachments. */
  displayName?: string | null;
}

export function ClientBar({ roomId, callId, currentClientId, displayName }: ClientBarProps) {
  const router = useRouter();
  const { callSession, callSummary } = useCallStore();
  const { panes } = usePaneStore();

  // Merge session display names with the stats-derived name for the current client
  const clients: { id: string; name: string | null; shortId: string }[] = [];

  if (callSession?.clientSessions) {
    for (const [id, session] of callSession.clientSessions) {
      // Prefer the stats-derived name from the pane (already extracted & cached),
      // then the name recorded in call-summary.json, then the API-provided session name.
      const statsName = panes.get(id)?.displayName;
      const summaryName = callSummary?.clients?.[id]?.displayName;
      const name =
        statsName ||
        (id === currentClientId ? displayName : null) ||
        summaryName ||
        session.displayName ||
        null;
      clients.push({ id, name, shortId: id.slice(0, 8) });
    }
  }

  if (clients.length <= 1) return null;

  const handleClick = (cid: string) => {
    if (cid === currentClientId) return;
    router.push(`/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/${encodeURIComponent(cid)}`);
  };

  return (
    <div className={styles.bar}>
      <span className={styles.label}>Clients</span>
      <div className={styles.chips}>
        {clients.map(({ id, name, shortId }) => {
          const isCurrent = id === currentClientId;
          const isLoaded = panes.has(id);
          return (
            <button
              key={id}
              className={`${styles.chip} ${isCurrent ? styles.active : ''} ${isLoaded && !isCurrent ? styles.loaded : ''}`}
              onClick={() => handleClick(id)}
              title={id}
            >
              {isLoaded && <span className={styles.loadedDot} />}
              {name ? (
                <>
                  <span className={styles.chipName}>{name}</span>
                  <span className={styles.chipId}>{shortId}</span>
                </>
              ) : (
                <span className={styles.chipName}>{shortId}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
