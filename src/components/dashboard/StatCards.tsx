'use client';
import type { StatCard } from '../../utils/dashboardModel.ts';
import { InfoIcon } from '../help/InfoIcon.tsx';
import styles from './CallDashboard.module.css';

/**
 * The headline numbers across the top of the dashboard.
 *
 * Each carries an explanation. Where the card has a registered help topic the
 * icon opens the full one — what the number is, why it matters, how to read it
 * and what it does *not* mean; the short `info` string stays as the hover text
 * on the value itself, and covers the card-specific detail the generic topic
 * cannot know (which fallback produced this figure, whether a peak is a lower
 * bound).
 */
export function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <div className={styles.statGrid}>
      {cards.map((card) => (
        <div key={card.key} className="card elev-sm" title={card.info}>
          <div className={`card-kicker ${styles.statKicker}`}>
            {card.label}
            {card.help ? (
              <InfoIcon topic={card.help} />
            ) : (
              <span className={styles.statInfo} title={card.info} aria-label={card.info}>
                i
              </span>
            )}
          </div>
          <div className={styles.statValue} style={{ color: card.color }}>
            {card.value}
            {card.unit && <span className={styles.statUnit}>{card.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
