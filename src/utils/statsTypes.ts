/**
 * Type definitions for processWebRTCStats output structures.
 *
 * These types describe the major data shapes produced by statsProcessor.ts.
 * Fields marked `Record<string, any>` are left loosely typed for gradual adoption.
 */

import type { RecordingClientEventType } from '../schema/RecordingClientEventTypes.ts';

// ---------------------------------------------------------------------------
// Individual time-series value entries
// ---------------------------------------------------------------------------

/** Common fields present on every time-series sample. */
export interface TimeSeriesValueBase {
  timestamp: Date | number;
  sampleIndex: number;
}

/** A single outbound RTP time-series sample with computed delta metrics. */
export interface OutboundTimeSeriesValue extends TimeSeriesValueBase {
  // Raw fields from the stats report
  ssrc?: number;
  kind?: string;
  bytesSent?: number;
  packetsSent?: number;
  framesEncoded?: number;
  framesPerSecond?: number;
  frameWidth?: number;
  frameHeight?: number;
  targetBitrate?: number;
  totalEncodeTime?: number;
  nackCount?: number;
  pliCount?: number;
  firCount?: number;
  retransmittedPacketsSent?: number;
  qualityLimitationReason?: string;
  qualityLimitationDurations?: Record<string, number>;
  encoderImplementation?: string;
  scalabilityMode?: string;
  rid?: string;
  remoteId?: string;
  hugeFramesSent?: number;
  qpSum?: number;
  totalPacketSendDelay?: number;
  keyFramesEncoded?: number;
  qualityLimitationResolutionChanges?: number;

  // Computed delta fields (prefixed with _)
  _actualBitrateKbps?: number;
  _remoteRttMs?: number;
  _remoteFractionLostPct?: number;
  _remoteJitterMs?: number;
  _retransmitPct?: number;
  _pktSendDelayMs?: number;
  _avgQp?: number;
  _keyFrames?: number;
  _bwUtilPct?: number;
  _qlBandwidthPct?: number;
  _qlCpuPct?: number;
  _qlOtherPct?: number;
  _qlResChanges?: number;
  _hugeFramesDelta?: number;
  _resolution?: number;
  _encoderImpl?: string;
  _scalabilityMode?: string;
  encodeTimePerFrame?: number;
  encodeCpuPercent?: number;
  _remoteAvgRttMs?: number;
  _remotePacketsLost?: number;
  _remotePacketsLostDelta?: number;
  _remoteRttMeasurements?: number;
  _remoteTotalRtt?: number;
  _hasRemoteInbound?: boolean;
  _pauseFractionPct?: number;
}

/** A single inbound RTP time-series sample with computed delta metrics. */
export interface InboundTimeSeriesValue extends TimeSeriesValueBase {
  // Raw fields
  ssrc?: number;
  kind?: string;
  bytesReceived?: number;
  packetsReceived?: number;
  packetsLost?: number;
  audioLevel?: number;
  nackCount?: number;
  pauseCount?: number;
  jitter?: number;
  framesDecoded?: number;
  framesReceived?: number;
  framesPerSecond?: number;
  framesDropped?: number;
  frameWidth?: number;
  frameHeight?: number;
  totalDecodeTime?: number;
  totalFreezesDuration?: number;
  freezeCount?: number;
  totalPausesDuration?: number;
  jitterBufferDelay?: number;
  jitterBufferEmittedCount?: number;
  jitterBufferTargetDelay?: number;
  jitterBufferMinimumDelay?: number;
  concealedSamples?: number;
  silentConcealedSamples?: number;
  totalSamplesReceived?: number;
  concealmentEvents?: number;
  totalInterFrameDelay?: number;
  totalSquaredInterFrameDelay?: number;
  estimatedPlayoutTimestamp?: number;
  decoderImplementation?: string;
  totalAssemblyTime?: number;
  totalProcessingDelay?: number;
  fecPacketsReceived?: number;
  fecPacketsDiscarded?: number;
  insertedSamplesForDeceleration?: number;
  removedSamplesForAcceleration?: number;
  framesAssembledFromMultiplePackets?: number;
  keyFramesDecoded?: number;
  retransmittedPacketsReceived?: number;

