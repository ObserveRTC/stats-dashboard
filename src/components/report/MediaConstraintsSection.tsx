'use client';
import { useMemo } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { StatusBadge } from '../sections/StatusBadge.tsx';
import { formatHMS } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import {
  buildTrackConstraintViews,
  constraintRowsFromValue,
  extractRequestedMediaConstraints,
  extractUserMediaErrors,
  formatConstraintLabel,
  matchLabel,
  type ConstraintMatch,
  type ConstraintRow,
  type TrackConstraintView,
} from '../../utils/mediaConstraints.ts';
import styles from './MediaConstraintsSection.module.css';

interface MediaConstraintsSectionProps {
  samples: ClientSample[] | null | undefined;
  /** Nest under a caller-supplied section instead of owning the top level. */
  embedded?: boolean;
}

function MatchBadge({ match }: { match: ConstraintMatch }) {
  if (match === 'unknown') return <span className={styles.matchMuted}>—</span>;
  return (
    <span className={styles.match} data-match={match}>
      {matchLabel(match)}
    </span>
  );
}

function ConstraintTable({ rows, showApplied }: { rows: ConstraintRow[]; showApplied: boolean }) {
  if (rows.length === 0) {
    return <p className={styles.empty}>No constraint fields.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Property</th>
          <th>Requested</th>
          {showApplied && <th>Applied</th>}
          {showApplied && <th>Result</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className={styles.prop}>{formatConstraintLabel(row.key)}</td>
            <td className={styles.mono}>{row.requested}</td>
            {showApplied && (
              <td className={styles.mono}>
                {row.isId && row.appliedRaw && row.appliedRaw !== '—' ? (
                  <IdBadge value={row.appliedRaw} />
                ) : (
                  row.applied
                )}
              </td>
            )}
            {showApplied && (
              <td>
                <MatchBadge match={row.match} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrackCard({ view }: { view: TrackConstraintView }) {
  const tz = useTimezoneTick();
  const { track, rows, mismatchCount } = view;
  const created = track.addedAt != null ? formatHMS(track.addedAt, tz) : null;

  return (
    <CollapsibleSection
      id={`media-constraint/${track.trackId}`}
      defaultOpen={false}
      title={(
        <span className={styles.trackTitle}>
          <span className={styles.kindBadge} data-kind={track.kind}>{track.kind}</span>
          {track.label ? <span className={styles.trackLabel}>{track.label}</span> : null}
          <IdBadge value={track.trackId} />
          {created && <span className={styles.trackMeta}>{created}</span>}
          <StatusBadge status={track.status === 'active' ? 'active' : 'inactive'} />
          {mismatchCount > 0 && (
            <span className={styles.mismatchCount}>
              {mismatchCount} mismatch{mismatchCount === 1 ? '' : 'es'}
            </span>
          )}
        </span>
      )}
    >
      {!view.hasRequest && view.hasApplied && (
        <p className={styles.note}>No requested constraints on this track — showing applied settings only.</p>
      )}
      {view.hasRequest && !view.hasApplied && (
        <p className={styles.note}>No applied settings reported for this track.</p>
      )}
      <ConstraintTable rows={rows} showApplied={view.hasApplied} />
    </CollapsibleSection>
  );
}

export function MediaConstraintsSection({ samples, embedded }: MediaConstraintsSectionProps) {
  const gumRequests = useMemo(() => extractRequestedMediaConstraints(samples), [samples]);
  const gumErrors = useMemo(() => extractUserMediaErrors(samples), [samples]);
  const tracks = useMemo(() => buildTrackConstraintViews(samples), [samples]);

  if (gumRequests.length === 0 && gumErrors.length === 0 && tracks.length === 0) {
    return null;
  }

  const mismatchTracks = tracks.filter((t) => t.mismatchCount > 0).length;

  return (
    <CollapsibleSection
      title="Media constraints"
      id={embedded ? undefined : 'media-constraints'}
      help="client/media-constraints"
      count={tracks.length || gumRequests.length || undefined}
      defaultOpen={false}
    >
      <p className={styles.hint}>
        What this client <strong>requested</strong> (getUserMedia / track constraints)
        versus what the browser <strong>applied</strong> (track settings).
        Exact/min/max failures are mismatches; ideal-only differences are marked off-ideal.
      </p>

      {gumErrors.length > 0 && (
        <div className={styles.errors}>
          {gumErrors.map((error) => (
            <div key={error} className={styles.errorBanner}>
              getUserMedia failed: {error}
            </div>
          ))}
        </div>
      )}

      {gumRequests.length > 0 && (
        <div className={styles.block}>
          <h5 className={styles.blockTitle}>getUserMedia request{gumRequests.length > 1 ? 's' : ''}</h5>
          {gumRequests.map((req, i) => (
            <div key={i} className={styles.gumCard}>
              {'audio' in req.raw && (
                <div>
                  <div className={styles.subhead}>Audio</div>
                  <ConstraintTable rows={constraintRowsFromValue(req.audio ?? req.raw.audio)} showApplied={false} />
                </div>
              )}
              {'video' in req.raw && (
                <div>
                  <div className={styles.subhead}>Video</div>
                  <ConstraintTable rows={constraintRowsFromValue(req.video ?? req.raw.video)} showApplied={false} />
                </div>
              )}
              {!('audio' in req.raw) && !('video' in req.raw) && (
                <ConstraintTable rows={constraintRowsFromValue(req.raw)} showApplied={false} />
              )}
            </div>
          ))}
        </div>
      )}

      {tracks.length > 0 && (
        <div className={styles.block}>
          <h5 className={styles.blockTitle}>
            Tracks
            {mismatchTracks > 0 && (
              <span className={styles.blockHint}>
                {' '}· {mismatchTracks} with exact/min/max mismatch
              </span>
            )}
          </h5>
          <div className={styles.trackList}>
            {tracks.map((view) => (
              <TrackCard key={view.track.trackId} view={view} />
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
