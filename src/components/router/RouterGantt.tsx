'use client';
import type { MediasoupProducerSample, MediasoupConsumerSample } from '../../schema/MediasoupRouter.ts';
import styles from './RouterGantt.module.css';

const ROW_H = 16;
const LABEL_W = 140;
const MAX_H = 300;

type HistoryItem = { type: string; timestamp: number };

interface Props {
  producers: MediasoupProducerSample[];
  consumers: MediasoupConsumerSample[];
}

function dotColor(type: string): string {
  if (type.includes('pause')) return '#f97316';
  if (type.includes('resume')) return '#22c55e';
  if (type.includes('degrad')) return '#ef4444';
  return '#94a3b8';
}

export function RouterGantt({ producers, consumers }: Props) {
  const now = Date.now();
  const rows: Array<{
    id: string;
    label: string;
    kind: 'audio' | 'video';
    role: 'producer' | 'consumer';
    createdAt: number;
    closedAt: number | undefined;
    history: HistoryItem[];
  }> = [
    ...producers.map((p) => ({
      id: p.id,
      label: `${p.kind[0].toUpperCase()}P ${p.id.slice(0, 8)}`,
      kind: p.kind as 'audio' | 'video',
      role: 'producer' as const,
      createdAt: p.createdAt,
      closedAt: p.closedAt,
      history: (p.history ?? []) as HistoryItem[],
    })),
    ...consumers.map((c) => ({
      id: c.id,
      label: `${c.kind[0].toUpperCase()}C ${c.id.slice(0, 8)}`,
      kind: c.kind as 'audio' | 'video',
      role: 'consumer' as const,
      createdAt: c.createdAt,
      closedAt: c.closedAt,
      history: (c.history ?? []) as HistoryItem[],
    })),
  ];

  if (rows.length === 0) return null;

  const minT = Math.min(...rows.map((r) => r.createdAt));
  const maxT = Math.max(...rows.map((r) => r.closedAt ?? now));
  const span = maxT - minT || 1;

  const pct = (t: number) => `${((t - minT) / span) * 100}%`;

  const totalH = rows.length * (ROW_H + 4) + 24; // +24 for axis
  const scrollable = totalH > MAX_H;

  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Producer / Consumer Gantt</p>
      <div className={styles.chart} style={{ maxHeight: MAX_H, overflowY: scrollable ? 'auto' : 'visible' }}>
        <svg width="100%" height={totalH} style={{ minHeight: totalH }}>
          {/* X axis ticks */}
          {[0, 25, 50, 75, 100].map((p) => (
            <g key={p} transform={`translate(${LABEL_W + (p / 100) * (999 - LABEL_W)}, 0)`}>
              <line y1={0} y2={totalH - 20} stroke="var(--border-light)" strokeWidth={1} />
            </g>
          ))}

          {rows.map((row, i) => {
            const y = i * (ROW_H + 4);
            const barColor = row.kind === 'audio'
              ? (row.closedAt ? '#4ade80aa' : '#22c55e')
              : (row.closedAt ? '#60a5faaa' : '#3b82f6');

            return (
              <g key={row.id} transform={`translate(0, ${y})`}>
                {/* Label */}
                <text
                  x={LABEL_W - 4}
                  y={ROW_H / 2 + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {row.label}
                </text>

                {/* Bar */}
                <rect
                  x={`calc(${pct(row.createdAt)} * (100% - ${LABEL_W}px) / 100 + ${LABEL_W}px)`}
                  y={0}
                  width={`calc(${pct(row.closedAt ?? now)} * (100% - ${LABEL_W}px) / 100 - ${pct(row.createdAt)} * (100% - ${LABEL_W}px) / 100)`}
                  height={ROW_H}
                  rx={2}
                  fill={barColor}
                />

                {/* History dots */}
                {row.history.map((h, j) => (
                  <circle
                    key={j}
                    cx={`calc(${pct(h.timestamp)} * (100% - ${LABEL_W}px) / 100 + ${LABEL_W}px)`}
                    cy={ROW_H / 2}
                    r={3}
                    fill={dotColor(h.type)}
                    stroke="var(--card-bg)"
                    strokeWidth={1}
                  >
                    <title>{h.type} @ {new Date(h.timestamp).toLocaleTimeString()}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Axis labels */}
          <g transform={`translate(0, ${totalH - 18})`}>
            <text x={LABEL_W} fontSize={9} fill="var(--text-muted)">{new Date(minT).toLocaleTimeString()}</text>
            <text x="50%" textAnchor="middle" fontSize={9} fill="var(--text-muted)">{new Date((minT + maxT) / 2).toLocaleTimeString()}</text>
            <text x="100%" textAnchor="end" fontSize={9} fill="var(--text-muted)">{new Date(maxT).toLocaleTimeString()}</text>
          </g>
        </svg>
      </div>
      <div className={styles.legend}>
        <span><span className={styles.swatch} style={{ background: '#22c55e' }} />Audio producer</span>
        <span><span className={styles.swatch} style={{ background: '#3b82f6' }} />Video producer</span>
        <span><span className={styles.swatch} style={{ background: '#4ade80aa' }} />Audio consumer (open)</span>
        <span><span className={styles.swatch} style={{ background: '#60a5faaa' }} />Video consumer (open)</span>
        <span><span className={styles.swatch} style={{ background: '#f97316', borderRadius: '50%' }} />pause</span>
        <span><span className={styles.swatch} style={{ background: '#ef4444', borderRadius: '50%' }} />degrade</span>
      </div>
    </div>
  );
}
