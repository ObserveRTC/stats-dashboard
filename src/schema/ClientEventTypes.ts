export const ClientEventTypes = {
	CLIENT_JOINED: 'CLIENT_JOINED',
	CLIENT_LEFT: 'CLIENT_LEFT',
	PEER_CONNECTION_OPENED: 'PEER_CONNECTION_OPENED',
	PEER_CONNECTION_CLOSED: 'PEER_CONNECTION_CLOSED',
	MEDIA_TRACK_ADDED: 'MEDIA_TRACK_ADDED',
	MEDIA_TRACK_REMOVED: 'MEDIA_TRACK_REMOVED',
	MEDIA_TRACK_RESUMED: 'MEDIA_TRACK_RESUMED',
	MEDIA_TRACK_MUTED: 'MEDIA_TRACK_MUTED',
	MEDIA_TRACK_UNMUTED: 'MEDIA_TRACK_UNMUTED',
	ICE_GATHERING_STATE_CHANGED: 'ICE_GATHERING_STATE_CHANGED',
	PEER_CONNECTION_STATE_CHANGED: 'PEER_CONNECTION_STATE_CHANGED',
	ICE_CONNECTION_STATE_CHANGED: 'ICE_CONNECTION_STATE_CHANGED',
	DATA_CHANNEL_OPEN: 'DATA_CHANNEL_OPEN',
	DATA_CHANNEL_CLOSED: 'DATA_CHANNEL_CLOSED',
	DATA_CHANNEL_ERROR: 'DATA_CHANNEL_ERROR',
	NEGOTIATION_NEEDED: 'NEGOTIATION_NEEDED',
	SIGNALING_STATE_CHANGE: 'SIGNALING_STATE_CHANGE',
	ICE_CANDIDATE: 'ICE_CANDIDATE',
	ICE_CANDIDATE_ERROR: 'ICE_CANDIDATE_ERROR',

	// Added by client-monitor 4.7.0.
	PEER_CONNECTION_ICE_PATH_CHANGED: 'PEER_CONNECTION_ICE_PATH_CHANGED',
	ICE_RESTART: 'ICE_RESTART',
	ICE_RESTART_RECOMMENDED: 'ICE_RESTART_RECOMMENDED',
	LONG_PC_CONNECTION_ESTABLISHMENT: 'LONG_PC_CONNECTION_ESTABLISHMENT',
	EXCESSIVE_SYNTHESIZED_AUDIO: 'EXCESSIVE_SYNTHESIZED_AUDIO',
	CODEC_CHANGED: 'CODEC_CHANGED',
	VIDEO_RESOLUTION_CHANGED: 'VIDEO_RESOLUTION_CHANGED',
	SIMULCAST_LAYER_CHANGED: 'SIMULCAST_LAYER_CHANGED',
	CAPTURE_SOURCE_LOST: 'CAPTURE_SOURCE_LOST',
	CAPTURE_TRACK_MUTED: 'CAPTURE_TRACK_MUTED',
	STATS_COLLECTION_GAP: 'STATS_COLLECTION_GAP',
	TAB_VISIBILITY_CHANGED: 'TAB_VISIBILITY_CHANGED',

	PRODUCER_ADDED: 'PRODUCER_ADDED',
	PRODUCER_REMOVED: 'PRODUCER_REMOVED',
	PRODUCER_PAUSED: 'PRODUCER_PAUSED',
	PRODUCER_RESUMED: 'PRODUCER_RESUMED',
	CONSUMER_ADDED: 'CONSUMER_ADDED',
	CONSUMER_REMOVED: 'CONSUMER_REMOVED',
	CONSUMER_PAUSED: 'CONSUMER_PAUSED',
	CONSUMER_RESUMED: 'CONSUMER_RESUMED',
	DATA_PRODUCER_CREATED: 'DATA_PRODUCER_CREATED',
	DATA_PRODUCER_CLOSED: 'DATA_PRODUCER_CLOSED',
	DATA_CONSUMER_CREATED: 'DATA_CONSUMER_CREATED',
	DATA_CONSUMER_CLOSED: 'DATA_CONSUMER_CLOSED',
} as const;

