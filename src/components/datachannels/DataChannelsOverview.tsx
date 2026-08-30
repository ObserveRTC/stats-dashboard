'use client';
import { useMemo } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { ServerDataProducer, ServerDataConsumer } from '../../utils/routerServerData.ts';
import {
  collectClientDataChannels,
  joinDataChannels,
  type DataChannelPair,
} from '../../utils/dataChannelJoin.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { StatusBadge } from '../sections/StatusBadge.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { formatBytes, formatHMS, shortId, lifecycleDuration } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import styles from './DataChannelsOverview.module.css';

interface DataChannelsOverviewProps {
  dataProducers: ServerDataProducer[];
  dataConsumers: ServerDataConsumer[];
  samples: ClientSample[] | null | undefined;
  eventBus?: EventTarget;
}

const MATCH_LABEL: Record<string, string> = {
  attachment: 'matched by id',
  label: 'matched by label',
  none: 'unmatched',
};

const MATCH_HINT: Record<string, string> = {
  attachment: "The client channel's attachments name this SFU object directly.",
  label: 'Paired on a label unique to both sides. Inferred, not stated.',
  none: 'Only one side of this channel is present — the other never reported it.',
};

function stateToStatus(state: string | undefined): 'active' | 'inactive' {
  return state === 'open' ? 'active' : 'inactive';
}

/**
 * Data channels from both ends at once: the SFU's dataProducer / dataConsumer
 * and the browser's own byte and message counters for the same stream.
 */
export function DataChannelsOverview({
  dataProducers,
  dataConsumers,
  samples,
  eventBus,
}: DataChannelsOverviewProps) {
  const pairs = useMemo(
    () => joinDataChannels(dataProducers, dataConsumers, collectClientDataChannels(samples)),
    [dataProducers, dataConsumers, samples],
  );

  if (pairs.length === 0) return null;

  const unmatched = pairs.filter((p) => p.matchedBy === 'none').length;

  return (
    <CollapsibleSection
      title="Data Channels"
      id="data-channels"
      help="client/data-channels"
      hashPrefix="data-channel/"
      count={pairs.length}
      defaultOpen={false}
    >
      <p className={styles.hint}>
        Each row is one SCTP stream, showing the SFU&apos;s view and the browser&apos;s side by side.
        {unmatched > 0 && ` ${unmatched} could only be seen from one end.`}
      </p>
      {pairs.map((pair) => (
        <DataChannelRow key={pair.key} pair={pair} eventBus={eventBus} />
      ))}
    </CollapsibleSection>
  );
}

