'use client';
import type { RouterRow } from '../../utils/dashboardModel.ts';
import { shortId } from '../../utils/formatting.ts';
import styles from './CallDashboard.module.css';
import { InfoIcon } from '../help/InfoIcon.tsx';

/** Per-router transport / producer / consumer counts. */
export function RoutersCard({ rows }: { rows: RouterRow[] }) {
  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className="card-title">
        Routers <InfoIcon topic="call/routers" />
      </div>

      {rows.length === 0 ? (
        <p className={styles.emptyNote}>No routers reported for this call.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className="table">
            <thead>
              <tr>
                <th>Router</th>
                <th>Transports</th>
                <th>Producers</th>
                <th>Consumers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.routerId}>
                  <td title={row.routerId}>
                    {shortId(row.routerId, 18)}
                    <span className={`tag tag-neutral ${styles.rowTag}`}>{row.sfuId}</span>
                  </td>
                  <td>{row.transportsTotal}</td>
                  <td>{row.producersTotal}</td>
                  <td>{row.consumersTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
