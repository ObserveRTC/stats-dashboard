'use client';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import type { InboundTimeSeriesValue, TimeSeriesValueBase } from '../../utils/statsTypes.ts';
import type { ServerConsumer as Consumer, CodecInfo } from '../../utils/routerServerData.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { CopyMetricsCsvButton } from '../sections/CopyMetricsCsvButton.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { StackedConsumerTimeline } from '../charts/StackedConsumerTimeline.tsx';
import { StatusBadge } from '../sections/StatusBadge.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { TrackDetails } from '../sections/TrackDetails.tsx';
import { consumerIssueLaneItems } from '../../utils/issueTimelinePlacement.ts';
import type { ClientTrackView } from '../../utils/clientTracks.ts';
import { formatHMS, formatBps, formatCodecDetails, shortId, lifecycleDuration, tsMs } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { buildChartData, getTrackScoreBadge, detectChanges, type ChartDef } from '../../utils/chartHelpers.ts';
import styles from './ConsumerSection.module.css';

interface ConsumerSectionProps {
  consumer: Consumer;
  processedClientStats: ProcessWebRTCStatsResult | null;
  paneKey: string;
  clientStats?: ClientSample[];
  eventBus?: EventTarget;
  clientLabel?: string;
  onCompareProducer?: (producerId: string, producingClientId: string | null) => void;
  /**
   * The client's own inbound tracks rendering this consumer, matched on
   * `attachments.consumerId`. Carries the track score and the reasons for it.
   */
  tracks?: ClientTrackView[];
  /** Render without the outer collapsible wrapper (for embedding in modals). */
  embedded?: boolean;
}

