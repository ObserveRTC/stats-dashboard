/**
 * The issue vocabulary of **client-monitor-js 4.9.0**, and what each finding
 * means for the call.
 *
 * 4.9.0 rebuilt the detector layer around one rule — *one detector class raises
 * one issue type* — and rebuilt the score around a second — *the score is a
 * reading of the open issues, and nothing else*. 26 detector classes became 46,
 * 25 issue types became 37, and every one of those 37 is priced by a single
 * table (`ISSUE_SCORING`, mirrored below).
 *
 * This dashboard supports 4.9.0 and later. Types retired in that release —
 * `audio-concealment`, `audio-desync`, `freezed-video-track`, `keyframe-storm`,
 * `capture-bottleneck`, `capture-track-ended`, `blocked-transport`,
 * `media-pipeline-stalled` — are gone from the table rather than kept as
 * aliases: a split class cannot be aliased onto one of its parts without lying
 * about what it found. An older recording lands in the synthesised fallback,
 * which reads its payload rather than its name.
 *
 * ## Two categorisations, on purpose
 *
 * `category` is a **presentation** grouping: which object on the client page
 * owns the finding, and therefore which timeline it is drawn on.
 *
 * `scoring.category` is the **monitor's** grouping, one of the four kinds in
 * `ISSUE_SCORING`, and it decides how the finding moves a score:
 *
 *   - `connectivity` — the path is unusable. The connection scores **0** while
 *     the issue is open; nothing else is consulted.
 *   - `pipeline-disruption` — media stopped moving somewhere between the
 *     capture device and the renderer. It **caps** the score at
 *     `5 x (1 - weight)`; the deepest cap wins and two do not stack.
 *   - `perceived-quality` — media is flowing and a person can tell it is wrong.
 *     It **subtracts**, and several mild faults accumulate.
 *   - `transport-quality` — the path carries media, badly. It subtracts from
 *     the *connection*, which is one of the five dimensions of the call score.
 *
 * The rule behind the split is worth stating, because it is why the same
 * degradation is never charged twice: **a peer connection is scored for the
 * state of the path, a track for what the user perceived, and nothing is scored
 * for both.** Loss, jitter and round trip belong to the transport and are
 * subtracted once, there. Freezes, pixelation, invented speech and
 * jitter-buffer stress are measurements of damage a person experienced, and are
 * raised on the track.
 */

export const RESOLVED_ISSUE_SUFFIX = '-resolved';

/**
 * Where an issue belongs on the client page.
 *
 * Presentation only — the monitor does not have this concept. It answers
 * "which object's timeline draws this", which is what an operator needs when
 * they are looking at one consumer and want to know what happened to it.
 */
export type IssueCategory =
  | 'audio'
  | 'video-receive'
  | 'video-send'
  | 'capture'
  | 'ice'
  | 'transport'
  | 'endpoint'
  | 'other';

/** The four kinds `ISSUE_SCORING` uses, mirrored from the monitor. */
export type IssueScoreCategory =
  | 'connectivity'
  | 'pipeline-disruption'
  | 'perceived-quality'
  | 'transport-quality';

/**
 * Which monitor holds the issue, and therefore whose score it moves.
 *
 * A track issue lowers that track's score and reaches the call through its
 * dimension; a peer-connection issue lowers the connection's *stability* score,
 * which is a dimension of its own rather than an average of the tracks riding
 * on it.
 */
export type IssueScope = 'client' | 'peer-connection' | 'inbound-track' | 'outbound-track';

/** Where an issue type belongs on the client page besides Client Issues. */
export type IssueTimelineTarget = 'consumer' | 'producer' | 'transport' | 'session';

export type IssueChartKind =
  | 'inbound-invented-speech'
  | 'inbound-jitter-buffer'
  | 'inbound-av-desync'
  | 'inbound-video-flow'
  | 'inbound-pli-keyframe'
  | 'inbound-stuck-decoder'
  | 'inbound-decoder-load'
  | 'inbound-playout'
  | 'inbound-bitrate'
  | 'inbound-frame-supply'
  | 'inbound-bits-per-pixel'
  | 'outbound-bitrate'
  | 'outbound-capture-fps'
  | 'outbound-encoder'
  | 'media-source-audio-level'
  | 'ice-bytes'
  | 'ice-media-vs-transport'
  | 'ice-rtt'
  | 'ice-loss'
  | 'session-bitrate'
  | 'cpu-limitation';

export type IssueHighlightFormat =
  | 'string'
  | 'number'
  | 'ms'
  | 'fraction'
  | 'per-sec'
  | 'bytes'
  | 'bps';

export type IssueHighlightField = {
  key: string;
  label: string;
  format: IssueHighlightFormat;
};

export type IssueChartSpec = {
  kind: IssueChartKind;
  title: string;
  description: string;
};

/** How this issue is priced, mirroring one row of the monitor's `ISSUE_SCORING`. */
export type IssueScoreRule = {
  category: IssueScoreCategory;
  /** Share of the full 0-5 score this fault is worth at full severity, `0..1`. */
  weight: number;
  /**
   * A `0..1` payload field the monitor reads as the severity instead of
   * assuming the weight. Only the few detectors that measure how deep their
   * finding is declare one; for every other issue the weight is the whole
   * story, because the detector only ever says yes or no.
   */
  severityField?: string;
};

export type IssueTypeMeta = {
  type: string;
  label: string;
  category: IssueCategory;
  color: string;
  /** The release that introduced the type under this name. */
  since: '4.9.0' | 'pre-4.9.0';
  severity: 'info' | 'warning' | 'critical';
  /** Which monitor raises it — and therefore whose score it moves. */
  scope: IssueScope;
  scoring: IssueScoreRule;
  /** One-line verdict of what the detector proved. */
  summary: string;
  /** How to read the issue in an investigation. */
  meaning: string;
  /** What it costs the people on the call while it is open. */
  implication: string;
  /** What to do about it, or what to look at next. */
  remedy: string;
  charts: IssueChartSpec[];
  highlightFields: IssueHighlightField[];
};

export const ISSUE_CATEGORY_ORDER: IssueCategory[] = [
  'audio',
  'video-receive',
  'video-send',
  'capture',
  'ice',
  'transport',
  'endpoint',
  'other',
];

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  audio: 'Audio',
  'video-receive': 'Video receive',
  'video-send': 'Video send',
  capture: 'Capture',
  ice: 'ICE / connectivity',
  transport: 'Transport quality',
  endpoint: 'Endpoint',
  other: 'Other',
};

export const ISSUE_SCORE_CATEGORY_LABELS: Record<IssueScoreCategory, string> = {
  connectivity: 'Connectivity',
  'pipeline-disruption': 'Pipeline disruption',
  'perceived-quality': 'Perceived quality',
  'transport-quality': 'Transport quality',
};

/** What each kind does to the score it is read into. */
export const ISSUE_SCORE_CATEGORY_EFFECT: Record<IssueScoreCategory, string> = {
  connectivity:
    'Zeroes the connection score while open — nothing riding on an unusable path can be good.',
  'pipeline-disruption':
    'Caps the score in proportion to its weight. The deepest cap wins; two do not stack.',
  'perceived-quality':
    'Subtracts from the track, so several mild faults accumulate the way a viewer experiences them.',
  'transport-quality':
    'Subtracts from the connection, which is one of the five dimensions of the call score.',
};

export const ISSUE_TIMELINE_TARGET_LABELS: Record<IssueTimelineTarget, string> = {
  consumer: 'Consumer timeline',
  producer: 'Producer timeline',
  transport: 'Transport timeline',
  session: 'Client Issues',
};

export function issueTimelineTargetFromCategory(category: IssueCategory): IssueTimelineTarget {
  switch (category) {
    case 'audio':
    case 'video-receive':
      return 'consumer';
    case 'video-send':
    case 'capture':
      return 'producer';
    case 'ice':
    case 'transport':
      return 'transport';
    default:
      return 'session';
  }
}

const FALLBACK_COLORS = ['#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6'];

/** Every issue carries these; listed once rather than repeated in 37 rows. */
const TRACK_TAIL: IssueHighlightField[] = [
  { key: 'durationInMs', label: 'Duration', format: 'ms' },
  { key: 'trackId', label: 'Track', format: 'string' },
];

const PC_TAIL: IssueHighlightField[] = [
  { key: 'durationInMs', label: 'Duration', format: 'ms' },
  { key: 'peerConnectionId', label: 'Peer connection', format: 'string' },
];

