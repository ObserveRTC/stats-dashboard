'use client';
import { useMemo } from 'react';
import type { DashboardClient } from '../../utils/dashboardModel.ts';
import styles from './CallDashboard.module.css';
import { InfoIcon } from '../help/InfoIcon.tsx';

/**
 * Clients with their quality score, a six-sample trend sparkline, and
 * the two numbers that usually explain a bad score: RTT and packet loss.
 *
 * Most observers write a summary with no per-client metrics in it, which
 * left every one of those columns showing an em dash on a call whose data was
 * all there, one fetch away. So each row carries a **Load** button beside
 * **View**: Load fetches and processes that client's stats in place and
 * fills the row in, without leaving the dashboard. Rows load in parallel and
 * independently — Load all starts every outstanding one at once — and what
 * they load is kept, so clicking View afterwards opens instantly.
 */
export function ClientsCard({
  clients,
  onView,
  onLoad,
  onLoadAll,
}: {
  clients: DashboardClient[];
  onView: (clientId: string) => void;
  onLoad: (clientId: string) => void;
  onLoadAll: () => void;
}) {
  const { loadable, loadingCount } = useMemo(
    () => ({
      loadable: clients.filter(
        (p) => p.loadStatus === 'idle' || p.loadStatus === 'error',
      ).length,
      loadingCount: clients.filter((p) => p.loadStatus === 'loading').length,
    }),
    [clients],
  );

  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className={styles.cardHead}>
        <div className="card-title">
          Clients <InfoIcon topic="call/clients-table" />
        </div>
        <div className={styles.cardHeadActions}>
          {loadingCount > 0 && (
            <span className={styles.loadHint}>
              Loading {loadingCount} of {clients.length}…
            </span>
          )}
          {loadable > 0 && (
            <button type="button" className="btn btn-ghost" onClick={onLoadAll}>
              Load all ({loadable})
            </button>
          )}
        </div>
      </div>

      {clients.length === 0 ? (
        <p className={styles.emptyNote}>No clients found for this call.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Quality</th>
                <th>Median RTT</th>
                <th>P95 Loss</th>
                <th>Issues</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((p) => (
                <tr key={p.clientId}>
                  <td>
                    <span className={styles.clientCell} title={p.clientId}>
                      {p.name}
                      {p.turnConnected && <span className="tag tag-neutral">TURN</span>}
                      {p.rejoins > 0 && (
                        <span className="tag tag-neutral">
                          {p.rejoins} rejoin{p.rejoins === 1 ? '' : 's'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className={styles.quality}>
                      <span style={{ color: p.scoreColor }}>{p.scoreDisplay}</span>
                      {/* The pip marks numbers measured from this client's
                          own stats rather than taken from the call summary. */}
                      {p.source === 'loaded' && (
                        <span
                          className={styles.livePip}
                          title="Measured from this client's stats"
                        />
                      )}
                      <div className={styles.trend}>
                        {p.trendBars.map((bar, i) => (
                          <div
                            key={i}
                            className={styles.trendBar}
                            style={{ height: bar.h, background: bar.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>{p.rttDisplay}</td>
                  <td>{p.lossDisplay}</td>
                  <td>{p.issueCount == null ? '—' : p.issueCount}</td>
                  <td className={styles.rowActions}>
                    {p.loadStatus === 'error' && (
                      <span className={styles.loadError} title={p.loadError}>
                        failed
                      </span>
                    )}
                    {p.loadStatus === 'empty' && (
                      <span className={styles.loadHint} title="No stats object stored for this client.">
                        no stats
                      </span>
                    )}
                    {p.loadStatus !== 'loaded' && p.loadStatus !== 'empty' && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={p.loadStatus === 'loading'}
                        onClick={() => onLoad(p.clientId)}
                        title="Fetch this client's stats and fill in their numbers here, without leaving the page."
                      >
                        {p.loadStatus === 'loading'
                          ? 'Loading…'
                          : p.loadStatus === 'error'
                            ? 'Retry'
                            : 'Load'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onView(p.clientId)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
