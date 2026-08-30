/**
 * What a score reason means.
 *
 * `DefaultScoreCalculator` starts every entity at 5.0 (audio tracks start at a
 * bitrate-derived base) and subtracts penalties, recording each subtraction
 * under a reason key. This table turns a bare key back into a statement
 * someone can act on, and carries the maximum each penalty can subtract so an
 * explanation can rank reasons by what they *could* have cost rather than by
 * how often they appeared.
 *
 * ## Transcribed from client-monitor-js 4.7.0
 *
 * Three things changed in 4.7.0 and this table is written to survive all of
 * them, because a dashboard reads samples recorded by older clients for as
 * long as those recordings are kept:
 *
 *   1. **The client entry carries no reasons of its own.** The client score is
 *      a weighted aggregate of peer-connection and track scores, and 4.7.0
 *      stopped attributing subtractions to it (`setScore(clientScore,
 *      undefined, currentReasons)` — the accumulated view goes out on the
 *      `score` event, not on the entry). Everything here is raised by a peer
 *      connection or a track.
 *   2. **Magnitudes are on the wire.** `scoreReasons` is a
 *      `Record<reasonKey, pointsSubtracted>` from schema 3.6.0 onward. Older
 *      samples carry keys only; `maxPenalty` is what stands in for a magnitude
 *      there.
 *   3. **Two keys are gone and one is new.** `very-high-rtt` folded into
 *      `high-rtt` (which now subtracts 1 or 2 depending on the threshold
 *      crossed) and `low-bitrate-per-pixel` was replaced by `pixelated-video`,
 *      which judges the decoded quantizer against a codec-specific band rather
 *      than guessing sharpness from bits per pixel. Both retired keys are kept
 *      below, marked `retired`, so an old recording still explains itself.
 *
 * Penalties described as *normalized* ramp linearly from 0 at an activation
 * threshold to their maximum at a saturation point, so a recorded magnitude
 * anywhere between the two is meaningful on its own.
 */

export type ScoreReasonEntity = 'peer-connection' | 'inbound-track' | 'outbound-track';

/** Broad grouping, used to summarise where a client's trouble was concentrated. */
export type ScoreReasonGroup = 'path' | 'audio' | 'video-receive' | 'video-send';

export interface ScoreReasonMeta {
  key: string;
  label: string;
  /** Entities that can raise it. Several reasons exist on more than one. */
  entities: ScoreReasonEntity[];
  media?: 'audio' | 'video';
  /** Most points this reason can subtract from its entity's base score. */
  maxPenalty: number;
  /**
   * Set when a client-monitor-js version stopped emitting the key. The entry
   * stays so recordings made before that version still explain themselves;
   * the string names the version and what took its place.
   */
  retired?: string;
  /** One-line verdict: what the detector proved. */
  meaning: string;
  /** Where to look next. */
  guidance: string;
  group: ScoreReasonGroup;
}

export const GROUP_LABELS: Record<ScoreReasonGroup, string> = {
  path: 'Network path',
  audio: 'Audio',
  'video-receive': 'Video received',
  'video-send': 'Video sent',
};

