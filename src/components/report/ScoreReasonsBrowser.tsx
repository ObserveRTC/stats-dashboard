'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { formatHMSms } from '../../utils/formatting.ts';
import {
  buildSampleScoreReasons,
  nearestEntryIndex,
  type ReasonOrigin,
} from '../../utils/sampleScoreReasons.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import styles from './ScoreReasonsBrowser.module.css';

const ORIGIN_LABEL: Record<ReasonOrigin, string> = {
  client: 'client',
  peerConnection: 'peer connection',
  track: 'track',
};

const ORIGIN_TINT: Record<ReasonOrigin, string> = {
  client: '#f97316',
  peerConnection: '#3b82f6',
  track: '#22c55e',
};

interface Props {
  processedStats: ProcessWebRTCStatsResult | null;
  /** Sample the chart last asked for, by timestamp. */
  selectedTimestamp?: number | null;
  /** Selecting a row here moves the chart's marker too. */
  onSelectSample?: (timestamp: number) => void;
  /**
   * Bumped by the chart when a point is clicked, so this section opens and
   * comes on screen instead of quietly parking on a sample nobody can see.
   */
  revealToken?: number;
}

/**
 * Which sample carried which score reason, and from which component.
 *
 * The chart above says *when* the score moved; this says *what* moved it and
 * *whose fault it was*. Those became two separate questions in client-monitor
 * 4.7.0: the client entry no longer carries the aggregated reasons, because
 * every entity now ships only what it is itself responsible for. The client
 * view is rebuilt by re-aggregating a sample's components, and once you are
 * re-aggregating anyway, keeping the attribution is free — so a reason is never
 * shown pooled, always next to the peer connection or track that raised it.
 *
 * Clicking a point on the chart parks this on that sample; clicking a row here
 * moves the chart's marker. **Every** sample is listed, quiet ones included:
 * the list is driven by clicking the chart, so dropping the quiet samples would
 * break the correspondence and land a click on some other moment's reasons
 * while the marker said otherwise. A row that says "no reasons" is also an
 * answer — it is how you confirm a dip had nothing underneath it.
 */