export type ClientEventType = (typeof ClientEventTypes)[keyof typeof ClientEventTypes];

export type ClientJoinedEventPayload = Record<string, unknown>;

export type ClientLeftEventPayload = Record<string, unknown>;

export interface PeerConnectionOpenedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	iceConnectionState?: string;
	iceGatheringState?: string;
	signalingState?: string;
}

export interface PeerConnectionClosedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	iceConnectionState?: string;
	iceGatheringState?: string;
	signalingState?: string;
}

export interface MediaTrackAddedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	trackId: string;
	kind: 'audio' | 'video';
	label?: string;
	muted: boolean;
	enabled: boolean;
	readyState: string;
	contentHint?: string;
	constraints: MediaTrackConstraints,
	capabilities: MediaTrackCapabilities,
	settings: MediaTrackSettings,
}

export interface MediaTrackRemovedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	trackId: string;
	kind: 'audio' | 'video';
	label?: string;
	muted: boolean;
	enabled: boolean;
	readyState: string;
	contentHint?: string;
}

export interface MediaTrackMutedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	trackId: string;
	kind: 'audio' | 'video';
	label?: string;
	muted: boolean;
	enabled: boolean;
	readyState: string;
	contentHint?: string;
}

export interface MediaTrackUnmutedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	trackId: string;
	kind: 'audio' | 'video';
	label?: string;
	muted: boolean;
	enabled: boolean;
	readyState: string;
	contentHint?: string;
}

export interface IceGatheringStateChangedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	iceGatheringState: string;
}

export interface PeerConnectionStateChangedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	connectionState: string;
}

export interface IceConnectionStateChangedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	iceConnectionState: string;
}

export interface DataChannelErrorEventPayload extends Record<string, unknown> {
	label: string;
	peerConnectionId: string;
	readyState: string;
	dataChannelId: string | number | null,
	error: string | null,
}

export interface DataChannelOpenEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	label: string;
	readyState: string;
	dataChannelId: string | number | null,
}

export interface DataChannelClosedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	label: string;
	readyState: string;
	dataChannelId: string | number | null,
}

export interface NegotiationNeededEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
}

export interface IceCandidateEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/address) */
	address?: string | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/candidate) */
    candidate?: string;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/component) */
    component?: RTCIceComponent | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/foundation) */
    foundation?: string | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/port) */
    port?: number | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/priority) */
    priority?: number | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/protocol) */
    protocol?: RTCIceProtocol | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/relatedAddress) */
    relatedAddress?: string | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/relatedPort) */
    relatedPort?: number | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/sdpMLineIndex) */
    sdpMLineIndex?: number | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/sdpMid) */
    sdpMid?: string | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/tcpType) */
    tcpType?: RTCIceTcpCandidateType | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/type) */
    type?: RTCIceCandidateType | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/RTCIceCandidate/usernameFragment) */
    usernameFragment?: string | null;
}

export interface IceCandidateErrorEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	errorCode?: number;
	errorText?: string;
	address?: string | null;
	port?: number | null;
	url?: string | null;
}

export interface SignalingStateChangedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	signalingState: string;
}

export interface ProducerAddedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
}

export interface ProducerRemovedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
}

export interface ProducerPausedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
}

export interface ProducerResumedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
}

export interface ConsumerAddedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
	consumerId: string;
	trackId: string;
}

export interface ConsumerRemovedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
	consumerId: string;
	trackId: string;
}

export interface ConsumerPausedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
	consumerId: string;
	trackId: string;
}

export interface ConsumerResumedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	producerId: string;
	consumerId: string;
	trackId: string;
}

export interface DataProducerCreatedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	dataProducerId: string;
}

export interface DataProducerClosedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	dataProducerId: string;
}

export interface DataConsumerCreatedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	dataProducerId: string;
	dataConsumerId: string;
}

export interface DataConsumerClosedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	dataProducerId: string;
	dataConsumerId: string;
}

/* ── client-monitor 4.7.0 payloads ────────────────────── */

