'use client';
import { useMemo } from 'react';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import styles from './AudioGlitchSection.module.css';

interface AudioGlitchSectionProps {
  processedStats: ProcessWebRTCStatsResult | null;
  eventBus?: EventTarget;
}

/**
 * Audio delivered late or not at all, from the client's own extension stats.
 *
 * These come from `MEDIA_STREAM_TRACK_GLITCH_METRICS` and
 * `WEB_AUDIO_PLAYOUT_GLITCH_METRICS`, which not every deployment emits — the
 * section disappears when they are absent. They measure something the RTP
 * stats cannot: frames that reached the decoder but never made it to the
 * speaker.
 */
export function AudioGlitchSection({ processedStats, eventBus }: AudioGlitchSectionProps) {
  const series = useMemo(() => {
    const audioMetrics = processedStats?.timeSeries?.audioMetrics;
    const out: Array<{
      title: string;
      description: string;
      data: Array<{ timestamp: Date; value: number }>;
      formatter: (v: number) => string;
    }> = [];

    const push = (
      title: string,
      description: string,
      data: Array<{ timestamp: Date; value: number }>,
      formatter: (v: number) => string,
    ) => {
      if (data.length >= 2) out.push({ title, description, data, formatter });
    };

    push(
      'Undelivered frames fraction',
      'Share of captured audio frames that never reached the encoder. Rising values mean the capture pipeline is dropping work, usually under CPU pressure.',
      (audioMetrics?.glitchMetrics ?? [])
        .filter((d) => d.undeliveredFramesFraction != null)
        .map((d) => ({ timestamp: d.timestamp, value: d.undeliveredFramesFraction })),
      (v) => v.toFixed(4),
    );
    push(
      'Undelivered event frequency',
      'How often the undelivered-frames condition was entered, in events per second.',
      (audioMetrics?.glitchMetrics ?? [])
        .filter((d) => d.undeliveredEventFrequency != null)
        .map((d) => ({ timestamp: d.timestamp, value: d.undeliveredEventFrequency })),
      (v) => `${v.toFixed(2)} Hz`,
    );
    push(
      'Fallback frames fraction',
      'Share of playout frames the Web Audio graph had to synthesise because real audio did not arrive in time — heard as a gap or a click.',
      (audioMetrics?.playoutMetrics ?? [])
        .filter((d) => d.fallbackFramesFraction != null)
        .map((d) => ({ timestamp: d.timestamp, value: d.fallbackFramesFraction })),
      (v) => v.toFixed(4),
    );
    push(
      'Fallback event frequency',
      'How often playout fell back, in events per second.',
      (audioMetrics?.playoutMetrics ?? [])
        .filter((d) => d.fallbackEventFrequency != null)
        .map((d) => ({ timestamp: d.timestamp, value: d.fallbackEventFrequency })),
      (v) => `${v.toFixed(2)} Hz`,
    );

    return out;
  }, [processedStats]);

  if (series.length === 0) return null;

  return (
    <CollapsibleSection
      title="Audio Glitch Metrics"
      id="audio-glitches"
      help="client/audio-glitches"
      count={series.length}
      defaultOpen={false}
    >
      <div className={styles.grid}>
        {series.map((s) => (
          <MiniChart
            key={s.title}
            title={s.title}
            description={s.description}
            data={s.data}
            formatter={s.formatter}
            color="var(--warning)"
            eventBus={eventBus}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}