export function ScoreReasonsBrowser({
  processedStats,
  selectedTimestamp,
  onSelectSample,
  revealToken,
}: Props) {
  const tz = useTimezoneTick();
  const entries = useMemo(() => buildSampleScoreReasons(processedStats), [processedStats]);
  const [index, setIndex] = useState(0);
  // An opt-in narrowing for a long, mostly clean session. Off by default,
  // because with it on a chart click can only land on the nearest *listed*
  // sample rather than the one clicked.
  const [onlyWithReasons, setOnlyWithReasons] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // The chart drives this: a click there jumps here.
  useEffect(() => {
    if (selectedTimestamp == null || entries.length === 0) return;
    const next = nearestEntryIndex(entries, selectedTimestamp);
    if (next >= 0) setIndex(next);
  }, [selectedTimestamp, entries]);

  // Keep the parked row on screen without yanking the whole page: only the
  // list scrolls, and only when the row is actually out of view.
  useEffect(() => {
    const row = rowRefs.current.get(index);
    const list = listRef.current;
    if (!row || !list) return;
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    if (rowTop < list.scrollTop || rowBottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: rowTop - list.clientHeight / 2 + row.offsetHeight / 2 });
    }
  }, [index, entries]);

  if (entries.length === 0) return null;

  const selected = entries[Math.min(index, entries.length - 1)];
  const first = entries[0].timestamp;
  const withReasons = entries.filter((e) => e.reasons.length > 0).length;
  const visible = entries
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry }) => !onlyWithReasons || entry.reasons.length > 0);

  /**
   * Open the section a reason came from.
   *
   * The hash is set even when it is already the current one, because the
   * section listens for `hashchange` — clicking the same link twice after
   * scrolling away should bring you back, and assigning an unchanged hash fires
   * nothing.
   */
  const jumpTo = (hash: string) => {
    if (window.location.hash === `#${hash}`) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const select = (next: number) => {
    const clamped = Math.max(0, Math.min(next, entries.length - 1));
    setIndex(clamped);
    onSelectSample?.(entries[clamped].timestamp);
  };

  return (
    <CollapsibleSection
      title="Score reasons by sample"
      id="score-reasons-browser"
      help="client/score-reasons-browser"
      count={entries.length}
      defaultOpen={false}
      revealToken={revealToken}
    >
      <p className={styles.lede}>
        Every sample, and for each the components that raised a reason. From client-monitor 4.7.0
        the client entry ships no reasons of its own — the client view is rebuilt from the peer
        connections and tracks of the same sample, which is also what keeps the attribution. Click
        a point on the chart above to jump to that sample.{' '}
        <span className={styles.ledeCount}>
          {withReasons} of {entries.length} carried a reason.
        </span>
      </p>

      <div className={styles.body}>
        <div className={styles.listWrap}>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => select(index - 1)}
              disabled={index === 0}
              title="Previous sample with a reason"
            >
              ‹
            </button>
            <span className={styles.counter}>
              {index + 1} / {entries.length}
            </span>
            <label className={styles.filter} title="Hide samples that raised nothing">
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={onlyWithReasons}
                onChange={() => setOnlyWithReasons((v) => !v)}
              />
              only with reasons
            </label>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => select(index + 1)}
              disabled={index >= entries.length - 1}
              title="Next sample with a reason"
            >
              ›
            </button>
          </div>

          <div className={styles.list} ref={listRef}>
            {visible.map(({ entry, i }) => (
              <button
                key={entry.timestamp}
                type="button"
                ref={(el) => {
                  if (el) rowRefs.current.set(i, el);
                  else rowRefs.current.delete(i);
                }}
                className={
                  `${styles.row} ${i === index ? styles.rowSelected : ''} ` +
                  `${entry.reasons.length === 0 ? styles.rowQuiet : ''}`
                }
                onClick={() => select(i)}
              >
                <span className={styles.rowTime}>
                  +{((entry.timestamp - first) / 1000).toFixed(1)}s
                </span>
                {entry.clientScore != null && (
                  <span className={styles.rowScore}>{entry.clientScore.toFixed(1)}</span>
                )}
                <span className={styles.rowCount}>
                  {entry.reasons.length === 0
                    ? '—'
                    : `${entry.reasons.length} reason${entry.reasons.length === 1 ? '' : 's'}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.detail}>
          <div className={styles.detailHead}>
            <span className={styles.detailTime}>{formatHMSms(selected.timestamp, tz)}</span>
            {selected.clientScore != null && (
              <span className={styles.detailScore}>
                client score {selected.clientScore.toFixed(2)} / 5
              </span>
            )}
            {selected.totalPoints != null && (
              <span className={styles.detailPoints}>
                −{selected.totalPoints.toFixed(1)} across its components
              </span>
            )}
          </div>

          {selected.reasons.length === 0 ? (
            <p className={styles.empty}>
              No component raised a reason in this sample. If the client score moved here, it moved
              on the smoothing rather than on anything newly wrong.
            </p>
          ) : (
            <>
              {/* The client score is a smoothed weighted aggregate, not
                  `5 − sum(reasons)`. Saying so here is what stops a recovered
                  score beside a live reason reading as a stale reason. */}
              <p className={styles.caveat}>
                The client score is a smoothed weighted aggregate of its components, not 5 minus
                these points — a recovered score beside a live reason is a component still
                degraded, not a stale entry.
              </p>

              <ul className={styles.reasonList}>
            {selected.reasons.map((reason, i) => (
              <li key={`${reason.entityId}-${reason.key}-${i}`} className={styles.reason}>
                <span className={styles.reasonHead}>
                  <span
                    className={styles.originDot}
                    style={{ background: ORIGIN_TINT[reason.origin] }}
                  />
                  <span className={styles.reasonLabel}>{reason.meta.label}</span>
                  <code className={styles.reasonKey}>{reason.key}</code>
                  {typeof reason.points === 'number' && reason.points > 0 && (
                    <span className={styles.reasonPoints}>−{reason.points.toFixed(1)}</span>
                  )}
                </span>
                <span className={styles.reasonFrom}>
                  {/* The section that owns this component opens and scrolls on
                      a matching hash, so the id is the link — the reader would
                      otherwise hunt it through three collapsed sections. */}
                  {reason.targetHash ? (
                    <a
                      className={styles.reasonLink}
                      href={`#${reason.targetHash}`}
                      title={`Open the ${reason.targetLabel ?? 'section'} this reason came from`}
                      onClick={() => jumpTo(reason.targetHash as string)}
                    >
                      {reason.entityLabel}
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        width="10"
                        height="10"
                        aria-hidden="true"
                        className={styles.linkIcon}
                      >
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                    </a>
                  ) : (
                    reason.entityLabel
                  )}
                  <span className={styles.reasonOrigin}> · {ORIGIN_LABEL[reason.origin]}</span>
                  {reason.direction && (
                    <span className={styles.reasonOrigin}> · {reason.direction}</span>
                  )}
                  {reason.entityScore != null && (
                    <span className={styles.reasonOrigin}>
                      {' '}
                      · scored {reason.entityScore.toFixed(2)}
                    </span>
                  )}
                </span>
                <span className={styles.reasonMeaning}>{reason.meta.meaning}</span>
              </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
