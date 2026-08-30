'use client';
import { useMemo } from 'react';
import type { MediasoupRouterSample } from '../../schema/MediasoupRouter.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import type { ClientServerData, MatchSource } from '../../utils/routerServerData.ts';
import { computeRouterCoverage } from '../../utils/routerServerData.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { shortId } from '../../utils/formatting.ts';
import styles from './SfuMappingCard.module.css';

interface SfuMappingCardProps {
  serverData: ClientServerData;
  routerSamples: Map<string, MediasoupRouterSample>;
  processedStats: ProcessWebRTCStatsResult | null;
  /** Drop the card chrome and heading — the caller supplies them (e.g. a tab). */
  embedded?: boolean;
}

const MATCH_LABEL: Record<MatchSource, string> = {
  attachment: 'tagged by the SFU',
  rtp: 'confirmed by client RTP',
  transport: 'inferred from the transport',
  inferred: 'deduced from call topology',
};

const MATCH_HINT: Record<MatchSource, string> = {
  attachment: 'The router object carries this client id in its attachments — the SFU said so directly.',
  rtp: "The client's own RTP stats name this producer or consumer id.",
  transport: 'The object sits on a transport already attributed to this client. Inferred, not stated.',
  inferred:
    'Nothing identified this object directly. It was matched because its transport is the only one in the call whose consumers line up with what this client receives — a deduction, so check it against the client RTP before trusting it.',
};

/**
 * How the SFU's router samples were mapped onto this client, and where the two
 * sides disagree. Rendered above the per-client server sections so the numbers
 * below it can be read with the right amount of trust.
 */
export function SfuMappingCard({ serverData, routerSamples, processedStats, embedded }: SfuMappingCardProps) {
  const coverage = useMemo(
    () => computeRouterCoverage(serverData, processedStats, routerSamples),
    [serverData, processedStats, routerSamples],
  );

  const Shell = ({ children }: { children: React.ReactNode }) =>
    embedded ? <>{children}</> : <div className={styles.card}>{children}</div>;

  const Heading = ({ children }: { children?: React.ReactNode }) =>
    embedded && !children ? null : (
      <div className={styles.headerRow}>
        {!embedded && <h3 className={styles.heading}>SFU mapping</h3>}
        {children}
      </div>
    );

  if (routerSamples.size === 0) {
    return (
      <Shell>
        <Heading />
        <p className={styles.note}>
          No mediasoup router sample was found for this call, so only client-side stats are shown.
        </p>
      </Shell>
    );
  }

  if (serverData.empty) {
    return (
      <Shell>
        <Heading>
          <span className={styles.warnPill}>no objects matched</span>
        </Heading>
        <p className={styles.note}>
          {routerSamples.size} router sample{routerSamples.size === 1 ? '' : 's'} loaded, but nothing
          in them could be attributed to this client. The client stats carry no producer or consumer
          ids, and the router objects carry no client id in their attachments.
        </p>
      </Shell>
    );
  }

  const confirmedPct =
    coverage.confirmedRatio == null ? null : Math.round(coverage.confirmedRatio * 100);

  const stats = [
    { label: 'Transports', value: serverData.transports.length },
    { label: 'Producers', value: serverData.producers.length },
    { label: 'Consumers', value: serverData.consumers.length },
    { label: 'Data producers', value: serverData.dataProducers.length },
    { label: 'Data consumers', value: serverData.dataConsumers.length },
  ].filter((s) => s.value > 0);

  const hasGaps =
    coverage.producersWithoutRtp.length > 0 ||
    coverage.consumersWithoutRtp.length > 0 ||
    coverage.orphanProducerIds.length > 0 ||
    coverage.orphanConsumerIds.length > 0;

  return (
    <Shell>
      <Heading>
        {confirmedPct != null && (
          <span
            className={confirmedPct >= 80 ? styles.okPill : confirmedPct >= 40 ? styles.warnPill : styles.badPill}
            title="Share of this client's router producers and consumers that the client's own RTP stats confirm."
          >
            {confirmedPct}% confirmed by client RTP
          </span>
        )}
      </Heading>

      <div className={styles.statRow}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>Router{serverData.routerIds.length === 1 ? '' : 's'}</span>
        {serverData.routerIds.map((rid) => (
          <IdBadge key={rid} value={rid}>{shortId(rid)}</IdBadge>
        ))}
        {serverData.sfuIds.length > 0 && (
          <>
            <span className={styles.metaLabel}>SFU{serverData.sfuIds.length === 1 ? '' : 's'}</span>
            {serverData.sfuIds.map((sid) => (
              <IdBadge key={sid} value={sid}>{shortId(sid)}</IdBadge>
            ))}
          </>
        )}
      </div>

      <div className={styles.matchRow}>
        {(Object.keys(coverage.matchCounts) as MatchSource[])
          .filter((k) => coverage.matchCounts[k] > 0)
          .map((k) => (
            <span key={k} className={styles.matchPill} data-source={k} title={MATCH_HINT[k]}>
              {coverage.matchCounts[k]} {MATCH_LABEL[k]}
            </span>
          ))}
      </div>

      {hasGaps && (
        <CollapsibleSection
          title="Mapping gaps"
          id="sfu-mapping-gaps"
          count={
            coverage.producersWithoutRtp.length +
            coverage.consumersWithoutRtp.length +
            coverage.orphanProducerIds.length +
            coverage.orphanConsumerIds.length
          }
          defaultOpen={false}
        >
          <GapList
            title="Producers with no client RTP"
            hint="The router created these producers, but this client's outbound stats never reported them. Usually a producer that was closed before any media flowed, or one that belongs to another client on the same transport."
            items={coverage.producersWithoutRtp.map((p) => ({
              id: p.id,
              detail: `${p.kind} · ${p.codecInfo?.mimeType ?? 'unknown codec'} · ${p.matchedBy}`,
            }))}
          />
          <GapList
            title="Consumers with no client RTP"
            hint="The router created these consumers, but this client's inbound stats never reported them. Often a consumer that stayed paused, or one whose producer never resumed."
            items={coverage.consumersWithoutRtp.map((c) => ({
              id: c.id,
              detail: `${c.kind} · from producer ${shortId(c.producerId)} · ${c.matchedBy}`,
            }))}
          />
          <GapList
            title="Client producer ids with no router object"
            hint="The client reported outbound RTP against these producer ids, but no loaded router sample contains them. Either the router sample is missing, or the producer was created on a router this call summary does not list."
            items={coverage.orphanProducerIds.map((id) => ({ id, detail: 'outbound' }))}
          />
          <GapList
            title="Client consumer ids with no router object"
            hint="The client reported inbound RTP against these consumer ids, but no loaded router sample contains them."
            items={coverage.orphanConsumerIds.map((id) => ({ id, detail: 'inbound' }))}
          />
        </CollapsibleSection>
      )}
    </Shell>
  );
}

function GapList({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: { id: string; detail: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.gapGroup}>
      <p className={styles.gapTitle}>
        {title} <span className={styles.gapCount}>{items.length}</span>
      </p>
      <p className={styles.gapHint}>{hint}</p>
      <ul className={styles.gapList}>
        {items.map((item) => (
          <li key={item.id} className={styles.gapItem}>
            <IdBadge value={item.id}>{shortId(item.id)}</IdBadge>
            <span className={styles.gapDetail}>{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
