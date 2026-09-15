/**
 * What a score reason means.
 *
 * ## Transcribed from client-monitor-js 4.9.0
 *
 * 4.9.0 collapsed two vocabularies into one. Before it, the score calculator
 * carried its own thresholds — jitter ramps, FPS volatility bands, per-codec
 * quantizer tables — and recorded its subtractions under reason keys of its own
 * invention (`high-rtt`, `low-fps`, `frozen-video`, `audio-time-stretch`, …).
 * Those keys named judgements no detector had made, which is how a score could
 * penalise a track no issue mentioned, or stay silent on one every detector had
 * flagged.
 *
 * **Now `scoreReasons` is keyed by issue type.** The reason a score fell is the
 * name of the finding that caused it — the same string the issue carries, and
 * the same string in `clientIssues[]` of the same sample. So this table is not a
 * second vocabulary to maintain: it is a projection of
 * `schema/ClientIssueTypes`, and there is exactly one place to edit when the
 * library retunes a weight.
 *
 * Three consequences worth knowing when reading an explanation:
 *
 *   1. **A reason is joinable to an issue.** The key that cost 2.5 points at
 *      12:04:31 is the same key you will find open in the issue list at that
 *      moment, on the same entity. That was not true before 4.9.0.
 *   2. **`maxPenalty` is `weight x 5`, not a guess.** `ISSUE_SCORING` gives each
 *      type a `0..1` share of the full score; five points times that share is
 *      what the finding costs at full severity.
 *   3. **The group is the monitor's own category**, so it says *how* the fault
 *      counted — zeroed, capped, or subtracted — rather than merely which media
 *      it concerned.
 *
 * Magnitudes have been on the wire since schema 3.6.0 (`scoreReasons` as a
 * `Record<reasonKey, pointsSubtracted>`), and 4.9.0 clients always send them.
 *
 * ## Two caveats about the magnitudes
 *
 * A **pipeline-disruption** reason *caps* rather than subtracts, and only the
 * deepest cap applies — so two of them in one tick do not add up, and the
 * recorded magnitude of the shallower one is what it *would* have taken, not
 * what it did. A **connectivity** reason zeroes its monitor outright. Summing
 * every magnitude in a tick therefore over-counts; the ranking is still
 * meaningful, which is what the explanation uses it for.
 *
 * `pixelated-video` is the one reason whose recorded magnitude can exceed its
 * `maxPenalty`: the calculator multiplies it by how large the picture was being
 * shown (x1.5 at 1.5x magnification or more, x0.25 below 0.75x), so a
 * full-screen stream can record 3.75 against a table price of 2.5.
 */

import {
  CLIENT_ISSUE_TYPES,
  ISSUE_SCORE_CATEGORY_EFFECT,
  ISSUE_SCORE_CATEGORY_LABELS,
  baseIssueType,
  getIssueTypeMeta,
  issueMaxPenalty,
  type IssueScoreCategory,
  type IssueScope,
} from './ClientIssueTypes.ts';

export type ScoreReasonEntity = 'peer-connection' | 'inbound-track' | 'outbound-track' | 'client';

/**
 * How the fault counted, which is the monitor's own categorisation.
 *
 * Replaces the pre-4.9.0 media grouping (`path` / `audio` / `video-receive` /
 * `video-send`). Grouping by media answered "where was the trouble"; grouping
 * by score category answers "what did it do to the number", which is the
 * question an explanation of a score is actually asked.
 */
export type ScoreReasonGroup = IssueScoreCategory;

export interface ScoreReasonMeta {
  key: string;
  label: string;
  /** Entities that can raise it. */
  entities: ScoreReasonEntity[];
  media?: 'audio' | 'video';
  /**
   * Most points this reason can subtract at full severity: `weight x 5` from
   * `ISSUE_SCORING`. For a pipeline-disruption reason this is the depth of the
   * cap rather than a subtraction; see the note at the top of this file.
   */
  maxPenalty: number;
  /**
   * Set for a key a client-monitor-js version stopped emitting. This dashboard
   * targets 4.9.0 and later, so these exist only so that a recording made
   * before it still names itself rather than rendering a bare string.
   */
  retired?: string;
  /** One-line verdict: what the detector proved. */
  meaning: string;
  /** Where to look next. */
  guidance: string;
  group: ScoreReasonGroup;
  /** What this group does to the score it is read into. */
  effect: string;
}

export const GROUP_LABELS: Record<ScoreReasonGroup, string> = ISSUE_SCORE_CATEGORY_LABELS;

/** Which media a reason concerns, where the issue type only concerns one. */
const REASON_MEDIA: Record<string, 'audio' | 'video'> = {
  'invented-speech': 'audio',
  'synthesized-audio': 'audio',
  'audio-jitter-buffer-stress': 'audio',
  'av-desync': 'audio',
  'silent-audio-source': 'audio',
  'video-flow-disrupted': 'video',
  'pixelated-video': 'video',
  'stuck-decoder': 'video',
  'frame-assembly-stalled': 'video',
  'video-recovery-failed': 'video',
  'decoder-bottleneck': 'video',
  'video-decoder-overloaded': 'video',
  'video-capture-bottleneck': 'video',
  'encoder-bottleneck': 'video',
  'inbound-video-playout-discrepancy': 'video',
};

function entitiesOf(scope: IssueScope): ScoreReasonEntity[] {
  switch (scope) {
    case 'inbound-track':
      return ['inbound-track'];
    case 'outbound-track':
      return ['outbound-track'];
    case 'peer-connection':
      return ['peer-connection'];
    default:
      return ['client'];
  }
}

