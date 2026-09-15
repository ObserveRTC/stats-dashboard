'use client';
import { useMemo } from 'react';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import {
  buildScoreExplanation,
  BAND_COLORS,
  type ReasonScope,
} from '../../utils/scoreExplanation.ts';
import { GROUP_LABELS } from '../../schema/ScoreReasons.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import styles from './ScoreExplanation.module.css';

interface ScoreExplanationProps {
  processedStats: ProcessWebRTCStatsResult | null;
  /** Same warm-up boundary the rest of the report uses. */
  warmupEnd?: number;
}

const SCOPE_LABELS: Record<ReasonScope, string> = {
  client: 'client',
  peerConnection: 'peer connection',
  track: 'track',
};

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/**
 * Why the client's score is what it is.
 *
 * The chart above shows the number moving; this says what moved it. Since
 * client-monitor 4.9.0 each reason key **is an issue type**, so every row here
 * names a finding that is also in the issue list at the same moment, on the
 * same entity — and the “How it counts” column says whether that finding
 * zeroed, capped or subtracted, which is why the point totals rank the reasons
 * rather than adding up to the score.
 */
export function ScoreExplanation({ processedStats, warmupEnd }: ScoreExplanationProps) {
  const explanation = useMemo(
    () => buildScoreExplanation(processedStats, { warmupEnd }),
    [processedStats, warmupEnd],
  );

  if (explanation.sampleCount === 0 && explanation.totalOccurrences === 0) return null;

  const { average, band, reasons, groups, totalOccurrences, measured, totalPoints } =
    explanation;

  return (
    <CollapsibleSection
      title="Why this score"
      id="score-explanation"
      help="client/score-explanation"
      count={reasons.length || undefined}
      defaultOpen={false}
    >
      <div className={styles.narrative}>
        {explanation.narrative.map((line, i) => (
          <p key={i} className={i === 0 ? styles.lead : undefined}>
            {i === 0 && average != null && band != null ? (
              <>
                <span className={styles.score} style={{ color: BAND_COLORS[band] }}>
                  {average.toFixed(2)}
                </span>
                <span className={styles.scoreUnit}>/5</span>
                <span className={styles.band} style={{ color: BAND_COLORS[band] }}>
                  {band}
                </span>
                <span className={styles.leadText}>{line}</span>
              </>
            ) : (
              line
            )}
          </p>
        ))}
      </div>

      {groups.length > 0 && (
        <div className={styles.groupBar} aria-label="Where the penalties came from">
          {groups.map((g) => (
            <div
              key={g.group}
              className={styles.groupSlice}
              style={{ flexGrow: g.points ?? g.occurrences }}
              data-group={g.group}
              title={
                g.points != null
                  ? `${g.label}: −${g.points.toFixed(1)} points across ${g.occurrences} of ${totalOccurrences} reasons`
                  : `${g.label}: ${g.occurrences} of ${totalOccurrences} reasons (${pct(g.share)})`
              }
            >
              <span className={styles.groupLabel}>
                {g.label} {pct(g.pointShare ?? g.share)}
              </span>
            </div>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Reason</th>
              <th className={styles.numeric}>Ticks</th>
              {measured && <th className={styles.numeric}>Points&nbsp;lost</th>}
              {measured && <th className={styles.numeric}>Avg&nbsp;/&nbsp;peak</th>}
              <th className={styles.numeric}>Share</th>
              <th className={styles.numeric}>Max&nbsp;penalty</th>
              <th>How&nbsp;it&nbsp;counts</th>
              <th>Raised on</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((r) => (
              <tr key={r.meta.key}>
                <td>
                  <span className={styles.reasonLabel}>{r.meta.label}</span>
                  <code className={styles.reasonKey}>{r.meta.key}</code>
                </td>
                <td className={styles.numeric}>{r.occurrences}</td>
                {measured && (
                  <td className={styles.numeric}>
                    {r.points != null ? (
                      <span className={styles.points}>−{r.points.toFixed(1)}</span>
                    ) : (
                      <span className={styles.unmeasured} title="These samples predate schema 3.6.0, which is the first to carry magnitudes.">
                        —
                      </span>
                    )}
                  </td>
                )}
                {measured && (
                  <td className={styles.numeric}>
                    {r.averagePoints != null && r.peakPoints != null
                      ? `${r.averagePoints.toFixed(2)} / ${r.peakPoints.toFixed(1)}`
                      : '—'}
                  </td>
                )}
                <td className={styles.numeric}>
                  {measured && totalPoints != null && totalPoints > 0 && r.points != null
                    ? pct(r.points / totalPoints)
                    : pct(r.share)}
                </td>
                <td className={styles.numeric}>
                  {r.meta.maxPenalty > 0 ? `−${r.meta.maxPenalty.toFixed(1)}` : '—'}
                </td>
                <td className={styles.scopes} title={r.meta.effect}>
                  {GROUP_LABELS[r.meta.group]}
                </td>
                <td className={styles.scopes}>
                  {r.scopes.map((s) => SCOPE_LABELS[s]).join(', ')}
                  {r.entityCount > 1 && (
                    <span className={styles.entityCount}> ×{r.entityCount}</span>
                  )}
                </td>
                <td className={styles.meaning}>
                  {r.meta.meaning}
                  <span className={styles.guidance}>{r.meta.guidance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {explanation.retiredKeys.length > 0 && (
        <p className={styles.note}>
          This capture predates client-monitor 4.9.0: {explanation.retiredKeys.length}{' '}
          reason {explanation.retiredKeys.length === 1 ? 'key was' : 'keys were'} retired in that
          release ({explanation.retiredKeys.join(', ')}). Its score came from thresholds inside the
          calculator rather than from the open issues, so it is not comparable like for like with a
          4.9.0 capture.
        </p>
      )}

      {explanation.unknownKeys.length > 0 && (
        <p className={styles.note}>
          {explanation.unknownKeys.length} reason{' '}
          {explanation.unknownKeys.length === 1 ? 'key is' : 'keys are'} not in this dashboard&apos;s
          4.9.0 reference table ({explanation.unknownKeys.join(', ')}). Since a reason key is an
          issue type, these are most likely custom detectors or application-raised issues. The
          counts are still accurate.
        </p>
      )}

      <p className={styles.footnote}>
        {measured ? (
          <>
            Points come from the sample itself, and each key is the issue type that caused it.
            Connectivity findings zero a score and pipeline-disruption findings cap it, so the
            column totals rank the reasons rather than summing to the score — each monitor&apos;s
            own score is the authority on what it actually reached.
          </>
        ) : (
          <>
            These samples name reasons without their magnitudes, so this ranks by how often each
            fired and how much it is capable of subtracting — not by points actually lost. A
            client-monitor 4.9.0 client always sends the magnitudes.
          </>
        )}
      </p>
    </CollapsibleSection>
  );
}
