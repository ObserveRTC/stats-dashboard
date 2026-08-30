'use client';
import { useMemo } from 'react';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import { buildAggregatedCpuTimeline } from '../../utils/healthMetrics.ts';
import { CpuChart } from './CpuChart.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import styles from './CpuUsagePanel.module.css';

interface CpuUsagePanelProps {
  processedStats: ProcessWebRTCStatsResult | null;
  eventBus?: EventTarget;
  clientLabel?: string;
}

/**
 * What the endpoint had to do to keep up.
 *
 * The encode + decode timeline is the detail; the CPU-limitation series beside
 * it is the browser's own verdict. They answer different questions: the first
 * is how much video work there was, the second whether the machine could
 * actually keep up with it.
 */
export function CpuUsagePanel({ processedStats, eventBus, clientLabel }: CpuUsagePanelProps) {
  const cpuData = useMemo(
    () => buildAggregatedCpuTimeline(processedStats),
    [processedStats],
  );

  const limitationSeries = useMemo(() => {
    const out: Array<{ timestamp: Date; value: number }> = [];
    for (const series of Object.values(processedStats?.timeSeries.outboundRtp ?? {})) {
      for (const v of series.values ?? []) {
        if (v._qlCpuPct == null) continue;
        const t = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp as number);
        out.push({ timestamp: t, value: v._qlCpuPct });
      }
    }
    return out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [processedStats]);

  if (!cpuData && limitationSeries.length < 2) {
    return (
      <p className={styles.empty}>
        This client reported no video encode or decode timings. WebRTC only exposes them for video,
        so an audio-only session has no CPU figures at all.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      {cpuData && (
        <CpuChart
          cpuData={cpuData}
          eventBus={eventBus}
          pinLabel={clientLabel ? `${clientLabel} > Video CPU` : undefined}
        />
      )}
      {limitationSeries.length >= 2 && (
        <div className={styles.chartGrid}>
          <MiniChart
            title="CPU-limited share"
            description="Share of send time the browser attributed to CPU quality limitation. Unlike the timeline above — which is derived from video encode and decode timers — this is the browser's own verdict on whether the machine was the bottleneck, so it reflects the whole endpoint."
            data={limitationSeries}
            formatter={(v) => `${v.toFixed(0)}%`}
            color="var(--danger)"
            yDomain={[0, 100]}
            eventBus={eventBus}
          />
        </div>
      )}
    </div>
  );
}
