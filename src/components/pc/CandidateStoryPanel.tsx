'use client';
import type { CandidateStory, CandidatePairStory, StoryTone } from '../../utils/iceCandidateStory.ts';
import { formatBytes, formatHMS } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import styles from './CandidateStoryPanel.module.css';

const VERDICT_CLASS: Record<StoryTone, string> = {
  good: styles.verdictGood,
  warn: styles.verdictWarn,
  bad: styles.verdictBad,
  neutral: styles.verdictNeutral,
};

const DOT_CLASS: Record<StoryTone, string> = {
  good: styles.dotGood,
  warn: styles.dotWarn,
  bad: styles.dotBad,
  neutral: '',
};

/** `+m:ss.mmm` since the peer connection's first sample. */
function offsetLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `+${minutes}:${String(seconds).padStart(2, '0')}`;
}

function StateChain({ pair }: { pair: CandidatePairStory }) {
  if (pair.states.length === 0) return <span className={styles.detail}>no state reported</span>;
  return (
    <div className={styles.stateChain}>
      {pair.states.map((step, i) => (
        <span key={`${step.at}-${i}`} style={{ display: 'contents' }}>
          {i > 0 && <span className={styles.arrow}>→</span>}
          <span
            className={`${styles.stateChip} ${
              step.state === 'succeeded'
                ? styles.stateSucceeded
                : step.state === 'failed'
                  ? styles.stateFailed
                  : ''
            }`}
          >
            {step.state}
          </span>
        </span>
      ))}
    </div>
  );
}

function PairCard({ pair }: { pair: CandidatePairStory }) {
  const selectedFor = pair.selectedWindows.length;
  const bytes =
    pair.bytesSent == null && pair.bytesReceived == null
      ? null
      : `${formatBytes(pair.bytesSent ?? 0)} out / ${formatBytes(pair.bytesReceived ?? 0)} in`;

  return (
    <div className={styles.pairCard}>
      <div className={styles.pairHead}>
        <span className={styles.pairPeer}>{pair.peerLabel}</span>
      </div>
      <StateChain pair={pair} />
      <div className={styles.pairRow}>
        <span>Nominated</span>
        <span className={styles.pairValue}>{pair.nominatedAt != null ? 'yes' : 'no'}</span>
      </div>
      <div className={styles.pairRow}>
        <span>Selected</span>
        <span className={styles.pairValue}>
          {selectedFor === 0 ? 'never' : selectedFor === 1 ? 'once' : `${selectedFor} times`}
        </span>
      </div>
      {bytes && (
        <div className={styles.pairRow}>
          <span>Traffic</span>
          <span className={styles.pairValue}>{bytes}</span>
        </div>
      )}
      {/* Checks sent with no answers is the fingerprint of a blocked path, and
          it is only visible next to each other. */}
      {(pair.requestsSent != null || pair.responsesReceived != null) && (
        <div className={styles.pairRow}>
          <span>STUN sent / answered</span>
          <span className={styles.pairValue}>
            {pair.requestsSent ?? '—'} / {pair.responsesReceived ?? '—'}
          </span>
        </div>
      )}
      {pair.rttMs && (
        <div className={styles.pairRow}>
          <span>RTT min / max</span>
          <span className={styles.pairValue}>
            {Math.round(pair.rttMs.min)} / {Math.round(pair.rttMs.max)} ms
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The story of one ICE candidate: what it was paired with, what the checks
 * did, whether it was ever nominated or actually used, and when it stopped
 * being reported.
 *
 * A verdict first, then the sequence. The verdict is what most readers came
 * for — "was this the one that carried the call, and if not, why not" — and the
 * timeline underneath is the evidence for it, so a reader who disagrees can
 * check.
 */
export function CandidateStoryPanel({ story }: { story: CandidateStory }) {
  const tz = useTimezoneTick();

  return (
    <div className={styles.panel}>
      <p className={`${styles.verdict} ${VERDICT_CLASS[story.verdictTone]}`}>{story.verdict}</p>

      <div className={styles.sub}>What happened</div>
      <div className={styles.timeline}>
        {story.events.map((event, i) => (
          <span key={`${event.at}-${event.kind}-${i}`} style={{ display: 'contents' }}>
            <span className={styles.time}>{formatHMS(event.at, tz)}</span>
            <span className={styles.offset}>{offsetLabel(event.offsetMs)}</span>
            <span className={`${styles.dot} ${DOT_CLASS[event.tone]}`} />
            <span className={styles.what}>
              {event.title}
              {event.detail && <span className={styles.detail}> — {event.detail}</span>}
            </span>
          </span>
        ))}
      </div>

      {story.pairs.length > 0 && (
        <>
          <div className={styles.sub}>
            {story.pairs.length === 1 ? 'Its pair' : `Its ${story.pairs.length} pairs`}
          </div>
          <div className={styles.pairGrid}>
            {story.pairs.map((pair) => (
              <PairCard key={pair.pairId} pair={pair} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
