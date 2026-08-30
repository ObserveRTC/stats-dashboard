'use client';
import type { MediasoupTransportSample } from '../../schema/MediasoupRouter.ts';
import styles from './TransportTimeline.module.css';

const ICE_COLORS: Record<string, string> = {
  new: '#94a3b8',
  connected: '#22c55e',
  completed: '#14b8a6',
  disconnected: '#f59e0b',
  closed: '#ef4444',
};

const DTLS_COLORS: Record<string, string> = {
  new: '#94a3b8',
  connecting: '#a78bfa',
  connected: '#3b82f6',
  failed: '#ef4444',
  closed: '#64748b',
};

type HistoryItem = { type: string; timestamp: number };

function extractStateSegments(
  history: HistoryItem[],
  prefix: string,
  colorMap: Record<string, string>,
  start: number,
  end: number,
): Array<{ state: string; from: number; to: number; color: string }> {
  const relevant = history
    .filter((h) => h.type.startsWith(prefix))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (relevant.length === 0) return [];

  const segments: Array<{ state: string; from: number; to: number; color: string }> = [];
  for (let i = 0; i < relevant.length; i++) {
    const item = relevant[i];
    const state = item.type.replace(prefix, '');
    const from = item.timestamp;
    const to = i + 1 < relevant.length ? relevant[i + 1].timestamp : end;
    segments.push({ state, from, to, color: colorMap[state] ?? '#94a3b8' });
  }
  return segments;
}

interface Props {
  transport: MediasoupTransportSample & { type: 'webrtc'; history: HistoryItem[] };
}

export function TransportTimeline({ transport }: Props) {
  const history = (transport.history ?? []) as HistoryItem[];
  const start = transport.createdAt;
  const end = transport.closedAt ?? Date.now();
  const span = end - start || 1;

  const iceSegments = extractStateSegments(history, 'icestate-changed-to-', ICE_COLORS, start, end);
  const dtlsSegments = extractStateSegments(history, 'dtlsstate-changed-to-', DTLS_COLORS, start, end);

  if (iceSegments.length === 0 && dtlsSegments.length === 0) return null;

  const pct = (t: number) => `${((t - start) / span) * 100}%`;
  const width = (from: number, to: number) => `${((to - from) / span) * 100}%`;

  return (
    <div className={styles.wrap}>
      {iceSegments.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>ICE</span>
          <div className={styles.track}>
            {iceSegments.map((seg, i) => (
              <div
                key={i}
                className={styles.segment}
                style={{ left: pct(seg.from), width: width(seg.from, seg.to), background: seg.color }}
                title={`ICE: ${seg.state}\n${new Date(seg.from).toLocaleTimeString()} → ${new Date(seg.to).toLocaleTimeString()}`}
              />
            ))}
          </div>
          <div className={styles.states}>
            {iceSegments.map((seg, i) => (
              <span key={i} className={styles.statePill} style={{ color: seg.color }}>{seg.state}</span>
            ))}
          </div>
        </div>
      )}
      {dtlsSegments.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>DTLS</span>
          <div className={styles.track}>
            {dtlsSegments.map((seg, i) => (
              <div
                key={i}
                className={styles.segment}
                style={{ left: pct(seg.from), width: width(seg.from, seg.to), background: seg.color }}
                title={`DTLS: ${seg.state}\n${new Date(seg.from).toLocaleTimeString()} → ${new Date(seg.to).toLocaleTimeString()}`}
              />
            ))}
          </div>
          <div className={styles.states}>
            {dtlsSegments.map((seg, i) => (
              <span key={i} className={styles.statePill} style={{ color: seg.color }}>{seg.state}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
