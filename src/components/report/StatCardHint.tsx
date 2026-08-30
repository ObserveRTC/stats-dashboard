'use client';
import { useEffect, useState, type ReactNode } from 'react';
import sharedStyles from '../clientInspector/SectionShared.module.css';
import styles from './StatCardHint.module.css';

export interface StatCardHintProps {
  label: string;
  hint: string;
  value: ReactNode;
  valueColor?: string;
  compact?: boolean;
}

export function StatCardHint({ label, hint, value, valueColor, compact = false }: StatCardHintProps) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [tip]);

  const showTip = (x: number, y: number) => setTip({ x: x + 12, y: y - 10 });

  return (
    <div className={`${sharedStyles.statCard} ${compact ? styles.cardCompact : ''}`}>
      <div className={styles.labelRow}>
        <span className={`${sharedStyles.statLabel} ${compact ? styles.labelCompact : ''}`}>{label}</span>
        <span
          className={styles.infoIcon}
          role="img"
          aria-label={hint}
          onMouseEnter={(e) => showTip(e.clientX, e.clientY)}
          onMouseMove={(e) => showTip(e.clientX, e.clientY)}
          onMouseLeave={() => setTip(null)}
        >
          ⓘ
        </span>
      </div>
      <span
        className={`${sharedStyles.statValue} ${compact ? styles.valueCompact : ''}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
      {tip && (
        <div className={styles.infoTooltip} style={{ left: tip.x, top: tip.y }}>
          {hint}
        </div>
      )}
    </div>
  );
}
