'use client';
import { useMemo } from 'react';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { TransportStateTimeline } from '../transport/TransportStateTimeline.tsx';
import { RouterEntityTimeline } from './RouterEntityTimeline.tsx';
import { buildRouterEntityTimeline } from '../../utils/routerEntityTimeline.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { formatHMS, formatDuration, shortId } from '../../utils/formatting.ts';
import type { MediasoupRouterSample } from '../../schema/MediasoupRouter.ts';
import type { ServerTransport } from '../../utils/routerServerData.ts';
import styles from './RouterDetailSection.module.css';

interface Props {
  routerId: string;
  sample: MediasoupRouterSample;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Adapt a router sample's transport to the shape the transport timeline reads.
 *
 * The timeline was written for a transport already matched to a client, which
 * carries a role and a match provenance. From the router's side neither exists
 * — nothing here is attributed to anybody — so they are filled with what is
 * true rather than left to imply a match that was never made.
 */
function asServerTransport(
  transport: MediasoupRouterSample['transports'][number],
  routerId: string,
): ServerTransport {
  const tuple = transport.tuple as
    | { localAddress?: string; localPort?: number; remoteIp?: string; remotePort?: number; protocol?: string }
    | undefined;
  return {
    id: transport.id,
    role: transport.type,
    hybrid: false,
    transportType: transport.type,
    routerId,
    createdAt: transport.createdAt,
    connectedAt: transport.connectedAt,
    closedAt: transport.closedAt,
    tuple: tuple
      ? {
          localIp: tuple.localAddress ?? '',
          localPort: tuple.localPort ?? 0,
          remoteIp: tuple.remoteIp ?? '',
          remotePort: tuple.remotePort ?? 0,
          protocol: tuple.protocol ?? '',
        }
      : undefined,
    history: (transport.history ?? []).map((item) => ({
      timestamp: item.timestamp,
      event: item.type,
      payload: item as unknown as Record<string, unknown>,
    })),
    // Nothing on this page claims a client: the router view is the SFU's own
    // account, before any attribution to a client.
    matchedBy: 'inferred',
    attachments: transport.attachments,
  };
}

/**
 * Everything one router sample says about itself.
 *
 * The dashboard above answers "how was the call"; this answers "what was this
 * router actually doing" — which transports it held and how each one's ICE,
 * DTLS and SCTP went, and every producer, consumer and data channel it carried,
 * with the history that says when each paused, degraded or stopped.
 *
 * Deliberately unattributed. The per-client report maps these objects to the
 * clients that owned them; here they are the router's own record, which is
 * the view you want when the question is about the SFU rather than about a
 * person.
 */
export function RouterDetailSection({ routerId, sample }: Props) {
  const tz = useTimezoneTick();
  const model = useMemo(() => buildRouterEntityTimeline(sample), [sample]);

  const attachments = (sample.attachments ?? {}) as Record<string, unknown>;
  const sfuId = str(attachments.sfuId) ?? str(attachments.sfu);
  const region = str(attachments.region);

  const transports = sample.transports ?? [];
  const counts = [
    ['Transports', transports.length],
    ['Producers', (sample.producers ?? []).length],
    ['Consumers', (sample.consumers ?? []).length],
    ['Data producers', (sample.dataProducers ?? []).length],
    ['Data consumers', (sample.dataConsumers ?? []).length],
  ] as const;

  const duration =
    sample.closedAt != null && sample.createdAt != null
      ? formatDuration(sample.closedAt - sample.createdAt)
      : undefined;

  return (
    <CollapsibleSection
      title={`Router ${shortId(routerId, 12)}`}
      id={`router/${routerId}`}
      help="call/router-detail"
      count={transports.length}
      defaultOpen={false}
    >
      <InfoGrid>
        <InfoCard title="Router">
          <div>
            <span className={styles.label}>ID:</span> <IdBadge value={routerId} />
          </div>
          {sfuId && (
            <div>
              <span className={styles.label}>SFU:</span> {sfuId}
            </div>
          )}
          {region && (
            <div>
              <span className={styles.label}>Region:</span> {region}
            </div>
          )}
        </InfoCard>

        <InfoCard title="Timing">
          <div>
            <span className={styles.label}>Created:</span> {formatHMS(sample.createdAt, tz)}
          </div>
          {sample.closedAt != null && (
            <div>
              <span className={styles.label}>Closed:</span> {formatHMS(sample.closedAt, tz)}
            </div>
          )}
          {duration && (
            <div>
              <span className={styles.label}>Duration:</span> {duration}
            </div>
          )}
        </InfoCard>

        <InfoCard title="Held">
          {counts.map(([label, value]) => (
            <div key={label}>
              <span className={styles.label}>{label}:</span> {value}
            </div>
          ))}
        </InfoCard>
      </InfoGrid>

      {model?.groups.map((group) => (
        <RouterEntityTimeline
          key={group.kind}
          group={group}
          start={model.start}
          end={model.end}
        />
      ))}

      {transports.length > 0 && (
        <CollapsibleSection title={`Transports (${transports.length})`} defaultOpen={false}>
          {transports.map((transport) => (
            <div key={transport.id} className={styles.transport}>
              <div className={styles.transportHead}>
                <span className={styles.transportType}>{transport.type}</span>
                <IdBadge value={transport.id} />
                {transport.closedAt == null && (
                  <span className={styles.openTag}>open at close</span>
                )}
              </div>
              {/* The same lanes the per-client report draws, minus the
                  browser's half: from the router's side there is no peer
                  connection to read against. */}
              <TransportStateTimeline
                transport={asServerTransport(transport, routerId)}
                fallbackStart={model?.start}
                fallbackEnd={model?.end}
              />
            </div>
          ))}
        </CollapsibleSection>
      )}
    </CollapsibleSection>
  );
}