  // Computed delta fields
  _actualBitrateKbps?: number;
  _retransmitPct?: number;
  _jbDelayMs?: number;
  _jbTargetDelayMs?: number;
  _jbMinDelayMs?: number;
  _concealmentPct?: number;
  _ifdJitterMs?: number;
  _keyFrames?: number;
  _freezeFractionPct?: number;
  _packetLossRatePct?: number;
  _pauseFractionPct?: number;
  _silentConcealRatio?: number;
  _assemblyTimePerFrameMs?: number;
  _processingDelayPerFrameMs?: number;
  _fecDiscardRatePct?: number;
  _jbManipRatePct?: number;
  _multiPacketFramePct?: number;
  _resolution?: number;
  _pendingDecodeFrames?: number;
  _playoutDriftMs?: number;
  _e2eReceiveLatencyMs?: number;
  _decoderImpl?: string;
  decodeTimePerFrame?: number;
  decodeCpuPercent?: number;
  _remoteRttMs?: number;
  _remoteAvgRttMs?: number;
  _remoteActualBitrateKbps?: number;
  _remotePacketSentRate?: number;
  _remotePacketsSent?: number;
  _remoteBytesSent?: number;
  _remoteReportsSent?: number;
  _remoteReportsSentDelta?: number;
  _remoteTotalRtt?: number;
  _remoteRttMeasurements?: number;
  _remoteTimestamp?: number;
  _hasRemoteOutbound?: boolean;
  _avgQp?: number;
}

// ---------------------------------------------------------------------------
// allObjects map entries (accumulated per-stream metadata)
// ---------------------------------------------------------------------------

/** Entry stored in allObjects.outboundRtps */
export interface OutboundRtpEntry {
  peerConnectionId: string;
  pcIndex: number;
  firstSeen: number;
  lastSeen: number;
  ssrc?: number;
  kind?: string;
  trackIdentifier?: string;
  id?: string;
  producerId?: string;
  label?: string;
  bytesSent?: number;
  /** Full attachments record from the associated OutboundTrackSample. */
  trackAttachments?: Record<string, unknown>;
}

/** Entry stored in allObjects.inboundRtps */
export interface InboundRtpEntry {
  peerConnectionId: string;
  pcIndex: number;
  firstSeen: number;
  lastSeen: number;
  ssrc?: number;
  kind?: string;
  trackIdentifier?: string;
  id?: string;
  producerId?: string;
  consumerId?: string;
  bytesReceived?: number;
  /** Full attachments record from the associated InboundTrackSample. */
  trackAttachments?: Record<string, unknown>;
}

/** Entry stored in allObjects.iceCandidates */
export interface IceCandidateEntry {
  peerConnectionId?: string;
  pcIndex?: number;
  firstSeen?: number;
  lastSeen?: number;
  id: string;
  timestamp: number;
  transportId?: string;
  address?: string;
  port?: number;
  protocol?: string;
  candidateType?: string;
  networkType?: string;
}

/** Entry stored in allObjects.candidatePairs */
export interface CandidatePairEntry {
  peerConnectionId: string;
  pcIndex: number;
  firstSeen: number;
  lastSeen: number;
  id?: string;
  state?: string;
  nominated?: boolean;
  bytesSent?: number;
  bytesReceived?: number;
}

/** Entry stored in allObjects.peerConnections */
export interface PeerConnectionInfo {
  peerConnectionId: string;
  transportId?: string;
  index: number;
  firstSeen: number;
  lastSeen: number;
}

// ---------------------------------------------------------------------------
// Time series container types
// ---------------------------------------------------------------------------

/** Time series entry for outbound RTP streams. */
export interface OutboundRtpTimeSeriesEntry {
  peerConnectionId?: string;
  producerId?: string;
  label?: string;
  kind?: string;
  ssrc?: number;
  rid?: string;
  values: OutboundTimeSeriesValue[];
}

/** Time series entry for inbound RTP streams. */
export interface InboundRtpTimeSeriesEntry {
  peerConnectionId?: string;
  consumerId?: string;
  producerId?: string;
  kind?: string;
  ssrc?: number;
  values: InboundTimeSeriesValue[];
}

