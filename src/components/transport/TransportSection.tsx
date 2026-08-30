'use client';
import { useState } from 'react';
import type { ServerTransport as Transport } from '../../utils/routerServerData.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { IceCandidatesTable } from './IceCandidatesTable.tsx';
import { TransportStateTimeline } from './TransportStateTimeline.tsx';
import { TransportStateLog } from './TransportStateLog.tsx';
import { StatusBadge } from '../sections/StatusBadge.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { buildSelectedPairCombinedValues } from '../../utils/healthMetrics.ts';
import { formatScoreReasons } from '../../utils/scoreExplanation.ts';
import { transportIssueLaneItems } from '../../utils/issueTimelinePlacement.ts';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type {
  CandidatePairEntry,
  IceCandidateEntry,
  IceSelectedPairValue,
  ProcessWebRTCStatsResult,
} from '../../utils/statsTypes.ts';
import { formatHMS, formatBps, shortId, lifecycleDuration, scoreColor } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import styles from './TransportSection.module.css';

interface TransportSectionProps {
  transport: Transport | null;
  processedClientStats: ProcessWebRTCStatsResult | null;
  paneKey: string;
  clientStats?: ClientSample[];
  eventBus?: EventTarget;
  clientLabel?: string;
  /** When no server-side transport is available, use this peer-connection ID to look up stats. */
  pcId?: string;
}

