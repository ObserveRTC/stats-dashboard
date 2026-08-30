'use client';
import { useState } from 'react';
import type { ServerProducer as Producer } from '../../utils/routerServerData.ts';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsProcessor.ts';
import type { OutboundTimeSeriesValue } from '../../utils/statsTypes.ts';
// RecordingOverlay — minimal overlay for timeline bands
interface RecordingOverlay {
  start: number;
  end: number;
  label?: string;
  color: string;
}
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { CopyMetricsCsvButton } from '../sections/CopyMetricsCsvButton.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { Timeline } from '../charts/Timeline.tsx';
import { QualityTimeline } from '../charts/QualityTimeline.tsx';
import { StatusBadge } from '../sections/StatusBadge.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { TrackDetails } from '../sections/TrackDetails.tsx';
import { producerIssueLaneItems } from '../../utils/issueTimelinePlacement.ts';
import type { ClientTrackView } from '../../utils/clientTracks.ts';
import { formatHMS, formatBps, formatCodecDetails, formatTimeOnly, shortId, lifecycleDuration, tsMs } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { QUALITY_LIMITATION_COLORS, QUALITY_LIMITATION_LABELS } from '../../utils/qualityClassifier.ts';
import { buildChartData, getTrackScoreBadge, extractTimeSeries, detectChanges, type ChartDef } from '../../utils/chartHelpers.ts';
import styles from './ProducerSection.module.css';

interface ProducerSectionProps {
  producer: Producer;
  processedClientStats: ProcessWebRTCStatsResult | null;
  paneKey: string;
  clientStats?: ClientSample[];
  eventBus?: EventTarget;
  /** Client identifier for cross-chart comparison labels. */
  clientLabel?: string;
  /** Recording overlays to render as faint background bands on the Timeline. */
  recordingOverlays?: RecordingOverlay[];
  /**
   * The client's own outbound tracks feeding this producer, matched on
   * `attachments.producerId`. Carries the track score and the reasons for it.
   */
  tracks?: ClientTrackView[];
  /** Render without the outer collapsible wrapper (for embedding in modals). */
  embedded?: boolean;
}