const TRANSPORT_TAIL: IssueHighlightField[] = [
  { key: 'durationInMs', label: 'Duration', format: 'ms' },
  { key: 'transportId', label: 'Transport', format: 'string' },
  { key: 'peerConnectionId', label: 'Peer connection', format: 'string' },
];

export const CLIENT_ISSUE_TYPES: Record<string, IssueTypeMeta> = {
  /* ---- Perceived quality: it is flowing, and it looks or sounds wrong ---- */

  'invented-speech': {
    type: 'invented-speech',
    label: 'Invented speech',
    category: 'audio',
    color: '#06b6d4',
    since: '4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'perceived-quality', weight: 0.6 },
    summary: 'NetEQ had to invent audio the sender never delivered, for long enough to hear.',
    meaning:
      'The 4.9.0 replacement for `audio-concealment`, and a different measurement: it accumulates invented audio while someone was speaking (silence excluded) and raises once the excess past the allowed ratio reaches the configured budget. Loss is not the discriminator — in a captured session 754 of 772 intervals measured zero packet loss and 31 of them still had audible invention above 0.5%, from jitter-buffer underruns and late arrivals rather than packets that never came.',
    implication:
      'This is what "you are breaking up" sounds like. Every millisecond counted here is audio the listener heard as a warble, a click or a smear rather than as the speaker.',
    remedy:
      'Read it beside `audio-jitter-buffer-stress` on the same track and the transport issues on its peer connection. Invention with a quiet path is a jitter or pacing problem; invention with `transport-loss-sustained` is real loss.',
    charts: [
      {
        kind: 'inbound-invented-speech',
        title: 'Invented speech ratio',
        description: 'Share of played speech the decoder fabricated, with the accumulated excess that raised the issue.',
      },
    ],
    highlightFields: [
      { key: 'inventedSpeechRatio', label: 'Invented share', format: 'fraction' },
      { key: 'excessInventedMs', label: 'Excess invented', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  'synthesized-audio': {
    type: 'synthesized-audio',
    label: 'Synthesized audio playout',
    category: 'audio',
    color: '#0891b2',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'perceived-quality', weight: 0.4 },
    summary: 'The playout device played more fabricated audio than the threshold allows, for a sustained window.',
    meaning:
      'The same fault as `invented-speech` seen from the other end: `invented-speech` is the stream that had to conceal, this is the device that had to play something. Both can be open at once, which is why the pair is priced so it is not double-weighted — 0.4 here against 0.6 there.',
    implication:
      'A ratio near 1 is a listener with nothing real left to hear at all. Below that it is the same audible damage the invented-speech finding describes, attributed to the playout path.',
    remedy:
      'Treat the pair as one episode. If only this one is open, the trouble is on the playout side (device, sink, audio worklet) rather than in any single stream.',
    charts: [
      {
        kind: 'inbound-jitter-buffer',
        title: 'Synthesized share of playout',
        description: 'Milliseconds synthesized against milliseconds played, over the detection window.',
      },
    ],
    highlightFields: [
      { key: 'synthesizedRatio', label: 'Synthesized share', format: 'fraction' },
      { key: 'synthesizedForDetectionInMs', label: 'Synthesized', format: 'ms' },
      { key: 'playedOutForDetectionInMs', label: 'Played out', format: 'ms' },
      { key: 'synthesisEvents', label: 'Episodes', format: 'number' },
      { key: 'playoutDelayPerSampleInMs', label: 'Playout delay/sample', format: 'ms' },
      { key: 'detectionWindowInMs', label: 'Window', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  'audio-jitter-buffer-stress': {
    type: 'audio-jitter-buffer-stress',
    label: 'Jitter buffer stress',
    category: 'audio',
    color: '#0ea5e9',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'perceived-quality', weight: 0.3 },
    summary: 'NetEQ grew its target delay and had to time-stretch — added latency plus audible warble.',
    meaning:
      'Either signal alone is the buffer working: a grown target delay is latency bought to hide jitter, and time-stretching alone is ordinary clock-drift correction. Both together, for `minConsecutiveTicks`, mean the buffer is fighting the network rather than absorbing it.',
    implication:
      'The lightest perceived-quality price in the table (1.5 of 5 at full weight) because audio still arrives — but it arrives late and slightly wrong, which is what turns a conversation into people talking over each other.',
    remedy:
      'Compare the target delay against the actual. A target far above actual is the buffer bracing for jitter it has already seen; check the transport for `transport-delay-degraded` and for congestion on the receive side.',
    charts: [
      {
        kind: 'inbound-jitter-buffer',
        title: 'Jitter buffer target delay vs time-stretch',
        description: 'Target delay in milliseconds and the share of samples stretched or compressed. Stress requires both.',
      },
    ],
    highlightFields: [
      { key: 'targetDelayInMs', label: 'Target delay', format: 'ms' },
      { key: 'actualDelayInMs', label: 'Actual delay', format: 'ms' },
      { key: 'timeStretchRate', label: 'Time-stretch', format: 'fraction' },
      { key: 'consecutiveTicks', label: 'Ticks', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  'av-desync': {
    type: 'av-desync',
    label: 'A/V desync',
    category: 'audio',
    color: '#22d3ee',
    since: '4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'perceived-quality', weight: 0.4 },
    summary: 'This audio track played ahead of or behind the video it belongs with, and stayed there.',
    meaning:
      'Replaces `audio-desync`, which inferred lip sync from a jitter-buffer counter that moved because sync was being corrected. This one compares the audio track’s playout against its linked video track’s directly, and only raises after the skew holds past the threshold for `sustainForInMs` of stats time. `playoutDiffInMs` is signed: positive means audio is ahead.',
    implication:
      'Lip sync is one of the faults people notice instantly and cannot ignore, even when both streams are individually clean. Nothing else in the table detects it.',
    remedy:
      'Check the linked video track for a freeze or a decoder finding — video falling behind is the usual cause, and fixing the video ends the desync. Persistent audio-ahead skew with healthy video points at the playout path.',
    charts: [
      {
        kind: 'inbound-av-desync',
        title: 'Audio vs video playout skew',
        description: 'Signed skew in milliseconds between the audio track and the video track it is linked to.',
      },
    ],
    highlightFields: [
      { key: 'playoutDiffInMs', label: 'Skew', format: 'ms' },
      { key: 'direction', label: 'Direction', format: 'string' },
      { key: 'sustainedForInMs', label: 'Sustained for', format: 'ms' },
      { key: 'linkedVideoTrackId', label: 'Linked video track', format: 'string' },
      ...TRACK_TAIL,
    ],
  },

  'video-flow-disrupted': {
    type: 'video-flow-disrupted',
    label: 'Video flow disrupted',
    category: 'video-receive',
    color: '#ef4444',
    since: '4.9.0',
    severity: 'critical',
    scope: 'inbound-track',
    scoring: { category: 'perceived-quality', weight: 0.8 },
    summary: 'The picture stopped: once and for long (`frozen`), or repeatedly and briefly (`choppy`).',
    meaning:
      'Replaces `freezed-video-track` and folds choppiness into the same finding, discriminated by `state`. `frozen` is one freeze that outlasted `frozenAfterInMs` and closes the moment frames render again; `choppy` is `minFreezeCountForChoppy` freezes inside the observation window and needs a whole freeze-free `continuousDurationInMs` to close. Frozen wins wherever both would fit. Screen shares, paused tracks and a backgrounded tab are not judged at all.',
    implication:
      'The heaviest perceived-quality price in the table (4.0 of 5) because it is the complaint behind most "you are breaking up" reports. `frozen` usually means delivery stopped or the decoder wedged; `choppy` usually means frames are arriving late or in bursts.',
    remedy:
      'Read the pipeline findings on the same track first — `stuck-decoder`, `frame-assembly-stalled`, `dry-inbound-track` and `video-recovery-failed` all cause freezes and each names a different fix. A freeze with none of them and a healthy path is usually the sender.',
    charts: [
      {
        kind: 'inbound-video-flow',
        title: 'Decoded FPS and freeze count',
        description: 'Decoded frame rate and cumulative freeze starts. Shaded windows are the disrupted episodes.',
      },
    ],
    highlightFields: [
      { key: 'state', label: 'State', format: 'string' },
      { key: 'observedFrozenTimeInMs', label: 'Frozen for', format: 'ms' },
      { key: 'freezeCount', label: 'Freezes in window', format: 'number' },
      { key: 'frozenRatio', label: 'Frozen share', format: 'fraction' },
      { key: 'windowInMs', label: 'Window', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  'pixelated-video': {
    type: 'pixelated-video',
    label: 'Pixelated video',
    category: 'video-receive',
    color: '#f43f5e',
    since: '4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'perceived-quality', weight: 0.5 },
    summary: 'Bits per pixel stayed at or below the threshold long enough for the blocking to be visible.',
    meaning:
      'The detector decides whether the picture is blocky, which is a fact about the stream and the same everywhere. How much it matters is a fact about this client: the score multiplies the price by the track’s `displayMagnification` — x1.5 at 1.5x or larger, x0.25 below 0.75x, x1 in between and whenever nothing declared a presented size. So the same finding costs 3.75 full-screen and 0.63 in a thumbnail.',
    implication:
      'Moving, legible, and ugly. It never blocks the call, but it is the difference between reading a shared slide and not.',
    remedy:
      'A blocky picture at a healthy frame rate is a bitrate allocation question: check `downlink-congestion` on the receiving peer connection and the sender’s simulcast layer choice. If the application declares a presented size, this is also the finding to weight by it.',
    charts: [
      {
        kind: 'inbound-bits-per-pixel',
        title: 'Bits per pixel',
        description: 'Received bitrate against decoded frame area and rate. The episode shades where it sat under the threshold.',
      },
    ],
    highlightFields: [
      { key: 'bitPerPixel', label: 'Bits/pixel', format: 'number' },
      { key: 'frameWidth', label: 'Width', format: 'number' },
      { key: 'frameHeight', label: 'Height', format: 'number' },
      { key: 'framesPerSecond', label: 'FPS', format: 'number' },
      { key: 'sustainedForInMs', label: 'Sustained for', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  /* ---- Pipeline disruption: media stopped moving somewhere ---- */

  'dry-inbound-track': {
    type: 'dry-inbound-track',
    label: 'Dry inbound track',
    category: 'video-receive',
    color: '#64748b',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'This inbound track stopped receiving bytes while it was expected to flow.',
    meaning:
      'No inbound RTP bytes for longer than the dry threshold, ignoring remote pause. The discriminator against `stuck-decoder` is bytes: dry is starvation, stuck is a wedge with traffic still arriving.',
    implication:
      'A full-weight cap: the track scores 0 while it is open, because there is no media to be good. Nothing downstream of it can be judged.',
    remedy:
      'Check the remote producer for a pause first — a paused producer is an expected dry track. Otherwise look at the transport: `transport-demux-stalled` and the blocked-media findings explain a dry track that the sender believes it is filling.',
    charts: [
      {
        kind: 'inbound-bitrate',
        title: 'Inbound bitrate',
        description: 'Received bitrate on the affected track. A dry episode is a stretch at or near zero.',
      },
    ],
    highlightFields: [
      { key: 'duration', label: 'Dry for', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  'dry-outbound-track': {
    type: 'dry-outbound-track',
    label: 'Dry outbound track',
    category: 'video-send',
    color: '#78716c',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'outbound-track',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'This outbound track stopped sending bytes while it was expected to flow.',
    meaning:
      'No outbound RTP bytes past the dry threshold. The send-side twin of `dry-inbound-track`, and the symptom every capture failure eventually produces.',
    implication:
      'A full-weight cap on the track, and — unlike most findings — one every other participant experiences. Nobody is receiving this person.',
    remedy:
      'Look at `capture-source-lost` and `silent-audio-source` on the same track, and at `rtp-sender-stalled` on its peer connection. A dry track with a healthy capture source and a stalled sender is a wedged sender, not a device problem.',
    charts: [
      {
        kind: 'outbound-bitrate',
        title: 'Outbound bitrate',
        description: 'Sent bitrate on the affected track. A dry episode is a stretch at or near zero.',
      },
    ],
    highlightFields: [
      { key: 'duration', label: 'Dry for', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  'capture-source-lost': {
    type: 'capture-source-lost',
    label: 'Capture source lost',
    category: 'capture',
    color: '#ca8a04',
    since: '4.9.0',
    severity: 'critical',
    scope: 'outbound-track',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'The camera or microphone track reached `ended` — the device is gone.',
    meaning:
      'Renamed from `capture-track-ended` in 4.9.0, and now the only thing its detector reports; the OS or another app taking the device is `CaptureTrackMutedDetector`, which raises no issue and emits `CAPTURE_TRACK_MUTED` instead. Terminal: it is never resolved, because a dead device does not come back on the same track.',
    implication:
      'A full-weight cap, and the end of that track for this session. Everything downstream — the dry outbound track, the collapse in send bitrate — is a symptom of it.',
    remedy:
      'Nothing in RTP explains it and nothing in RTP fixes it. Read `deviceLabel` and the `CAPTURE_SOURCE_LOST` event: unplugged device, an OS permission revoked, or a virtual camera whose host application quit. The application has to re-acquire the device.',
    charts: [
      {
        kind: 'outbound-bitrate',
        title: 'Outbound bitrate',
        description: 'Sent bitrate around the lost source. Capture ending usually drops send to zero.',
      },
    ],
    highlightFields: [
      { key: 'kind', label: 'Kind', format: 'string' },
      { key: 'deviceLabel', label: 'Device', format: 'string' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },

  'silent-audio-source': {
    type: 'silent-audio-source',
    label: 'Silent microphone',
    category: 'capture',
    color: '#a3a3a3',
    since: '4.9.0',
    severity: 'critical',
    scope: 'outbound-track',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'A live, enabled, unmuted microphone produced digital silence for a long stretch.',
    meaning:
      'Split out of the old `CaptureFailureDetector` in 4.9.0 so it can be tuned and silenced on its own. RMS is integrated over the interval rather than sampled — instantaneous `audioLevel` reads zero between words. A muted mic is reported as a mute, never as this.',
    implication:
      'A full-weight cap. Digital silence and a person who is simply not talking are the same measurement, which is why the default threshold is tens of seconds: when it does raise, nobody has heard this person for that long.',
    remedy:
      'Read `silenceKind` and `deviceLabel`. A device that was captured successfully and produces nothing is usually an OS-level input selection problem or an exclusive-mode grab by another application.',
    charts: [
      {
        kind: 'media-source-audio-level',
        title: 'Capture audio level',
        description: 'Media-source audio level over the call. The episode is a long stretch near zero on a live track.',
      },
    ],
    highlightFields: [
      { key: 'silenceKind', label: 'Silence kind', format: 'string' },
      { key: 'rmsAudioLevel', label: 'RMS level', format: 'number' },
      { key: 'silentForInMs', label: 'Silent for', format: 'ms' },
      { key: 'capturedForInMs', label: 'Captured for', format: 'ms' },
      { key: 'deviceLabel', label: 'Device', format: 'string' },
      ...TRACK_TAIL,
    ],
  },

  'stuck-decoder': {
    type: 'stuck-decoder',
    label: 'Stuck decoder',
    category: 'video-receive',
    color: '#b91c1c',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'RTP bytes kept arriving, nothing decoded, and PLIs kept firing — a decode wedge.',
    meaning:
      'Bytes still flowing is what separates this from a dry track. `variant` names which half wedged: `assembly` is packets arriving with no frame reassembled, `decode` is frames assembling but never decoding.',
    implication:
      'A full-weight cap, and bandwidth spent on a picture nobody sees — `deadBytesReceived` is exactly that. The repair loop it triggers also competes with the traffic that would fix it.',
    remedy:
      'The known mitigation is recreating the consumer. It is one of the few findings with a direct programmatic remedy, which is why the monitor emits `stuck-decoder` as its own event.',
    charts: [
      {
        kind: 'inbound-stuck-decoder',
        title: 'Inbound bitrate vs decoded FPS',
        description: 'Dead traffic: bytes still received while decoded frames per second stays at zero.',
      },
    ],
    highlightFields: [
      { key: 'variant', label: 'Variant', format: 'string' },
      { key: 'stuckForInMs', label: 'Stuck for', format: 'ms' },
      { key: 'deadBytesReceived', label: 'Dead bytes', format: 'bytes' },
      { key: 'pliCountSinceStuck', label: 'PLIs while stuck', format: 'number' },
      { key: 'frameWidth', label: 'Width', format: 'number' },
      { key: 'frameHeight', label: 'Height', format: 'number' },
      { key: 'decoderImplementation', label: 'Decoder', format: 'string' },
      { key: 'ssrc', label: 'SSRC', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  'frame-assembly-stalled': {
    type: 'frame-assembly-stalled',
    label: 'Frame assembly stalled',
    category: 'video-receive',
    color: '#9f1239',
    since: '4.9.0',
    severity: 'critical',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'Packets kept arriving while `framesReceived` stayed flat — nothing ever assembled into a frame.',
    meaning:
      'New in 4.9.0, and deliberately narrower than `stuck-decoder`: this is the boundary before the decoder, where the depacketizer never completes a frame. Needs `minPacketsReceived` before it will judge, so a trickle is not mistaken for a stall.',
    implication:
      'A full-weight cap. The traffic is real and the receiver is doing nothing with it, so the bandwidth is spent for nothing — the same waste as a stuck decoder, one stage earlier.',
    remedy:
      'Usually a packetization or SSRC mismatch after a renegotiation, or a consumer created against a producer whose parameters changed. Compare `packetsSinceLastFrame` against the arriving bitrate; recreating the consumer is the same lever as for a stuck decoder.',
    charts: [
      {
        kind: 'inbound-frame-supply',
        title: 'Packets received vs frames assembled',
        description: 'Packet arrival against frames received. The stall is packets rising with frames flat.',
      },
    ],
    highlightFields: [
      { key: 'packetsSinceLastFrame', label: 'Packets since last frame', format: 'number' },
      { key: 'stalledForInMs', label: 'Stalled for', format: 'ms' },
      { key: 'ssrc', label: 'SSRC', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  'rtp-sender-stalled': {
    type: 'rtp-sender-stalled',
    label: 'RTP sender stalled',
    category: 'video-send',
    color: '#db2777',
    since: '4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'Frames encoded on an ssrc while no packet left it — the sender wedged after the encoder.',
    meaning:
      'One half of the old `media-pipeline-stalled`, now its own detector with its own ssrc-scoped key. An encoded frame always packetizes, and congestion control or adaptation would have stopped the encoder instead — so a sustained violation is a wedge, not backpressure. Seen after `replaceTrack` races and simulcast reconfigurations.',
    implication:
      'A full-weight cap on the peer connection. The encoder is burning CPU producing frames that never reach the wire.',
    remedy:
      'Compare `framesEncodedDelta` against `packetsSentDelta` on the named ssrc. The application-level fix is renegotiating or replacing the sender; nothing on the network side will clear it.',
    charts: [
      {
        kind: 'outbound-bitrate',
        title: 'Encoded frames vs packets sent',
        description: 'Frames leaving the encoder against packets leaving the sender, per ssrc.',
      },
    ],
    highlightFields: [
      { key: 'framesEncodedDelta', label: 'Frames encoded Δ', format: 'number' },
      { key: 'packetsSentDelta', label: 'Packets sent Δ', format: 'number' },
      { key: 'stalledForMs', label: 'Stalled for', format: 'ms' },
      { key: 'ssrc', label: 'SSRC', format: 'number' },
      { key: 'trackId', label: 'Track', format: 'string' },
      ...PC_TAIL,
    ],
  },

  'transport-demux-stalled': {
    type: 'transport-demux-stalled',
    label: 'Transport demux stalled',
    category: 'ice',
    color: '#be123c',
    since: '4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'pipeline-disruption', weight: 1 },
    summary: 'The ICE transport was receiving real traffic while every inbound RTP on it stayed flat.',
    meaning:
      'The other half of the old `media-pipeline-stalled`. The receive bitrate is above the floor that rules out RTCP and STUN, so what is arriving is media — and none of it demuxes onto a stream. Attribution uses the one rule 4.8.0 introduced: exact `transportId`, and a stream without one belongs to a transport only when it is the connection’s sole transport.',
    implication:
      'A full-weight cap, and every track on that transport goes dry at the same moment. It is the finding that explains several simultaneous dry tracks on a perfectly healthy path.',
    remedy:
      'Almost always an SSRC mismatch after renegotiation, or a consumer created against a dead producer. Compare `transportReceivingBitrate` against `demuxedBytesDelta`; the fix is on the signalling side.',
    charts: [
      {
        kind: 'ice-media-vs-transport',
        title: 'Transport receive vs demuxed bytes',
        description: 'What the ICE transport took in against what any inbound RTP stream accounted for.',
      },
    ],
    highlightFields: [
      { key: 'transportReceivingBitrate', label: 'Transport in', format: 'bps' },
      { key: 'demuxedBytesDelta', label: 'Demuxed Δ', format: 'bytes' },
      { key: 'stalledForMs', label: 'Stalled for', format: 'ms' },
      ...TRANSPORT_TAIL,
    ],
  },

  'video-recovery-failed': {
    type: 'video-recovery-failed',
    label: 'Video recovery failed',
    category: 'video-receive',
    color: '#dc2626',
    since: '4.9.0',
    severity: 'critical',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 0.9 },
    summary: 'PLIs left the client, the picture stayed frozen, and `keyFramesDecoded` never advanced.',
    meaning:
      'The successor to `keyframe-storm`, which 4.9.0 removed outright. The storm was a rate; this is an outcome — repair was requested, and nothing usable came back. A high PLI rate that ends in a keyframe is the system working and is no longer reported at all.',
    implication:
      'Caps the track at 0.5 of 5. A freeze the repair loop could not end is a freeze that is not going to end on its own, and the PLIs it keeps sending compete with the keyframe that would fix it.',
    remedy:
      'The request left this client, so the answer is upstream: the SFU’s forwarding, or the producing client. Check the producer for a pause and the SFU for whether the PLI was forwarded at all.',
    charts: [
      {
        kind: 'inbound-pli-keyframe',
        title: 'PLI count vs keyframes decoded',
        description: 'Repair requests going out while decoded keyframes stay flat is the recovery-failed fingerprint.',
      },
    ],
    highlightFields: [
      { key: 'pliCountSinceStalled', label: 'PLIs while stalled', format: 'number' },
      { key: 'stalledForInMs', label: 'Stalled for', format: 'ms' },
      { key: 'freezeCount', label: 'Freeze count', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  'decoder-bottleneck': {
    type: 'decoder-bottleneck',
    label: 'Decoder bottleneck',
    category: 'video-receive',
    color: '#e11d48',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 0.7 },
    summary: 'Frames arrived and the decoder turned too few of them into pictures, averaged over a window.',
    meaning:
      'Frames received and frames decoded are accumulated over the detection window and compared once, so a decoder that stumbles and recovers is caught where a per-tick test reads it as mostly healthy. The bar is the measured arrival rate, never the sender’s intent — a stream deliberately throttled to 5 fps that decodes cleanly is silent here. Distinct from `video-decoder-overloaded`, which is about what decoding cost.',
    implication:
      'Caps the track at 1.5 of 5: frames are arriving and being lost, so the picture stutters rather than stops.',
    remedy:
      'Read `decodeDegradation` with the frame size. A bottleneck at a large frame size on a software decoder is a codec/hardware mismatch; one at a small size points at the machine — check `cpulimitation`.',
    charts: [
      {
        kind: 'inbound-frame-supply',
        title: 'Frames received vs decoded',
        description: 'Arrival rate against decode rate over the window. The bottleneck is the gap, not a low absolute rate.',
      },
    ],
    highlightFields: [
      { key: 'decodeDegradation', label: 'Decode degradation', format: 'fraction' },
      { key: 'receivedFpsForDetection', label: 'Received FPS', format: 'number' },
      { key: 'decodedFpsForDetection', label: 'Decoded FPS', format: 'number' },
      { key: 'detectionWindowInMs', label: 'Window', format: 'ms' },
      { key: 'frameWidth', label: 'Width', format: 'number' },
      { key: 'frameHeight', label: 'Height', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  'video-capture-bottleneck': {
    type: 'video-capture-bottleneck',
    label: 'Capture bottleneck',
    category: 'video-send',
    color: '#eab308',
    since: '4.9.0',
    severity: 'warning',
    scope: 'outbound-track',
    scoring: { category: 'pipeline-disruption', weight: 0.7 },
    summary: 'The capture device fell short of its configured frame rate across the detection window.',
    meaning:
      'Renamed from `capture-bottleneck` — and in 4.8.0 it also carried no score weight at all, because the issue union declared a type nothing raised. The discriminator against `encoder-bottleneck` is where the shortfall is: here the source never produced the frames, so no encoder and no network can help.',
    implication:
      'Caps the track at 1.5 of 5, and it is a fault every receiver of this track sees. A camera at 8 fps is 8 fps for everyone.',
    remedy:
      'Read `producedFpsForDetection` against `expectedFps`. A dim room (cameras drop frame rate to expose), a busy machine, or a screen share of static content — the last of which is expected and worth excluding rather than chasing.',
    charts: [
      {
        kind: 'outbound-capture-fps',
        title: 'Capture source FPS',
        description: 'Frames per second the media source actually produced, against the configured rate.',
      },
    ],
    highlightFields: [
      { key: 'produceDegradation', label: 'Produce degradation', format: 'fraction' },
      { key: 'producedFpsForDetection', label: 'Source FPS', format: 'number' },
      { key: 'expectedFps', label: 'Expected FPS', format: 'number' },
      { key: 'detectionWindowInMs', label: 'Window', format: 'ms' },
      { key: 'trackSettingsWidth', label: 'Width', format: 'number' },
      { key: 'trackSettingsHeight', label: 'Height', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  'encoder-bottleneck': {
    type: 'encoder-bottleneck',
    label: 'Encoder bottleneck',
    category: 'video-send',
    color: '#f59e0b',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'outbound-track',
    scoring: { category: 'pipeline-disruption', weight: 0.7 },
    summary: 'The source delivered frames and the encoder could not keep up, for the whole window.',
    meaning:
      'The exact opposite of `video-capture-bottleneck`, and the pair is why both exist: "we are sending fewer frames than we should" has two causes with opposite fixes. `qualityLimitationReason` and the encoder implementation corroborate.',
    implication:
      'Caps the track at 1.5 of 5. Usually a CPU-bound software encoder, and usually accompanied by resolution and frame-rate drops that every receiver sees.',
    remedy:
      'Check `encoderImplementation` and `powerEfficientEncoder` — a software encoder on a machine also reporting `cpulimitation` is the common case, and the lever is fewer simulcast layers or a lower resolution.',
    charts: [
      {
        kind: 'outbound-encoder',
        title: 'Source FPS vs encoded FPS',
        description: 'Capture frame rate against what the encoder produced, over the detection window.',
      },
    ],
    highlightFields: [
      { key: 'encodeDegradation', label: 'Encode degradation', format: 'fraction' },
      { key: 'producedFpsForDetection', label: 'Source FPS', format: 'number' },
      { key: 'encodedFpsForDetection', label: 'Encoded FPS', format: 'number' },
      { key: 'qualityLimitationReason', label: 'Limitation', format: 'string' },
      { key: 'encoderImplementation', label: 'Encoder', format: 'string' },
      { key: 'powerEfficientEncoder', label: 'Power-efficient', format: 'string' },
      { key: 'detectionWindowInMs', label: 'Window', format: 'ms' },
      ...TRACK_TAIL,
    ],
  },

  'inbound-video-playout-discrepancy': {
    type: 'inbound-video-playout-discrepancy',
    label: 'Playout discrepancy',
    category: 'video-receive',
    color: '#fb7185',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 0.7 },
    summary: 'More frames were received than rendered — the player dropped them after decode.',
    meaning:
      'Frame skew is received minus rendered, and the ratio is what raises. Everything upstream worked: the network delivered and the decoder decoded. The loss is in presentation.',
    implication:
      'Caps the track at 1.5 of 5. The viewer sees a stutter identical to a network problem, which is exactly why it is worth separating: nothing on the network would fix it.',
    remedy:
      'A display or compositor problem on this machine — a busy main thread, a video element off-screen, a browser throttling the tab. Check the tab-visibility lane before anything else.',
    charts: [
      {
        kind: 'inbound-playout',
        title: 'Received vs rendered FPS',
        description: 'Inbound frames received per second against frames rendered. The gap is playout dropping frames.',
      },
    ],
    highlightFields: [
      { key: 'frameSkew', label: 'Frame skew', format: 'number' },
      { key: 'skewRatio', label: 'Skew ratio', format: 'fraction' },
      { key: 'ewmaFps', label: 'EWMA FPS', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  cpulimitation: {
    type: 'cpulimitation',
    label: 'CPU limitation',
    category: 'endpoint',
    color: '#f472b6',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'client',
    scoring: { category: 'pipeline-disruption', weight: 0.6, severityField: 'minUtilization' },
    summary: 'The machine’s codecs were occupied enough that the endpoint, not the network, was the limit.',
    meaning:
      'The one pipeline issue that reports its own severity: `minUtilization` is the lower of encoder and decoder occupancy, already `0..1`, and the score reads it rather than assuming the weight. Utilizations sum across streams, so three simulcast layers busy half the time each come to 1.5 rather than saturating at 1. Streams on hardware codecs are counted out and reported separately.',
    implication:
      'Caps at up to 3.0 of 5, scaled by how occupied the codecs actually were. It is a statement about the whole endpoint rather than any one stream, which is why it is raised on the client.',
    remedy:
      'Read it as the context for `encoder-bottleneck` and `decoder-bottleneck` rather than as a finding to fix on its own. The counts of hardware-accelerated encoders and decoders say how much headroom a codec change would buy.',
    charts: [
      {
        kind: 'cpu-limitation',
        title: 'Encoder and decoder utilization',
        description: 'Time spent inside the video codecs per unit of stats time, summed over the streams on the CPU.',
      },
    ],
    highlightFields: [
      { key: 'minUtilization', label: 'Min utilization', format: 'fraction' },
      { key: 'encoderUtilization', label: 'Encoder utilization', format: 'fraction' },
      { key: 'decoderUtilization', label: 'Decoder utilization', format: 'fraction' },
      { key: 'hardwareAcceleratedEncoders', label: 'HW encoders', format: 'number' },
      { key: 'hardwareAcceleratedDecoders', label: 'HW decoders', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
    ],
  },

  'video-decoder-overloaded': {
    type: 'video-decoder-overloaded',
    label: 'Decoder overloaded',
    category: 'video-receive',
    color: '#fda4af',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'inbound-track',
    scoring: { category: 'pipeline-disruption', weight: 0.5 },
    summary: 'Frames arrived and loss was quiet, but decode time overran the frame budget.',
    meaning:
      'The earlier warning that `decoder-bottleneck` is the failure of: decoding is expensive but still keeping up. `dropRatio` is context here, never the trigger — frames lost after arrival are the bottleneck detector’s finding. It fires only when frames demonstrably arrived and loss was low, which is what separates "could not decode" from "never received".',
    implication:
      'The lightest pipeline cap in the table, at 2.5 of 5. The picture may still be moving; the machine is on the edge of not managing it.',
    remedy:
      'Compare `decodeTimePerFrameInMs` against `frameBudgetInMs`, and read `powerEfficientDecoder`: a software decoder overrunning budget is a codec choice, a hardware one overrunning is a genuinely loaded machine.',
    charts: [
      {
        kind: 'inbound-decoder-load',
        title: 'Decode time per frame vs budget',
        description: 'Wall-clock decode cost per frame against the stream’s own per-frame budget.',
      },
    ],
    highlightFields: [
      { key: 'decodeTimePerFrameInMs', label: 'Decode ms/frame', format: 'number' },
      { key: 'frameBudgetInMs', label: 'Budget ms/frame', format: 'number' },
      { key: 'dropRatio', label: 'Drop ratio', format: 'fraction' },
      { key: 'renderRatio', label: 'Render ratio', format: 'fraction' },
      { key: 'framesReceived', label: 'Frames received', format: 'number' },
      { key: 'decoderImplementation', label: 'Decoder', format: 'string' },
      { key: 'powerEfficientDecoder', label: 'Power-efficient', format: 'string' },
      { key: 'consecutiveTicks', label: 'Ticks', format: 'number' },
      ...TRACK_TAIL,
    ],
  },

  /* ---- Connectivity: the path is not usable ---- */

  'ice-connection-failed': {
    type: 'ice-connection-failed',
    label: 'ICE failed',
    category: 'ice',
    color: '#7c3aed',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'An ICE transport reached `failed` — terminal for that ICE generation.',
    meaning:
      'Raised immediately. Since 4.8.0 the peer connection’s `iceState` is the most severe state across its transports, so a failed transport is no longer masked by a healthy sibling on a non-BUNDLE connection. Resolves only when ICE reconnects, which in practice means after a restart.',
    implication:
      'A connectivity issue: the peer connection scores 0 while it is open, and the transport is one of the five dimensions of the call score. Only a restart can revive that generation.',
    remedy:
      'Pair with `ICE_RESTART_RECOMMENDED` and any `ICE_RESTART` event. `everConnected` tells you whether this was a working path that died or one that never came up.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Per-transport send and receive bitrate around the failed generation.',
      },
    ],
    highlightFields: [
      { key: 'everConnected', label: 'Ever connected', format: 'string' },
      { key: 'dtlsState', label: 'DTLS', format: 'string' },
      { key: 'iceGeneration', label: 'ICE generation', format: 'number' },
      { key: 'selectedCandidatePairId', label: 'Selected pair', format: 'string' },
      ...TRANSPORT_TAIL,
    ],
  },

  'ice-disconnected': {
    type: 'ice-disconnected',
    label: 'ICE disconnected',
    category: 'ice',
    color: '#8b5cf6',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'ICE stayed `disconnected` past the blip window — not the transient ICE usually heals.',
    meaning:
      'Raised only after `disconnectedThresholdInMs`, so routine ICE repairs never produce an issue. Recovery resolves it with the episode duration.',
    implication:
      'A connectivity issue: 0 on the connection while it is open. Media is not flowing in either direction for the duration.',
    remedy:
      'Read `disconnectedForMs` against the session timeline — a handful of short episodes is a flaky link, one long one is an outage. Check whether an ICE restart followed and whether `unstable-ice-path` is also open.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Per-transport send and receive bitrate. A disconnect episode is a hole in both directions.',
      },
    ],
    highlightFields: [
      { key: 'disconnectedForMs', label: 'Disconnected for', format: 'ms' },
      { key: 'iceState', label: 'ICE state', format: 'string' },
      { key: 'dtlsState', label: 'DTLS', format: 'string' },
      { key: 'iceGeneration', label: 'ICE generation', format: 'number' },
      ...TRANSPORT_TAIL,
    ],
  },

  'ice-transport-stalled': {
    type: 'ice-transport-stalled',
    label: 'ICE transport stalled',
    category: 'ice',
    color: '#a78bfa',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'Still sending on a succeeded pair of a connected transport, and receiving nothing.',
    meaning:
      'Deliberately narrow: connected, sending, and inbound gone to zero. 4.9.0 fixed the assumption behind it — it now requires that return media was expected at all, meaning at least one inbound RTP stream attributed to the transport, so an SFU publish transport no longer raises it on a healthy call.',
    implication:
      'A connectivity issue: 0 on the connection. Half-open paths are worse than dead ones because the sender keeps spending uplink on media nobody receives.',
    remedy:
      'Compare `outboundBytesDelta` against `inboundBytesDelta`. Read it beside `blocked-inbound-media-transport`, which is the same shape measured from the far end’s sender reports.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Stall fingerprint: outbound keeps flowing while inbound drops to zero.',
      },
    ],
    highlightFields: [
      { key: 'stalledForMs', label: 'Stalled for', format: 'ms' },
      { key: 'direction', label: 'Direction', format: 'string' },
      { key: 'iceState', label: 'ICE state', format: 'string' },
      { key: 'candidatePairState', label: 'Pair state', format: 'string' },
      { key: 'outboundBytesDelta', label: 'Outbound Δ', format: 'bytes' },
      { key: 'inboundBytesDelta', label: 'Inbound Δ', format: 'bytes' },
      { key: 'currentRoundTripTime', label: 'RTT (s)', format: 'number' },
      { key: 'iceGeneration', label: 'ICE generation', format: 'number' },
      ...TRANSPORT_TAIL,
    ],
  },

  'ice-establishment-failed': {
    type: 'ice-establishment-failed',
    label: 'ICE establishment failed',
    category: 'ice',
    color: '#6d28d9',
    since: '4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'Local candidates existed, no pair was ever nominated, and the connection never connected.',
    meaning:
      'New in 4.9.0, and the exact complement of `no-available-ice-candidate`: there was a network, and connectivity checks still never produced a usable pair. `candidatePairStates` and `localCandidateCounts` say what was tried.',
    implication:
      'A connectivity issue: 0 on the connection, and unlike a disconnect there is nothing to recover to — this path never worked.',
    remedy:
      'The classic causes are symmetric NAT with no working TURN, a TURN credential that expired, or a firewall dropping the candidate types on offer. Read `localCandidateCounts`: host-only means STUN and TURN both failed to produce anything.',
    charts: [],
    highlightFields: [
      { key: 'connectionState', label: 'Connection state', format: 'string' },
      { key: 'iceGatheringState', label: 'Gathering state', format: 'string' },
      { key: 'localIceCandidateCount', label: 'Local candidates', format: 'number' },
      { key: 'candidatePairCount', label: 'Candidate pairs', format: 'number' },
      { key: 'candidatePairStates', label: 'Pair states', format: 'string' },
      { key: 'sustainedForInMs', label: 'Trying for', format: 'ms' },
      ...PC_TAIL,
    ],
  },

  'no-available-ice-candidate': {
    type: 'no-available-ice-candidate',
    label: 'No ICE candidate',
    category: 'ice',
    color: '#4c1d95',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'Gathering completed with zero local candidates — this client had no network to connect with.',
    meaning:
      'Every other ICE issue describes a path that existed and stopped working; this one says no path was ever possible. Any interface that is up yields a host candidate within milliseconds even with no internet, so an empty list is an absent network rather than a slow start. Falling to disconnected or failed with zero candidates raises immediately; sitting in new or connecting raises only after the threshold. Never fires on a connection that once reached connected.',
    implication:
      'A connectivity issue: 0 on the connection. It is also the one finding that is unambiguously not a service problem.',
    remedy:
      'Airplane mode, no interface up, a VPN that tore down every route, or sockets that cannot bind. It cannot separate "no network" from "every candidate type forbidden by policy" and does not try.',
    charts: [],
    highlightFields: [
      { key: 'connectionState', label: 'Connection state', format: 'string' },
      { key: 'previousConnectionState', label: 'Previous state', format: 'string' },
      { key: 'iceGatheringState', label: 'Gathering state', format: 'string' },
      { key: 'localIceCandidateCount', label: 'Local candidates', format: 'number' },
      { key: 'sustainedForInMs', label: 'Trying for', format: 'ms' },
      ...PC_TAIL,
    ],
  },

  'dtls-handshake-failed': {
    type: 'dtls-handshake-failed',
    label: 'DTLS handshake failed',
    category: 'ice',
    color: '#5b21b6',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'An ICE transport reached `dtlsState: failed` — the secure transport never negotiated.',
    meaning:
      'Separates "the network path failed" from "the media transport never keyed", which nothing owned before 4.8.0: a certificate fingerprint mismatch, DTLS version intolerance, or a middlebox that passes STUN and eats DTLS all used to present as a generically slow `connecting`. Resolves only when a later handshake connects, which needs an ICE restart to re-key.',
    implication:
      'A connectivity issue: 0 on the connection. Terminal for this transport, and — unlike most ICE findings — usually a configuration or interop problem rather than a network one.',
    remedy:
      'Look at the certificate and cipher fields on the transport, and at whether the same client fails against every SFU or only one. Retrying the same path will not help.',
    charts: [],
    highlightFields: [
      { key: 'dtlsState', label: 'DTLS state', format: 'string' },
      { key: 'iceState', label: 'ICE state', format: 'string' },
      { key: 'selectedCandidatePairId', label: 'Selected pair', format: 'string' },
      ...TRANSPORT_TAIL,
    ],
  },

  'dtls-handshake-stalled': {
    type: 'dtls-handshake-stalled',
    label: 'DTLS handshake stalled',
    category: 'ice',
    color: '#7e22ce',
    since: 'pre-4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 1 },
    summary: 'ICE was proven healthy while DTLS sat in `new`/`connecting` past the stall threshold.',
    meaning:
      '`iceEvidence` names how ICE health was proven: `transport-ice-state` where the browser reports one, `selected-pair-succeeded` where it does not (Safari, and the transport reconstructed for Firefox < 153). Never judges a transport on its first observed tick, never treats `closed` as a failure, and restarts its timer when the ufrag changes.',
    implication:
      'A connectivity issue: 0 on the connection. The signature of a middlebox that passes the small well-known packets and eats the rest.',
    remedy:
      'A working ICE path with a stalled handshake points at the network dropping DTLS specifically — a DPI middlebox or an MTU problem. Compare against the same client on a different network.',
    charts: [],
    highlightFields: [
      { key: 'stalledForMs', label: 'Stalled for', format: 'ms' },
      { key: 'dtlsState', label: 'DTLS state', format: 'string' },
      { key: 'iceState', label: 'ICE state', format: 'string' },
      { key: 'iceEvidence', label: 'ICE evidence', format: 'string' },
      ...TRANSPORT_TAIL,
    ],
  },

  'unstable-ice-path': {
    type: 'unstable-ice-path',
    label: 'Unstable ICE path',
    category: 'ice',
    color: '#c084fc',
    since: 'pre-4.9.0',
    severity: 'warning',
    scope: 'peer-connection',
    scoring: { category: 'connectivity', weight: 0.6 },
    summary: 'The selected ICE path switched too many times inside the observation window.',
    meaning:
      'The one connectivity issue that is not an outage — the path works between reselections, and the churn is what costs, which is why it is weighted 0.6 rather than 1. Since 4.8.0 it takes the larger of the observed transitions and the browser’s own `selectedCandidatePairChanges` delta, because a flap that departs and returns inside one collection period is invisible to tick-to-tick diffing.',
    implication:
      'Still zeroes the connection while open, as every connectivity issue does — but reads as instability rather than an outage. Each switch is a discontinuity in media: a re-key, a bitrate re-estimate, and often a freeze.',
    remedy:
      'Read `kind` and `pathKey` for what it is switching between. Direct/relay flapping is usually a marginal direct path; TURN server churn is usually load balancing. `nativePairChanges` above `switches` means the browser saw more than the sampling could.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Bitrate discontinuities usually line up with selected-path switches.',
      },
    ],
    highlightFields: [
      { key: 'switches', label: 'Switches', format: 'number' },
      { key: 'nativePairChanges', label: 'Native pair changes', format: 'number' },
      { key: 'windowInMs', label: 'Window', format: 'ms' },
      { key: 'kind', label: 'Path kind', format: 'string' },
      { key: 'pathKey', label: 'Path', format: 'string' },
      ...TRANSPORT_TAIL,
    ],
  },

  /* ---- Transport quality: the path carries media, badly ---- */

  'blocked-inbound-media-transport': {
    type: 'blocked-inbound-media-transport',
    label: 'Inbound media blocked',
    category: 'transport',
    color: '#4338ca',
    since: '4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 1 },
    summary: 'The far end’s sender reports advanced while our receivers took nothing.',
    meaning:
      'One of the three detectors the old `blocked-transport` became. The proof is the far end’s own accounting: it says it sent `remotePacketsSent` packets, and none of them arrived. STUN keeps passing throughout, which is why nothing else can see it — consent responses count into the pair’s `bytesReceived`, so the path never looks dry.',
    implication:
      'Full weight (5.0 subtracted from the connection). Signalling survives and media does not, which is the firewall signature and reads to a user as a call that connected and then went silent.',
    remedy:
      'Almost always a network policy dropping media while permitting STUN. Compare against a TURN/TLS path — forcing relay over 443 is the usual workaround.',
    charts: [
      {
        kind: 'ice-media-vs-transport',
        title: 'Remote packets sent vs received',
        description: 'What the far end reported sending against what this endpoint took in.',
      },
    ],
    highlightFields: [
      { key: 'blockedForMs', label: 'Blocked for', format: 'ms' },
      { key: 'remotePacketsSent', label: 'Remote packets sent', format: 'number' },
      { key: 'pathKind', label: 'Path', format: 'string' },
      ...PC_TAIL,
    ],
  },

  'blocked-outbound-media-transport': {
    type: 'blocked-outbound-media-transport',
    label: 'Outbound media blocked',
    category: 'transport',
    color: '#4f46e5',
    since: '4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 1 },
    summary: 'Media left on a STUN-answered path and no receiver report ever came back.',
    meaning:
      'The send-side counterpart: `packetsSent` packets went out, STUN was answered the whole time, and not one RTCP receiver report acknowledged any of it. Resolves the moment a report arrives.',
    implication:
      'Full weight (5.0 subtracted from the connection), and the one blocked-media finding whose damage every other participant experiences.',
    remedy:
      'The same class of cause as the inbound version, measured from the other side. If both are open at once, the path passes STUN and nothing else — a relay path is the test.',
    charts: [
      {
        kind: 'ice-media-vs-transport',
        title: 'Packets sent vs acknowledged',
        description: 'What this endpoint put on the wire against what any receiver report acknowledged.',
      },
    ],
    highlightFields: [
      { key: 'blockedForMs', label: 'Blocked for', format: 'ms' },
      { key: 'packetsSent', label: 'Packets sent', format: 'number' },
      { key: 'pathKind', label: 'Path', format: 'string' },
      ...PC_TAIL,
    ],
  },

  'blocked-stun-requests': {
    type: 'blocked-stun-requests',
    label: 'STUN requests blocked',
    category: 'transport',
    color: '#4c1d95',
    since: '4.9.0',
    severity: 'critical',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 1 },
    summary: 'A succeeded pair stopped answering STUN while this endpoint kept asking.',
    meaning:
      'Renamed from `blocked-transport` when that detector was split three ways, and now the narrowest of the three: consent checks going out unanswered on a pair that had been working. `requestsSent` counts checks plus consent during the silence.',
    implication:
      'Full weight (5.0 subtracted from the connection). Consent failing is the last thing to go before ICE declares the path dead, so it is usually the earliest warning of an outage.',
    remedy:
      'Read `currentRoundTripTime` from just before the silence — a rising RTT then silence is congestion collapse, an abrupt cut is a route or NAT-binding loss. An ICE restart is the usual response.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Traffic on the pair either side of the STUN silence.',
      },
    ],
    highlightFields: [
      { key: 'silentForMs', label: 'Silent for', format: 'ms' },
      { key: 'requestsSent', label: 'Requests unanswered', format: 'number' },
      { key: 'pathKind', label: 'Path', format: 'string' },
      { key: 'currentRoundTripTime', label: 'RTT (s)', format: 'number' },
      ...TRANSPORT_TAIL,
    ],
  },

  'uplink-congestion': {
    type: 'uplink-congestion',
    label: 'Uplink congestion',
    category: 'transport',
    color: '#ec4899',
    since: '4.9.0',
    severity: 'warning',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 0.8, severityField: 'severity' },
    summary: 'The send path is running out of room: the estimate fell and the pacer backed up.',
    meaning:
      'Two witnesses combined as a geometric mean, so a witness at its healthy level takes the severity to zero rather than merely failing to add — which is what separates a path running out of room from a sender that was simply asked for less. `undershoot` is how far the bandwidth estimate fell below its recent maximum; `pacerBloating` is how far per-packet pacer time sits above its own running median. The recent maximum decays on a half-life rather than a window, and decays faster for 30 seconds after an episode closes, because a path rarely gives back all of what one took.',
    implication:
      'Subtracts up to 4.0 from the connection, scaled by the reported `severity` rather than assumed. What the far end sees is the adaptation: lower resolution, fewer layers, and a bitrate that will not climb back.',
    remedy:
      'Read `severity` for depth and the two witnesses for shape. Undershoot alone with a quiet pacer is often the application asking for less; both together is real contention on the uplink.',
    charts: [
      {
        kind: 'session-bitrate',
        title: 'Sending bitrate vs available outgoing',
        description: 'What was sent against the bandwidth estimate and its recent maximum.',
      },
    ],
    highlightFields: [
      { key: 'severity', label: 'Severity', format: 'fraction' },
      { key: 'undershoot', label: 'Undershoot', format: 'fraction' },
      { key: 'pacerBloating', label: 'Pacer bloating', format: 'fraction' },
      { key: 'availableOutgoingBitrate', label: 'Available out', format: 'bps' },
      { key: 'recentMaxAvailableBitrate', label: 'Recent max', format: 'bps' },
      { key: 'sendingBitrate', label: 'Sending', format: 'bps' },
      { key: 'avgPacketSendDelayInMs', label: 'Pacer delay', format: 'ms' },
      { key: 'estimatedMedianPacketSendDelayInMs', label: 'Pacer median', format: 'ms' },
      ...PC_TAIL,
    ],
  },

  'downlink-congestion': {
    type: 'downlink-congestion',
    label: 'Downlink congestion',
    category: 'transport',
    color: '#f472b6',
    since: '4.9.0',
    severity: 'warning',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 0.8, severityField: 'severity' },
    summary: 'The receive path is running out of room: arrivals fell and the jitter buffer bloated.',
    meaning:
      'The receiving counterpart, and the reason `CongestionDetector` is deprecated: it answered for both directions from one signal, which a receiver cannot support, because Chrome computes no incoming bandwidth estimate and the old detector’s incoming fields read zero there. This one measures what actually arrives against its recent maximum, and per-frame jitter buffer delay against its median.',
    implication:
      'Subtracts up to 4.0 from the connection, scaled by the reported `severity`. Downstream it shows up as pixelation and freezes on inbound tracks — read those findings together.',
    remedy:
      'Set `congestionDetector: null` on the client and read this instead of `congestion`. Bloating without undershoot is a buffer absorbing jitter; both together is a narrowed path.',
    charts: [
      {
        kind: 'session-bitrate',
        title: 'Receiving bitrate vs recent maximum',
        description: 'What arrived against the most this path recently carried, with jitter buffer delay.',
      },
    ],
    highlightFields: [
      { key: 'severity', label: 'Severity', format: 'fraction' },
      { key: 'undershoot', label: 'Undershoot', format: 'fraction' },
      { key: 'bufferBloating', label: 'Buffer bloating', format: 'fraction' },
      { key: 'receivingBitrate', label: 'Receiving', format: 'bps' },
      { key: 'recentMaxReceivingBitrate', label: 'Recent max', format: 'bps' },
      { key: 'avgJitterBufferDelayInMs', label: 'JB delay', format: 'ms' },
      { key: 'estimatedMedianJitterBufferDelayInMs', label: 'JB median', format: 'ms' },
      ...PC_TAIL,
    ],
  },

  'transport-loss-sustained': {
    type: 'transport-loss-sustained',
    label: 'Sustained packet loss',
    category: 'transport',
    color: '#f87171',
    since: '4.9.0',
    severity: 'warning',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 0.7 },
    summary: 'Mean interval loss in the worse direction stayed at or above the threshold for the duration.',
    meaning:
      'New in 4.9.0, and the only place loss is priced. Loss is a property of the transport — every stream riding it shares it, and no single track owns it — so it is subtracted once, here, and never again on a track. `direction` says which way. Sustained rather than bursty is the point: a spike the codec absorbed is not a finding.',
    implication:
      'Subtracts up to 3.5 from the connection. What the same loss does differs by stream, which is why the track findings exist: 2% is inaudible on Opus with FEC and PLC, and very visible on video without it.',
    remedy:
      'Join it with the track findings of the same sample. Loss with `invented-speech` open is loss the listener heard; loss with clean tracks is loss the codecs absorbed and is not worth chasing.',
    charts: [
      {
        kind: 'ice-loss',
        title: 'Fraction lost by direction',
        description: 'Per-interval loss fraction inbound and outbound, over the sustained window.',
      },
    ],
    highlightFields: [
      { key: 'fractionLost', label: 'Fraction lost', format: 'fraction' },
      { key: 'direction', label: 'Direction', format: 'string' },
      { key: 'sustainedForInMs', label: 'Sustained for', format: 'ms' },
      ...PC_TAIL,
    ],
  },

  'transport-delay-degraded': {
    type: 'transport-delay-degraded',
    label: 'Round trip degraded',
    category: 'transport',
    color: '#fb923c',
    since: '4.9.0',
    severity: 'warning',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 0.5 },
    summary: 'Mean round trip over the detection window reached the threshold, and stayed there.',
    meaning:
      'New in 4.9.0, and the successor to the old `high-rtt` score penalty — RTT is no longer a threshold the calculator re-derives, it is a detector finding like any other. `rttSource` names where the measurement came from. 4.8.0 also fixed the underlying average: RTCP round trip is only counted when the remote report actually advances, because `getStats()` keeps serving the last `remote-inbound-rtp` after the far end goes quiet.',
    implication:
      'Subtracts up to 2.5 from the connection. Long enough to break turn-taking: people start talking over each other before anything sounds broken.',
    remedy:
      'Check the selected candidate pair and whether media is being relayed — a TURN path through the wrong region is the usual cause, and the fix is a closer relay rather than anything on the client.',
    charts: [
      {
        kind: 'ice-rtt',
        title: 'Round-trip time',
        description: 'Round trip over the call, with the sustained window that raised the issue shaded.',
      },
    ],
    highlightFields: [
      { key: 'rttInMs', label: 'RTT', format: 'ms' },
      { key: 'rttSource', label: 'Source', format: 'string' },
      { key: 'sustainedForInMs', label: 'Sustained for', format: 'ms' },
      ...PC_TAIL,
    ],
  },

  congestion: {
    type: 'congestion',
    label: 'Congestion (deprecated)',
    category: 'transport',
    color: '#a1a1aa',
    since: 'pre-4.9.0',
    severity: 'info',
    scope: 'peer-connection',
    scoring: { category: 'transport-quality', weight: 0 },
    summary: 'The deprecated single-direction congestion finding. Priced at zero on purpose.',
    meaning:
      '`CongestionDetector` is still registered and still raises this, but it answers for both directions from one signal — which a receiver cannot support, since Chrome computes no incoming bandwidth estimate and the incoming fields read zero there. Both directional detectors also emit an event of this name, discriminated on `direction`, so an application that only dims a network badge keeps one listener.',
    implication:
      'Costs nothing. It is listed in `ISSUE_SCORING` at weight 0 rather than omitted, because omission is how the monitor’s coverage test reports a detector nobody got around to pricing — and pricing this one would charge the same episode twice.',
    remedy:
      'Set `congestionDetector: null` on the client and read `uplink-congestion` and `downlink-congestion` instead.',
    charts: [
      {
        kind: 'session-bitrate',
        title: 'Session send vs receive bitrate',
        description: 'ICE-level sending and receiving bitrate for the client through the episode.',
      },
    ],
    highlightFields: [
      { key: 'availableOutgoingBitrate', label: 'Available out', format: 'bps' },
      { key: 'availableIncomingBitrate', label: 'Available in', format: 'bps' },
      { key: 'maxSendingBitrate', label: 'Max sending', format: 'bps' },
      { key: 'maxReceivingBitrate', label: 'Max receiving', format: 'bps' },
      ...PC_TAIL,
    ],
  },
};

/**
 * The monitor's `ISSUE_SCORING`, projected out of the table above.
 *
 * Kept as a derived view rather than a second literal so the two cannot drift:
 * there is one place to edit when a weight moves in the library.
 */
export const ISSUE_SCORING: Record<string, IssueScoreRule> = Object.fromEntries(
  Object.entries(CLIENT_ISSUE_TYPES).map(([type, meta]) => [type, meta.scoring]),
);

export function isResolvedIssueType(type: string): boolean {
  return type.endsWith(RESOLVED_ISSUE_SUFFIX) && type.length > RESOLVED_ISSUE_SUFFIX.length;
}

export function baseIssueType(type: string): string {
  return isResolvedIssueType(type) ? type.slice(0, -RESOLVED_ISSUE_SUFFIX.length) : type;
}

/** Most points this issue can take off the 0-5 score it is read into. */
export function issueMaxPenalty(type: string): number {
  return (ISSUE_SCORING[baseIssueType(type)]?.weight ?? 0) * 5;
}

/**
 * Issue types this table does not price — the monitor's own coverage check, run
 * against whatever a recording actually contained.
 *
 * Empty for a 4.9.0 stream. Anything here is either an application's own
 * detector or a type newer than this dashboard.
 */
export function unscoredIssueTypes(knownIssueTypes: readonly string[]): string[] {
  return knownIssueTypes.filter((type) => ISSUE_SCORING[baseIssueType(type)] === undefined);
}

/**
 * True when the built-in table describes this type.
 *
 * The table covers the 37 types client-monitor-js 4.9.0 ships with, but
 * detectors are extensible and applications raise their own. Callers that would
 * otherwise route an issue by its *name* need to know when that name means
 * nothing, so they can fall back to what the payload says instead.
 */
export function isKnownIssueType(type: string): boolean {
  return baseIssueType(type) in CLIENT_ISSUE_TYPES;
}

export function getIssueTypeMeta(type: string): IssueTypeMeta {
  const base = baseIssueType(type);
  const known = CLIENT_ISSUE_TYPES[base];
  if (known) return known;
  const color = FALLBACK_COLORS[Math.abs(hashString(base)) % FALLBACK_COLORS.length];
  return {
    type: base,
    label: base,
    category: 'other',
    color,
    since: 'pre-4.9.0',
    severity: 'info',
    scope: 'client',
    // Unpriced by construction: the monitor scores nothing it has no rule for,
    // and neither does this. A weight guessed here would be a number nobody
    // measured, shown next to numbers that were.
    scoring: { category: 'perceived-quality', weight: 0 },
    summary: 'Client-reported issue with no entry in this dashboard’s 4.9.0 reference table.',
    meaning:
      'Either an application-raised issue, a custom detector, or a type from a client-monitor-js newer than this build. Inspect the payload fields and the nearby media and ICE charts.',
    implication:
      'It costs the score nothing: DefaultScoreCalculator skips an issue type ISSUE_SCORING does not price, so a detector added without a rule is silent in the score rather than arbitrary.',
    remedy:
      'Read the payload. If this type should be priced, add a rule for it in the library and a row here.',
    charts: [],
    highlightFields: [],
  };
}

export function issueTimelineTarget(type: string): IssueTimelineTarget {
  return issueTimelineTargetFromCategory(getIssueTypeMeta(type).category);
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}
