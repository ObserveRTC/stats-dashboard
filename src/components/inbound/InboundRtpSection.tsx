'use client';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import type { InboundRtpTimeSeriesEntry, ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import { toMiniChartData, hasEnoughData } from '../../utils/miniChartHelpers.ts';
import { AttachmentsCard } from '../sections/AttachmentsCard.tsx';
import { shortId, formatBytes, formatHMS } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import styles from './InboundRtpSection.module.css';

interface InboundRtpSectionProps {
  streamId: string;
  entry: InboundRtpTimeSeriesEntry;
  processedStats: ProcessWebRTCStatsResult;
  eventBus?: EventTarget;
  pinPrefix?: string;
  pcId?: string;
}

function formatKbps(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}Mbps` : `${v.toFixed(0)}kbps`;
}

export function InboundRtpSection({
  streamId,
  entry,
  processedStats,
  eventBus,
  pinPrefix,
  pcId,
}: InboundRtpSectionProps) {
  const tz = useTimezoneTick();
  const kind = entry.kind ?? 'unknown';
  const ssrc = entry.ssrc ?? entry.values[0]?.ssrc;
  const producerId = entry.producerId;
  const consumerId = entry.consumerId;
  const isVideo = kind === 'video';
  const isAudio = kind === 'audio';

  // Look up full metadata from allObjects
  const rtpMeta = processedStats.allObjects.inboundRtps.get(streamId);
  const firstSeen = rtpMeta?.firstSeen ?? 0;
  const lastSeen = rtpMeta?.lastSeen ?? 0;
  const bytesReceived = rtpMeta?.bytesReceived;
  // Track-level attachments stored when samples were processed
  const attachments = rtpMeta?.trackAttachments ?? null;

  const titleStr = pcId
    ? <>{`↓ ${kind} — SSRC ${ssrc ?? '?'} — ${shortId(streamId)}`} <IdBadge value={pcId}>{`PC ${shortId(pcId)}`}</IdBadge></>
    : `↓ ${kind} — SSRC ${ssrc ?? '?'} — ${shortId(streamId)}`;

  const v = entry.values;

  const bitrateData = toMiniChartData(v, '_actualBitrateKbps');
  const lossData = toMiniChartData(v, '_packetLossRatePct');
  const jitterData = toMiniChartData(v, 'jitter').map((d) => ({ ...d, value: d.value * 1000 }));
  const jbDelayData = toMiniChartData(v, '_jbDelayMs');
  // Video-only
  const resolutionData = toMiniChartData(v, '_resolution');
  const fpsData = toMiniChartData(v, 'framesPerSecond');
  const freezeData = toMiniChartData(v, '_freezeFractionPct');
  // Audio-only
  const audioLevelData = toMiniChartData(v, 'audioLevel');
  const concealmentData = toMiniChartData(v, '_concealmentPct');


  const pin = pinPrefix ? `${pinPrefix} > ↓${kind} ${shortId(streamId)}` : undefined;

  return (
    <CollapsibleSection
      title={titleStr}
      id={`inbound/${streamId}`}
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
          {consumerId && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Consumer ID:</span>{' '}
              <IdBadge value={consumerId}>{shortId(consumerId)}</IdBadge>
            </div>
          )}
          {producerId && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Producer ID:</span>{' '}
              <IdBadge value={producerId}>{shortId(producerId)}</IdBadge>
            </div>
          )}
          {bytesReceived != null && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Bytes received:</span>{' '}
              {formatBytes(bytesReceived)}
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
            title="Bitrate received"
            description="Actual inbound bitrate in kbps/Mbps."
            data={bitrateData}
            formatter={formatKbps}
            color="var(--accent)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Bitrate` : undefined}
          />
        )}
        {hasEnoughData(lossData) && (
          <MiniChart
            title="Packet loss"
            description="Inbound packet loss rate as a percentage."
            data={lossData}
            formatter={(v) => `${v.toFixed(1)}%`}
            color="var(--danger)"
            yDomain={[0, 100]}
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Packet loss` : undefined}
          />
        )}
        {jitterData.filter((d) => d.value !== 0).length >= 2 && (
          <MiniChart
            title="Jitter"
            description="Network jitter in milliseconds. High jitter causes audio/video instability."
            data={jitterData}
            formatter={(v) => `${v.toFixed(1)}ms`}
            color="var(--warning)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Jitter` : undefined}
          />
        )}
        {hasEnoughData(jbDelayData) && (
          <MiniChart
            title="Jitter buffer delay"
            description="Average jitter buffer delay in milliseconds."
            data={jbDelayData}
            formatter={(v) => `${v.toFixed(1)}ms`}
            color="var(--violet)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > JB delay` : undefined}
          />
        )}
        {isVideo && hasEnoughData(resolutionData) && (
          <MiniChart
            title="Resolution"
            description="Decoded video resolution in pixels."
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
            description="Decoded frames per second."
            data={fpsData}
            formatter={(v) => `${v.toFixed(1)}fps`}
            color="var(--success)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Framerate` : undefined}
          />
        )}
        {isVideo && hasEnoughData(freezeData) && (
          <MiniChart
            title="Freeze fraction"
            description="Fraction of time the video was frozen, as a percentage."
            data={freezeData}
            formatter={(v) => `${v.toFixed(1)}%`}
            color="var(--danger)"
            yDomain={[0, 100]}
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Freeze` : undefined}
          />
        )}
        {isAudio && audioLevelData.filter((d) => d.value !== 0).length >= 2 && (
          <MiniChart
            title="Audio level"
            description="Audio energy level (0–1 scale)."
            data={audioLevelData}
            formatter={(v) => v.toFixed(3)}
            color="var(--success)"
            yDomain={[0, 1]}
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Audio level` : undefined}
          />
        )}
        {isAudio && hasEnoughData(concealmentData) && (
          <MiniChart
            title="Concealment"
            description="Percentage of audio samples that were concealed due to packet loss."
            data={concealmentData}
            formatter={(v) => `${v.toFixed(1)}%`}
            color="var(--warning)"
            eventBus={eventBus}
            pinLabel={pin ? `${pin} > Concealment` : undefined}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
