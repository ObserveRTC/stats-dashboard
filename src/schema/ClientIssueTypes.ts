export const RESOLVED_ISSUE_SUFFIX = '-resolved';

export type IssueCategory =
  | 'audio'
  | 'video-receive'
  | 'video-send'
  | 'capture'
  | 'ice'
  | 'session'
  | 'other';

/** Where an issue type belongs on the client page besides Client Issues. */
export type IssueTimelineTarget = 'consumer' | 'producer' | 'transport' | 'session';

export type IssueChartKind =
  | 'inbound-concealment'
  | 'inbound-jitter-buffer'
  | 'inbound-audio-desync'
  | 'inbound-video-freeze'
  | 'inbound-pli-keyframe'
  | 'inbound-stuck-decoder'
  | 'inbound-decoder-load'
  | 'inbound-playout'
  | 'inbound-bitrate'
  | 'outbound-bitrate'
  | 'outbound-capture-fps'
  | 'outbound-encoder'
  | 'media-source-audio-level'
  | 'ice-bytes'
  | 'ice-media-vs-transport'
  | 'inbound-frame-supply'
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

export type IssueTypeMeta = {
  type: string;
  label: string;
  category: IssueCategory;
  color: string;
  since: '4.5.0' | '4.7.0' | 'legacy';
  severity: 'info' | 'warning' | 'critical';
  /** One-line verdict of what the detector proved. */
  summary: string;
  /** How to read the issue in an investigation. */
  meaning: string;
  charts: IssueChartSpec[];
  highlightFields: IssueHighlightField[];
};

export const ISSUE_CATEGORY_ORDER: IssueCategory[] = [
  'audio',
  'video-receive',
  'video-send',
  'capture',
  'ice',
  'session',
  'other',
];

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  audio: 'Audio',
  'video-receive': 'Video receive',
  'video-send': 'Video send',
  capture: 'Capture',
  ice: 'ICE / transport',
  session: 'Session',
  other: 'Other',
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
      return 'transport';
    default:
      return 'session';
  }
}

const FALLBACK_COLORS = ['#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6'];

