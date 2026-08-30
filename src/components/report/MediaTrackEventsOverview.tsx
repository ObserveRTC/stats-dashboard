'use client';
import { useMemo } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsProcessor.ts';
import {
  buildTrackScoreSeries,
  extractMediaTrackEvents,
  type MediaTrackRecord,
  type TrackScoreSeries,
} from '../../utils/mediaTrackEvents.ts';
import { MiniChart } from '../charts/MiniChart.tsx';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './MediaTrackEventsOverview.module.css';

interface MediaTrackEventsOverviewProps {
  clientStats: ClientSample[] | null;
  processedClientStats?: ProcessWebRTCStatsResult | null;
  eventBus?: EventTarget;
}

import {
  buildConstraintRows,
  formatConstraintLabel,
} from '../../utils/mediaConstraints.ts';

const ID_SETTING_KEYS = new Set(['deviceId', 'groupId']);

function formatSettingValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, '');
  return String(value);
}

function formatSettingLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase());
}

function TrackSettings({ settings }: { settings: Record<string, unknown> }) {
  const entries = Object.entries(settings);
  if (entries.length === 0) {
    return <p className={styles.emptyPayload}>No settings available.</p>;
  }

  return (
    <div className={styles.fieldGrid}>
      {entries.map(([key, value]) => (
        <div key={key} className={styles.fieldRow}>
          <span className={styles.label}>{formatSettingLabel(key)}:</span>{' '}
          {typeof value === 'string' && ID_SETTING_KEYS.has(key) ? (
            <IdBadge value={value} />
          ) : (
            <span className={styles.mono}>{formatSettingValue(value)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function getTrackSettings(track: MediaTrackRecord): Record<string, unknown> | null {
  const settings = track.addedPayload?.settings;
  if (settings != null && typeof settings === 'object' && !Array.isArray(settings)) {
    return settings as Record<string, unknown>;
  }
  return null;
}

function getContentHint(track: MediaTrackRecord): string {
  const hint = track.addedPayload?.contentHint;
  if (typeof hint === 'string' && hint.trim()) return hint.trim();
  return '—';
}

function MediaTrackCard({
  track,
  scoreSeries,
  eventBus,
}: {
  track: MediaTrackRecord;
  scoreSeries: TrackScoreSeries | null;
  eventBus?: EventTarget;
}) {
  const settings = getTrackSettings(track);
  const contentHint = getContentHint(track);
  const comparison = buildConstraintRows(track.addedPayload?.constraints, settings);

  return (
    <CollapsibleSection
      id={`media-track/${track.trackId}`}
      className={styles.trackSection}
      defaultOpen={false}
      title={(
        <span className={styles.trackTitle}>
          <IdBadge value={track.trackId} />
          <span className={styles.kindBadge} data-kind={track.kind}>{track.kind}</span>
        </span>
      )}
    >
      {scoreSeries && (
        <div className={styles.scoreChart}>
          <MiniChart
            title={`Track score · ${scoreSeries.kind}`}
            description="ObserverRTC per-track quality score from peer connection outbound/inbound track stats. Higher is better."
            data={scoreSeries.data}
            formatter={(v) => v.toFixed(2)}
            yDomain={[0, 5]}
            eventBus={eventBus}
            compact
          />
        </div>
      )}
      <div className={styles.fieldRow}>
        <span className={styles.label}>Content hint:</span>{' '}
        <span className={styles.mono} data-empty={contentHint === '—' ? 'true' : undefined}>
          {contentHint}
        </span>
      </div>
      {comparison.length > 0 ? (
        <div className={styles.constraintBlock}>
          <div className={styles.constraintHead}>Requested vs applied</div>
          {comparison.map((row) => (
            <div key={row.key} className={styles.fieldRow}>
              <span className={styles.label}>{formatConstraintLabel(row.key)}:</span>{' '}
              <span className={styles.mono}>
                {row.requested}
                {row.applied !== '—' && row.applied !== row.requested && (
                  <> → {row.applied}</>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : settings ? (
        <TrackSettings settings={settings} />
      ) : (
        <p className={styles.emptyPayload}>No settings available.</p>
      )}
    </CollapsibleSection>
  );
}

export function MediaTrackEventsOverview({
  clientStats,
  processedClientStats,
  eventBus,
}: MediaTrackEventsOverviewProps) {
  const tracks = useMemo(() => extractMediaTrackEvents(clientStats), [clientStats]);
  const scoreSeriesByTrackId = useMemo(() => {
    const map = new Map<string, TrackScoreSeries>();
    for (const track of tracks) {
      const series = buildTrackScoreSeries(clientStats, processedClientStats, track);
      if (series) map.set(track.trackId, series);
    }
    return map;
  }, [tracks, clientStats, processedClientStats]);

  if (tracks.length === 0) return null;

  const activeCount = tracks.filter((t) => t.status === 'active').length;

  return (
    <div className={styles.section}>
      <CollapsibleSection
        help="client/media-tracks"
        title={`Media tracks (${tracks.length}${activeCount < tracks.length ? ` · ${activeCount} active` : ''})`}
        defaultOpen={false}
      >
        <p className={styles.hint}>
          Tracks from <code className={styles.inlineCode}>MEDIA_TRACK_ADDED</code> events, with
          {' '}<code className={styles.inlineCode}>constraints</code> (requested),
          {' '}<code className={styles.inlineCode}>settings</code> (applied),
          {' '}<code className={styles.inlineCode}>contentHint</code>,
          and per-track scores from peer connection stats.
        </p>
        <div className={styles.trackList}>
          {tracks.map((track) => (
            <MediaTrackCard
              key={track.trackId}
              track={track}
              scoreSeries={scoreSeriesByTrackId.get(track.trackId) ?? null}
              eventBus={eventBus}
            />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
