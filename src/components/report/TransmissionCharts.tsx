'use client';
import { MiniChart } from '../charts/MiniChart.tsx';
import { formatBitrateKbps, type ClientRollups } from '../../utils/clientRollups.ts';
import { shortId } from '../../utils/formatting.ts';
import styles from './TransmissionCharts.module.css';

interface TransmissionChartsProps {
  rollups: ClientRollups;
  eventBus?: EventTarget;
  /** Prefix for pin labels so the same chart stays distinguishable when compared. */
  clientLabel?: string;
}

/** True when there is enough data for any of the three charts to be worth drawing. */
export function hasTransmissionData(rollups: ClientRollups): boolean {
  return (
    rollups.totalSend.length >= 2 ||
    rollups.totalRecv.length >= 2 ||
    rollups.activeStreams.length >= 2
  );
}

/**
 * Whole-client bitrate and stream-count rollups.
 *
 * Per-producer and per-consumer charts answer "why is this track bad"; these
 * answer "what was this client doing in total" — a send bitrate that falls
 * while the stream count holds steady says the streams themselves shrank,
 * which no single-stream chart shows.
 */
export function TransmissionCharts({
  rollups,
  eventBus,
  clientLabel,
}: TransmissionChartsProps) {
  if (!hasTransmissionData(rollups)) return null;
  const pin = clientLabel ? `${shortId(clientLabel)} > ` : '';

  return (
    <div className={styles.grid}>
      {rollups.totalSend.length >= 2 && (
        <MiniChart
          title="Total send bitrate"
          description="Sum of every outbound RTP stream's bitrate. Read against Active streams — a drop here while the count holds steady means the streams themselves shrank."
          data={rollups.totalSend}
          formatter={formatBitrateKbps}
          color="var(--accent)"
          eventBus={eventBus}
          pinLabel={pin ? `${pin}Total send bitrate` : undefined}
        />
      )}
      {rollups.totalRecv.length >= 2 && (
        <MiniChart
          title="Total recv bitrate"
          description="Sum of every inbound RTP stream's bitrate."
          data={rollups.totalRecv}
          formatter={formatBitrateKbps}
          color="var(--violet)"
          eventBus={eventBus}
          pinLabel={pin ? `${pin}Total recv bitrate` : undefined}
        />
      )}
      {rollups.activeStreams.length >= 2 && (
        <MiniChart
          title="Active streams"
          description="How many RTP streams reported at each moment, both directions."
          data={rollups.activeStreams}
          formatter={(v) => v.toFixed(0)}
          color="var(--success)"
          eventBus={eventBus}
          pinLabel={pin ? `${pin}Active streams` : undefined}
        />
      )}
    </div>
  );
}
