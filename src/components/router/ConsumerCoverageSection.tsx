'use client';
import type { MediasoupRouterSample } from '../../schema/MediasoupRouter.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import styles from './ConsumerCoverageSection.module.css';

interface Props {
  routerSamples: Map<string, MediasoupRouterSample>;
}

export function ConsumerCoverageSection({ routerSamples }: Props) {
  if (routerSamples.size === 0) return null;

  // Collect all producers across all routers
  const allProducerIds = new Set<string>();
  for (const sample of routerSamples.values()) {
    for (const p of sample.producers ?? []) allProducerIds.add(p.id);
  }

  // Collect all consumers across all routers
  type ConsumerRow = {
    id: string;
    kind: string;
    producerId: string;
    status: 'matched' | 'missing';
  };
  const consumerRows: ConsumerRow[] = [];
  for (const sample of routerSamples.values()) {
    for (const c of sample.consumers ?? []) {
      consumerRows.push({
        id: c.id,
        kind: c.kind,
        producerId: c.producerId,
        status: allProducerIds.has(c.producerId) ? 'matched' : 'missing',
      });
    }
  }

  // Orphan producers: no consumer points to them
  const referencedProducerIds = new Set(consumerRows.map((c) => c.producerId));
  const orphanProducers: Array<{ id: string; kind: string }> = [];
  for (const sample of routerSamples.values()) {
    for (const p of sample.producers ?? []) {
      if (!referencedProducerIds.has(p.id)) {
        orphanProducers.push({ id: p.id, kind: p.kind });
      }
    }
  }

  const missingCount = consumerRows.filter((c) => c.status === 'missing').length;
  const total = consumerRows.length;

  if (total === 0 && orphanProducers.length === 0) return null;

  const summary = `${total} consumers checked, ${missingCount} missing producer refs, ${orphanProducers.length} orphan producers`;

  return (
    <CollapsibleSection title="Consumer Coverage" id="consumer-coverage" defaultOpen={missingCount > 0 || orphanProducers.length > 0}>
      <p className={styles.summary}>{summary}</p>

      {consumerRows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Consumer ID</th>
                <th>Kind</th>
                <th>Producer ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {consumerRows.map((row) => (
                <tr key={row.id}>
                  <td title={row.id}>{row.id.slice(0, 12)}…</td>
                  <td>{row.kind}</td>
                  <td title={row.producerId}>{row.producerId.slice(0, 12)}…</td>
                  <td>
                    {row.status === 'matched'
                      ? <span className={styles.badgeOk}>✓ matched</span>
                      : <span className={styles.badgeMissing}>✗ missing</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orphanProducers.length > 0 && (
        <>
          <p className={styles.subHeading}>Orphan Producers ({orphanProducers.length})</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producer ID</th>
                  <th>Kind</th>
                </tr>
              </thead>
              <tbody>
                {orphanProducers.map((p) => (
                  <tr key={p.id}>
                    <td title={p.id}>{p.id.slice(0, 12)}…</td>
                    <td>{p.kind}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