/**
 * Every reason a 4.9.0 client can record, projected out of the issue table.
 *
 * Derived rather than transcribed on purpose: a second literal is a second
 * thing to forget when a weight moves.
 */
export const SCORE_REASONS: Record<string, ScoreReasonMeta> = Object.fromEntries(
  Object.entries(CLIENT_ISSUE_TYPES).map(([type, meta]) => [
    type,
    {
      key: type,
      label: meta.label,
      entities: entitiesOf(meta.scope),
      media: REASON_MEDIA[type],
      maxPenalty: meta.scoring.weight * 5,
      meaning: meta.summary,
      guidance: meta.remedy,
      group: meta.scoring.category,
      effect: ISSUE_SCORE_CATEGORY_EFFECT[meta.scoring.category],
    } satisfies ScoreReasonMeta,
  ]),
);

/**
 * Keys the calculator emitted before 4.9.0, and what replaced each.
 *
 * This dashboard does not support pre-4.9.0 clients, and none of these are
 * scored or ranked. They exist so a recording from an older client renders a
 * sentence instead of a bare key, and so an operator who sees one knows
 * immediately that they are looking at an old capture rather than a new
 * detector.
 */
const RETIRED_REASON_REPLACEMENTS: Record<string, string> = {
  'high-rtt': 'transport-delay-degraded',
  'very-high-rtt': 'transport-delay-degraded',
  'high-jitter': 'audio-jitter-buffer-stress, downlink-congestion',
  'high-packetloss': 'transport-loss-sustained',
  'low-fps': 'video-flow-disrupted (choppy)',
  'volatile-fps': 'video-flow-disrupted (choppy)',
  'dropped-video-frames': 'inbound-video-playout-discrepancy, decoder-bottleneck',
  'video-frame-corruptions': 'video-flow-disrupted, pixelated-video',
  'frozen-video': 'video-flow-disrupted (frozen)',
  'choppy-video': 'video-flow-disrupted (choppy)',
  'blocky-video': 'pixelated-video',
  'low-bitrate-per-pixel': 'pixelated-video',
  'high-deviation-from-target-bitrate': 'uplink-congestion',
  'high-volatile-bitrate': 'uplink-congestion',
  'cpu-limitation': 'cpulimitation',
  'bandwidth-limitation': 'uplink-congestion',
  'downscaled-screenshare': 'video-capture-bottleneck, encoder-bottleneck',
  'audio-concealment': 'invented-speech',
  'audio-time-stretch': 'audio-jitter-buffer-stress',
  'high-jitter-buffer-delay': 'audio-jitter-buffer-stress',
  'capture-bottleneck': 'video-capture-bottleneck',
  'capture-track-ended': 'capture-source-lost',
  'freezed-video-track': 'video-flow-disrupted',
  'keyframe-storm': 'video-recovery-failed',
  'audio-desync': 'av-desync',
  'blocked-transport': 'blocked-stun-requests, blocked-inbound-media-transport, blocked-outbound-media-transport',
  'media-pipeline-stalled': 'rtp-sender-stalled, transport-demux-stalled',
};

/**
 * Metadata for a reason key, synthesised for keys this table does not know.
 *
 * Three outcomes, and they are different statements: a 4.9.0 reason, a key
 * retired in 4.9.0 (so: an old recording), or something this build has never
 * heard of (so: a custom calculator, or a newer library).
 */
export function getScoreReasonMeta(key: string): ScoreReasonMeta {
  const known = SCORE_REASONS[key];
  if (known) return known;

  const replacement = RETIRED_REASON_REPLACEMENTS[key];
  if (replacement) {
    return {
      key,
      label: key,
      entities: [],
      maxPenalty: 0,
      retired: `4.9.0 — replaced by ${replacement}`,
      meaning:
        'A reason key from before client-monitor-js 4.9.0, when the calculator carried its own thresholds instead of reading the open issues.',
      guidance: `This recording predates 4.9.0. The equivalent finding on a current client is ${replacement}.`,
      group: 'perceived-quality',
      effect: ISSUE_SCORE_CATEGORY_EFFECT['perceived-quality'],
    };
  }

  // Not a 4.9.0 issue type and not a key we retired: fall through to the issue
  // table's own fallback, so a custom detector's type at least renders as one.
  const issue = getIssueTypeMeta(key);
  return {
    key,
    label: issue.label,
    entities: [],
    maxPenalty: issueMaxPenalty(key),
    meaning: 'Reason raised by a score calculator this dashboard has no description for.',
    guidance:
      'Since 4.9.0 a reason key is an issue type, so this is most likely a custom detector or an application-raised issue. The count is still accurate.',
    group: 'perceived-quality',
    effect: ISSUE_SCORE_CATEGORY_EFFECT['perceived-quality'],
  };
}

export function isKnownScoreReason(key: string): boolean {
  return baseIssueType(key) in SCORE_REASONS;
}

/**
 * True when the key is one 4.9.0 stopped emitting.
 *
 * A retired key in a recording is not an error — it dates the recording.
 */
export function isRetiredScoreReason(key: string): boolean {
  return key in RETIRED_REASON_REPLACEMENTS;
}

/** Every key 4.9.0 retired, for a "this capture is old" notice. */
export function retiredScoreReasonKeys(): string[] {
  return Object.keys(RETIRED_REASON_REPLACEMENTS);
}