export function ConsumerSection({
  consumer,
  processedClientStats,
  paneKey: _paneKey,
  clientStats,
  eventBus,
  clientLabel,
  onCompareProducer,
  tracks,
  embedded,
}: ConsumerSectionProps) {
  const tz = useTimezoneTick();
  const { id: consumerId, kind, createdAt, closedAt } = consumer;
  const isVideo = kind === 'video';
  const isAudio = kind === 'audio';
  const isActive = closedAt == null;
  const pinPrefix = clientLabel ? `${shortId(clientLabel)} > Consumer ${shortId(consumerId)}` : '';

  // Issues the client raised against this consumer or the track it renders,
  // drawn as a lane under the state timeline.
  const issueLane = consumerIssueLaneItems(clientStats, processedClientStats, consumer, tz);

  const inboundValues = findInboundValuesForConsumer(processedClientStats, consumer);
  const playoutSeries = isAudio ? findPlayoutSeries(processedClientStats) : [];
  const scoreBadge = getTrackScoreBadge(processedClientStats, consumerId, 'inbound', 'consumerId', consumer.history);
  const decoderImplChanges = isVideo ? detectChanges(inboundValues, '_decoderImpl') : [];

  const created = formatHMS(createdAt, tz);
  const closed = closedAt != null ? formatHMS(closedAt, tz) : null;
  const duration = lifecycleDuration(createdAt, closedAt);
  const codecStr = formatCodecDetails((consumer as Consumer & { codecInfo?: CodecInfo }).codecInfo);

  const primaryDefs: ChartDef<InboundTimeSeriesValue>[] = [
    { title: 'Actual Bitrate (kbps)', tip: 'Real throughput from bytes received. Sudden drops may indicate network issues or SFU throttling. Audio: expect 20–100 kbps. Video: 100–2500+ kbps depending on resolution.', extract: (v) => v._actualBitrateKbps, formatter: (v) => formatBps(v * 1000), needNonZero: true },
    { title: 'Audio Level', tip: 'RMS audio amplitude (0–1). Values near 0 mean silence. Typical speech: 0.01–0.1. If consistently 0, the mic may be muted or broken.', extract: (v) => v.audioLevel, formatter: (v) => v.toFixed(4), needNonZero: true, condition: isAudio },
    { title: 'Jitter (ms)', tip: 'Inter-packet arrival time variation. Good: <20ms. Warning: 20–50ms. Bad: >50ms. High jitter causes audio glitches and video stuttering.', extract: (v) => v.jitter ? v.jitter * 1000 : undefined, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true },
    { title: 'Packets Lost', tip: 'Cumulative packets lost. Any increasing trend indicates ongoing network issues. Spikes correlate with visible/audible quality drops.', extract: (v) => v.packetsLost, needNonZero: true },
    { title: 'Frame Rate (FPS)', tip: 'Frames per second received and decoded. Good: matches source (15–30 fps). Drops below 10 fps are visibly choppy.', extract: (v) => v.framesPerSecond, formatter: (v) => `${v.toFixed(1)} fps`, needNonZero: true, condition: isVideo },
    { title: 'Resolution', tip: 'Video height in pixels being received. Drops indicate the SFU or sender reduced quality, often due to bandwidth or CPU constraints.', extract: (v) => v.frameHeight || undefined, formatter: (v) => `${v}p`, needNonZero: true, condition: isVideo },
    { title: 'Decode Time/Frame (ms)', tip: 'Average time to decode one frame. Good: <10ms. Warning: 10–30ms. Bad: >30ms. High values indicate CPU pressure.', extract: (v) => v.decodeTimePerFrame, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true, condition: isVideo },
    { title: 'Decode CPU %', tip: 'Fraction of wall-clock time spent decoding video. Good: <50%. Warning: 50–80%. Bad: >80%. High values may cause frame drops and freezes.', extract: (v) => v.decodeCpuPercent, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
    { title: 'Freeze Count', tip: 'Number of visible freezes detected by the browser. Any freeze is noticeable to the user. Rising count indicates ongoing issues.', extract: (v) => v.freezeCount, needNonZero: true, condition: isVideo },
    { title: 'Total Freezes Duration (s)', tip: 'Cumulative seconds the video was frozen. Even short freezes (<1s) are noticeable. >5s total is a significant quality issue.', extract: (v) => v.totalFreezesDuration, formatter: (v) => `${v.toFixed(2)}s`, needNonZero: true, condition: isVideo },
    { title: 'Frames Dropped', tip: 'Frames discarded before rendering, usually due to late arrival or decode overload. Rising count means the device can\'t keep up.', extract: (v) => v.framesDropped, needNonZero: true, condition: isVideo },
    { title: 'Inter-frame Jitter (ms)', tip: 'Standard deviation of inter-frame delay. Good: <5ms. Warning: 5–15ms. Bad: >15ms. Higher values mean inconsistent frame delivery causing visual stutter.', extract: (v) => v._ifdJitterMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true, condition: isVideo },
  ];

  const advancedDefs: ChartDef<InboundTimeSeriesValue>[] = [
    { title: 'Packet Loss Rate %', tip: 'Instantaneous packet loss rate. Good: <0.5%. Warning: 0.5–2%. Bad: >2%. High loss causes audio glitches and video artifacts.', extract: (v) => v._packetLossRatePct, formatter: (v) => `${v.toFixed(3)}%`, needNonZero: true },
    { title: 'Jitter Buffer Delay (ms)', tip: 'Current jitter buffer delay. Good: <50ms. Higher values mean the browser is buffering more to smooth out jitter, adding latency.', extract: (v) => v._jbDelayMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true },
    { title: 'JB Target Delay (ms)', tip: 'Target jitter buffer delay the browser is aiming for. Rising values mean the network jitter is increasing.', extract: (v) => v._jbTargetDelayMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true },
    { title: 'JB Min Delay (ms)', tip: 'Minimum jitter buffer delay. This is the floor — the buffer won\'t go below this even in good conditions.', extract: (v) => v._jbMinDelayMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true },
    { title: 'Audio Concealment %', tip: 'Percentage of audio samples that were concealed (synthesized to fill gaps). Good: <1%. Warning: 1–5%. Bad: >5%. Indicates packet loss or late arrivals.', extract: (v) => v._concealmentPct, formatter: (v) => `${v.toFixed(2)}%`, needNonZero: true, condition: isAudio },
    { title: 'Silent Concealment Ratio %', tip: 'Of concealed samples, what percentage were silent. High values mean the browser couldn\'t even guess what the audio should be.', extract: (v) => v._silentConcealRatio, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isAudio },
    { title: 'JB Manipulation Rate %', tip: 'Rate of jitter buffer insertions/removals to adapt to changing network conditions. High values indicate unstable network.', extract: (v) => v._jbManipRatePct, formatter: (v) => `${v.toFixed(2)}%`, needNonZero: true, condition: isAudio },
    { title: 'FEC Packets Received', tip: 'Forward Error Correction packets received. These help recover from packet loss without retransmission. Presence indicates loss recovery is active.', extract: (v) => v.fecPacketsReceived, needNonZero: true, condition: isAudio },
    { title: 'FEC Discard Rate %', tip: 'Percentage of FEC packets discarded because they arrived too late to be useful. High values indicate jitter buffer is too small or network jitter is too high for FEC to help.', extract: (v) => v._fecDiscardRatePct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isAudio },
    { title: 'Freeze Fraction %', tip: 'Percentage of time the video was frozen. Good: 0%. Warning: >1%. Bad: >5%. Freezes are visible to the user.', extract: (v) => v._freezeFractionPct, formatter: (v) => `${v.toFixed(2)}%`, needNonZero: true, condition: isVideo },
    { title: 'Pause Count', tip: 'Number of times video playback was paused. Frequent pauses indicate rendering or decoding issues.', extract: (v) => v.pauseCount, needNonZero: true, condition: isVideo },
    { title: 'Pending Decode Frames', tip: 'Frames received but not yet decoded. A growing gap means the decoder is falling behind — expect frame drops and increased latency.', extract: (v) => v._pendingDecodeFrames, needNonZero: true, condition: isVideo },
    { title: 'E2E Receive Latency (ms)', tip: 'Estimated end-to-end receive-side latency: jitter buffer delay + decode time. This is the delay from network arrival to rendered frame. Good: <100ms. Bad: >200ms.', extract: (v) => v._e2eReceiveLatencyMs, formatter: (v) => `${v.toFixed(1)} ms`, needNonZero: true, condition: isVideo },
    { title: 'Playout Drift (ms)', tip: 'Difference between wall-clock time progression and playout timestamp progression. Non-zero drift indicates clock skew between sender and receiver, or buffer level changes.', extract: (v) => v._playoutDriftMs, formatter: (v) => `${v.toFixed(1)} ms`, condition: isVideo },
    { title: 'Processing Delay/Frame (ms)', tip: 'Time from receiving the last packet of a frame to decoded. Includes network jitter buffer and decode time. Good: <30ms.', extract: (v) => v._processingDelayPerFrameMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true, condition: isVideo },
    { title: 'Assembly Time/Frame (ms)', tip: 'Time from receiving the first packet of a frame to the last. Higher values mean frames are spread across many packets arriving over time.', extract: (v) => v._assemblyTimePerFrameMs, formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true, condition: isVideo },
    { title: 'Average QP', tip: 'Quantization Parameter — higher values mean more compression and lower quality. Good: <25 (H.264). Warning: 25–35. Bad: >35.', extract: (v) => v._avgQp, formatter: (v) => v.toFixed(1), needNonZero: true, condition: isVideo },
    { title: 'Retransmission %', tip: 'Percentage of bytes that were retransmitted. Good: <2%. Higher values indicate packet loss being recovered via retransmission.', extract: (v) => v._retransmitPct, formatter: (v) => `${v.toFixed(2)}%`, needNonZero: true },
    { title: 'NACK Count', tip: 'Negative acknowledgements sent — requests for the sender to retransmit lost packets. Rising count indicates ongoing packet loss.', extract: (v) => v.nackCount, needNonZero: true },
    { title: 'Key Frames Decoded', tip: 'Number of key (I) frames decoded. Key frames are larger but don\'t depend on previous frames. Frequent key frames may indicate recovery from errors.', extract: (v) => v._keyFrames, needNonZero: true, condition: isVideo },
    { title: 'Multi-Packet Frame %', tip: 'Percentage of frames assembled from multiple packets — higher values indicate larger frames requiring fragmentation', extract: (v) => v._multiPacketFramePct, formatter: (v) => `${v.toFixed(1)}%`, needNonZero: true, condition: isVideo },
  ];

  const remoteOutboundDefs: ChartDef<InboundTimeSeriesValue>[] = [
    { title: 'Remote RTT (ms)', tip: 'Round-trip time as measured by the remote sender via RTCP SR/RR exchange. Good: <100ms. Warning: 100–300ms. Bad: >300ms.', extract: (v) => v._remoteRttMs, formatter: (v) => `${v.toFixed(1)} ms` },
    { title: 'Remote Avg RTT (ms)', tip: 'Average round-trip time computed from totalRoundTripTime/measurements reported by the remote sender. Smooths out individual RTT spikes.', extract: (v) => v._remoteAvgRttMs, formatter: (v) => `${v.toFixed(1)} ms` },
    { title: 'Remote Sender Bitrate (kbps)', tip: 'Bitrate as reported by the remote sender via RTCP SR. Compare with received bitrate — differences indicate packet loss or throttling in the network path.', extract: (v) => v._remoteActualBitrateKbps, formatter: (v) => formatBps(v * 1000), needNonZero: true },
    { title: 'Remote Packet Send Rate (pkt/s)', tip: 'Rate at which the remote sender is transmitting packets. Compare with local receive rate to detect loss.', extract: (v) => v._remotePacketSentRate, formatter: (v) => `${v.toFixed(1)} pkt/s`, needNonZero: true },
    { title: 'Remote Packets Sent', tip: 'Cumulative packets sent by the remote sender. Compare with packetsReceived — any gap is packets lost in transit.', extract: (v) => v._remotePacketsSent },
    { title: 'Remote Bytes Sent', tip: 'Cumulative bytes sent by the remote sender. Compare with bytesReceived to quantify data lost in transit.', extract: (v) => v._remoteBytesSent },
    { title: 'Remote RTCP Reports Sent', tip: 'Number of RTCP Sender Report packets sent by the remote side. Each report provides timing and byte count information for RTT calculation and synchronization.', extract: (v) => v._remoteReportsSent },
    { title: 'Remote Reports (delta)', tip: 'New RTCP SR reports per interval. A steady rate indicates healthy RTCP feedback. Drops may indicate RTCP being blocked or throttled.', extract: (v) => v._remoteReportsSentDelta, needNonZero: true },
  ];

  // Every subsection here reads the same underlying series — the consumer's
  // inbound RTP samples, with the remote-outbound fields the browser folded
  // into them — so one exporter serves all of them. Each copy therefore carries
  // the same columns; which subsection you clicked changes where you were
  // looking, not what the browser reported for this consumer.
  const getInboundRows = () => inboundValues as unknown as Record<string, unknown>[];

  const primaryCharts = buildChartData(inboundValues, primaryDefs);
  const advancedCharts = buildChartData(inboundValues, advancedDefs);
  const remoteOutboundCharts = buildChartData(inboundValues, remoteOutboundDefs);

  const title = (
    <>
      <span className={styles.kindBadge} data-kind={kind}>{kind}</span>
      Consumer <IdBadge value={consumerId}>{shortId(consumerId)}</IdBadge> · {consumer.label || '—'} · {created}
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
        <InfoCard title="Consumer details">
          <div><span className={styles.label}>ID:</span> <IdBadge value={consumerId} /></div>
          <div><span className={styles.label}>Kind:</span> {consumer.kind}</div>
          <div><span className={styles.label}>Label:</span> {consumer.label || '—'}</div>
          <div><span className={styles.label}>Transport:</span> <IdBadge value={consumer.transportId} /></div>
          <div>
            <span className={styles.label}>Producer:</span>{' '}
            <IdBadge
              value={consumer.producerId}
              variant="link"
              title={`Open producer ${consumer.producerId}`}
              onClick={() => onCompareProducer?.(consumer.producerId, consumer.producingClientId ?? null)}
            />
          </div>
          {consumer.producingClientId != null && (
            <div><span className={styles.label}>Producing client:</span> <IdBadge value={consumer.producingClientId} /></div>
          )}
          <div><span className={styles.label}>Codec:</span> {codecStr}</div>
        </InfoCard>
        <InfoCard title="Timing">
          <div><span className={styles.label}>Created:</span> {created}</div>
          {closed != null && <div><span className={styles.label}>Closed:</span> {closed}</div>}
          {duration && <div><span className={styles.label}>Duration:</span> {duration}</div>}
        </InfoCard>
      </InfoGrid>

      <TrackDetails tracks={tracks ?? []} eventBus={eventBus} pinPrefix={pinPrefix} />

      <StackedConsumerTimeline data={consumer} description="Track/Producer/Consumer state timeline. Green = active, red = track off, gray = paused. If Track is off, no media flows. If Producer is paused, the sender stopped sending. If Consumer is paused, the local side stopped receiving." eventBus={eventBus} issueLane={issueLane} pinLabel={pinPrefix ? `${pinPrefix} > Timeline` : undefined} />

      {decoderImplChanges.length > 0 && (
        <div className={styles.infoNote}>Decoder changed: {decoderImplChanges.join('; ')}</div>
      )}

      {primaryCharts.length > 0 && (
        <div className={styles.chartsSection}>
          <div className={styles.sectionTitleRow}>
            <h5 className={styles.sectionTitle}>Inbound RTP metrics</h5>
            <CopyMetricsCsvButton
              getRows={getInboundRows}
              title="Copy every inbound RTP field for this consumer, across the session, as CSV"
            />
          </div>
          <div className={styles.chartGrid}>
            {primaryCharts.map((c) => (
              <MiniChart
                key={c.title}
                title={c.title}
                description={c.tip}
                data={c.data}
                formatter={c.formatter}
                color="var(--accent)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > ${c.title}` : undefined}
              />
            ))}
          </div>
        </div>
      )}


      {advancedCharts.length > 0 && (
        <CollapsibleSection
          title={`Advanced metrics (${advancedCharts.length})`}
          defaultOpen={false}
          getCsvRows={getInboundRows}
        >
          <div className={styles.chartGrid}>
            {advancedCharts.map((c) => (
              <MiniChart
                key={`adv-${c.title}`}
                title={c.title}
                description={c.tip}
                data={c.data}
                formatter={c.formatter}
                color="var(--text-muted)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > ${c.title}` : undefined}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {remoteOutboundCharts.length > 0 && (
        <CollapsibleSection
          title={`Remote outbound metrics (${remoteOutboundCharts.length})`}
          defaultOpen={false}
          getCsvRows={getInboundRows}
        >
          <div className={styles.chartGrid}>
            {remoteOutboundCharts.map((c) => (
              <MiniChart
                key={`ro-${c.title}`}
                title={c.title}
                description={c.tip}
                data={c.data}
                formatter={c.formatter}
                color="var(--text-muted)"
                eventBus={eventBus}
                pinLabel={pinPrefix ? `${pinPrefix} > ${c.title}` : undefined}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {playoutSeries.length > 0 && (
        <CollapsibleSection title={`Playout metrics (${playoutSeries.length})`} defaultOpen={false}>
          <div className={styles.chartGrid}>
            {playoutSeries.map(({ key, data, title: chartTitle, description: chartDescription, formatter }) =>
              data.length >= 2 ? (
                <MiniChart
                  key={key}
                  title={chartTitle}
                  description={chartDescription}
                  data={data}
                  formatter={formatter}
                  color="var(--accent)"
                  eventBus={eventBus}
                  pinLabel={pinPrefix ? `${pinPrefix} > ${chartTitle}` : undefined}
                />
              ) : null,
            )}
          </div>
        </CollapsibleSection>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <CollapsibleSection title={title} id={`consumer/${consumerId}`} defaultOpen={false}>
      {content}
    </CollapsibleSection>
  );
}

function findInboundValuesForConsumer(
  stats: ProcessWebRTCStatsResult | null,
  consumer: Consumer,
): InboundTimeSeriesValue[] {
  const series = stats?.timeSeries?.inboundRtp;
  if (!series) return [];

  const { id, producerId, createdAt, closedAt } = consumer;
  const start = createdAt ?? 0;
  const end = closedAt ?? Infinity;

  const entries = Object.values(series);
  const matched = entries
    .filter((e) => e.consumerId === id)
    .concat(
      entries.filter((e) => e.consumerId !== id && producerId && e.producerId === producerId),
    );

  if (!matched.length) return [];

  return matched
    .flatMap((e) => e.values)
    .filter((v) => {
      const t = tsMs(v.timestamp);
      return t >= start && t <= end;
    })
    .sort((a, b) => tsMs(a.timestamp) - tsMs(b.timestamp));
}

function findPlayoutSeries(
  stats: ProcessWebRTCStatsResult | null,
): Array<{ key: string; title: string; description?: string; data: Array<{ timestamp: Date; value: number }>; formatter: (v: number) => string }> {
  const result: Array<{ key: string; title: string; description?: string; data: Array<{ timestamp: Date; value: number }>; formatter: (v: number) => string }> = [];

  const series = stats?.timeSeries?.mediaPlayouts;
  if (!series) return result;

  for (const [key, entry] of Object.entries(series)) {
    const values = (entry.values ?? []) as Array<TimeSeriesValueBase & { _avgPlayoutDelayMs?: number; _synthesizedFractionPct?: number }>;

    const delayData: Array<{ timestamp: Date; value: number }> = [];
    const synthData: Array<{ timestamp: Date; value: number }> = [];

    for (const v of values) {
      const ts = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
      if (v._avgPlayoutDelayMs != null) delayData.push({ timestamp: ts, value: v._avgPlayoutDelayMs });
      if (v._synthesizedFractionPct != null) synthData.push({ timestamp: ts, value: v._synthesizedFractionPct });
    }

    if (delayData.length >= 2) {
      result.push({ key: `${key}-delay`, title: `Playout Delay (${key})`, description: 'Time from receiving audio to playing it out. Good: <50ms. Higher values add latency but help smooth jitter.', data: delayData, formatter: (v) => `${v.toFixed(1)} ms` });
    }
    if (synthData.length >= 2) {
      result.push({ key: `${key}-synth`, title: `Synthesized Audio % (${key})`, description: 'Percentage of audio that was synthesized (generated by the browser to fill gaps). Good: <1%. Higher values mean audible artifacts from packet loss.', data: synthData, formatter: (v) => `${v.toFixed(2)}%` });
    }
  }

  return result;
}
