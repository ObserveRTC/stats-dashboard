'use client';
import { useMemo, type ReactNode } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { CodecInfo, ClientServerData as ServerData } from '../../utils/routerServerData.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsProcessor.ts';
import {
  extractClientCodecsFromSamples,
  formatChannels,
  formatClockRateHz,
} from '../../utils/clientCodecs.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './CodecOverview.module.css';

interface CodecOverviewProps {
  serverData: ServerData | null;
  clientStats: ClientSample[] | null;
  processedClientStats: ProcessWebRTCStatsResult | null;
}

interface CodecDetails {
  mimeType: string;
  clockRate?: number;
  channels?: number;
  payloadType?: number;
  sdpFmtpLine?: string;
}

interface ServerCodecRow extends CodecDetails {
  key: string;
  entityType: 'producer' | 'consumer';
  entityId: string;
  label: string;
  kind: string;
}

interface PayloadTypeGroup<T> {
  payloadType: number | null;
  label: string;
  rows: T[];
}

function payloadTypeLabel(payloadType: number | null): string {
  return payloadType != null ? `Payload type ${payloadType}` : 'Payload type unknown';
}

function groupByPayloadType<T extends { payloadType?: number }>(rows: T[]): PayloadTypeGroup<T>[] {
  const map = new Map<number | null, T[]>();

  for (const row of rows) {
    const pt = row.payloadType ?? null;
    const list = map.get(pt) ?? [];
    list.push(row);
    map.set(pt, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return a - b;
    })
    .map(([payloadType, groupRows]) => ({
      payloadType,
      label: payloadTypeLabel(payloadType),
      rows: groupRows,
    }));
}

function CodecFields({ row }: { row: CodecDetails }) {
  return (
    <>
      <div>
        <span className={styles.label}>MIME type:</span>{' '}
        <span className={styles.mono}>{row.mimeType}</span>
      </div>
      <div>
        <span className={styles.label}>Clock rate:</span> {formatClockRateHz(row.clockRate)}
      </div>
      <div>
        <span className={styles.label}>Channels:</span> {formatChannels(row.channels)}
      </div>
      <div>
        <span className={styles.label}>SDP fmtp line:</span>{' '}
        <span className={styles.mono}>{row.sdpFmtpLine || '—'}</span>
      </div>
    </>
  );
}

function PayloadTypeSection<T extends { payloadType?: number }>({
  rows,
  renderRow,
}: {
  rows: T[];
  renderRow: (row: T) => ReactNode;
}) {
  const groups = groupByPayloadType(rows);
  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className={styles.payloadGroup}>
          <h6 className={styles.payloadGroupTitle}>
            {group.label}
            <span className={styles.payloadGroupCount}>{group.rows.length}</span>
          </h6>
          <InfoGrid>
            {group.rows.map((row) => renderRow(row))}
          </InfoGrid>
        </div>
      ))}
    </>
  );
}

export function CodecOverview({
  serverData,
  clientStats,
  processedClientStats,
}: CodecOverviewProps) {
  const { clientCodecs, serverCodecs } = useMemo(() => {
    let clientCodecs = extractClientCodecsFromSamples(clientStats);
    if (clientCodecs.length === 0 && processedClientStats?.codecs?.size) {
      clientCodecs = [...processedClientStats.codecs.values()].map((codec) => ({
        key: `${codec.payloadType ?? 'x'}:${codec.mimeType}:${codec.sdpFmtpLine ?? ''}`,
        mimeType: codec.mimeType,
        clockRate: codec.clockRate,
        channels: codec.channels,
        payloadType: codec.payloadType,
        sdpFmtpLine: codec.sdpFmtpLine,
      }));
    }

    const serverCodecs: ServerCodecRow[] = [];

    for (const producer of serverData?.producers ?? []) {
      if (!producer.codecInfo?.mimeType) continue;
      serverCodecs.push({
        key: `producer:${producer.id}`,
        entityType: 'producer',
        entityId: producer.id,
        label: producer.label || '—',
        kind: producer.kind,
        ...producer.codecInfo,
        mimeType: producer.codecInfo.mimeType,
      });
    }

    for (const consumer of serverData?.consumers ?? []) {
      const codecInfo = (consumer as { codecInfo?: CodecInfo }).codecInfo;
      if (!codecInfo?.mimeType) continue;
      serverCodecs.push({
        key: `consumer:${consumer.id}`,
        entityType: 'consumer',
        entityId: consumer.id,
        label: consumer.label || '—',
        kind: consumer.kind,
        ...codecInfo,
        mimeType: codecInfo.mimeType,
      });
    }

    return { clientCodecs, serverCodecs };
  }, [serverData, clientStats, processedClientStats]);

  const total = clientCodecs.length + serverCodecs.length;
  if (total === 0) return null;

  const serverProducers = serverCodecs.filter((r) => r.entityType === 'producer');
  const serverConsumers = serverCodecs.filter((r) => r.entityType === 'consumer');

  const titleParts: string[] = [];
  if (clientCodecs.length > 0) titleParts.push(`${clientCodecs.length} sample`);
  if (serverCodecs.length > 0) titleParts.push(`${serverCodecs.length} router`);

  return (
    <div className={styles.section}>
      <CollapsibleSection title={`Codecs (${titleParts.join(' · ')})`} defaultOpen={false}>
        {clientCodecs.length > 0 && (
          <div className={styles.sourceGroup}>
            <div className={styles.sourceHeader}>
              <span className={styles.sourceBadge} data-source="client">Client samples</span>
              <span className={styles.sourceHint}>
                From WebRTC <code className={styles.inlineCode}>getStats()</code> · peer connection codec objects
              </span>
            </div>
            <PayloadTypeSection
              rows={clientCodecs}
              renderRow={(row) => (
                <InfoCard key={row.key} title={row.mimeType.split('/')[1] || row.mimeType}>
                  <CodecFields row={row} />
                </InfoCard>
              )}
            />
          </div>
        )}

        {serverCodecs.length > 0 && (
          <div className={styles.sourceGroup}>
            <div className={styles.sourceHeader}>
              <span className={styles.sourceBadge} data-source="server">Router report</span>
              <span className={styles.sourceHint}>
                Negotiated <code className={styles.inlineCode}>codecInfo</code> on server producers and consumers
              </span>
            </div>

            {serverProducers.length > 0 && (
              <div className={styles.entitySection}>
                <h6 className={styles.subGroupTitle}>Producers ({serverProducers.length})</h6>
                <PayloadTypeSection
                  rows={serverProducers}
                  renderRow={(row) => (
                    <InfoCard
                      key={row.key}
                      title={row.label}
                      badge={<span className={styles.kindBadge} data-kind={row.kind}>{row.kind}</span>}
                    >
                      <div><span className={styles.label}>Producer:</span> <IdBadge value={row.entityId} /></div>
                      <CodecFields row={row} />
                    </InfoCard>
                  )}
                />
              </div>
            )}

            {serverConsumers.length > 0 && (
              <div className={styles.entitySection}>
                <h6 className={styles.subGroupTitle}>Consumers ({serverConsumers.length})</h6>
                <PayloadTypeSection
                  rows={serverConsumers}
                  renderRow={(row) => (
                    <InfoCard
                      key={row.key}
                      title={row.label}
                      badge={<span className={styles.kindBadge} data-kind={row.kind}>{row.kind}</span>}
                    >
                      <div><span className={styles.label}>Consumer:</span> <IdBadge value={row.entityId} /></div>
                      <CodecFields row={row} />
                    </InfoCard>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
