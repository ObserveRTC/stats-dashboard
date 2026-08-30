'use client';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { formatBps } from '../../utils/formatting.ts';
import { buildChartData, type ChartDef } from '../../utils/chartHelpers.ts';
import { buildMetricCsv, chartResultsToColumns } from '../../utils/metricSeriesExport.ts';
import type { InboundTimeSeriesValue, OutboundTimeSeriesValue } from '../../utils/statsTypes.ts';
import type { UnmatchedRtpEntry } from '../../utils/unmatchedRtp.ts';
import styles from './UnmatchedRtpSection.module.css';

interface Props {
  entries: UnmatchedRtpEntry[];
  eventBus?: EventTarget;
}

export function UnmatchedRtpSection({ entries, eventBus }: Props) {
  if (entries.length === 0) return null;

  return (
    <CollapsibleSection
      title={`Unmatched RTP Streams (${entries.length})`}
      id="unmatched-rtp"
      help="client/unmatched-rtp"
      defaultOpen={false}
    >
      <p className={styles.description}>
        These RTP streams could not be mapped to any known producer or consumer.
      </p>
      {entries.map((entry) => (
        <UnmatchedEntry key={entry.key} entry={entry} eventBus={eventBus} />
      ))}
    </CollapsibleSection>
  );
}

function UnmatchedEntry({ entry, eventBus }: { entry: UnmatchedRtpEntry; eventBus?: EventTarget }) {
  const isOutbound = entry.direction === 'outbound';
  const isVideo = entry.kind === 'video';
  const isAudio = entry.kind === 'audio';

  const charts = isOutbound
    ? buildChartData(entry.values as OutboundTimeSeriesValue[], [
        { title: 'Actual Bitrate (kbps)', tip: 'How much this stream actually moved per second. This stream could not be matched to anything the server recorded, so the traffic is real but its owner is unknown.', extract: (v) => v._actualBitrateKbps, formatter: (v) => formatBps(v * 1000), needNonZero: true },
        { title: 'Frame Rate (FPS)', tip: 'Frames per second on this stream. Below about 10 fps motion looks visibly choppy; a drop to zero while bitrate continues means frames stopped being produced or decoded rather than the link failing.', extract: (v) => v.framesPerSecond, formatter: (v) => `${v.toFixed(1)} fps`, needNonZero: true, condition: isVideo },
        { title: 'Packets Sent', tip: 'Cumulative packets sent on this stream. It only ever rises — a flat stretch means nothing was going out at all during it.', extract: (v) => v.packetsSent, needNonZero: true },
      ] satisfies ChartDef<OutboundTimeSeriesValue>[])
    : buildChartData(entry.values as InboundTimeSeriesValue[], [
        { title: 'Actual Bitrate (kbps)', tip: 'How much this stream actually moved per second. This stream could not be matched to anything the server recorded, so the traffic is real but its owner is unknown.', extract: (v) => v._actualBitrateKbps, formatter: (v) => formatBps(v * 1000), needNonZero: true },
        { title: 'Audio Level', tip: 'How loud the received audio was. A long stretch at or near zero means silence arrived — either nobody spoke, or the sending side was producing nothing.', extract: (v) => v.audioLevel, formatter: (v) => v.toFixed(4), needNonZero: true, condition: isAudio },
        { title: 'Jitter (ms)', tip: 'How irregularly packets arrived. Under 30 ms is unremarkable; above 100 ms the receiver is largely failing to smooth it out and you should expect audible or visible artifacts.', extract: (v) => (v.jitter != null ? v.jitter * 1000 : undefined), formatter: (v) => `${v.toFixed(2)} ms`, needNonZero: true },
        { title: 'Packets Lost', tip: 'Cumulative packets that never arrived. The slope matters more than the height: a step means a burst of loss, a steady climb means a consistently lossy link.', extract: (v) => v.packetsLost, needNonZero: true },
        { title: 'Frame Rate (FPS)', tip: 'Frames per second on this stream. Below about 10 fps motion looks visibly choppy; a drop to zero while bitrate continues means frames stopped being produced or decoded rather than the link failing.', extract: (v) => v.framesPerSecond, formatter: (v) => `${v.toFixed(1)} fps`, needNonZero: true, condition: isVideo },
      ] satisfies ChartDef<InboundTimeSeriesValue>[]);

  const badge = isOutbound ? 'outbound' : 'inbound';
  const kindLabel = isVideo ? 'video' : isAudio ? 'audio' : entry.kind ?? 'unknown';

  const title = (
    <>
      <span className={styles.badge} data-direction={badge}>{badge}</span>
      <span className={styles.badge} data-kind={kindLabel}>{kindLabel}</span>
      {entry.key}
      {entry.ssrc != null && <span className={styles.meta}> · SSRC {entry.ssrc}</span>}
      {entry.producerId && <span className={styles.meta}> · producerId: {entry.producerId}</span>}
      {entry.consumerId && <span className={styles.meta}> · consumerId: {entry.consumerId}</span>}
      {entry.peerConnectionId && <span className={styles.meta}> · PC: {entry.peerConnectionId.slice(0, 8)}…</span>}
    </>
  );

  const getCsv = () => buildMetricCsv(`Unmatched RTP ${entry.key}`, chartResultsToColumns(charts));

  return (
    <CollapsibleSection title={title} defaultOpen={false} getCsv={getCsv}>
      <div className={styles.info}>
        <span>{entry.values.length} samples</span>
      </div>
      {charts.length > 0 && (
        <div className={styles.chartGrid}>
          {charts.map((c) => (
            <MiniChart
              key={c.title}
              title={c.title}
              description={c.tip}
              data={c.data}
              formatter={c.formatter}
              color="var(--text-muted)"
              eventBus={eventBus}
            />
          ))}
        </div>
      )}
      {charts.length === 0 && (
        <p className={styles.noCharts}>No plottable data found.</p>
      )}
    </CollapsibleSection>
  );
}