export const SCORE_REASONS: Record<string, ScoreReasonMeta> = {
  'high-rtt': {
    key: 'high-rtt',
    label: 'High round-trip time',
    entities: ['peer-connection'],
    maxPenalty: 2,
    meaning:
      'The path is long. Two steps: average RTT above 150 ms subtracts 1, above 300 ms subtracts 2 — the point where interactive conversation stops working.',
    guidance:
      'Check the selected candidate pair and whether media is being relayed. A recorded magnitude of 2 means the 300 ms threshold was crossed, not merely approached.',
    group: 'path',
  },
  'very-high-rtt': {
    key: 'very-high-rtt',
    label: 'Very high round-trip time',
    entities: ['peer-connection'],
    maxPenalty: 2,
    retired: '4.7.0 — folded into high-rtt, which now subtracts 2 at the same 300 ms threshold',
    meaning: 'Average RTT above 300 ms — interactive conversation suffers badly.',
    guidance: 'Usually a geographically distant or relayed path. Compare against the ICE candidate pair and TURN usage.',
    group: 'path',
  },
  'high-jitter': {
    key: 'high-jitter',
    label: 'High jitter',
    entities: ['peer-connection'],
    maxPenalty: 2,
    meaning:
      'Packet arrival timing is unstable — the average across the streams that carried media. Above 30 ms subtracts 1, above 100 ms subtracts 2.',
    guidance:
      'The receiver has to buffer more to compensate, which adds latency. Look for a congested or wireless uplink. Streams carrying no media (an SFU probation stream) are excluded from the average, so this is about the real path.',
    group: 'path',
  },
  'high-packetloss': {
    key: 'high-packetloss',
    label: 'Packet loss',
    entities: ['peer-connection'],
    maxPenalty: 5,
    meaning:
      'Packets are being lost in this interval — the per-interval loss fraction averaged over the streams that carried media. Above 1% subtracts 1, above 5% subtracts 2, above 20% subtracts the whole 5.',
    guidance:
      'The heaviest single penalty available: a magnitude of 5 pins the connection at zero on its own. Check the path first, then whether one stream or all of them are affected.',
    group: 'path',
  },
  'low-fps': {
    key: 'low-fps',
    label: 'Low frame rate',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning: 'Sustained frame rate under 10 fps while frames were actually flowing — motion is visibly choppy.',
    guidance:
      'Not raised for screen share, and not for a dry or paused track (that is DryInboundTrackDetector’s verdict). Check the sender’s encoder and the available bandwidth.',
    group: 'video-receive',
  },
  'volatile-fps': {
    key: 'volatile-fps',
    label: 'Unsteady frame rate',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning:
      'The frame rate is fluctuating beyond 0.1 of its own EWMA as standard deviation — playback feels unsteady even when the average looks fine. Normalized, saturating at 0.2.',
    guidance: 'Not raised for screen share, whose frame rate is bursty by design. Often congestion control reacting, or an encoder struggling in bursts.',
    group: 'video-receive',
  },
  'dropped-video-frames': {
    key: 'dropped-video-frames',
    label: 'Dropped frames',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning: 'More than 10% of frames arrived but were dropped instead of rendered. Normalized, saturating at 20%.',
    guidance: 'A receive-side performance problem — the frames made it across the network. Check decode CPU.',
    group: 'video-receive',
  },
  'video-frame-corruptions': {
    key: 'video-frame-corruptions',
    label: 'Frame corruption',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning: 'Decoded frames carry visible corruption — per-interval corruption probability beyond 0.05, saturating at 0.5.',
    guidance: 'Usually loss the decoder could not conceal. Check packet loss and keyframe requests on the same track.',
    group: 'video-receive',
  },
  'frozen-video': {
    key: 'frozen-video',
    label: 'Frozen video',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 2,
    meaning: 'The picture was frozen. This dominates every other aspect of the track.',
    guidance:
      'Derived from FreezedVideoTrackDetector, so it is absent when that detector is disabled. Check the producer’s send side and whether keyframes were being answered.',
    group: 'video-receive',
  },
  'pixelated-video': {
    key: 'pixelated-video',
    label: 'Pixelated video',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 3,
    meaning:
      'The decoded picture was coarsely quantized enough to show — blocking and loss of detail. Judged from the inbound qpSum against a band chosen for the codec and the motion type, so it describes the frames this viewer actually saw.',
    guidance:
      'Weighted by how far the picture was magnified to reach the viewer: up to 3 points for a large presentation, 2 by default, 0.5 for a thumbnail. Absent when the browser does not report qpSum for the codec in use. Replaced low-bitrate-per-pixel in 4.7.0.',
    group: 'video-receive',
  },
  'low-bitrate-per-pixel': {
    key: 'low-bitrate-per-pixel',
    label: 'Starved for its resolution',
    entities: ['inbound-track'],
    media: 'video',
    maxPenalty: 1,
    retired: '4.7.0 — replaced by pixelated-video, which measures the decoded quantizer instead of inferring from bitrate',
    meaning: 'Bits per pixel are under the codec’s floor — blur and blockiness long before anything freezes.',
    guidance: 'Either the sender is bandwidth-limited at too high a resolution, or the layer choice is wrong.',
    group: 'video-receive',
  },
  'high-deviation-from-target-bitrate': {
    key: 'high-deviation-from-target-bitrate',
    label: 'Below its own target bitrate',
    entities: ['outbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning:
      'The encoder is sending at least 5% less than the target it set for itself — it wants to send more but cannot. Normalized, saturating at 15%.',
    guidance:
      'Not raised for screen share. Measured against the summed payload bitrate of every layer, so a simulcast track is judged as a whole. Look at CPU and at the uplink.',
    group: 'video-send',
  },
  'high-volatile-bitrate': {
    key: 'high-volatile-bitrate',
    label: 'Swinging send bitrate',
    entities: ['outbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning: 'The sending bitrate is swinging beyond 0.1 of its EWMA. Normalized, saturating at 0.2.',
    guidance: 'Not raised for screen share, whose bitrate collapses to near zero between changes by design. Typically an unstable uplink, or congestion control fighting for a stable estimate.',
    group: 'video-send',
  },
  'cpu-limitation': {
    key: 'cpu-limitation',
    label: 'CPU-limited encoder',
    entities: ['outbound-track'],
    media: 'video',
    maxPenalty: 2,
    meaning: 'The encoder spent at least 30% of the interval CPU-limited — the machine cannot keep up.',
    guidance:
      'Taken from qualityLimitationDurations, with the instantaneous qualityLimitationReason as a fallback for browsers that do not report the totals. Every receiver of this track sees the resulting resolution and frame-rate drop.',
    group: 'video-send',
  },
  'bandwidth-limitation': {
    key: 'bandwidth-limitation',
    label: 'Bandwidth-limited encoder',
    entities: ['outbound-track'],
    media: 'video',
    maxPenalty: 1,
    meaning: 'The encoder spent at least 50% of the interval bandwidth-limited — the uplink is the bottleneck.',
    guidance: 'Penalised more mildly than CPU on purpose: bandwidth adaptation is the system working as designed.',
    group: 'video-send',
  },
  'downscaled-screenshare': {
    key: 'downscaled-screenshare',
    label: 'Downscaled screen share',
    entities: ['outbound-track'],
    media: 'video',
    maxPenalty: 2,
    meaning:
      'A screen share is encoded below the captured resolution: under half the captured area subtracts 1, under a quarter subtracts 2 — the point where shared text stops being readable.',
    guidance:
      'The only quality penalty applied to screen share, because sharpness is what screen share is for. Check the encoder’s scaling and whether the share is competing with camera tracks for bitrate.',
    group: 'video-send',
  },
  'audio-concealment': {
    key: 'audio-concealment',
    label: 'Audio concealment',
    entities: ['inbound-track'],
    media: 'audio',
    maxPenalty: 1,
    meaning: 'NetEQ is audibly filling in missing audio — the listener hears gaps, warbles or robotic artifacts.',
    guidance:
      'Gated by the audio-concealment issue being active, then scaled from that detector’s own activation threshold up to a 10% audible concealment share. A tick where the rate fell back under the threshold contributes nothing even while the issue stays open.',
    group: 'audio',
  },
  'audio-time-stretch': {
    key: 'audio-time-stretch',
    label: 'Audio time-stretching',
    entities: ['inbound-track'],
    media: 'audio',
    maxPenalty: 1,
    meaning:
      'NetEQ is stretching or compressing a significant share of samples to keep up — audio may sound sped-up, slowed-down, or drift against video.',
    guidance: 'Gated by the audio-desync issue, saturating at a 30% correction share. Often a clock-drift or jitter problem rather than loss.',
    group: 'audio',
  },
  'high-jitter-buffer-delay': {
    key: 'high-jitter-buffer-delay',
    label: 'High jitter-buffer delay',
    entities: ['inbound-track'],
    media: 'audio',
    maxPenalty: 1,
    meaning: 'The jitter buffer’s target delay adds noticeable latency — the audio plays cleanly, but late.',
    guidance:
      'Gated by the audio-jitter-buffer-stress issue, saturating at a 500 ms target delay. The buffer is doing its job; the path is why it has to.',
    group: 'audio',
  },
};

/** Metadata for a reason key, synthesised for keys this table does not know. */
export function getScoreReasonMeta(key: string): ScoreReasonMeta {
  const known = SCORE_REASONS[key];
  if (known) return known;
  return {
    key,
    label: key,
    entities: [],
    maxPenalty: 0,
    meaning: 'Reason raised by a score calculator this dashboard does not have a description for.',
    guidance: 'Custom or newer calculators can define their own reason keys. The count is still accurate.',
    group: 'path',
  };
}

export function isKnownScoreReason(key: string): boolean {
  return key in SCORE_REASONS;
}

/**
 * True when the key is still emitted by the current client-monitor-js.
 *
 * A retired key in a recording is not an error — it dates the recording.
 */
export function isRetiredScoreReason(key: string): boolean {
  return Boolean(SCORE_REASONS[key]?.retired);
}