/**
 * The browser tab moved to or from the foreground.
 *
 * `visible` is the state the tab moved *to*, not the state it was in — so a
 * span of backgrounded time runs from a `visible: false` event to the next
 * `visible: true` one. This matters more than it sounds: a backgrounded tab is
 * throttled by the browser, which slows timers, drops the capture frame rate
 * and starves the encoder. Half the alarming readings on a timeline are the
 * tab being in the background, and the only way to tell is to draw it.
 */
export interface TabVisibilityChangedEventPayload extends Record<string, unknown> {
	/** True when the tab became visible, false when it went to the background. */
	visible: boolean;
}

/**
 * The stats collector missed its schedule.
 *
 * Usually the same cause as a backgrounded tab — throttled timers — and worth
 * reading next to it, since a gap in collection is not a gap in the call.
 */
export interface StatsCollectionGapEventPayload extends Record<string, unknown> {
	expectedPeriodInMs: number;
	actualPeriodInMs: number;
	gapInMs: number;
	durationOfCollectingStatsInMs?: number;
}

/**
 * The capture device went away: the MediaStreamTrack reached `ended`.
 *
 * Renamed from `CAPTURE_TRACK_ENDED` in client-monitor 4.9.0, when
 * `CaptureFailureDetector` was split into one detector per finding. It now
 * covers only a device that is *gone* — the OS or another application taking
 * the device is `CAPTURE_TRACK_MUTED`, and a live microphone producing digital
 * silence is the `silent-audio-source` issue. All three used to arrive under
 * one detector, which is why they used to be hard to tell apart.
 */
export interface CaptureSourceLostEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	trackId: string;
	kind: string;
	deviceLabel?: string;
}

/** The OS or another application took the device. Event only — no issue is raised. */
export interface CaptureTrackMutedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	trackId: string;
	kind: string;
	deviceLabel?: string;
}

export interface IceRestartEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	transportId: string;
	iceGeneration: number;
	/** 'detected', 'recovered' or 'failed'. */
	outcome: string;
	iceState?: string;
	/** How the new ICE generation was inferred. */
	evidence: string;
	timestamp: number;
}

/**
 * The selected ICE path changed.
 *
 * `from` and `to` are **structured records** from sample schema 3.7.0 onward,
 * which is the release that let event payloads nest. Before it both were
 * pre-serialised JSON documents in strings, so a reader that calls `JSON.parse`
 * on them will now be parsing an object. `parsePathEvidence` below accepts
 * either and is what this dashboard reads them through.
 */
export interface PeerConnectionIcePathChangedEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	/** Why the path changed: 'initial-selection', 'direct-to-relay', … */
	transition: string;
	/** The previous path evidence. Absent for the first path observed on a transport. */
	from?: Record<string, string | number | boolean | undefined> | string;
	/** The path evidence that is selected now. */
	to: Record<string, string | number | boolean | undefined> | string;
}

/**
 * Read one side of `PEER_CONNECTION_ICE_PATH_CHANGED`.
 *
 * Schema 3.7.0 ships path evidence as a record; earlier producers shipped the
 * same document as a JSON string. Both resolve to the same object here, so no
 * caller has to know which vintage it is holding.
 */
export function parsePathEvidence(
	value: Record<string, unknown> | string | undefined,
): Record<string, unknown> | undefined {
	if (value == null) return undefined;
	if (typeof value !== 'string') return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

/**
 * Establishment is taking too long, and — since schema 3.7.0 — which stage it is
 * stuck in.
 *
 * `connectionState: 'connecting'` covers ICE and the DTLS handshake alike, so
 * before 3.7.0 this event could not tell a STUN desert from a certificate
 * problem. `stalledStage` names which of them is holding the connection up.
 */
export interface LongPcConnectionEstablishmentEventPayload extends Record<string, unknown> {
	peerConnectionId: string;
	duration: number;
	/** 'ice-gathering', 'ice-checking', 'dtls' or 'unknown'. Since schema 3.7.0. */
	stalledStage?: string;
	/** ICE state of the most severe transport at raise time. Since schema 3.7.0. */
	iceState?: string;
	/** DTLS state of the most severe transport at raise time. Since schema 3.7.0. */
	dtlsState?: string;
	/** The peer connection's ICE gathering state at raise time. Since schema 3.7.0. */
	iceGatheringState?: string;
}