export const CLIENT_ISSUE_TYPES: Record<string, IssueTypeMeta> = {
  'audio-concealment': {
    type: 'audio-concealment',
    label: 'Audio concealment',
    category: 'audio',
    color: '#06b6d4',
    since: '4.5.0',
    severity: 'warning',
    summary: 'The listener heard concealment — clicks or dropouts — not just packet loss.',
    meaning:
      'Opus + NetEQ hide a lot of loss inaudibly, and audio can also degrade without dramatic loss when the jitter buffer misbehaves. This detector uses audible concealment (silent concealment subtracted) over a sliding window, classified as bursty (many short clicks) or continuous (fewer, longer dropouts). Chart the concealment share against the episode windows.',
    charts: [
      {
        kind: 'inbound-concealment',
        title: 'Audible concealment share',
        description: 'Share of received audio samples that were concealed and audible (silent concealment excluded). Episodes shade when the detector was raised.',
      },
    ],
    highlightFields: [
      { key: 'burstiness', label: 'Pattern', format: 'string' },
      { key: 'concealmentRate', label: 'Concealment', format: 'fraction' },
      { key: 'concealmentEventRate', label: 'Events/s', format: 'per-sec' },
      { key: 'windowInMs', label: 'Window', format: 'ms' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'audio-jitter-buffer-stress': {
    type: 'audio-jitter-buffer-stress',
    label: 'Jitter buffer stress',
    category: 'audio',
    color: '#0ea5e9',
    since: '4.5.0',
    severity: 'warning',
    summary: 'NetEQ grew its target delay and had to time-stretch — latency plus audible warble.',
    meaning:
      'A high jitter-buffer target delay alone means NetEQ is succeeding: it bought latency to hide jitter. Time stretching alone is ordinary clock-drift correction. Both together mean the buffer is fighting the network. Chart target delay (ms) beside the stretch rate.',
    charts: [
      {
        kind: 'inbound-jitter-buffer',
        title: 'Jitter buffer target delay vs time-stretch',
        description: 'Target delay in milliseconds and the share of samples stretched or compressed. Stress requires both to be high.',
      },
    ],
    highlightFields: [
      { key: 'targetDelayInMs', label: 'Target delay', format: 'ms' },
      { key: 'actualDelayInMs', label: 'Actual delay', format: 'ms' },
      { key: 'timeStretchRate', label: 'Time-stretch', format: 'fraction' },
      { key: 'consecutiveTicks', label: 'Ticks', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'audio-desync': {
    type: 'audio-desync',
    label: 'Audio desync',
    category: 'audio',
    color: '#22d3ee',
    since: 'legacy',
    severity: 'warning',
    summary: 'The playout clock inserted or removed a large share of samples to keep audio in time.',
    meaning:
      'When inbound audio arrives off-rate, the browser accelerates or decelerates by inserting/removing samples. A high fractional correction is the usual A/V sync complaint. Chart the correction rate over the call and match it to episode windows.',
    charts: [
      {
        kind: 'inbound-audio-desync',
        title: 'Sample correction rate',
        description: 'Share of inbound audio samples inserted or removed for acceleration/deceleration.',
      },
    ],
    highlightFields: [
      { key: 'fractionalCorrection', label: 'Correction', format: 'fraction' },
      { key: 'dCorrectedSamples', label: 'Corrected samples', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'freezed-video-track': {
    type: 'freezed-video-track',
    label: 'Frozen video',
    category: 'video-receive',
    color: '#ef4444',
    since: 'legacy',
    severity: 'critical',
    summary: 'Inbound video stopped rendering frames — duration is the real episode, not a one-tick blip.',
    meaning:
      'From 4.5.0 a freeze persists until frames are rendered again (previously it looked one stats tick long). Pair with producer pause: a paused producer is an expected freeze. Overlay freeze count and decoded FPS; a freeze with bytes still arriving points at decode/repair, not a dry track.',
    charts: [
      {
        kind: 'inbound-video-freeze',
        title: 'Decoded FPS and freeze count',
        description: 'Decoded frame rate and cumulative freeze starts. Shaded windows are freeze episodes.',
      },
    ],
    highlightFields: [
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'keyframe-storm': {
    type: 'keyframe-storm',
    label: 'Keyframe storm',
    category: 'video-receive',
    color: '#f97316',
    since: '4.5.0',
    severity: 'critical',
    summary: 'PLI rate stayed high — keyframes are large and worsen the congestion that provoked them.',
    meaning:
      'A sustained PLI rate (default alert ~0.5/s over 30s) is a self-reinforcing repair loop. Healthy streams stay well under 0.1 PLI/s outside joins. Chart PLI/s against keyframes decoded: if PLIs go out and keyframes do not come back, see video-recovery-failed.',
    charts: [
      {
        kind: 'inbound-pli-keyframe',
        title: 'PLI rate vs keyframes decoded',
        description: 'Picture-loss indications sent per second versus keyframes actually decoded. A storm is PLIs without recovery.',
      },
    ],
    highlightFields: [
      { key: 'pliRate', label: 'PLI/s', format: 'per-sec' },
      { key: 'firRate', label: 'FIR/s', format: 'per-sec' },
      { key: 'keyFrameRate', label: 'Keyframe/s', format: 'per-sec' },
      { key: 'windowInMs', label: 'Window', format: 'ms' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'video-recovery-failed': {
    type: 'video-recovery-failed',
    label: 'Video recovery failed',
    category: 'video-receive',
    color: '#dc2626',
    since: '4.5.0',
    severity: 'critical',
    summary: 'PLIs left the client, the picture stayed frozen, and keyFramesDecoded did not advance.',
    meaning:
      'The repair request left this client and nothing usable came back — that points at SFU forwarding (or the producer) rather than the first-hop network. Check the producing client and whether the producer was paused. Chart PLIs vs keyframes over the stall.',
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
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'stuck-decoder': {
    type: 'stuck-decoder',
    label: 'Stuck decoder',
    category: 'video-receive',
    color: '#b91c1c',
    since: '4.5.0',
    severity: 'critical',
    summary: 'RTP bytes kept arriving while framesDecoded stayed flat and PLIs fired — a decode wedge.',
    meaning:
      'Bytes still flowing is the discriminator: a dry track is starvation; this is a wedge. Variant assembly = packets arrive but no frame is reassembled; decode = frames assemble but never decode. Known mitigation is recreating the consumer. Chart inbound bitrate against decoded FPS — bitrate up, FPS at zero.',
    charts: [
      {
        kind: 'inbound-stuck-decoder',
        title: 'Inbound bitrate vs decoded FPS',
        description: 'Dead traffic: bytes still received while decoded frames per second stays at zero. That is the recreate-consumer fingerprint.',
      },
    ],
    highlightFields: [
      { key: 'variant', label: 'Variant', format: 'string' },
      { key: 'stuckForInMs', label: 'Stuck for', format: 'ms' },
      { key: 'deadBytesReceived', label: 'Dead bytes', format: 'bytes' },
      { key: 'pliCountSinceStuck', label: 'PLIs while stuck', format: 'number' },
      { key: 'decoderImplementation', label: 'Decoder', format: 'string' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'video-decoder-overloaded': {
    type: 'video-decoder-overloaded',
    label: 'Decoder overloaded',
    category: 'video-receive',
    color: '#fb7185',
    since: '4.5.0',
    severity: 'warning',
    summary: 'Frames arrived (loss was quiet) but this client could not decode them in budget.',
    meaning:
      'Frames dropped because they never arrived and frames dropped because the client could not decode them look identical in an FPS chart and have opposite fixes. This detector fires only when frames demonstrably arrived, loss was low, and decode time exceeded the stream’s own frame budget. Chart decode time per frame against drop ratio.',
    charts: [
      {
        kind: 'inbound-decoder-load',
        title: 'Decode time per frame vs drop ratio',
        description: 'Wall-clock decode cost per frame (ms) and the share of received frames that were dropped after arriving.',
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
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'inbound-video-playout-discrepancy': {
    type: 'inbound-video-playout-discrepancy',
    label: 'Playout discrepancy',
    category: 'video-receive',
    color: '#f43f5e',
    since: 'legacy',
    severity: 'warning',
    summary: 'More frames were received than rendered — the player dropped frames after decode.',
    meaning:
      'Frame skew is received minus rendered. This is a display/performance problem after the network, not a freeze and not a decoder wedge. Chart received vs rendered FPS.',
    charts: [
      {
        kind: 'inbound-playout',
        title: 'Received vs rendered FPS',
        description: 'Inbound frames received per second versus frames rendered. A gap is playout dropping frames.',
      },
    ],
    highlightFields: [
      { key: 'frameSkew', label: 'Frame skew', format: 'number' },
      { key: 'ewmaFps', label: 'EWMA FPS', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'dry-inbound-track': {
    type: 'dry-inbound-track',
    label: 'Dry inbound track',
    category: 'video-receive',
    color: '#64748b',
    since: 'legacy',
    severity: 'warning',
    summary: 'This inbound track stopped receiving bytes while it was expected to flow.',
    meaning:
      'No inbound RTP bytes for longer than the dry threshold, ignoring remote pause. Contrast with stuck-decoder (bytes still flow). Chart inbound bitrate — it should sit at zero through the episode. Producer pause on the remote side often explains it.',
    charts: [
      {
        kind: 'inbound-bitrate',
        title: 'Inbound bitrate',
        description: 'Received bitrate on the affected track. A dry episode is a stretch at or near zero.',
      },
    ],
    highlightFields: [
      { key: 'duration', label: 'Dry for', format: 'ms' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'dry-outbound-track': {
    type: 'dry-outbound-track',
    label: 'Dry outbound track',
    category: 'video-send',
    color: '#78716c',
    since: 'legacy',
    severity: 'warning',
    summary: 'This outbound track stopped sending bytes while it was expected to flow.',
    meaning:
      'No outbound RTP bytes for longer than the dry threshold. Chart outbound bitrate; a capture-ended or paused producer often sits next to it.',
    charts: [
      {
        kind: 'outbound-bitrate',
        title: 'Outbound bitrate',
        description: 'Sent bitrate on the affected track. A dry episode is a stretch at or near zero.',
      },
    ],
    highlightFields: [
      { key: 'duration', label: 'Dry for', format: 'ms' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'capture-bottleneck': {
    type: 'capture-bottleneck',
    label: 'Capture bottleneck',
    category: 'video-send',
    color: '#eab308',
    since: '4.5.0',
    severity: 'warning',
    summary: 'The source never produced the frames — camera, OS, or a static screen share.',
    meaning:
      'Send-side “we are sending fewer frames than we should” splits here vs encoder-bottleneck. Discriminator is MediaSource sourceFps against the highest active layer. If the source is slow, the encoder and the network cannot help. Chart source FPS vs expected FPS.',
    charts: [
      {
        kind: 'outbound-capture-fps',
        title: 'Capture source FPS',
        description: 'Frames per second the media source actually produced. A capture bottleneck is a low source FPS, not a slow encoder.',
      },
    ],
    highlightFields: [
      { key: 'sourceFps', label: 'Source FPS', format: 'number' },
      { key: 'expectedFps', label: 'Expected FPS', format: 'number' },
      { key: 'sourceWidth', label: 'Width', format: 'number' },
      { key: 'sourceHeight', label: 'Height', format: 'number' },
      { key: 'consecutiveTicks', label: 'Ticks', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'encoder-bottleneck': {
    type: 'encoder-bottleneck',
    label: 'Encoder bottleneck',
    category: 'video-send',
    color: '#f59e0b',
    since: '4.5.0',
    severity: 'warning',
    summary: 'The source produced frames; the encoder could not keep up.',
    meaning:
      'Usually a CPU-bound software encoder. Chart source FPS vs encoded FPS and encode time per frame. qualityLimitationReason and cpuLimitationShare corroborate. Opposite of capture-bottleneck.',
    charts: [
      {
        kind: 'outbound-encoder',
        title: 'Source FPS vs encoded FPS',
        description: 'Capture source frame rate against what the highest active layer actually encoded, plus encode time per frame.',
      },
    ],
    highlightFields: [
      { key: 'sourceFps', label: 'Source FPS', format: 'number' },
      { key: 'encodedFps', label: 'Encoded FPS', format: 'number' },
      { key: 'encodeTimePerFrameInMs', label: 'Encode ms/frame', format: 'number' },
      { key: 'qualityLimitationReason', label: 'Limitation', format: 'string' },
      { key: 'cpuLimitationShare', label: 'CPU share', format: 'fraction' },
      { key: 'encoderImplementation', label: 'Encoder', format: 'string' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'capture-track-ended': {
    type: 'capture-track-ended',
    label: 'Capture track ended',
    category: 'capture',
    color: '#ca8a04',
    since: '4.5.0',
    severity: 'critical',
    summary: 'The camera or microphone track moved to ended — the device is gone.',
    meaning:
      'Source-end failure: the MediaStreamTrack ended. Nothing in RTP explains it. Check device label and nearby CAPTURE_TRACK_ENDED events. Outbound bitrate collapsing at the same timestamp is the downstream symptom.',
    charts: [
      {
        kind: 'outbound-bitrate',
        title: 'Outbound bitrate',
        description: 'Sent bitrate around the ended-track event. Capture ending usually drops send to zero.',
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
    since: '4.5.0',
    severity: 'warning',
    summary: 'The microphone was live, unmuted, and produced near-zero RMS for a long stretch.',
    meaning:
      'Digital silence and a person not talking are the same measurement — the default threshold is tens of seconds on purpose. RMS is integrated over the interval (not instantaneous audioLevel, which reads zero between words). A muted mic is reported as mute, not this. Chart RMS / audio level.',
    charts: [
      {
        kind: 'media-source-audio-level',
        title: 'Capture audio level',
        description: 'Media-source audioLevel over the call. A silent-source episode is a long stretch near zero while the track is live.',
      },
    ],
    highlightFields: [
      { key: 'rmsAudioLevel', label: 'RMS level', format: 'number' },
      { key: 'silentForInMs', label: 'Silent for', format: 'ms' },
      { key: 'deviceLabel', label: 'Device', format: 'string' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'ice-disconnected': {
    type: 'ice-disconnected',
    label: 'ICE disconnected',
    category: 'ice',
    color: '#8b5cf6',
    since: '4.5.0',
    severity: 'warning',
    summary: 'ICE stayed disconnected past the blip window — not the transient disconnect ICE usually heals.',
    meaning:
      'Raised only after disconnectedThresholdInMs (default 5s), so routine ICE repairs never produce an issue. Recovery resolves it with the episode duration. Chart ICE bytes in/out across the gap; look at ice generation and whether an ICE restart followed.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Per-transport send and receive bitrate. A disconnect episode is a hole in both directions.',
      },
    ],
    highlightFields: [
      { key: 'iceState', label: 'ICE state', format: 'string' },
      { key: 'dtlsState', label: 'DTLS', format: 'string' },
      { key: 'disconnectedForMs', label: 'Disconnected for', format: 'ms' },
      { key: 'iceGeneration', label: 'ICE generation', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'transportId', label: 'Transport', format: 'string' },
    ],
  },
  'ice-connection-failed': {
    type: 'ice-connection-failed',
    label: 'ICE failed',
    category: 'ice',
    color: '#7c3aed',
    since: '4.5.0',
    severity: 'critical',
    summary: 'ICE entered failed — terminal for that ICE generation; only a restart can revive it.',
    meaning:
      'Raised immediately on failed. Pair with ICE_RESTART_RECOMMENDED (reason ice-failed) and any ICE_RESTART outcome. Chart bytes around the failure; a new generation should show traffic resuming after a successful restart.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Per-transport send and receive bitrate around the failed generation.',
      },
    ],
    highlightFields: [
      { key: 'dtlsState', label: 'DTLS', format: 'string' },
      { key: 'disconnectedForMs', label: 'Disconnected before fail', format: 'ms' },
      { key: 'iceGeneration', label: 'ICE generation', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'transportId', label: 'Transport', format: 'string' },
    ],
  },
  'ice-transport-stalled': {
    type: 'ice-transport-stalled',
    label: 'ICE transport stalled',
    category: 'ice',
    color: '#a78bfa',
    since: '4.5.0',
    severity: 'warning',
    summary: 'This endpoint was still sending on a connected pair but received nothing.',
    meaning:
      'Deliberately narrow: connected + sending + inbound previously observed + now inbound is zero. “No traffic in either direction” is not reported — at PC level that cannot be distinguished from a paused connection. Chart send vs receive: send continues, receive drops to zero.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Stall fingerprint: outbound keeps flowing while inbound bitrate drops to zero.',
      },
    ],
    highlightFields: [
      { key: 'iceState', label: 'ICE state', format: 'string' },
      { key: 'candidatePairState', label: 'Pair state', format: 'string' },
      { key: 'direction', label: 'Direction', format: 'string' },
      { key: 'stalledForMs', label: 'Stalled for', format: 'ms' },
      { key: 'outboundBytesDelta', label: 'Outbound Δ', format: 'bytes' },
      { key: 'inboundBytesDelta', label: 'Inbound Δ', format: 'bytes' },
      { key: 'currentRoundTripTime', label: 'RTT (s)', format: 'number' },
      { key: 'iceGeneration', label: 'ICE generation', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'transportId', label: 'Transport', format: 'string' },
    ],
  },
  'unstable-ice-path': {
    type: 'unstable-ice-path',
    label: 'Unstable ICE path',
    category: 'ice',
    color: '#c084fc',
    since: '4.5.0',
    severity: 'warning',
    summary: 'The selected ICE path switched too many times in the observation window.',
    meaning:
      'Path flapping (direct↔relay, TURN server, protocol) destabilizes media. Chart ICE bitrates for discontinuities at each switch; path-change events on the transport section name the transition. `kind` is the path at raise time.',
    charts: [
      {
        kind: 'ice-bytes',
        title: 'ICE send vs receive bitrate',
        description: 'Bitrate discontinuities often line up with selected-path switches.',
      },
    ],
    highlightFields: [
      { key: 'switches', label: 'Switches', format: 'number' },
      { key: 'windowInMs', label: 'Window', format: 'ms' },
      { key: 'kind', label: 'Path kind', format: 'string' },
      { key: 'pathKey', label: 'Path', format: 'string' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'transportId', label: 'Transport', format: 'string' },
    ],
  },
  'decoder-bottleneck': {
    type: 'decoder-bottleneck',
    label: 'Decoder bottleneck',
    category: 'video-receive',
    color: '#e11d48',
    since: '4.7.0',
    severity: 'warning',
    summary: 'Frames arrived and the decoder turned too few of them into pictures — averaged over a window, not a single tick.',
    meaning:
      'The receive-side counterpart of capture-bottleneck. Frames received and frames decoded are accumulated over the detector window and compared once: decoded below the ratio threshold raises, at or above resolves. Averaging is what catches a decoder that stumbles — drops on some intervals, recovers on others — which a per-tick test reads as mostly healthy. The bar is the measured arrival rate, never the sender’s intent, so a stream deliberately throttled to 5 fps that decodes cleanly is silent here. Distinct from video-decoder-overloaded, which is about what decoding cost rather than about frames going missing. A backgrounded tab, a paused consumer or a paused remote sender is refused rather than judged.',
    charts: [
      {
        kind: 'inbound-frame-supply',
        title: 'Frames received vs decoded',
        description: 'Arrival rate against decode rate over the window. The bottleneck is the gap between them, not a low absolute rate.',
      },
    ],
    highlightFields: [
      { key: 'sourceFps', label: 'Decoded FPS', format: 'number' },
      { key: 'expectedFps', label: 'Received FPS', format: 'number' },
      { key: 'averagedOverInMs', label: 'Averaged over', format: 'ms' },
      { key: 'sourceWidth', label: 'Width', format: 'number' },
      { key: 'sourceHeight', label: 'Height', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
    ],
  },
  'blocked-transport': {
    type: 'blocked-transport',
    label: 'Blocked transport',
    category: 'ice',
    color: '#6d28d9',
    since: '4.7.0',
    severity: 'critical',
    summary: 'STUN says the path is alive and no media traverses it — the firewall signature.',
    meaning:
      'The candidate pair is succeeded, consent checks keep passing, iceConnectionState reads connected, and the call carries nothing. No other detector can see this: STUN consent responses count into the pair’s bytesReceived so it never looks dry, and the dry-track detectors watch producer-side counters that keep advancing because the encoder is working fine. Two evidences: media-not-leaving-transport (senders produce bytes, the transport’s send counter barely moves — host firewall or the OS dropping on send) and no-return-traffic (media leaves at full rate, STUN answers, and nothing else comes back, not even RTCP — a middlebox passing the small well-known packets and eating the rest). One-sided by construction: only on the send side does the client hold both halves of the proof.',
    charts: [
      {
        kind: 'ice-media-vs-transport',
        title: 'Outbound media vs transport bitrate',
        description: 'What the senders produced against what the ICE transport reports going out and coming back. The block is the gap.',
      },
    ],
    highlightFields: [
      { key: 'evidence', label: 'Evidence', format: 'string' },
      { key: 'pathKind', label: 'Path', format: 'string' },
      { key: 'blockedForMs', label: 'Blocked for', format: 'ms' },
      { key: 'outboundMediaBitrate', label: 'Media produced', format: 'bps' },
      { key: 'transportSendingBitrate', label: 'Transport out', format: 'bps' },
      { key: 'transportReceivingBitrate', label: 'Transport in', format: 'bps' },
      { key: 'stunResponsesReceivedDelta', label: 'STUN responses \u0394', format: 'number' },
      { key: 'currentRoundTripTime', label: 'RTT (s)', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'transportId', label: 'Transport', format: 'string' },
    ],
  },
  'no-available-ice-candidate': {
    type: 'no-available-ice-candidate',
    label: 'No ICE candidate',
    category: 'ice',
    color: '#4c1d95',
    since: '4.7.0',
    severity: 'critical',
    summary: 'ICE gathering produced zero local candidates — this client had no network to connect with.',
    meaning:
      'Every other ICE issue describes a path that existed and stopped working; this one says no path was ever possible. Any interface that is up yields a host candidate within milliseconds even with no internet, so an empty candidate list is an absent network, not a slow start — no interface up, airplane mode, a VPN that tore down every route, or sockets that cannot bind. Falling to disconnected/failed with zero candidates raises immediately; sitting in new/connecting raises only after the threshold, which is what keeps it off an un-negotiated peer connection. Never fires on a connection that once reached connected. It cannot separate “no network” from “every candidate type forbidden by policy” and does not try.',
    charts: [],
    highlightFields: [
      { key: 'connectionState', label: 'Connection state', format: 'string' },
      { key: 'previousConnectionState', label: 'Previous state', format: 'string' },
      { key: 'iceGatheringState', label: 'Gathering state', format: 'string' },
      { key: 'localIceCandidateCount', label: 'Local candidates', format: 'number' },
      { key: 'sinceMs', label: 'Trying for', format: 'ms' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'peerConnectionId', label: 'Peer connection', format: 'string' },
    ],
  },
  'media-pipeline-stalled': {
    type: 'media-pipeline-stalled',
    label: 'Media pipeline stalled',
    category: 'session',
    color: '#db2777',
    since: '4.7.0',
    severity: 'critical',
    summary: 'Names the stage boundary where media stopped moving, rather than only that it stopped.',
    meaning:
      'Every pipeline stage carries a monotonic counter, so a break is locatable: the first boundary where the upstream counter advances and the downstream one stays flat. Only the two boundaries no specialist detector owns are raised. rtp-sender: frames encoded while no packet was sent on the same outbound RTP — an encoded frame always packetizes, and adaptation or congestion would have stopped the encoder instead, so a sustained violation is a wedged sender (seen after replaceTrack races and simulcast reconfigurations). transport-demux: the ICE transport receiving above the floor that rules out RTCP and STUN while every inbound RTP of that transport is flat — traffic arriving that never demuxes, after an SSRC mismatch on renegotiation or a consumer created against a dead producer. suspectedIssueTypes lists the specialist issues active at raise time, so one entry both localizes the stage and links the detailed evidence.',
    charts: [
      {
        kind: 'session-bitrate',
        title: 'Session send vs receive bitrate',
        description: 'Where the stall sits in the client’s overall traffic. The stage name in the payload is the finding; this is the context.',
      },
    ],
    highlightFields: [
      { key: 'stage', label: 'Stage', format: 'string' },
      { key: 'direction', label: 'Direction', format: 'string' },
      { key: 'upstreamDelta', label: 'Upstream \u0394', format: 'number' },
      { key: 'downstreamDelta', label: 'Downstream \u0394', format: 'number' },
      { key: 'transportReceivingBitrate', label: 'Transport in', format: 'bps' },
      { key: 'suspectedIssueTypes', label: 'Suspected', format: 'string' },
      { key: 'stalledForMs', label: 'Stalled for', format: 'ms' },
      { key: 'ssrc', label: 'SSRC', format: 'number' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'trackId', label: 'Track', format: 'string' },
      { key: 'peerConnectionId', label: 'Peer connection', format: 'string' },
    ],
  },
  congestion: {
    type: 'congestion',
    label: 'Congestion',
    category: 'session',
    color: '#ec4899',
    since: 'legacy',
    severity: 'warning',
    summary: 'Outbound quality was bandwidth-limited, often with RTT and/or loss corroboration.',
    meaning:
      'Sensitivity (high/medium/low) changes how much corroboration is required. Chart session send/receive bitrate through the episode and compare to availableIncoming/OutgoingBitrate in the payload.',
    charts: [
      {
        kind: 'session-bitrate',
        title: 'Session send vs receive bitrate',
        description: 'ICE-level sending and receiving bitrate for the client. Congestion episodes often show a send-side clamp.',
      },
    ],
    highlightFields: [
      { key: 'availableOutgoingBitrate', label: 'Available out', format: 'bps' },
      { key: 'availableIncomingBitrate', label: 'Available in', format: 'bps' },
      { key: 'maxSendingBitrate', label: 'Max sending', format: 'bps' },
      { key: 'maxReceivingBitrate', label: 'Max receiving', format: 'bps' },
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
      { key: 'peerConnectionId', label: 'Peer connection', format: 'string' },
    ],
  },
  cpulimitation: {
    type: 'cpulimitation',
    label: 'CPU limitation',
    category: 'session',
    color: '#f472b6',
    since: 'legacy',
    severity: 'warning',
    summary: 'The encoder or decoder was CPU-bound (qualityLimitationReason cpu, or inbound decode could not keep up).',
    meaning:
      'Outbound uses qualityLimitationReason / limitation-duration share and encode-time budget. Inbound uses decoded/received frame ratio — not FPS volatility, which false-triggers on static screen share. Chart CPU-limitation share of each interval.',
    charts: [
      {
        kind: 'cpu-limitation',
        title: 'CPU limitation share',
        description: 'Share of each stats interval the outbound encoder spent CPU-limited, from qualityLimitationDurations.',
      },
    ],
    highlightFields: [
      { key: 'durationInMs', label: 'Duration', format: 'ms' },
    ],
  },
};

export function isResolvedIssueType(type: string): boolean {
  return type.endsWith(RESOLVED_ISSUE_SUFFIX) && type.length > RESOLVED_ISSUE_SUFFIX.length;
}

export function baseIssueType(type: string): string {
  return isResolvedIssueType(type) ? type.slice(0, -RESOLVED_ISSUE_SUFFIX.length) : type;
}

/**
 * True when the built-in table describes this type.
 *
 * The table covers the detectors client-monitor-js ships with, but detectors
 * are extensible and applications raise their own types. Callers that would
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
    since: 'legacy',
    severity: 'info',
    summary: 'Client-reported issue without a built-in detector description.',
    meaning: 'Inspect the payload fields and nearby media/ICE charts. Custom or application-raised issues land here.',
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
