'use client';
import { Fragment } from 'react';
import type {
  MediasoupRouterSample,
  MediasoupTransportSample,
  MediasoupProducerSample,
  MediasoupConsumerSample,
  MediasoupDataProducerSample,
  MediasoupDataConsumerSample,
} from '../../schema/MediasoupRouter.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { formatDateTime } from '../../utils/formatting.ts';
import { useTimezoneTick, type Tz } from '../../stores/tzStore.ts';
import { RouterGantt } from './RouterGantt.tsx';
import { TransportTimeline } from './TransportTimeline.tsx';
import styles from './router.module.css';

/* ── helpers ────────────────────────────────────────────── */

function durStr(startMs: number, endMs?: number): string {
  const ms = (endMs ?? Date.now()) - startMs;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function tupleStr(t: MediasoupTransportSample['tuple']): string {
  if (!t) return '—';
  return `${t.localAddress}:${t.localPort} ↔ ${t.remoteIp ?? '?'}:${t.remotePort ?? '?'} (${t.protocol})`;
}

/* ── Event history pills ────────────────────────────────── */

type HistoryItem = { type: string; timestamp: number };

function HistoryPills({ history }: { history: HistoryItem[] }) {
  if (!history || history.length === 0) return <span className={styles.empty} style={{ padding: 0 }}>—</span>;
  return (
    <span className={styles.history}>
      {history.map((h, i) => {
        const type = h.type ?? '';
        let cls = styles.histPill;
        if (type.includes('pause') || type.includes('paused')) cls = `${styles.histPill} ${styles.histPillPause}`;
        else if (type.includes('resume') || type.includes('resumed')) cls = `${styles.histPill} ${styles.histPillResume}`;
        else if (type.includes('degrad')) cls = `${styles.histPill} ${styles.histPillDegrade}`;
        else if (type.includes('restor') || type.includes('started')) cls = `${styles.histPill} ${styles.histPillRestore}`;
        return <span key={i} className={cls} title={new Date(h.timestamp).toISOString()}>{type}</span>;
      })}
    </span>
  );
}

/* ── Transport type badge ───────────────────────────────── */

function TransportBadge({ type }: { type: string }) {
  const cls =
    type === 'webrtc' ? styles.badgeWebrtc :
    type === 'plain'  ? styles.badgePlain :
    type === 'pipe'   ? styles.badgePipe :
    styles.badgeDirect;
  return <span className={`${styles.badge} ${cls}`}>{type}</span>;
}

function KindBadge({ kind }: { kind: 'audio' | 'video' }) {
  const cls = kind === 'audio' ? styles.badgeAudio : styles.badgeVideo;
  return <span className={`${styles.badge} ${cls}`}>{kind}</span>;
}

function StatusBadge({ closed }: { closed: boolean }) {
  const cls = closed ? styles.badgeClosed : styles.badgeOpen;
  return <span className={`${styles.badge} ${cls}`}>{closed ? 'closed' : 'open'}</span>;
}

/* ── Sub-sections ───────────────────────────────────────── */

function TransportsTable({ transports, tz }: { transports: MediasoupTransportSample[]; tz: Tz }) {
  if (!transports.length) return <p className={styles.empty}>No transports.</p>;
  return (
    <>
      <p className={styles.subHeading}>Transports ({transports.length})</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Connected at</th>
              <th>Duration</th>
              <th>Tuple</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {transports.map((t) => (
              <Fragment key={t.id}>
                <tr>
                  <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.id}>{t.id.slice(0, 12)}…</td>
                  <td><TransportBadge type={t.type} /></td>
                  <td><StatusBadge closed={!!t.closedAt} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(t.createdAt, tz)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.connectedAt ? formatDateTime(t.connectedAt, tz) : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{durStr(t.createdAt, t.closedAt)}</td>
                  <td style={{ minWidth: 220 }}>{tupleStr(t.tuple)}</td>
                  <td><HistoryPills history={(t.history ?? []) as HistoryItem[]} /></td>
                </tr>
                {t.type === 'webrtc' && (t.history ?? []).length > 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '0 8px 6px' }}>
                      <TransportTimeline transport={t as Parameters<typeof TransportTimeline>[0]['transport']} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProducersTable({ producers, tz }: { producers: MediasoupProducerSample[]; tz: Tz }) {
  if (!producers.length) return null;
  return (
    <>
      <p className={styles.subHeading}>Producers ({producers.length})</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Kind</th>
              <th>Codec</th>
              <th>SSRCs</th>
              <th>RIDs</th>
              <th>Transport</th>
              <th>Status</th>
              <th>Created</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {producers.map((p) => (
              <tr key={p.id}>
                <td title={p.id}>{p.id.slice(0, 12)}…</td>
                <td><KindBadge kind={p.kind} /></td>
                <td>{p.codecInfo?.mimeType ?? '—'}</td>
                <td>{p.ssrcs?.join(', ') ?? '—'}</td>
                <td>{p.rids?.join(', ') ?? '—'}</td>
                <td title={p.transportId}>{p.transportId.slice(0, 10)}…</td>
                <td><StatusBadge closed={!!p.closedAt} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(p.createdAt, tz)}</td>
                <td><HistoryPills history={(p.history ?? []) as HistoryItem[]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ConsumersTable({ consumers, tz }: { consumers: MediasoupConsumerSample[]; tz: Tz }) {
  if (!consumers.length) return null;
  return (
    <>
      <p className={styles.subHeading}>Consumers ({consumers.length})</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Kind</th>
              <th>Producer ID</th>
              <th>Transport</th>
              <th>Status</th>
              <th>Created</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {consumers.map((c) => (
              <tr key={c.id}>
                <td title={c.id}>{c.id.slice(0, 12)}…</td>
                <td><KindBadge kind={c.kind} /></td>
                <td title={c.producerId}>{c.producerId.slice(0, 12)}…</td>
                <td title={c.transportId}>{c.transportId.slice(0, 10)}…</td>
                <td><StatusBadge closed={!!c.closedAt} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(c.createdAt, tz)}</td>
                <td><HistoryPills history={(c.history ?? []) as HistoryItem[]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DataTable({
  items,
  label,
  tz,
}: {
  items: (MediasoupDataProducerSample | MediasoupDataConsumerSample)[];
  label: string;
  tz: Tz;
}) {
  if (!items.length) return null;
  return (
    <>
      <p className={styles.subHeading}>{label} ({items.length})</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Label</th>
              <th>Protocol</th>
              <th>Transport</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td title={d.id}>{d.id.slice(0, 12)}…</td>
                <td>{d.label}</td>
                <td>{d.protocol || '—'}</td>
                <td title={d.transportId}>{d.transportId.slice(0, 10)}…</td>
                <td><StatusBadge closed={!!d.closedAt} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(d.createdAt, tz)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AttachmentsRow({ attachments }: { attachments: Record<string, unknown> }) {
  const entries = Object.entries(attachments).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return null;
  return (
    <div className={styles.attachGrid}>
      {entries.map(([k, v]) => (
        <div key={k} className={styles.attachEntry}>
          <span className={styles.attachKey}>{k}:</span>
          <span className={styles.attachVal}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */

interface Props {
  routerId: string;
  sample: MediasoupRouterSample;
}

export function RouterSection({ routerId, sample }: Props) {
  const tz = useTimezoneTick() as Tz;

  const totalItems =
    (sample.transports?.length ?? 0) +
    (sample.producers?.length ?? 0) +
    (sample.consumers?.length ?? 0) +
    (sample.dataProducers?.length ?? 0) +
    (sample.dataConsumers?.length ?? 0);

  return (
    <CollapsibleSection
      title={`Router · ${routerId.slice(0, 12)}…`}
      id={`router-${routerId}`}
      count={totalItems}
      defaultOpen={false}
    >
      {/* Meta bar */}
      <div className={styles.routerMeta}>
        <div className={styles.routerMetaItem}>
          <span className={styles.routerMetaLabel}>Router ID:</span>
          <span className={styles.routerMetaValue}>{routerId}</span>
        </div>
        <div className={styles.routerMetaItem}>
          <span className={styles.routerMetaLabel}>Created:</span>
          <span className={styles.routerMetaValue}>{formatDateTime(sample.createdAt, tz)}</span>
        </div>
        {sample.closedAt && (
          <div className={styles.routerMetaItem}>
            <span className={styles.routerMetaLabel}>Closed:</span>
            <span className={styles.routerMetaValue}>{formatDateTime(sample.closedAt, tz)}</span>
          </div>
        )}
        <div className={styles.routerMetaItem}>
          <span className={styles.routerMetaLabel}>Duration:</span>
          <span className={styles.routerMetaValue}>{durStr(sample.createdAt, sample.closedAt)}</span>
        </div>
      </div>

      {/* Attachments */}
      {sample.attachments && Object.keys(sample.attachments).length > 0 && (
        <AttachmentsRow attachments={sample.attachments} />
      )}

      {/* Gantt */}
      {((sample.producers?.length ?? 0) + (sample.consumers?.length ?? 0)) > 0 && (
        <RouterGantt producers={sample.producers ?? []} consumers={sample.consumers ?? []} />
      )}

      {/* Tables */}
      <TransportsTable transports={sample.transports ?? []} tz={tz} />
      <ProducersTable producers={sample.producers ?? []} tz={tz} />
      <ConsumersTable consumers={sample.consumers ?? []} tz={tz} />
      <DataTable items={sample.dataProducers ?? []} label="Data Producers" tz={tz} />
      <DataTable items={sample.dataConsumers ?? []} label="Data Consumers" tz={tz} />
    </CollapsibleSection>
  );
}