/** A single ICE candidate-pair time-series sample with computed delta metrics. */
export interface CandidatePairTimeSeriesValue extends TimeSeriesValueBase {
  id?: string;
  state?: string;
  currentRoundTripTime?: number;
  availableOutgoingBitrate?: number;
  bytesSent?: number;
  bytesReceived?: number;
  _sendBitrateKbps?: number;
  _recvBitrateKbps?: number;
  _rttMs?: number;
  _sendPacketRate?: number;
  _recvPacketRate?: number;
  _avgConsentRttMs?: number;
  _discardedPackets?: number;
  _discardedBytesKb?: number;
  _consentSuccessRate?: number;
}

/** Time series entry for ICE candidate pairs. */
export interface CandidatePairTimeSeriesEntry {
  peerConnectionId?: string;
  values: CandidatePairTimeSeriesValue[];
}

/** One ICE transport time-series sample (data-channel bitrate estimates). */
export interface IceTransportTimeSeriesValue {
  timestamp: Date;
  sampleIndex: number;
  bytesSent?: number;
  bytesReceived?: number;
  packetsSent?: number;
  packetsReceived?: number;
  iceState?: string;
  dtlsState?: string;
  _estDcSendBitrateKbps?: number;
  _estDcRecvBitrateKbps?: number;
  _estDcBytesSent?: number;
  _estDcBytesReceived?: number;
}

/** Extension stat sample: MEDIA_STREAM_TRACK_GLITCH_METRICS. */
export interface GlitchMetricsSample {
  timestamp: Date;
  undeliveredFramesFraction: number;
  undeliveredEventFrequency: number;
  audioProcessorEnabled?: boolean;
}

/** Extension stat sample: WEB_AUDIO_PLAYOUT_GLITCH_METRICS. */
export interface PlayoutMetricsSample {
  timestamp: Date;
  fallbackFramesFraction: number;
  fallbackEventFrequency: number;
  audioProcessorEnabled?: boolean;
}

/** Individual value in the iceSelectedPair time series. */
export interface IceSelectedPairValue {
  timestamp: Date | number;
  selectedCandidatePairId: string | null;
  state: 'relay' | 'direct';
  candidateType: string | null;
  localCandidateType: string | null;
  localNetworkType: string | null;
  localAddress: string | null;
  localPort: number | null;
  localProtocol: string | null;
  ip: string | null;
  relayProtocol: string | null;
  url: string | null;
  selectedCandidatePairChanges: number | null;
}

// ---------------------------------------------------------------------------
// Quality scores
// ---------------------------------------------------------------------------

/**
 * One quality score, with the explanation the client attached to it.
 *
 * observer-js computes a 1–5 score for the client, each peer connection and
 * each track, and writes `scoreReasons` next to it. The score alone says
 * something is wrong; the reasons say what — so they travel together.
 *
 * `reasons` is always a list here, whatever the producer wrote: the schema
 * carried `scoreReasons` as a string, then a `string[]`, and from 3.6.0 as a
 * `Record<reasonKey, pointsSubtracted>`, and all three vintages are in
 * storage. `toReasonList` does the normalizing.
 *
 * `penalties` is the 3.6.0 addition: how much each reason actually took off
 * the score. It is absent — not zeroed — for older samples, because a sample
 * that never carried magnitudes must not be read as one where every reason
 * cost nothing.
 */
export interface ScoreSample {
  timestamp: Date | number;
  score: number;
  /** Normalized `scoreReasons` keys, biggest contributor first. */
  reasons?: string[];
  /** Points each reason subtracted; only on samples from schema ≥3.6. */
  penalties?: Record<string, number>;
}

/** A track's score over time, tagged with what it belongs to. */
export interface TrackScoreSeries {
  /** `outbound` (a producer's track) or `inbound` (a consumer's track). */
  kind: string;
  /** The track's own id, which is how it joins onto the sample's tracks. */
  trackId?: string;
  peerConnectionId?: string;
  producerId?: string;
  consumerId?: string;
  values: ScoreSample[];
}

// ---------------------------------------------------------------------------
// Top-level processWebRTCStats result
// ---------------------------------------------------------------------------