export function TransportSection({
  transport,
  processedClientStats,
  paneKey: _paneKey,
  clientStats,
  eventBus,
  clientLabel,
  pcId,
}: TransportSectionProps) {
  const tz = useTimezoneTick();
  const transportId = transport?.id ?? pcId ?? 'unknown';
  const role = transport?.role ?? 'unknown';
  const createdAt = transport?.createdAt ?? 0;
  const closedAt = transport?.closedAt;
  const created = formatHMS(createdAt, tz);
  const closed = closedAt != null ? formatHMS(closedAt, tz) : null;
  const duration = lifecycleDuration(createdAt, closedAt);
  const isActive = closedAt == null;

  const startTime = createdAt ?? 0;
  const [now] = useState(Date.now);
  const endTime = closedAt ?? now;

  // ICE-family issues the client raised against this transport (or the peer
  // connection standing in for it), drawn as a lane under the state bar.
  const issueLane = transportIssueLaneItems(clientStats, { id: transportId, closedAt }, tz);

  const scoreSeries = extractScoreSeries(processedClientStats, transportId, startTime, endTime);
  const latestScore = scoreSeries?.length ? scoreSeries[scoreSeries.length - 1] : null;

  const title = (
    <>
      <span className={styles.roleBadge}>{role}</span>
      Transport <IdBadge value={transportId}>{shortId(transportId)}</IdBadge> · {created}
      {closed != null && ` – ${closed}`}
      {duration && ` (${duration})`}
      {' '}
      <StatusBadge status={isActive ? 'active' : 'inactive'} />
      {latestScore && (
        <span
          className={styles.scoreBadge}
          style={{
            background: `color-mix(in srgb, ${scoreColor(latestScore.value)} 18%, transparent)`,
            color: scoreColor(latestScore.value),
          }}
          title={
            latestScore.notes?.length
              ? `Latest quality score ${latestScore.value.toFixed(2)}/5 — ${latestScore.notes.join(' · ')}`
              : `Latest quality score ${latestScore.value.toFixed(2)}/5`
          }
        >
          {latestScore.value.toFixed(1)}
        </span>
      )}
    </>
  );

  const candidates = extractCandidates(processedClientStats, transportId);
  const pairs = extractPairs(processedClientStats, transportId);
  const pairSeries = extractCandidatePairSeries(processedClientStats, transportId);
  const iceSelectedPairValues = extractIceSelectedPairValues(processedClientStats, transportId);

  const hasSend = hasOutboundRtp(processedClientStats, transportId);
  const hasRecv = hasInboundRtp(processedClientStats, transportId);
  const pathChangeData = extractPathChangeData(processedClientStats, transportId);
  const pinPrefix = clientLabel ? `${shortId(clientLabel)} > Transport ${shortId(transportId)}` : '';

  return (
    <CollapsibleSection title={title} id={`transport/${transportId}`} defaultOpen={false}>
      <InfoGrid>
        <InfoCard title="Transport details">
          <div>
            <span className={styles.label}>ID:</span> <IdBadge value={transportId} />
          </div>
          <div>
            <span className={styles.label}>Role:</span> {role}
          </div>
        </InfoCard>

        <InfoCard title="Timing">
          <div>
            <span className={styles.label}>Created:</span> {created}
          </div>
          {closedAt != null && (
            <div>
              <span className={styles.label}>Closed:</span> {closed}
            </div>
          )}
          {duration && (
            <div>
              <span className={styles.label}>Duration:</span> {duration}
            </div>
          )}
        </InfoCard>

        {transport?.tuple != null && (
          <InfoCard title="Tuple">
            <div>
              <span className={styles.label}>Local:</span>{' '}
              {transport?.tuple.localIp}:{transport?.tuple.localPort}
            </div>
            <div>
              <span className={styles.label}>Remote:</span>{' '}
              {transport?.tuple.remoteIp}:{transport?.tuple.remotePort}
            </div>
            <div>
              <span className={styles.label}>Protocol:</span> {transport?.tuple.protocol}
            </div>
          </InfoCard>
        )}
      </InfoGrid>

      <TransportStateTimeline
        transport={transport}
        iceSelectedPair={iceSelectedPairValues}
        clientSamples={clientStats}
        peerConnectionId={pcId ?? transportId}
        issueLane={issueLane}
        fallbackStart={startTime}
        fallbackEnd={endTime}
      />

      {/* The same events as the timeline, read as values rather than as a
          picture: exact times, the order, and how long each state held. */}
      <TransportStateLog
        transport={transport}
        iceSelectedPair={iceSelectedPairValues}
        clientSamples={clientStats}
        peerConnectionId={pcId ?? transportId}
        fallbackStart={startTime}
        fallbackEnd={endTime}
      />

      {(pairSeries || (scoreSeries && scoreSeries.length >= 2)) && (
        <div className={styles.chartsSection}>
          <div className={styles.chartRow}>
            {hasSend && pairSeries?.sendData && pairSeries.sendData.length >= 2 && (
              <MiniChart
                title="Send bitrate"
                description="Outgoing bitrate on this transport's selected ICE candidate pair. Drops may indicate network congestion or bandwidth estimation throttling."
                data={pairSeries.sendData}
                formatter={(v) => formatBps(v * 1000)}
                color="var(--accent)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Send bitrate` : undefined}
              />
            )}
            {hasRecv && pairSeries?.recvData && pairSeries.recvData.length >= 2 && (
              <MiniChart
                title="Recv bitrate"
                description="Incoming bitrate on this transport's selected ICE candidate pair. Drops may indicate remote-side congestion or SFU throttling."
                data={pairSeries.recvData}
                formatter={(v) => formatBps(v * 1000)}
                color="var(--success)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Recv bitrate` : undefined}
              />
            )}
            {pairSeries?.rttData && pairSeries.rttData.length >= 2 && (
              <MiniChart
                title="RTT"
                description="Round-trip time to the SFU. Good: <50ms. Acceptable: 50–150ms. Poor: >150ms. High RTT causes delay and may trigger quality reductions."
                data={pairSeries.rttData}
                formatter={(v) => `${v.toFixed(0)} ms`}
                color="var(--violet)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > RTT` : undefined}
              />
            )}
            {hasSend && pairSeries?.bweData && pairSeries.bweData.length >= 2 && (
              <MiniChart
                title="Available Outgoing Bitrate (BWE)"
                description="Browser's bandwidth estimation — the maximum bitrate the encoder is allowed to target"
                data={pairSeries.bweData}
                formatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} Mbps` : `${v.toFixed(0)} kbps`)}
                color="var(--warning)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > BWE` : undefined}
              />
            )}
            {scoreSeries && scoreSeries.length >= 2 && (
              <MiniChart
                title="Quality Score"
                description="Quality score the client computed for this transport's peer connection, 1–5. Hover a point to read the reasons the client recorded for it."
                data={scoreSeries}
                formatter={(v) => v.toFixed(2)}
                color="var(--accent)"
                yDomain={[0, 5]}
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Quality Score` : undefined}
              />
            )}
          </div>
          {(() => {
            const advancedCharts: Array<{ title: string; description: string; data: { timestamp: Date; value: number }[]; formatter: (v: number) => string; color: string }> = [];
            if (hasSend && pairSeries?.sendPktRateData && pairSeries.sendPktRateData.length >= 2) {
              advancedCharts.push({ title: 'Send Packet Rate', description: 'Packets per second being sent. Alongside bitrate, reveals packet size changes — e.g. a drop in bitrate with stable packet rate means smaller packets (audio-only fallback).', data: pairSeries.sendPktRateData, formatter: (v) => `${v.toFixed(0)} pkt/s`, color: 'var(--accent)' });
            }
            if (hasRecv && pairSeries?.recvPktRateData && pairSeries.recvPktRateData.length >= 2) {
              advancedCharts.push({ title: 'Recv Packet Rate', description: 'Packets per second being received. Sudden drops may indicate remote-side issues or SFU throttling.', data: pairSeries.recvPktRateData, formatter: (v) => `${v.toFixed(0)} pkt/s`, color: 'var(--success)' });
            }
            if (pairSeries?.consentRttData && pairSeries.consentRttData.length >= 2) {
              advancedCharts.push({ title: 'Consent RTT (ms)', description: 'ICE consent check round-trip time, measured independently from media RTT. Divergence from media RTT may indicate asymmetric routing or TURN relay overhead.', data: pairSeries.consentRttData, formatter: (v) => `${v.toFixed(1)} ms`, color: 'var(--violet)' });
            }
            if (pairSeries?.consentSuccessData && pairSeries.consentSuccessData.length >= 2 && pairSeries.consentSuccessData.some(d => d.value < 100)) {
              advancedCharts.push({ title: 'Consent Success %', description: 'Percentage of ICE consent requests that received a response. Drops below 100% are an early warning of connectivity loss — the connection will fail if consent checks keep failing.', data: pairSeries.consentSuccessData, formatter: (v) => `${v.toFixed(0)}%`, color: 'var(--warning)' });
            }
            if (pairSeries?.discardedPktData && pairSeries.discardedPktData.length >= 2) {
              advancedCharts.push({ title: 'Discarded Packets', description: 'Packets discarded at the send buffer, typically due to local network congestion or buffer overflow. Any non-zero value indicates the local network interface is struggling.', data: pairSeries.discardedPktData, formatter: (v) => v.toFixed(0), color: 'var(--danger)' });
            }
            if (pathChangeData && pathChangeData.length >= 2 && pathChangeData.some(d => d.value > 1)) {
              advancedCharts.push({ title: 'ICE Path Changes', description: 'Cumulative count of ICE candidate pair changes. Increases indicate the network path switched — e.g. relay to direct, or IP address change. Each change may cause a brief quality disruption.', data: pathChangeData, formatter: (v) => v.toFixed(0), color: 'var(--warning)' });
            }
            if (advancedCharts.length === 0) return null;
            return (
              <CollapsibleSection title={`Advanced transport metrics (${advancedCharts.length})`} defaultOpen={false}>
                <div className={styles.chartRow}>
                  {advancedCharts.map((c) => (
                    <MiniChart
                      key={c.title}
                      title={c.title}
                      description={c.description}
                      data={c.data}
                      formatter={c.formatter}
                      color={c.color}
                      eventBus={eventBus}
                      pinLabel={pinPrefix ? `${pinPrefix} > ${c.title}` : undefined}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            );
          })()}
        </div>
      )}

      {(candidates.length > 0 || pairs.length > 0) && (
        <CollapsibleSection title="ICE Candidates & Pairs" defaultOpen={false}>
          <IceCandidatesTable candidates={candidates} pairs={pairs} tuple={transport?.tuple} />
        </CollapsibleSection>
      )}
    </CollapsibleSection>
  );
}

function extractCandidates(
  stats: ProcessWebRTCStatsResult | null,
  transportId: string,
): IceCandidateEntry[] {
  if (!stats?.allObjects?.iceCandidates) return [];
  return Array.from(stats.allObjects.iceCandidates.values()).filter(
    (c) => c.peerConnectionId === transportId,
  );
}

function extractPairs(
  stats: ProcessWebRTCStatsResult | null,
  transportId: string,
): CandidatePairEntry[] {
  if (!stats?.allObjects?.candidatePairs) return [];
  return Array.from(stats.allObjects.candidatePairs.values()).filter(
    (p) => p.peerConnectionId === transportId,
  );
}

type IceSelectedPairSeries = ProcessWebRTCStatsResult['timeSeries']['iceSelectedPair'][string];

function extractIceSelectedPairValues(
  stats: ProcessWebRTCStatsResult | null,
  transportId: string,
): IceSelectedPairValue[] {
  if (!stats) return [];

  const iceMap = stats.timeSeries?.iceSelectedPair;
  if (!iceMap || typeof iceMap !== 'object') return [];

  const pc = findPeerConnection(stats, transportId);
  const pcId = pc?.peerConnectionId;

  let iceSeries: IceSelectedPairSeries | null = pcId ? (iceMap[pcId] ?? null) : null;
  if (!iceSeries) {
    iceSeries = Object.values(iceMap).find(
      (s) => s && s.peerConnectionId === pcId,
    ) ?? null;
  }
  if (!iceSeries) {
    const first = Object.values(iceMap)[0];
    if (first?.values?.length) iceSeries = first;
  }

  if (!iceSeries?.values?.length) return [];

  return iceSeries.values.map((v): IceSelectedPairValue => ({
    timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp),
    selectedCandidatePairId: v.selectedCandidatePairId ?? null,
    state: v.state ?? 'direct',
    candidateType: v.candidateType ?? v.localCandidateType ?? null,
    localCandidateType: v.localCandidateType ?? null,
    localNetworkType: v.localNetworkType ?? null,
    localAddress: v.localAddress ?? v.ip ?? null,
    localPort: v.localPort ?? null,
    localProtocol: v.localProtocol ?? null,
    ip: v.ip ?? v.localAddress ?? null,
    relayProtocol: v.relayProtocol ?? null,
    url: v.url ?? null,
    selectedCandidatePairChanges: v.selectedCandidatePairChanges ?? null,
  }));
}

function findPeerConnection(
  stats: ProcessWebRTCStatsResult,
  transportId: string,
): ProcessWebRTCStatsResult['peerConnections'][number] | null {
  const pcs = stats.peerConnections ?? [];
  let pc = pcs.find((p) => p.transportId === transportId);
  if (!pc) {
    if (pcs.length === 1) {
      pc = pcs[0];
    } else {
      const iceMap = stats.timeSeries?.iceSelectedPair ?? {};
      const iceKeys = Object.keys(iceMap);
      pc =
        pcs.find(
          (p) => p.peerConnectionId != null && iceKeys.includes(p.peerConnectionId),
        ) ?? pcs[0] ?? null;
    }
  }
  return pc ?? null;
}

interface CandidatePairChartData {
  sendData: { timestamp: Date; value: number }[];
  recvData: { timestamp: Date; value: number }[];
  rttData: { timestamp: Date; value: number }[];
  bweData: { timestamp: Date; value: number }[];
  sendPktRateData: { timestamp: Date; value: number }[];
  recvPktRateData: { timestamp: Date; value: number }[];
  consentRttData: { timestamp: Date; value: number }[];
  consentSuccessData: { timestamp: Date; value: number }[];
  discardedPktData: { timestamp: Date; value: number }[];
}

function extractCandidatePairSeries(
  stats: ProcessWebRTCStatsResult | null,
  transportId: string
): CandidatePairChartData | null {
  if (!stats) return null;

  const values = buildSelectedPairCombinedValues(stats, transportId);
  if (values.length <= 1) return null;

  const sendData: { timestamp: Date; value: number }[] = [];
  const recvData: { timestamp: Date; value: number }[] = [];
  const rttData: { timestamp: Date; value: number }[] = [];
  const bweData: { timestamp: Date; value: number }[] = [];
  const sendPktRateData: { timestamp: Date; value: number }[] = [];
  const recvPktRateData: { timestamp: Date; value: number }[] = [];
  const consentRttData: { timestamp: Date; value: number }[] = [];
  const consentSuccessData: { timestamp: Date; value: number }[] = [];
  const discardedPktData: { timestamp: Date; value: number }[] = [];

  for (const v of values) {
    const ts = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
    if (v._sendBitrateKbps != null) sendData.push({ timestamp: ts, value: v._sendBitrateKbps });
    if (v._recvBitrateKbps != null) recvData.push({ timestamp: ts, value: v._recvBitrateKbps });
    if (v._rttMs != null) rttData.push({ timestamp: ts, value: v._rttMs });
    if (v.availableOutgoingBitrate != null && v.availableOutgoingBitrate > 0) {
      bweData.push({ timestamp: ts, value: v.availableOutgoingBitrate / 1000 });
    }
    if (v._sendPacketRate != null) sendPktRateData.push({ timestamp: ts, value: v._sendPacketRate });
    if (v._recvPacketRate != null) recvPktRateData.push({ timestamp: ts, value: v._recvPacketRate });
    if (v._avgConsentRttMs != null && v._avgConsentRttMs > 0) {
      consentRttData.push({ timestamp: ts, value: v._avgConsentRttMs });
    }
    if (v._consentSuccessRate != null) {
      consentSuccessData.push({ timestamp: ts, value: v._consentSuccessRate });
    }
    if (v._discardedPackets != null && v._discardedPackets > 0) {
      discardedPktData.push({ timestamp: ts, value: v._discardedPackets });
    }
  }

  const hasAny = [sendData, recvData, rttData, bweData, sendPktRateData, recvPktRateData, consentRttData, consentSuccessData, discardedPktData].some(d => d.length >= 2);
  if (!hasAny) return null;
  return { sendData, recvData, rttData, bweData, sendPktRateData, recvPktRateData, consentRttData, consentSuccessData, discardedPktData };
}

function extractScoreSeries(
  stats: ProcessWebRTCStatsResult | null,
  transportId: string,
  startTime: number,
  endTime: number,
): { timestamp: Date; value: number; notes?: string[] }[] | null {
  if (!stats) return null;

  const pc = findPeerConnection(stats, transportId);
  const pcId = pc?.peerConnectionId;
  if (!pcId) return null;

  const perPc = stats.scores?.perPc ?? {};
  const pcData = perPc[pcId];
  if (!pcData?.values?.length) return null;

  const pts = pcData.values
    .filter((v) => {
      if (v.score == null) return false;
      const ms = v.timestamp instanceof Date ? v.timestamp.getTime() : new Date(v.timestamp).getTime();
      return ms >= startTime && ms <= endTime;
    })
    // `reasons` rides along as the point notes, so hovering the score chart
    // shows the client's own explanation for that sample.
    .map((v) => ({
      timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp),
      value: v.score,
      notes: formatScoreReasons(v.reasons, v.penalties),
    }));

  return pts.length >= 2 ? pts : null;
}

function extractPathChangeData(
  stats: ProcessWebRTCStatsResult | null,
  transportId: string,
): { timestamp: Date; value: number }[] | null {
  if (!stats) return null;
  const iceMap = stats.timeSeries?.iceSelectedPair;
  if (!iceMap || typeof iceMap !== 'object') return null;

  const pc = findPeerConnection(stats, transportId);
  const pcId = pc?.peerConnectionId;
  if (!pcId) return null;

  const iceSeries = iceMap[pcId];
  if (!iceSeries?.values?.length) return null;

  const data: { timestamp: Date; value: number }[] = [];
  for (const v of iceSeries.values) {
    if (v.selectedCandidatePairChanges != null) {
      const ts = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
      data.push({ timestamp: ts, value: v.selectedCandidatePairChanges });
    }
  }
  return data.length >= 2 ? data : null;
}

function hasOutboundRtp(stats: ProcessWebRTCStatsResult | null, transportId: string): boolean {
  if (!stats) return false;
  const outbound = stats.timeSeries?.outboundRtp ?? {};
  return Object.values(outbound).some((s) => s.peerConnectionId === transportId);
}

function hasInboundRtp(stats: ProcessWebRTCStatsResult | null, transportId: string): boolean {
  if (!stats) return false;
  const inbound = stats.timeSeries?.inboundRtp ?? {};
  return Object.values(inbound).some((s) => s.peerConnectionId === transportId);
}