function DataChannelRow({ pair, eventBus }: { pair: DataChannelPair; eventBus?: EventTarget }) {
  const tz = useTimezoneTick();
  const { client, sfuProducer, sfuConsumer } = pair;
  const sfu = sfuProducer ?? sfuConsumer;

  const title = (
    <>
      <span className={styles.dirBadge} data-direction={pair.direction}>
        {pair.direction === 'producer' ? '↑ producer' : pair.direction === 'consumer' ? '↓ consumer' : 'channel'}
      </span>
      {pair.label}
      {client?.state && (
        <>
          {' '}
          <StatusBadge status={stateToStatus(client.state)} label={client.state} />
        </>
      )}
      <span className={styles.matchPill} data-match={pair.matchedBy} title={MATCH_HINT[pair.matchedBy]}>
        {MATCH_LABEL[pair.matchedBy]}
      </span>
    </>
  );

  return (
    <CollapsibleSection title={title} id={`data-channel/${pair.key}`} defaultOpen={false}>
      <InfoGrid>
        {sfu && (
          <InfoCard title={sfuProducer ? 'SFU data producer' : 'SFU data consumer'}>
            <div className={styles.row}>
              <span className={styles.label}>ID:</span> <IdBadge value={sfu.id}>{shortId(sfu.id)}</IdBadge>
            </div>
            {sfuConsumer && (
              <div className={styles.row}>
                <span className={styles.label}>From data producer:</span>{' '}
                <IdBadge value={sfuConsumer.dataProducerId}>{shortId(sfuConsumer.dataProducerId)}</IdBadge>
              </div>
            )}
            <div className={styles.row}>
              <span className={styles.label}>Transport:</span>{' '}
              <IdBadge value={sfu.transportId}>{shortId(sfu.transportId)}</IdBadge>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Label:</span> {sfu.label || '—'}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Protocol:</span> {sfu.protocol || '—'}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Created:</span> {formatHMS(sfu.createdAt, tz)}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Lifetime:</span>{' '}
              {lifecycleDuration(sfu.createdAt, sfu.closedAt) || '—'}
            </div>
          </InfoCard>
        )}

        {client && (
          <InfoCard title="Browser channel">
            <div className={styles.row}>
              <span className={styles.label}>Channel:</span>{' '}
              <IdBadge value={client.channelId}>{shortId(client.channelId)}</IdBadge>
            </div>
            {client.dataChannelIdentifier != null && (
              <div className={styles.row}>
                <span className={styles.label}>SCTP id:</span> {client.dataChannelIdentifier}
              </div>
            )}
            <div className={styles.row}>
              <span className={styles.label}>Label:</span> {client.label || '—'}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>State:</span> {client.state ?? '—'}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Sent:</span>{' '}
              {client.latest.bytesSent != null ? formatBytes(client.latest.bytesSent) : '—'}
              {client.latest.messagesSent != null && ` · ${client.latest.messagesSent} msgs`}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Received:</span>{' '}
              {client.latest.bytesReceived != null ? formatBytes(client.latest.bytesReceived) : '—'}
              {client.latest.messagesReceived != null && ` · ${client.latest.messagesReceived} msgs`}
            </div>
          </InfoCard>
        )}
      </InfoGrid>

      {!client && (
        <p className={styles.note}>
          The browser never reported a channel for this SFU object — nothing was opened on its end,
          or the stats stopped before it was.
        </p>
      )}
      {client && !sfu && (
        <p className={styles.note}>
          No SFU data producer or consumer matched this channel. It may be a peer-to-peer channel, or
          the router sample for it was not loaded.
        </p>
      )}

      {client && (
        <div className={styles.chartGrid}>
          {client.series.bytesSent.length >= 2 && (
            <MiniChart
              title="Bytes Sent"
              description="Application data this participant sent on this channel — chat, signalling, whatever the app uses it for. It shares the connection with audio and video, so a flatline here at the same moment media stopped is one connection failing rather than two problems."
              data={client.series.bytesSent}
              formatter={formatBytes}
              color="var(--accent)"
              eventBus={eventBus}
            />
          )}
          {client.series.bytesReceived.length >= 2 && (
            <MiniChart
              title="Bytes Received"
              description="Application data this participant received on this channel. Compare against Bytes Sent: traffic in one direction only usually means the far end stopped rather than the link breaking."
              data={client.series.bytesReceived}
              formatter={formatBytes}
              color="var(--success)"
              eventBus={eventBus}
            />
          )}
          {client.series.messagesSent.length >= 2 && (
            <MiniChart
              title="Messages Sent"
              description="Individual messages sent, as opposed to their size. Many tiny messages and few large ones move the same bytes but stress the channel differently."
              data={client.series.messagesSent}
              formatter={(v) => `${v}`}
              color="var(--text-muted)"
              eventBus={eventBus}
            />
          )}
          {client.series.messagesReceived.length >= 2 && (
            <MiniChart
              title="Messages Received"
              description="Individual messages received. A gap while Bytes Received keeps climbing means one large transfer rather than a stall."
              data={client.series.messagesReceived}
              formatter={(v) => `${v}`}
              color="var(--text-muted)"
              eventBus={eventBus}
            />
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}
