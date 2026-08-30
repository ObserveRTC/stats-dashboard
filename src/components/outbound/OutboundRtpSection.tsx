'use client';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import type { OutboundRtpTimeSeriesEntry, ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import { toMiniChartData, hasEnoughData } from '../../utils/miniChartHelpers.ts';
import { AttachmentsCard } from '../sections/AttachmentsCard.tsx';
import { shortId, formatBytes, formatHMS } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import styles from './OutboundRtpSection.module.css';

interface OutboundRtpSectionProps {
  streamId: string;
  entry: OutboundRtpTimeSeriesEntry;
  processedStats: ProcessWebRTCStatsResult;
  eventBus?: EventTarget;
  pinPrefix?: string;
  pcId?: string;
}

function formatKbps(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}Mbps` : `${v.toFixed(0)}kbps`;
}

export function OutboundRtpSection({
  streamId,
  entry,
  processedStats,
  eventBus,
  pinPrefix,
  pcId,
}: OutboundRtpSectionProps) {
  const tz = useTimezoneTick();
  const kind = entry.kind ?? 'unknown';
  const ssrc = entry.ssrc ?? entry.values[0]?.ssrc;
  const label = entry.label;
  const producerId = entry.producerId;
  const isVideo = kind === 'video';

  // Look up full metadata from allObjects
  const rtpMeta = processedStats.allObjects.outboundRtps.get(streamId);
  const firstSeen = rtpMeta?.firstSeen ?? 0;
  const lastSeen = rtpMeta?.lastSeen ?? 0;
  const bytesSent = rtpMeta?.bytesSent;
  // Track-level attachments stored when samples were processed
  const attachments = rtpMeta?.trackAttachments ?? null;

  const titleParts: string[] = [`↑ ${kind}`];
  if (label) titleParts.push(label);
  titleParts.push(`— SSRC ${ssrc ?? '?'}`);
  titleParts.push(`— ${shortId(streamId)}`);
  const titleStr = pcId
    ? <>{titleParts.join(' ')} <IdBadge value={pcId}>{`PC ${shortId(pcId)}`}</IdBadge></>
    : titleParts.join(' ');

  const v = entry.values;

  const bitrateData = toMiniChartData(v, '_actualBitrateKbps');
  const lossData = toMiniChartData(v, '_remoteFractionLostPct');
  const rttData = toMiniChartData(v, '_remoteRttMs');
  const qlBwData = toMiniChartData(v, '_qlBandwidthPct');
  const qlCpuData = toMiniChartData(v, '_qlCpuPct');
  const resolutionData = toMiniChartData(v, '_resolution');
  const fpsData = toMiniChartData(v, 'framesPerSecond');
  const encodeTimeData = toMiniChartData(v, 'encodeTimePerFrame');

  const pin = pinPrefix ? `${pinPrefix} > ↑${kind} ${shortId(streamId)}` : undefined;

  return (
    <CollapsibleSection
      title={titleStr}
      id={`outbound/${streamId}`}
      defaultOpen={false}
    >
      <InfoGrid>
        <InfoCard title="Stream info">
          <div className={styles.infoRow}>
            <span className={styles.label}>Kind:</span> {kind}
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>SSRC:</span> {ssrc ?? '—'}
          </div>
          {label && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Label:</span> {label}
            </div>
          )}
          {producerId && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Producer ID:</span>{' '}
              <IdBadge value={producerId}>{shortId(producerId)}</IdBadge>
            </div>
          )}
          {bytesSent != null && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Bytes sent:</span>{' '}
              {formatBytes(bytesSent)}
            </div>
          )}
        </InfoCard>

        <InfoCard title="Timing">
          {firstSeen > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.label}>First seen:</span> {formatHMS(firstSeen, tz)}
            </div>
          )}
          {lastSeen > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Last seen:</span> {formatHMS(lastSeen, tz)}
            </div>
          )}
          {firstSeen > 0 && lastSeen > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Duration:</span>{' '}
              {Math.round((lastSeen - firstSeen) / 1000)}s
            </div>
          )}
        </InfoCard>

        <AttachmentsCard attachments={attachments} />
      </InfoGrid>

      <div className={styles.chartsGrid}>
        {hasEnoughData(bitrateData) && (
          <MiniChart
            title="Bitrate"
            description="Actual outbound bitrate in kbps/Mbps."
            data={bitrateData}
            formatter={formatKbps}
            color="var(--accent)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Bitrate` : undefined}
          />
        )}
        {hasEnoughData(lossData) && (
          <MiniChart
            title="Packet loss (remote)"
            description="Remote-side fraction of packets lost as a percentage."
            data={lossData}
            formatter={(v) => `${v.toFixed(1)}%`}
            color="var(--danger)"
            yDomain={[0, 100]}
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Packet loss` : undefined}
          />
        )}
        {hasEnoughData(rttData) && (
          <MiniChart
            title="RTT"
            description="Round-trip time reported by the remote receiver."
            data={rttData}
            formatter={(v) => `${v.toFixed(0)}ms`}
            color="var(--warning)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > RTT` : undefined}
          />
        )}
        {hasEnoughData(qlBwData) && (
          <MiniChart
            title="QL: bandwidth"
            description="Percentage of time quality limitation is due to bandwidth constraints."
            data={qlBwData}
            formatter={(v) => `${v.toFixed(1)}%`}
            color="var(--danger)"
            yDomain={[0, 100]}
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > QL bandwidth` : undefined}
          />
        )}
        {hasEnoughData(qlCpuData) && (
          <MiniChart
            title="QL: CPU"
            description="Percentage of time quality limitation is due to CPU constraints."
            data={qlCpuData}
            formatter={(v) => `${v.toFixed(1)}%`}
            color="var(--warning)"
            yDomain={[0, 100]}
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > QL CPU` : undefined}
          />
        )}
        {isVideo && hasEnoughData(resolutionData) && (
          <MiniChart
            title="Resolution"
            description="Encoded video resolution in pixels (width × height)."
            data={resolutionData}
            formatter={(v) => `${v.toFixed(0)}px`}
            color="var(--accent)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Resolution` : undefined}
          />
        )}
        {isVideo && hasEnoughData(fpsData) && (
          <MiniChart
            title="Framerate"
            description="Encoded frames per second."
            data={fpsData}
            formatter={(v) => `${v.toFixed(1)}fps`}
            color="var(--success)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Framerate` : undefined}
          />
        )}
        {isVideo && hasEnoughData(encodeTimeData) && (
          <MiniChart
            title="Encode time/frame"
            description="Average encode time per frame in milliseconds."
            data={encodeTimeData}
            formatter={(v) => `${v.toFixed(1)}ms`}
            color="var(--violet)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Encode time` : undefined}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