export function ProducerSection({
  producer,
  processedClientStats,
  paneKey: _paneKey,
  clientStats,
  eventBus,
  clientLabel,
  recordingOverlays,
  tracks,
  embedded,
}: ProducerSectionProps) {
  const tz = useTimezoneTick();
  const { id: producerId, kind, createdAt, closedAt, codecInfo } = producer;
  const pinPrefix = clientLabel ? `${shortId(clientLabel)} > ${producer.label || kind} ${shortId(producerId)}` : '';
  const isVideo = kind === 'video';
  const isActive = closedAt == null;
  const startTime = createdAt ?? 0;
  const [now] = useState(Date.now);
  const endTime = closedAt ?? now;

  // Issues the client raised against this producer or the track feeding it,
  // drawn as a lane under the lifecycle bar.
  const issueLane = producerIssueLaneItems(clientStats, processedClientStats, producer, tz);

  const layers = findOutboundLayersForProducer(processedClientStats, producer);
  const scoreBadge = getTrackScoreBadge(processedClientStats, producerId, 'outbound', 'producerId', producer.history);

  const audioSeries = processedClientStats?.timeSeries?.mediaSourceAudio?.[producerId]?.values;
  const videoSeries = processedClientStats?.timeSeries?.mediaSourceVideo?.[producerId]?.values;

  const audioLevelData = kind === 'audio' ? extractTimeSeries(audioSeries, 'audioLevel', startTime, endTime) : [];
  const echoReturnLossData = kind === 'audio' ? extractTimeSeries(audioSeries, 'echoReturnLoss', startTime, endTime).filter(d => d.value > -100) : [];
  const echoEnhancementData = kind === 'audio' ? extractTimeSeries(audioSeries, 'echoReturnLossEnhancement', startTime, endTime).filter(d => d.value > 0) : [];
  const captureFpsData = isVideo ? extractTimeSeries(videoSeries, 'framesPerSecond', startTime, endTime) : [];
  const captureResolutionData = isVideo ? extractTimeSeries(videoSeries, 'height', startTime, endTime) : [];

  const encoderImplChanges = isVideo ? layers.flatMap(l => detectChanges(l.values, '_encoderImpl', l.rid ?? String(l.ssrc ?? '?'))) : [];
  const scalabilityModeChanges = isVideo ? layers.flatMap(l => detectChanges(l.values, '_scalabilityMode', l.rid ?? String(l.ssrc ?? '?'))) : [];

  const created = formatHMS(createdAt, tz);
  const closed = closedAt != null ? formatHMS(closedAt, tz) : null;
  const duration = lifecycleDuration(createdAt, closedAt);
  const codecStr = formatCodecDetails(codecInfo);

  const title = (
    <>
      <span className={styles.kindBadge} data-kind={kind}>{kind}</span>
      Producer <IdBadge value={producerId}>{shortId(producerId)}</IdBadge> · {producer.label || '—'} · {created}
      {closed && ` – ${closed}`}
      {duration && ` (${duration})`}
      {' '}
      <StatusBadge status={isActive ? 'active' : 'inactive'} />
      {scoreBadge && (
        <span className={styles.scoreBadge} style={{ background: `${scoreBadge.color}20`, color: scoreBadge.color }} title={`Average quality score: ${scoreBadge.avg.toFixed(1)}/5`}>
          {scoreBadge.avg.toFixed(1)}
        </span>
      )}
    </>
  );

  const content = (
    <>
      <InfoGrid>
        <InfoCard title="Media info">
          <div><span className={styles.label}>Type:</span> {producer.kind}</div>
          <div><span className={styles.label}>Label:</span> {producer.label || '—'}</div>
          <div><span className={styles.label}>Codec:</span> {codecStr}</div>
        </InfoCard>
        <InfoCard title="Technical">
          <div><span className={styles.label}>ID:</span> <IdBadge value={producerId} /></div>
          <div><span className={styles.label}>Transport:</span> <IdBadge value={producer.transportId} /></div>
          {producer.ssrcs && producer.ssrcs.length > 0 && <div><span className={styles.label}>SSRCs:</span> {producer.ssrcs.join(', ')}</div>}
          {producer.rids && producer.rids.length > 0 && <div><span className={styles.label}>RIDs:</span> {producer.rids.join(', ')}</div>}
        </InfoCard>
        <InfoCard title="Timing">
          <div><span className={styles.label}>Created:</span> {created}</div>
          {closed != null && <div><span className={styles.label}>Closed:</span> {closed}</div>}
          {duration && <div><span className={styles.label}>Duration:</span> {duration}</div>}
        </InfoCard>
      </InfoGrid>

      <TrackDetails tracks={tracks ?? []} eventBus={eventBus} pinPrefix={pinPrefix} />

      <Timeline
        title="Timeline · Producer"
        description="Producer lifecycle showing active/paused state over time. 'active' means media is being sent. 'inactive' means the producer is paused — remote clients won't receive this track. Faint colored bands indicate when a take was being recorded."
        data={producer}
        eventBus={eventBus}
        overlays={recordingOverlays?.map((o) => ({
          start: o.start,
          end: o.end,
          color: o.color,
          label: o.label,
          tooltip: `${o.label ? `<strong>${o.label}</strong><br/>` : ''}${formatTimeOnly(o.start, tz)} – ${formatTimeOnly(o.end, tz)}<br/>${((o.end - o.start) / 1000).toFixed(1)}s overlap`,
        }))}
        issueLane={issueLane}
        pinLabel={pinPrefix ? `${pinPrefix} > Timeline` : undefined}
      />

      {audioLevelData.length >= 2 && (
        <div className={styles.chartsSection}>
          <div className={styles.chartGrid}>
            <MiniChart
              title="Audio Level"
              description="RMS audio amplitude (0–1) from media source"
              data={audioLevelData}
              formatter={(v) => v.toFixed(4)}
              color="var(--accent)"
              eventBus={eventBus}
              pinLabel={pinPrefix ? `${pinPrefix} > Audio Level` : undefined}
            />
          </div>
        </div>
      )}

      {(echoReturnLossData.length >= 2 || echoEnhancementData.length >= 2) && (
        <CollapsibleSection title={`Echo Metrics (${[echoReturnLossData, echoEnhancementData].filter(d => d.length >= 2).length})`} defaultOpen={false}>
          <div className={styles.chartGrid}>
            {echoReturnLossData.length >= 2 && (
              <MiniChart
                title="Echo Return Loss (dB)"
                description="Echo return loss — higher (less negative) means less echo leaking through"
                data={echoReturnLossData}
                formatter={(v) => `${v.toFixed(1)} dB`}
                color="var(--text-muted)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Echo Return Loss` : undefined}
              />
            )}
            {echoEnhancementData.length >= 2 && (
              <MiniChart
                title="Echo Return Loss Enhancement (dB)"
                description="Improvement in echo cancellation — higher means better suppression"
                data={echoEnhancementData}
                formatter={(v) => `${v.toFixed(2)} dB`}
                color="var(--text-muted)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Echo RL Enhancement` : undefined}
              />
            )}
          </div>
        </CollapsibleSection>
      )}

      {(captureFpsData.length >= 2 || captureResolutionData.length >= 2 || encoderImplChanges.length > 0 || scalabilityModeChanges.length > 0) && (
        <div className={styles.chartsSection}>
          <h5 className={styles.sectionTitle}>Camera source metrics</h5>
          <div className={styles.chartGrid}>
            {captureFpsData.length >= 2 && (
              <MiniChart
                title="Capture FPS"
                description="Frames per second from the camera. Compare with Encode FPS per layer — any gap means frames are being dropped before encoding due to CPU pressure or encoder backlog."
                data={captureFpsData}
                formatter={(v) => `${v.toFixed(1)} fps`}
                color="var(--accent)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Capture FPS` : undefined}
              />
            )}
            {captureResolutionData.length >= 2 && (
              <MiniChart
                title="Capture Resolution"
                description="Video height captured from the camera. Should stay constant. Changes indicate the application or browser adjusted the camera capture resolution."
                data={captureResolutionData}
                formatter={(v) => `${v}p`}
                color="var(--accent)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > Capture Resolution` : undefined}
              />
            )}
          </div>
          {encoderImplChanges.length > 0 && (
            <div className={styles.infoNote}>Encoder changed: {encoderImplChanges.join('; ')}</div>
          )}
          {scalabilityModeChanges.length > 0 && (
            <div className={styles.infoNote}>Scalability mode changed: {scalabilityModeChanges.join('; ')}</div>
          )}
        </div>
      )}

      {layers.length > 1 && isVideo && (
        <CollapsibleSection title="Simulcast Layer Comparison" defaultOpen={false}>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.layerCompareTable}>
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Resolution</th>
                  <th>FPS</th>
                  <th>Target Bitrate</th>
                  <th>Actual Bitrate</th>
                  <th>Encode Time</th>
                  <th>Scalability</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((layer, idx) => {
                  const last = layer.values[layer.values.length - 1];
                  if (!last) return null;
                  return (
                    <tr key={layer.key}>
                      <td>{layer.rid ? `RID: ${layer.rid}` : layer.ssrc ? `SSRC: ${layer.ssrc}` : `Layer ${idx + 1}`}</td>
                      <td>{last.frameWidth && last.frameHeight ? `${last.frameWidth}x${last.frameHeight}` : '—'}</td>
                      <td>{last.framesPerSecond != null ? `${last.framesPerSecond} fps` : '—'}</td>
                      <td>{last.targetBitrate != null ? formatBps(last.targetBitrate) : '—'}</td>
                      <td>{last._actualBitrateKbps != null ? formatBps(last._actualBitrateKbps * 1000) : '—'}</td>
                      <td>{last.encodeTimePerFrame != null ? `${last.encodeTimePerFrame.toFixed(1)} ms` : '—'}</td>
                      <td>{last._scalabilityMode || last.scalabilityMode || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      {layers.map((layer, layerIdx) => {
        const primaryDefs: ChartDef[] = [
          { title: 'Target Bitrate (kbps)', tip: 'Bitrate the encoder is targeting based on bandwidth estimation. Drops mean the browser detected congestion and is reducing quality.', extract: (v) => v.targetBitrate != null ? v.targetBitrate / 1000 : undefined, formatter: (v) => v.toFixed(0), needNonZero: true, condition: isVideo },
          { title: 'Actual Bitrate (kbps)', tip: 'Real throughput from bytes sent. Should track target bitrate closely. Large gaps mean the encoder can\'t keep up (CPU limited) or the network is dropping packets.', extract: (v) => v._actualBitrateKbps, formatter: (v) => formatBps(v * 1000), needNonZero: true },
          { title: 'Frame Rate (FPS)', tip: 'Frames per second being sent. Good: matches capture rate (15–30 fps). Drops below 10 fps indicate CPU pressure or bandwidth limiting.', extract: (v) => v.framesPerSecond, formatter: (v) => `${v.toFixed(1)} fps`, needNonZero: true, condition: isVideo },
          { title: 'Resolution', tip: 'Video height in pixels being sent. Drops from the source resolution mean the encoder is scaling down due to CPU or bandwidth constraints.', extract: (v) => v.frameHeight || undefined, formatter: (v) => `${v}p`, needNonZero: true, condition: isVideo },
          { title: 'Encode Time/Frame (ms)', tip: 'Average time to encode one frame. Good: <10ms. Warning: 10–30ms. Bad: >30ms. High values indicate CPU pressure and may cause frame drops.', extract: (v) => v.encodeTimePerFrame, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true, condition: isVideo },
          { title: 'Encode CPU %', tip: 'Fraction of wall-clock time spent encoding. Good: <50%. Warning: 50–80%. Bad: >80%. High values trigger quality limitation and resolution/fps drops.', extract: (v) => v.encodeCpuPercent, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
          { title: 'Packets Sent', tip: 'Cumulative RTP packets sent. A flattening curve means the producer stopped sending, possibly paused or network blocked.', extract: (v) => v.packetsSent, needNonZero: true },
          { title: 'Quality Issues (NACK+PLI+FIR)', tip: 'Sum of receiver feedback requests. NACK = retransmit request, PLI = picture loss, FIR = full key frame request. Any rising trend indicates the receiver is struggling.', extract: (v) => (v.nackCount || 0) + (v.pliCount || 0) + (v.firCount || 0), needNonZero: true },
        ];

        const advancedDefs: ChartDef[] = [
          { title: 'QL Bandwidth %', tip: 'Percentage of time the encoder was bandwidth-limited during this interval. >0% means the network couldn\'t handle the target bitrate, causing the encoder to reduce quality.', extract: (v) => v._qlBandwidthPct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
          { title: 'QL CPU %', tip: 'Percentage of time the encoder was CPU-limited during this interval. >0% means the device couldn\'t encode fast enough, causing resolution or framerate drops.', extract: (v) => v._qlCpuPct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
          { title: 'QL Other %', tip: 'Percentage of time the encoder was limited by other factors (not bandwidth or CPU). Rare — may indicate browser-internal throttling.', extract: (v) => v._qlOtherPct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
          { title: 'Average QP', tip: 'Quantization Parameter — higher means more compression. Good: <25. Warning: 25–35. Bad: >35. Rising QP means the encoder is struggling (CPU or bandwidth limited).', extract: (v) => v._avgQp, formatter: (v) => v.toFixed(1), needNonZero: true, condition: isVideo },
          { title: 'BW Utilization %', tip: 'How much of the available bandwidth estimate is being used. Good: 50–90%. Low values may mean the encoder is CPU-limited. >95% may cause congestion.', extract: (v) => v._bwUtilPct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
          { title: 'Retransmission %', tip: 'Percentage of bytes retransmitted. Good: <2%. Higher values indicate the receiver is requesting retransmissions due to packet loss.', extract: (v) => v._retransmitPct, formatter: (v) => `${v.toFixed(2)}%`, needNonZero: true },
          { title: 'Packet Send Delay (ms)', tip: 'Average time packets wait in the send queue before being sent. Good: <10ms. High values indicate local network congestion.', extract: (v) => v._pktSendDelayMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true },
          { title: 'Key Frames Encoded', tip: 'Number of key (I) frames encoded. Frequent key frames reduce compression efficiency but help receivers recover from errors.', extract: (v) => v._keyFrames, needNonZero: true, condition: isVideo },
          { title: 'QL Resolution Changes', tip: 'Number of times the encoder changed resolution due to quality limitation (CPU or bandwidth). Each change is a visible quality shift for remote viewers.', extract: (v) => v._qlResChanges, needNonZero: true, condition: isVideo },
          { title: 'Huge Frames', tip: 'Frames significantly larger than average, typically caused by key frames or scene changes. Each huge frame causes a latency spike as it takes longer to transmit.', extract: (v) => v._hugeFramesDelta, needNonZero: true, condition: isVideo },
          { title: 'Pause Fraction %', tip: 'Percentage of time the video track was paused during this interval. High values on a supposedly active track may indicate application-level issues.', extract: (v) => v._pauseFractionPct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
          { title: 'NACK Count', tip: 'Negative acknowledgements received from the remote side requesting retransmission. Rising count indicates the receiver is experiencing packet loss.', extract: (v) => v.nackCount, needNonZero: true },
          { title: 'PLI Count', tip: 'Picture Loss Indication — receiver requests a new key frame because it lost too many packets to decode. Bad: any count >0 means visible artifacts occurred.', extract: (v) => v.pliCount, needNonZero: true, condition: isVideo },
          { title: 'FIR Count', tip: 'Full Intra Request — receiver needs a complete key frame, usually after joining or severe loss. Similar to PLI but more aggressive.', extract: (v) => v.firCount, needNonZero: true, condition: isVideo },
        ];

        const remoteInboundDefs: ChartDef[] = [
          { title: 'Remote RTT (ms)', tip: 'Round-trip time as reported by the remote receiver via RTCP RR. Good: <100ms. Warning: 100–300ms. Bad: >300ms.', extract: (v) => v._remoteRttMs, formatter: (v) => `${v.toFixed(1)} ms` },
          { title: 'Remote Avg RTT (ms)', tip: 'Average round-trip time computed from totalRoundTripTime/measurements. Smooths out individual RTT spikes to show the trend.', extract: (v) => v._remoteAvgRttMs, formatter: (v) => `${v.toFixed(1)} ms` },
          { title: 'Remote Fraction Lost %', tip: 'Packet loss as reported by the remote receiver. Good: <0.5%. Warning: 0.5–2%. Bad: >2%.', extract: (v) => v._remoteFractionLostPct, formatter: (v) => `${v.toFixed(3)}%` },
          { title: 'Remote Packets Lost', tip: 'Cumulative packets lost as reported by the remote receiver via RTCP RR. A rising count means the receiver is consistently missing packets.', extract: (v) => v._remotePacketsLost },
          { title: 'Remote Packets Lost (delta)', tip: 'New packets lost per interval as reported by the remote receiver. Spikes indicate burst loss events visible to the remote side.', extract: (v) => v._remotePacketsLostDelta, needNonZero: true },
          { title: 'Remote Jitter (ms)', tip: 'Inter-packet jitter as reported by the remote receiver. Good: <30ms. Warning: 30–75ms. Bad: >75ms.', extract: (v) => v._remoteJitterMs, formatter: (v) => `${v.toFixed(2)} ms` },
        ];

        const primaryCharts = buildChartData(layer.values, primaryDefs);
        const advancedCharts = buildChartData(layer.values, advancedDefs);
        const remoteInboundCharts = buildChartData(layer.values, remoteInboundDefs);

        // One series per simulcast layer: each layer's button copies that
        // layer alone, which is what makes comparing rids in a spreadsheet
        // possible rather than handing over one interleaved blob.
        const getLayerRows = () => layer.values as unknown as Record<string, unknown>[];

        const qlSamples = isVideo
          ? layer.values
              .filter((v) => v.qualityLimitationReason)
              .map((v) => ({
                timestamp: tsMs(v.timestamp),
                state: v.qualityLimitationReason!,
              }))
          : [];

        if (primaryCharts.length === 0 && advancedCharts.length === 0) return null;

        const layerLabel = layer.rid ? `RID: ${layer.rid}` : layer.ssrc ? `SSRC: ${layer.ssrc}` : `Stream ${layerIdx + 1}`;

        return (
          <div key={layer.key} className={styles.chartsSection}>
            <div className={styles.sectionTitleRow}>
              <h5 className={styles.sectionTitle}>
                {layers.length > 1
                  ? `Layer ${layerIdx + 1} (${layerLabel})`
                  : 'Outbound RTP metrics'}
              </h5>
              <CopyMetricsCsvButton
                getRows={getLayerRows}
                title="Copy every outbound RTP field for this stream, across the session, as CSV"
              />
            </div>

            {qlSamples.length > 1 && (
              <QualityTimeline
                title="Quality Limitation"
                description="Reason the encoder is limiting quality. 'none' is ideal. 'bandwidth' means the network can't handle more. 'cpu' means the device is overloaded. Both cause resolution/framerate drops."
                samples={qlSamples}
                startTime={startTime}
                endTime={endTime}
                eventBus={eventBus}
                colorMap={QUALITY_LIMITATION_COLORS}
                labelMap={QUALITY_LIMITATION_LABELS}
                pinLabel={pinPrefix ? `${pinPrefix} ${layerLabel} > Quality Limitation` : undefined}
              />
            )}

            <div className={styles.chartGrid}>
              {primaryCharts.map((c) => (
                <MiniChart
                  key={`${layer.key}-${c.title}`}
                  title={c.title}
                  description={c.tip}
                  data={c.data}
                  formatter={c.formatter}
                  color="var(--accent)"
                  eventBus={eventBus}
                  pinLabel={pinPrefix ? `${pinPrefix} ${layerLabel} > ${c.title}` : undefined}
                />
              ))}
            </div>

            {advancedCharts.length > 0 && (
              <CollapsibleSection
                title={`Advanced metrics (${advancedCharts.length})`}
                defaultOpen={false}
                getCsvRows={getLayerRows}
              >
                <div className={styles.chartGrid}>
                  {advancedCharts.map((c) => (
                    <MiniChart
                      key={`${layer.key}-adv-${c.title}`}
                      title={c.title}
                      description={c.tip}
                      data={c.data}
                      formatter={c.formatter}
                      color="var(--text-muted)"
                      eventBus={eventBus}
                      pinLabel={pinPrefix ? `${pinPrefix} ${layerLabel} > ${c.title}` : undefined}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {remoteInboundCharts.length > 0 && (
              <CollapsibleSection
                title={`Remote inbound metrics (${remoteInboundCharts.length})`}
                defaultOpen={false}
                getCsvRows={getLayerRows}
              >
                <div className={styles.chartGrid}>
                  {remoteInboundCharts.map((c) => (
                    <MiniChart
                      key={`${layer.key}-ri-${c.title}`}
                      title={c.title}
                      description={c.tip}
                      data={c.data}
                      formatter={c.formatter}
                      color="var(--text-muted)"
                      eventBus={eventBus}
                      pinLabel={pinPrefix ? `${pinPrefix} ${layerLabel} > ${c.title}` : undefined}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        );
      })}

    </>
  );

  if (embedded) return content;

  return (
    <CollapsibleSection title={title} id={`producer/${producerId}`} defaultOpen={false}>
      {content}
    </CollapsibleSection>
  );
}

interface LayerData {
  key: string;
  ssrc?: number;
  rid?: string;
  values: OutboundTimeSeriesValue[];
}

function filterValuesInRange(
  values: OutboundTimeSeriesValue[],
  start: number,
  end: number,
): OutboundTimeSeriesValue[] {
  return values.filter((v) => {
    const ts = v.timestamp instanceof Date ? v.timestamp.getTime() : new Date(v.timestamp).getTime();
    return ts >= start && ts <= end;
  });
}

function mapOutboundLayers(
  series: ProcessWebRTCStatsResult['timeSeries']['outboundRtp'],
  filter: (entry: (typeof series)[string]) => boolean,
  producerStart: number,
  producerEnd: number,
): LayerData[] {
  return Object.entries(series)
    .filter(([, entry]) => filter(entry))
    .map(([key, entry]) => ({
      key,
      ssrc: entry.ssrc,
      rid: typeof entry.rid === 'string' ? entry.rid : undefined,
      values: filterValuesInRange(entry.values, producerStart, producerEnd),
    }))
    .filter((s) => s.values.length > 0);
}

function findOutboundLayersForProducer(
  stats: ProcessWebRTCStatsResult | null,
  producer: Producer,
): LayerData[] {
  const series = stats?.timeSeries?.outboundRtp;
  if (!series) return [];

  const producerStart = producer.createdAt ?? 0;
  const producerEnd = producer.closedAt ?? Infinity;

  const byProducerId = mapOutboundLayers(
    series,
    (entry) => entry.producerId === producer.id,
    producerStart,
    producerEnd,
  );
  if (byProducerId.length > 0) return byProducerId;

  const onTransport = mapOutboundLayers(
    series,
    (entry) => entry.peerConnectionId === producer.transportId,
    producerStart,
    producerEnd,
  );

  const matchByField = (ids: (number | string)[], field: 'ssrc' | 'rid') =>
    onTransport.filter((s) => s[field] != null && ids.includes(s[field] as number | string));

  if (producer.rids && onTransport.some((s) => s.rid)) {
    return matchByField(producer.rids, 'rid');
  }
  if (producer.ssrcs) {
    return matchByField(producer.ssrcs, 'ssrc');
  }
  return [];
}
