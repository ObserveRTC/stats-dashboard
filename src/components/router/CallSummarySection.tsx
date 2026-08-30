'use client';
import type { CallSummary } from '../../api/types.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import styles from './router.module.css';

interface Props {
  summary: CallSummary;
  routerCount: number;
}

/**
 * The call as summarized by the observers that watched it.
 *
 * A call spread across SFUs has one summary per SFU, merged into this one — so
 * the section says how many it was built from, and names anything the merge had
 * to give up rather than showing a number that would be wrong.
 */
export function CallSummarySection({ summary, routerCount }: Props) {
  const clientIds = Object.keys(summary.clients ?? {});
  const routerIds = summary.routerIds ?? [];
  const sources = summary.sources ?? [];
  const sfuIds = summary.sfuIds ?? [];
  const merged = sources.length > 1;

  return (
    <CollapsibleSection title="Call Summary" id="call-summary" defaultOpen={true}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Clients</span>
          <span className={styles.summaryValue}>{clientIds.length}</span>
        </div>
        {(merged || sfuIds.length > 0) && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>SFUs</span>
            <span
              className={styles.summaryValue}
              title={
                merged
                  ? `Merged from ${sources.length} call summaries, one per SFU.`
                  : 'A single call summary — this call ran on one SFU.'
              }
            >
              {sfuIds.length || sources.length}
            </span>
          </div>
        )}
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Routers</span>
          <span className={styles.summaryValue}>{routerIds.length}</span>
        </div>
        {routerCount > 0 && routerCount < routerIds.length && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Loaded</span>
            <span className={styles.summaryValue}>{routerCount} / {routerIds.length}</span>
          </div>
        )}
        {clientIds.length > 0 && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Client IDs</span>
            <span className={styles.summaryValue} style={{ fontSize: '0.62rem', lineHeight: 1.6 }}>
              {clientIds.map((id) => {
                const dn = summary.clients[id]?.displayName;
                return (
                  <span key={id} style={{ display: 'block' }}>
                    {dn ? `${dn} · ` : ''}{id}
                  </span>
                );
              })}
            </span>
          </div>
        )}
        {merged && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Merged from</span>
            <span className={styles.summaryValue} style={{ fontSize: '0.62rem', lineHeight: 1.6 }}>
              {sources.map((source) => (
                <span key={source.key ?? source.sfuId} style={{ display: 'block' }}>
                  {source.sfuId ?? source.key}
                  <span className={styles.sourceDetail}>
                    {' · '}
                    {source.clientIds.length} client{source.clientIds.length === 1 ? '' : 's'}
                    {source.routerIds.length > 0
                      ? ` · ${source.routerIds.length} router${source.routerIds.length === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </span>
              ))}
            </span>
          </div>
        )}
        {routerIds.length > 0 && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Router IDs</span>
            <span className={styles.summaryValue} style={{ fontSize: '0.62rem', lineHeight: 1.6 }}>
              {routerIds.map((id) => (
                <span key={id} style={{ display: 'block' }}>{id}</span>
              ))}
            </span>
          </div>
        )}
      </div>
      {summary.missingSources ? (
        <p className={styles.summaryNote}>
          {summary.missingSources} per-SFU {summary.missingSources === 1 ? 'summary' : 'summaries'}{' '}
          in this call folder could not be read, so the figures above are short of that SFU&apos;s
          contribution.
        </p>
      ) : null}
      {summary.unmergeable?.length ? (
        <p className={styles.summaryNote}>
          Not available across SFUs: {summary.unmergeable.join(', ')}. These cannot be recombined
          from per-SFU summaries — a median of medians is not a median, and two SFUs peaking at
          different moments do not add up to a call peak — so they are left out rather than
          approximated.
        </p>
      ) : null}
    </CollapsibleSection>
  );
}
