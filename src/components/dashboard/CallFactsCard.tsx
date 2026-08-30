'use client';
import type { CallFactGroup } from '../../utils/dashboardModel.ts';
import styles from './CallDashboard.module.css';
import { InfoIcon } from '../help/InfoIcon.tsx';

/**
 * What the call summary says, past the five headline numbers.
 *
 * Grouped rather than listed flat, because the questions are different: when
 * the call ran, who was in it, how it went, and what carried it. Groups the
 * summary said nothing about are absent, so the card is short on a thin
 * summary and long on a rich one instead of always being a wall of em dashes.
 */
export function CallFactsCard({ groups }: { groups: CallFactGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className="card-title">
        Call details <InfoIcon topic="call/details" />
      </div>
      <div className={styles.factGrid}>
        {groups.map((group) => (
          <div key={group.key} className={styles.factGroup}>
            <div className={`card-kicker ${styles.factGroupTitle}`}>{group.title}</div>
            <dl className={styles.factList}>
              {group.facts.map((fact) => (
                <div key={fact.key} className={styles.factRow}>
                  <dt className={styles.factLabel}>{fact.label}</dt>
                  <dd
                    className={fact.tone === 'warn' ? styles.factValueWarn : styles.factValue}
                    title={fact.info}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