/** Full typed result from processWebRTCStats. */
export interface ProcessWebRTCStatsResult {
  peerConnections: Array<{
    peerConnectionId?: string;
    transportId?: string;
    index: number;
    firstSeen: number;
    lastSeen: number;
    outboundRtps: OutboundRtpEntry[];
    inboundRtps: InboundRtpEntry[];
    candidatePairs: CandidatePairEntry[];
  }>;
  timeSeries: {
    outboundRtp: Record<string, OutboundRtpTimeSeriesEntry>;
    inboundRtp: Record<string, InboundRtpTimeSeriesEntry>;
    candidatePairs: Record<string, CandidatePairTimeSeriesEntry>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: Record<string, any>;
    iceSelectedPair: Record<string, {
      peerConnectionId: string;
      values: IceSelectedPairValue[];
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaSourceAudio: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaSourceVideo: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaPlayouts: Record<string, any>;
    peerConnectionTransport: Record<string, {
      peerConnectionId: string;
      direction?: string;
      values: Array<{ timestamp: Date; dataChannelsOpened: number; dataChannelsClosed: number; dataChannelsActive: number }>;
    }>;
    iceTransport: Record<string, {
      peerConnectionId: string;
      direction?: string;
      values: IceTransportTimeSeriesValue[];
    }>;
    audioMetrics: {
      glitchMetrics: GlitchMetricsSample[];
      playoutMetrics: PlayoutMetricsSample[];
    };
  };
  scores: {
    session: ScoreSample[];
    perPc: Record<string, { direction?: string; values: ScoreSample[] }>;
    perTrack: Record<string, TrackScoreSeries>;
  };
  codecs: Map<string, { mimeType: string; clockRate?: number; channels?: number; sdpFmtpLine?: string; payloadType?: number }>;
  dataChannels: Record<string, { opened: number; closed: number }>;
  allObjects: {
    outboundRtps: Map<string, OutboundRtpEntry>;
    inboundRtps: Map<string, InboundRtpEntry>;
    candidatePairs: Map<string, CandidatePairEntry>;
    peerConnections: Map<string, PeerConnectionInfo>;
    iceCandidates: Map<string, IceCandidateEntry>;
  };
  /** Periodic recorder-service snapshots from extensionStats type="recorderServiceStats". */
  recorderServiceSamples: RecorderServiceSample[];
  /** Discrete recording lifecycle events from sample.clientEvents. */
  clientRecordingEvents: ClientRecordingEvent[];
  /** videoProcessing flag samples from MEDIA_STREAM_TRACK_GLITCH_METRICS payloads. */
  videoProcessingSamples: Array<{
    timestamp: number;
    participantKey: string;
    videoProcessing: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Recorder service types
// ---------------------------------------------------------------------------

/** Stats from a HybridRecorder instance (used for both audio and video tracks). */
export interface HybridRecorderStats {
  createdSegments:       number;
  confirmedSegments:     number;
  processedSegments:     number;
  incomingFrames:        number;
  recordedFrames:        number;
  recordedKeyFrames:     number;
  recordedDeltaFrames:   number;
  recordedEmptyFrames:   number;
  discardedFrames:       number;
  sentFrames:            number;
  throttlerLevel:        number;
  incomingBitrate:       number;
  incomingBytes:         number;
  totalFileHandleReadTimeMs: number;
}

/** @deprecated Use HybridRecorderStats */
export type HybridVideoArchiveStats = HybridRecorderStats;

/**
 * Stats for a single recording track (archive) inside a RecordingSession.
 * Matches RecordingTrackStats from the client.
 */
export interface RecorderArchiveStats {
  state: string;
  localAudio?: { chunks: number; bytes: number; lastPartReceived?: boolean };
  localVideo?: { chunks: number; bytes: number; lastPartReceived?: boolean };
  hybridAudio?: HybridRecorderStats;
  hybridVideo?: HybridRecorderStats;
  audioWatchdogTimeouts?: number;
  videoWatchdogTimeouts?: number;
  errorCount?: number;
  keyFrameRequests?: number;
  keyFrameRequestRetries?: number;
  audioProducerSwaps?: number;
  videoProducerSwaps?: number;
}

/** One time-series sample from the `recorderServiceStats` extension stat. */
export interface RecorderServiceSample {
  timestamp: Date;
  /** Top-level RecorderService state (idle | starting | recording | stopping | error | initializing). */
  state: string;
  /** RecordingSession state (ready | starting | started | recording | stopping | stopped | error). */
  sessionState: string | null;
  /** Archive stats keyed by archive/client label. */
  archives: Record<string, RecorderArchiveStats>;
}

/** A discrete client-side recording event from `sample.clientEvents`. */
export interface ClientRecordingEvent {
  timestamp: Date;
  type: RecordingClientEventType | string;
  payload: Record<string, unknown>;
}
