'use client';
import { useMemo } from 'react';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import {
  buildScoreExplanation,
  BAND_COLORS,
  type ReasonScope,
} from '../../utils/scoreExplanation.ts';
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
 * The chart above shows the number moving; this says what moved it. From
 * schema 3.6.0 each reason arrives with the points it subtracted, so the table
 * shows what things actually cost. Older samples name reasons without
 * magnitudes; those columns read “—” and the ranking falls back to how often
 * each reason fired and how much it is capable of subtracting — never to an
 * invented point total.
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

      {explanation.unknownKeys.length > 0 && (
        <p className={styles.note}>
          {explanation.unknownKeys.length} reason{' '}
          {explanation.unknownKeys.length === 1 ? 'key is' : 'keys are'} not in this dashboard&apos;s
          reference table ({explanation.unknownKeys.join(', ')}). The counts are still accurate — a
          custom or newer score calculator can define its own keys.
        </p>
      )}

      <p className={styles.footnote}>
        {measured ? (
          <>
            Points come from the sample itself — schema 3.6.0 carries each reason with what it
            subtracted. Share is of all points lost; a reason showing “—” came from an older sample
            that named the reason without its magnitude.
          </>
        ) : (
          <>
            These samples predate schema 3.6.0, so reason keys travel without their magnitudes. This
            ranks by how often each fired and how much it is capable of subtracting — not by points
            actually lost.
          </>
        )}
      </p>
    </CollapsibleSection>
  );
}
