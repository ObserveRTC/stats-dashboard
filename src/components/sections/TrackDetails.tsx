'use client';
import type { ClientTrackView } from '../../utils/clientTracks.ts';
import { trackScoreChartData } from '../../utils/clientTracks.ts';
import { InfoCard } from './InfoCard.tsx';
import { AttachmentsCard } from './AttachmentsCard.tsx';
import { IdBadge } from './IdBadge.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { shortId, scoreColor } from '../../utils/formatting.ts';
import { formatScoreReasons } from '../../utils/scoreExplanation.ts';
import styles from './TrackDetails.module.css';

interface TrackDetailsProps {
  /** Tracks the client reported for this producer or consumer. */
  tracks: ClientTrackView[];
  eventBus?: EventTarget;
  /** Prefix for chart pin labels, so pinned charts stay distinguishable. */
  pinPrefix?: string;
}

/**
 * The browser's own view of the media behind a producer or consumer: the track
 * id, its quality score, and the reasons the client gave for that score.
 *
 * A producer normally has exactly one track; more than one means the same SFU
 * object was fed from several peer connections, which is worth seeing.
 */
export function TrackDetails({ tracks, eventBus, pinPrefix }: TrackDetailsProps) {
  if (tracks.length === 0) return null;

  return (
    <>
      {tracks.map((track) => {
        const scoreData = trackScoreChartData(track);
        const hasScoreChart = scoreData.length >= 2;
        const reasons = formatScoreReasons(track.latestScoreReasons, track.latestScorePenalties);

        return (
          <div key={track.key} className={styles.wrap}>
            <div className={styles.grid}>
              <InfoCard title={track.direction === 'outbound' ? 'Sending track' : 'Receiving track'}>
                <div className={styles.row}>
                  <span className={styles.label}>Track:</span>{' '}
                  <IdBadge value={track.trackId}>{shortId(track.trackId)}</IdBadge>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>Kind:</span> {track.kind}
                </div>
                {track.peerConnectionId && (
                  <div className={styles.row}>
                    <span className={styles.label}>Peer connection:</span>{' '}
                    <IdBadge value={track.peerConnectionId}>
                      {shortId(track.peerConnectionId)}
                    </IdBadge>
                  </div>
                )}
                {track.latestScore != null && (
                  <div className={styles.row}>
                    <span className={styles.label}>Score:</span>{' '}
                    <span
                      className={styles.scoreBadge}
                      style={{
                        background: `color-mix(in srgb, ${scoreColor(track.latestScore)} 18%, transparent)`,
                        color: scoreColor(track.latestScore),
                      }}
                    >
                      {track.latestScore.toFixed(2)} / 5
                    </span>
                  </div>
                )}
                <div className={styles.row}>
                  <span className={styles.label}>Seen in:</span> {track.seenCount} samples
                </div>
                {reasons.length > 0 && (
                  <div className={styles.reasons}>
                    <span className={styles.label}>Why:</span>
                    <ul className={styles.reasonList}>
                      {reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </InfoCard>
              <AttachmentsCard attachments={track.attachments} />
            </div>

            {hasScoreChart && (
              <div className={styles.chartWrap}>
                <MiniChart
                  title="Track score"
                  description="Quality score the client computed for this track, 1–5. Hover a point to read the reasons the client recorded for it."
                  data={scoreData}
                  formatter={(v) => `${v.toFixed(2)} / 5`}
                  color="var(--accent)"
                  yDomain={[0, 5]}
                  eventBus={eventBus}
                  pinLabel={pinPrefix ? `${pinPrefix} > Track score` : undefined}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
