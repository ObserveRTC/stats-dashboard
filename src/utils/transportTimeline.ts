/**
 * The transport's own account of itself, as lanes on one clock.
 *
 * A mediasoup WebRTC transport runs three independent state machines — ICE,
 * DTLS and SCTP — and the router sample records every transition of each, plus
 * every change of the selected tuple. A single "connected / not connected" bar
 * throws almost all of that away: it cannot show DTLS completing while ICE is
 * still checking, or SCTP failing on an otherwise healthy transport, which is
 * exactly the shape most connection bugs have.
 *
 * Three things this gets right that a naive read of the history does not:
 *
 *   1. **Which machines a transport even has.** `MediasoupTransportSample` is a
 *      union discriminated on `type`, and the event vocabulary differs per
 *      flavour: WebRTC has ICE + DTLS + SCTP, plain and pipe have SCTP alone,
 *      and direct has no state machine at all. Drawing an empty ICE lane for a
 *      pipe transport reads as "ICE never connected" when the truth is "this
 *      transport has no ICE".
 *   2. **The state before the first transition.** Every history entry is a
 *      change *to* a state, so a lane built from events alone begins blank and
 *      only starts at the first change. mediasoup starts each machine at `new`,
 *      so that opening stretch is drawn as `new` rather than as nothing.
 *   3. **The transitions themselves.** A colour change between two touching
 *      segments is easy to miss, and it never says what the change *was*. Each
 *      transition is emitted separately, carrying `from` and `to`, so the
 *      renderer can mark it and name it.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import { ClientEventTypes } from '../schema/ClientEventTypes.ts';
import { parseJsonPayload } from '../schema/clientSampleParse.ts';
import type { MediasoupTransportSample } from '../schema/MediasoupRouter.ts';
import type { ServerTransport, HistoryEvent } from './routerServerData.ts';
import type { IceSelectedPairValue } from './statsTypes.ts';

/**
 * A component of the peer connection.
 *
 * This is the organising idea of the whole timeline: there is *one* connection
 * being set up, and ICE, DTLS and SCTP are aspects of it rather than separate
 * things. Each aspect may be reported by the SFU, by the browser, or by both —
 * and when both report one, the two rows sit together and share a colour,
 * because they are two views of the same negotiation rather than two subjects.
 */
export type TransportComponent = 'connection' | 'signaling' | 'ice' | 'dtls' | 'sctp';

/** Display name and reading order for each component. */
export const COMPONENT_META: Record<TransportComponent, { label: string; order: number }> = {
  // Ordered the way the connection is established, so the table and the chart
  // both read top-down as the handshake proceeds.
  connection: { label: 'Connection', order: 0 },
  signaling: { label: 'Signaling', order: 1 },
  ice: { label: 'ICE', order: 2 },
  dtls: { label: 'DTLS', order: 3 },
  sctp: { label: 'SCTP', order: 4 },
};

/** A mediasoup transport state machine. */
export type SfuMachine = 'ice' | 'dtls' | 'sctp';

/**
 * A lane key. SFU machines keep their bare names; the browser's own machines
 * are prefixed, because both ends have something called ICE and they are not
 * the same thing — the SFU's ICE agent and the browser's are two peers of one
 * negotiation, and the interesting bugs live in the gap between them.
 */
export type TransportMachine = SfuMachine | `client-${string}`;

export interface TransportStateSegment {
  state: string;
  start: number;
  end: number;
  color: string;
  /**
   * True for the stretch before the first recorded transition. The state is
   * mediasoup's documented starting point, not something the sample said — so
   * the renderer can draw it as the inference it is.
   */
  initial?: boolean;
  /** Extra detail for the hover, beyond the state name and time. */
  detail?: string;
  /** Which machine within the component this episode belongs to. */
  machineLabel?: string;
  /** Which end reported it. */
  source?: 'sfu' | 'client';
  /** The spec attribute the episode's state belongs to. */
  attribute?: string;
}

/** One recorded state change, which is a moment rather than a duration. */
export interface TransportTransition {
  timestamp: number;
  machine: TransportMachine;
  /** Which end of the transport reported it. */
  source: 'sfu' | 'client';
  /** Display name of the state machine, e.g. `ICE · SFU`. */
  machineLabel: string;
  /** The spec attribute this machine is, e.g. `RTCPeerConnection.connectionState`. */
  attribute?: string;
  /** Which aspect of the peer connection this belongs to. */
  component: TransportComponent;
  /** The state left behind — `new` when this is the first recorded change. */
  from: string;
  /** The state entered. */
  to: string;
  /** Colour of the state entered. */
  color: string;
  /**
   * Colour of the state left behind.
   *
   * Carried so a reader can follow one channel's path by colour alone: the
   * `from` of each change is the `to` of the one before it, and painting both
   * makes that chain visible instead of leaving every prior state grey.
   */
  fromColor: string;
  /** How long `from` held before this change, in ms. */
  heldMs: number;
  /** True when `from` is mediasoup's starting state rather than a recorded one. */
  fromInitial: boolean;
  /** The event's payload as written, for the log's payload column. */
  payload?: Record<string, unknown> | null;
}

export interface TransportLane {
  /** Row label — a component name, e.g. `ICE`. */
  label: string;
  machine?: TransportMachine;
  /** The spec attribute this lane tracks, named for the hover. */
  attribute?: string;
  /** Which aspect of the peer connection this lane belongs to. */
  component: TransportComponent;
  /** Every value that attribute's enum admits. */
  states?: string;
  /** Where the states came from — shown in the hover. */
  source: 'sfu' | 'client';
  segments: TransportStateSegment[];
}

export interface TransportMarker {
  timestamp: number;
  label: string;
  /** Filter key, so point events group apart from the state machines. */
  machine: 'sfu-event' | 'client-event';
  /** Which aspect of the peer connection the event concerns. */
  component: TransportComponent;
  /** Which end of the transport reported it. */
  source: 'sfu' | 'client';
  color: string;
  /** Pre-rendered rows of `label: value` detail. */
  detail: string[];
  /** The event's payload as written, for the log's payload column. */
  payload?: Record<string, unknown> | null;
}

export interface TransportTimelineModel {
  start: number;
  end: number;
  /** The mediasoup transport flavour these lanes describe. */
  transportType?: MediasoupTransportSample['type'];
  lanes: TransportLane[];
  transitions: TransportTransition[];
  markers: TransportMarker[];
}

/* ── palettes ──────────────────────────────────────────── */

const ICE_COLORS: Record<string, string> = {
  new: '#94a3b8',
  checking: '#eab308',
  connected: '#22c55e',
  completed: '#14b8a6',
  disconnected: '#f59e0b',
  failed: '#ef4444',
  closed: '#64748b',
};

const DTLS_COLORS: Record<string, string> = {
  new: '#94a3b8',
  connecting: '#a78bfa',
  connected: '#3b82f6',
  failed: '#ef4444',
  closed: '#64748b',
};

const SCTP_COLORS: Record<string, string> = {
  new: '#94a3b8',
  connecting: '#a78bfa',
  connected: '#06b6d4',
  failed: '#ef4444',
  closed: '#64748b',
};

const PATH_COLORS: Record<string, string> = {
  direct: '#22c55e',
  relay: '#8b5cf6',
};

const TUPLE_COLOR = '#ec4899';
/** Point events the browser reported, distinct from anything the SFU said. */
const CLIENT_EVENT_COLOR = '#f97316';
const CONNECTED_COLOR = '#22c55e';

export const TRANSPORT_LANE_COLORS = {
  ice: ICE_COLORS,
  dtls: DTLS_COLORS,
  sctp: SCTP_COLORS,
  path: PATH_COLORS,
  tuple: TUPLE_COLOR,
  connected: CONNECTED_COLOR,
  clientEvent: CLIENT_EVENT_COLOR,
} as const;

const MACHINE_META: Record<
  SfuMachine,
  {
    label: string;
    component: TransportComponent;
    attribute: string;
    states: string;
    prefix: string;
    colors: Record<string, string>;
  }
> = {
  ice: {
    label: 'ICE',
    component: 'ice',
    attribute: 'mediasoup IceState',
    // Narrower than the W3C `RTCIceTransportState` the browser reports: mediasoup
    // exposes no `checking` and no `failed` on a WebRTC transport, so those never
    // appear on this row even though the browser's ICE row can show both.
    states: 'new · connected · completed · disconnected · closed',
    prefix: 'icestate-changed-to-',
    colors: ICE_COLORS,
  },
  dtls: {
    label: 'DTLS',
    component: 'dtls',
    attribute: 'mediasoup DtlsState',
    states: 'new · connecting · connected · failed · closed',
    prefix: 'dtlsstate-changed-to-',
    colors: DTLS_COLORS,
  },
  sctp: {
    label: 'SCTP',
    component: 'sctp',
    attribute: 'mediasoup SctpState',
    // Also wider than W3C's `RTCSctpTransportState`, which has only
    // connecting / connected / closed — mediasoup adds `new` and `failed`.
    states: 'new · connecting · connected · failed · closed',
    prefix: 'sctpstate-changed-to-',
    colors: SCTP_COLORS,
  },
};

/**
 * Which state machines each mediasoup transport flavour runs.
 *
 * Straight from the sample schema's per-type event vocabularies. A direct
 * transport has none: it moves packets between the router and the application
 * with no ICE, DTLS or SCTP in between.
 */
const MACHINES_BY_TYPE: Record<MediasoupTransportSample['type'], SfuMachine[]> = {
  webrtc: ['ice', 'dtls', 'sctp'],
  plain: ['sctp'],
  pipe: ['sctp'],
  direct: [],
};

/** mediasoup starts every one of these machines here. */
const INITIAL_STATE = 'new';

/* ── helpers ───────────────────────────────────────────── */

/**
 * The transport flavour, falling back to what its events betray.
 *
 * Samples written before `type` existed still name their events, and the
 * vocabularies do not overlap: only WebRTC emits ICE or DTLS transitions, and
 * only plain emits a bare `tuple-changed`.
 */
function inferType(
  declared: MediasoupTransportSample['type'] | undefined,
  history: HistoryEvent[],
): MediasoupTransportSample['type'] | undefined {
  if (declared) return declared;
  if (history.some((h) => h.event.startsWith('icestate-') || h.event.startsWith('dtlsstate-'))) {
    return 'webrtc';
  }
  if (history.some((h) => h.event === 'tuple-changed' || h.event === 'rtcptuple-changed')) {
    return 'plain';
  }
  if (history.some((h) => h.event.startsWith('sctpstate-'))) return 'pipe';
  return undefined;
}

interface MachineHistory {
  segments: TransportStateSegment[];
  transitions: TransportTransition[];
}

/**
 * Turn one machine's `<prefix>-changed-to-<state>` events into segments and
 * transitions.
 *
 * A state runs until the next transition of the *same* machine, so each lane is
 * built from its own events only — an ICE change must not end a DTLS state.
 */
function machineHistory(
  machine: SfuMachine,
  history: HistoryEvent[],
  start: number,
  end: number,
): MachineHistory {
  const { label, attribute, component, prefix, colors } = MACHINE_META[machine];
  const events = history
    .filter((h) => h.event.startsWith(prefix))
    .sort((a, b) => a.timestamp - b.timestamp);

  // No recorded change means the machine sat in its starting state throughout,
  // which is worth drawing — a blank lane would read as "no data".
  if (events.length === 0) {
    return {
      segments: [
        { state: INITIAL_STATE, start, end, color: colors[INITIAL_STATE], initial: true },
      ],
      transitions: [],
    };
  }

  const segments: TransportStateSegment[] = [];
  const transitions: TransportTransition[] = [];

  const firstAt = Math.max(start, events[0].timestamp);
  if (firstAt > start) {
    segments.push({
      state: INITIAL_STATE,
      start,
      end: firstAt,
      color: colors[INITIAL_STATE],
      initial: true,
    });
  }

  let previousState = INITIAL_STATE;
  let previousSince = start;

  for (let i = 0; i < events.length; i++) {
    const state = events[i].event.slice(prefix.length);
    const from = Math.max(start, events[i].timestamp);
    const to = i + 1 < events.length ? Math.max(from, events[i + 1].timestamp) : end;

    transitions.push({
      timestamp: from,
      machine,
      source: 'sfu',
      machineLabel: label,
      attribute,
      component,
      from: previousState,
      to: state,
      color: colors[state] ?? '#94a3b8',
      fromColor: colors[previousState] ?? '#94a3b8',
      heldMs: Math.max(0, from - previousSince),
      fromInitial: i === 0,
      payload: events[i].payload ?? null,
    });

    if (to > from) {
      segments.push({ state, start: from, end: to, color: colors[state] ?? '#94a3b8' });
    }
    previousState = state;
    previousSince = from;
  }

  return { segments, transitions };
}

function tupleDetail(payload: Record<string, unknown> | undefined): string[] {
  if (!payload) return [];
  const local = [payload.localAddress ?? payload.localIp, payload.localPort]
    .filter((v) => v != null)
    .join(':');
  const remote = [payload.remoteIp, payload.remotePort].filter((v) => v != null).join(':');
  const rows: string[] = [];
  if (local) rows.push(`Local: ${local}`);
  if (remote) rows.push(`Remote: ${remote}`);
  if (typeof payload.protocol === 'string') rows.push(`Protocol: ${payload.protocol}`);
  return rows;
}

function tsOf(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

/**
 * The client's view of the path it actually used: relayed through TURN, or
 * direct. Consecutive samples in the same state collapse into one segment.
 */
function pathSegments(
  values: IceSelectedPairValue[] | undefined,
  end: number,
): TransportStateSegment[] {
  if (!values?.length) return [];
  const out: TransportStateSegment[] = [];

  for (const value of values) {
    const at = tsOf(value.timestamp);
    const state = value.state === 'relay' ? 'relay' : 'direct';
    const detailParts = [
      value.candidateType ? `Candidate: ${value.candidateType}` : null,
      value.localAddress ? `Local: ${value.localAddress}${value.localPort != null ? `:${value.localPort}` : ''}` : null,
      value.ip ? `Remote: ${value.ip}` : null,
      value.relayProtocol ? `Relay protocol: ${value.relayProtocol}` : null,
    ].filter((v): v is string => v != null);
    const detail = detailParts.join('\n');

    const last = out[out.length - 1];
    if (last && last.state === state && last.detail === detail) {
      last.end = at;
      continue;
    }
    if (last) last.end = at;
    out.push({ state, start: at, end, color: PATH_COLORS[state], detail });
  }

  if (out.length > 0) out[out.length - 1].end = end;
  return out.filter((s) => s.end > s.start);
}

/** Human name for a tuple-change event, by transport flavour. */
function tupleLabel(event: string): string {
  if (event === 'iceselectedtuple-changed') return 'ICE tuple changed';
  if (event === 'rtcptuple-changed') return 'RTCP tuple changed';
  if (event === 'tuple-changed') return 'RTP tuple changed';
  return event;
}

/* ── the browser's side of the same transport ──────────── */

/**
 * W3C states are shared vocabulary across the four peer-connection machines,
 * so one palette covers them: green for arrived, amber for in-flight, red for
 * broken, grey for idle or closed.
 */
const CLIENT_STATE_COLORS: Record<string, string> = {
  new: '#94a3b8',
  checking: '#eab308',
  connecting: '#a78bfa',
  connected: '#22c55e',
  completed: '#14b8a6',
  disconnected: '#f59e0b',
  failed: '#ef4444',
  closed: '#64748b',
  gathering: '#eab308',
  complete: '#14b8a6',
  stable: '#22c55e',
  'have-local-offer': '#a78bfa',
  'have-remote-offer': '#a78bfa',
  'have-local-pranswer': '#a78bfa',
  'have-remote-pranswer': '#a78bfa',
};

interface ClientMachineSpec {
  key: TransportMachine;
  label: string;
  component: TransportComponent;
  /** The W3C attribute this row tracks, verbatim. */
  attribute: string;
  /** The spec enum defining its values. */
  enumName: string;
  /** Every value that enum admits, in the spec's own order. */
  states: string;
  eventType: string;
  /** Payload field holding the new state. */
  field: string;
  /** The state the W3C spec says a fresh peer connection starts in. */
  initial: string;
}

/**
 * The browser's own state machines for one peer connection.
 *
 * Each is drawn only when the client actually reported it — a lane of pure
 * inferred initial state would claim knowledge the samples do not carry.
 */
const CLIENT_MACHINES: ClientMachineSpec[] = [
  {
    key: 'client-pc',
    label: 'Connection',
    component: 'connection',
    attribute: 'RTCPeerConnection.connectionState',
    enumName: 'RTCPeerConnectionState',
    // The aggregate of the ICE and DTLS transports beneath it, which is why it
    // can read `failed` while ICE alone still looks healthy.
    states: 'new · connecting · connected · disconnected · failed · closed',
    eventType: ClientEventTypes.PEER_CONNECTION_STATE_CHANGED,
    field: 'connectionState',
    initial: 'new',
  },
  {
    key: 'client-ice',
    label: 'ICE',
    component: 'ice',
    attribute: 'RTCPeerConnection.iceConnectionState',
    enumName: 'RTCIceConnectionState',
    states: 'new · checking · connected · completed · disconnected · failed · closed',
    eventType: ClientEventTypes.ICE_CONNECTION_STATE_CHANGED,
    field: 'iceConnectionState',
    initial: 'new',
  },
  {
    key: 'client-gathering',
    label: 'ICE gathering',
    component: 'ice',
    attribute: 'RTCPeerConnection.iceGatheringState',
    enumName: 'RTCIceGatheringState',
    // Only three values, and `complete` — not `completed`, which is the ICE
    // *connection* state. The two are routinely confused.
    states: 'new · gathering · complete',
    eventType: ClientEventTypes.ICE_GATHERING_STATE_CHANGED,
    field: 'iceGatheringState',
    initial: 'new',
  },
  {
    key: 'client-signaling',
    label: 'Signaling',
    component: 'signaling',
    attribute: 'RTCPeerConnection.signalingState',
    enumName: 'RTCSignalingState',
    // Starts at `stable`, not `new` — the one machine here that does.
    states:
      'stable · have-local-offer · have-remote-offer · have-local-pranswer · have-remote-pranswer · closed',
    eventType: ClientEventTypes.SIGNALING_STATE_CHANGE,
    field: 'signalingState',
    initial: 'stable',
  },
];

/**
 * Client events that are moments rather than states, and worth marking.
 *
 * `ICE_CANDIDATE` is deliberately absent: a connection gathers dozens, and a
 * timeline peppered with them buries the handful of events that explain
 * anything.
 */
const CLIENT_EVENT_MARKERS: Record<string, { label: string; component: TransportComponent }> = {
  [ClientEventTypes.PEER_CONNECTION_OPENED]: { label: 'Peer connection opened', component: 'connection' },
  [ClientEventTypes.PEER_CONNECTION_CLOSED]: { label: 'Peer connection closed', component: 'connection' },
  [ClientEventTypes.LONG_PC_CONNECTION_ESTABLISHMENT]: { label: 'Slow connection setup', component: 'connection' },

  [ClientEventTypes.NEGOTIATION_NEEDED]: { label: 'Negotiation needed', component: 'signaling' },

  [ClientEventTypes.ICE_CANDIDATE_ERROR]: { label: 'ICE candidate error', component: 'ice' },
  [ClientEventTypes.ICE_RESTART]: { label: 'ICE restart', component: 'ice' },
  [ClientEventTypes.ICE_RESTART_RECOMMENDED]: { label: 'ICE restart recommended', component: 'ice' },
  [ClientEventTypes.PEER_CONNECTION_ICE_PATH_CHANGED]: { label: 'ICE path changed', component: 'ice' },

  // A data channel is the application's view of SCTP. Neither end reports SCTP
  // state from the browser, so these are the only browser-side evidence that
  // the SCTP association did — or did not — come up.
  [ClientEventTypes.DATA_CHANNEL_OPEN]: { label: 'Data channel open', component: 'sctp' },
  [ClientEventTypes.DATA_CHANNEL_CLOSED]: { label: 'Data channel closed', component: 'sctp' },
  [ClientEventTypes.DATA_CHANNEL_ERROR]: { label: 'Data channel error', component: 'sctp' },
};

/** Fields worth surfacing on a client marker, in the order they read best. */
const CLIENT_DETAIL_FIELDS = [
  'transition',
  'label',
  'readyState',
  'outcome',
  'evidence',
  'iceState',
  'errorText',
  'errorCode',
  'url',
  'address',
  'port',
  'durationInMs',
  'iceGeneration',
];

interface ClientEventEntry {
  at: number;
  type: string;
  payload: Record<string, unknown> | null;
}

/** Client events belonging to one peer connection, in time order. */
function collectClientEvents(
  samples: ClientSample[] | undefined,
  peerConnectionId: string | undefined,
): ClientEventEntry[] {
  if (!samples?.length || !peerConnectionId) return [];
  const out: ClientEventEntry[] = [];

  for (const sample of samples) {
    for (const event of sample.clientEvents ?? []) {
      if (!event?.type) continue;
      const payload = parseJsonPayload(event.payload);
      // The peer connection id is what ties an event to *this* transport; an
      // event that names none belongs to the client as a whole, not here.
      if (payload?.peerConnectionId !== peerConnectionId) continue;
      const at = event.timestamp ?? sample.timestamp;
      if (!Number.isFinite(at)) continue;
      out.push({ at, type: event.type, payload });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

/** Build one client lane, the same way an SFU machine lane is built. */
function clientMachineHistory(
  spec: ClientMachineSpec,
  events: ClientEventEntry[],
  start: number,
  end: number,
): MachineHistory {
  // `PEER_CONNECTION_OPENED` carries the connection's state at the moment it
  // opened — `iceConnectionState`, `iceGatheringState`, `signalingState`. When
  // it does, the opening stretch is *reported* rather than inferred from the
  // spec default, and is not flagged as a guess.
  const opened = events.find((e) => e.type === ClientEventTypes.PEER_CONNECTION_OPENED);
  const reportedInitial = (() => {
    const value = opened?.payload?.[spec.field];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  })();
  const initialState = reportedInitial ?? spec.initial;
  const initialIsInferred = reportedInitial == null;
  const changes = events
    .filter((e) => e.type === spec.eventType)
    .map((e) => ({ at: e.at, state: String(e.payload?.[spec.field] ?? '').trim(), payload: e.payload }))
    .filter((e) => e.state !== '');

  if (changes.length === 0) return { segments: [], transitions: [] };

  const colorOf = (state: string) => CLIENT_STATE_COLORS[state] ?? '#94a3b8';
  const segments: TransportStateSegment[] = [];
  const transitions: TransportTransition[] = [];

  const firstAt = Math.max(start, changes[0].at);
  if (firstAt > start) {
    segments.push({
      state: initialState,
      start,
      end: firstAt,
      color: colorOf(initialState),
      initial: initialIsInferred,
    });
  }

  let previousState = initialState;
  let previousSince = start;

  for (let i = 0; i < changes.length; i++) {
    const from = Math.max(start, changes[i].at);
    const to = i + 1 < changes.length ? Math.max(from, changes[i + 1].at) : end;

    // A client can re-announce the state it is already in; that is not a change.
    if (changes[i].state !== previousState) {
      transitions.push({
        timestamp: from,
        machine: spec.key,
        source: 'client',
        machineLabel: spec.label,
        attribute: spec.attribute,
        component: spec.component,
        from: previousState,
        to: changes[i].state,
        color: colorOf(changes[i].state),
        fromColor: colorOf(previousState),
        heldMs: Math.max(0, from - previousSince),
        // Only a guess when the client did not state where it started.
        fromInitial: i === 0 && initialIsInferred,
        payload: changes[i].payload,
      });
      previousSince = from;
    }

    if (to > from) {
      segments.push({ state: changes[i].state, start: from, end: to, color: colorOf(changes[i].state) });
    }
    previousState = changes[i].state;
  }

  return { segments, transitions };
}

/** Readable detail rows for a client marker. */
function clientMarkerDetail(payload: Record<string, unknown> | null): string[] {
  if (!payload) return [];
  const rows: string[] = [];
  for (const field of CLIENT_DETAIL_FIELDS) {
    const value = payload[field];
    if (value == null || value === '') continue;
    rows.push(`${field}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  }
  return rows;
}

/* ── model ─────────────────────────────────────────────── */

export interface BuildTransportTimelineOptions {
  transport: ServerTransport | null;
  /** The client's selected-candidate-pair series for this peer connection. */
  iceSelectedPair?: IceSelectedPairValue[];
  /**
   * The client's raw samples, for its own view of this transport.
   *
   * The SFU and the browser are the two peers of one negotiation, and each only
   * ever reports its own half. Reading them on one clock is what shows the gap:
   * the browser giving up on ICE while the SFU still believes it is connected,
   * a renegotiation the SFU never saw the result of, a DTLS handshake that
   * started long after the client thought it had a path.
   */
  clientSamples?: ClientSample[];
  /** Which peer connection those samples' events must name to count. */
  peerConnectionId?: string;
  /** Fallback window when the transport carries no lifetime of its own. */
  fallbackStart?: number;
  fallbackEnd?: number;
}

export function buildTransportTimeline({
  transport,
  iceSelectedPair,
  clientSamples,
  peerConnectionId,
  fallbackStart,
  fallbackEnd,
}: BuildTransportTimelineOptions): TransportTimelineModel | null {
  const history = transport?.history ?? [];
  const clientEvents = collectClientEvents(clientSamples, peerConnectionId ?? transport?.id);

  const clientTimes = [
    ...(iceSelectedPair ?? []).map((v) => tsOf(v.timestamp)),
    ...clientEvents.map((e) => e.at),
  ];

  // The clock starts at whichever end created its half of the connection first:
  // the SFU allocating the transport, or the browser opening the peer
  // connection. Neither reliably precedes the other — the order depends on the
  // signalling flow — so taking the earlier of the two is what keeps the setup
  // phase whole instead of clipping whichever end happened to move first.
  const pcOpenedAt = clientEvents.find(
    (e) => e.type === ClientEventTypes.PEER_CONNECTION_OPENED,
  )?.at;

  // The two ends' creation times, whichever exist. `fallbackStart` is only a
  // last resort: it is the whole call's window, and folding it in alongside
  // them would stretch a transport created 30s in back to the call's opening —
  // a mostly empty chart for one late transport.
  const createdAtEnds = [pcOpenedAt, transport?.createdAt || undefined].filter(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  const preferredStart = createdAtEnds.length
    ? Math.min(...createdAtEnds)
    : fallbackStart || undefined;
  const earliestEvent = clientTimes.length ? Math.min(...clientTimes) : undefined;

  const candidateEnds = [
    transport?.closedAt,
    fallbackEnd,
    ...(clientTimes.length ? [Math.max(...clientTimes)] : []),
  ].filter((v): v is number => typeof v === 'number' && v > 0);

  if (preferredStart == null && earliestEvent == null) return null;
  // The preferred origin, unless something was actually recorded before it —
  // clipping a real event to make the chart start where we would like it to is
  // the one thing worse than starting early.
  const start =
    preferredStart == null
      ? (earliestEvent as number)
      : earliestEvent != null
        ? Math.min(preferredStart, earliestEvent)
        : preferredStart;
  const end = candidateEnds.length > 0 ? Math.max(...candidateEnds, start + 1000) : start + 1000;

  const transportType = inferType(transport?.transportType, history);

  // With no declared or inferable type, fall back to drawing whatever machines
  // left a trace — better a partial picture than none for an unknown flavour.
  const machines: SfuMachine[] = transportType
    ? MACHINES_BY_TYPE[transportType]
    : (['ice', 'dtls', 'sctp'] as SfuMachine[]).filter((m) =>
        history.some((h) => h.event.startsWith(MACHINE_META[m].prefix)),
      );

  const transitions: TransportTransition[] = [];

  /**
   * Everything one component knows, from both ends, before it is flattened.
   *
   * A component can be described by more than one state machine — ICE by the
   * browser's `iceConnectionState`, its `iceGatheringState` and the SFU's
   * `IceState` all at once — and they run concurrently. A single row can only
   * ever show one of them at a time, so what it shows is the *most recent news*
   * about that component: each episode runs from one change to the next change
   * of any machine in the component, and names which machine and which end it
   * came from. That is the honest reading of one row per component, and it is
   * why the hover carries the machine name rather than leaving it to the label.
   */
  const componentParts = new Map<
    TransportComponent,
    { openings: TransportStateSegment[]; changes: TransportTransition[]; attributes: Set<string> }
  >();

  const partFor = (component: TransportComponent) => {
    let part = componentParts.get(component);
    if (!part) {
      part = { openings: [], changes: [], attributes: new Set() };
      componentParts.set(component, part);
    }
    return part;
  };

  for (const machine of machines) {
    const meta = MACHINE_META[machine];
    const { segments, transitions: machineTransitions } = machineHistory(machine, history, start, end);
    if (segments.length === 0) continue;
    const part = partFor(meta.component);
    part.attributes.add(meta.attribute);
    transitions.push(...machineTransitions);
    part.changes.push(...machineTransitions);
    const opening = segments[0];
    if (opening.initial || machineTransitions.length === 0) {
      part.openings.push({ ...opening, machineLabel: meta.label, source: 'sfu', attribute: meta.attribute });
    }
  }

  for (const spec of CLIENT_MACHINES) {
    const { segments, transitions: clientTransitions } = clientMachineHistory(spec, clientEvents, start, end);
    if (segments.length === 0) continue;
    const part = partFor(spec.component);
    part.attributes.add(spec.attribute);
    transitions.push(...clientTransitions);
    part.changes.push(...clientTransitions);
    const opening = segments[0];
    if (opening.start === start) {
      part.openings.push({ ...opening, machineLabel: spec.label, source: 'client', attribute: spec.attribute });
    }
  }

  const lanes: TransportLane[] = [];

  for (const [component, part] of componentParts) {
    part.changes.sort((a, b) => a.timestamp - b.timestamp);
    const segments: TransportStateSegment[] = [];

    // The opening stretch: the starting state of whichever machine in this
    // component changes first, so the row begins where the component began
    // rather than at its first recorded change.
    const firstChangeAt = part.changes[0]?.timestamp ?? end;
    const opening =
      part.openings.find((o) => o.machineLabel === part.changes[0]?.machineLabel) ??
      part.openings[0];
    if (opening && firstChangeAt > start) {
      segments.push({ ...opening, start, end: firstChangeAt });
    }

    for (let i = 0; i < part.changes.length; i++) {
      const change = part.changes[i];
      const from = Math.max(start, change.timestamp);
      const to = i + 1 < part.changes.length ? Math.max(from, part.changes[i + 1].timestamp) : end;
      if (to <= from) continue;
      segments.push({
        state: change.to,
        start: from,
        end: to,
        color: change.color,
        machineLabel: change.machineLabel,
        source: change.source,
        attribute: change.attribute,
      });
    }

    if (segments.length === 0) continue;
    lanes.push({
      label: COMPONENT_META[component].label,
      component,
      attribute: [...part.attributes].join('\n'),
      // A component row can carry both ends; the tag names whichever reported
      // more of it, and each episode says for itself.
      source: part.changes.some((c) => c.source === 'client') ? 'client' : 'sfu',
      segments,
    });
  }

  const path = pathSegments(iceSelectedPair, end);
  // Kept as its own row rather than folded into ICE: it is not a state machine
  // but *which candidate pair* was carrying media, derived from stats rather
  // than from events. Interleaving it with ICE states would put two different
  // kinds of fact in one sequence, where a relay switch would displace the ICE
  // state that was still true.
  if (path.length)
    lanes.push({ label: 'ICE path', component: 'ice', source: 'client', segments: path });

  // Grouped by component so the two views of one aspect sit together: the
  // SFU's ICE row directly beneath the browser's is the whole point.
  lanes.sort(
    (a, b) =>
      COMPONENT_META[a.component].order - COMPONENT_META[b.component].order ||
      // The state row before the derived path row within ICE.
      Number(a.label === 'ICE path') - Number(b.label === 'ICE path'),
  );

  transitions.sort((a, b) => a.timestamp - b.timestamp);

  /* ── markers: moments rather than states ── */

  const markers: TransportMarker[] = [];

  // The universal milestone. mediasoup has no single "connected" event, so the
  // observer derives this per flavour — worth marking precisely because it is
  // the one point every transport type has in common.
  //
  // Only when there are lanes to mark against. A direct transport runs no state
  // machine, so it has no timeline; a lone "connected at creation" tick with
  // nothing beneath it is a chart with no content, not a sparse one.
  if (lanes.length > 0 && transport?.connectedAt != null && transport.connectedAt >= start) {
    markers.push({
      timestamp: transport.connectedAt,
      label: 'Transport connected',
      machine: 'sfu-event',
      component: 'connection',
      source: 'sfu',
      color: CONNECTED_COLOR,
      detail: [`${((transport.connectedAt - start) / 1000).toFixed(1)}s after creation`],
    });
  }

  for (const event of history) {
    if (!event.event.endsWith('tuple-changed')) continue;
    // The generated history entry carries only a type and a timestamp. Some
    // producers inline the new tuple; when they do not, the sample's `tuple` is
    // the *latest* value, not the value at this moment — so it is labelled as
    // such rather than presented as what changed here.
    const inlined = tupleDetail(event.payload);
    const latest = tupleDetail(transport?.tuple as unknown as Record<string, unknown> | undefined);
    markers.push({
      timestamp: event.timestamp,
      label: tupleLabel(event.event),
      machine: 'sfu-event',
      // A tuple is the selected candidate pair: an ICE outcome.
      component: 'ice',
      source: 'sfu',
      color: TUPLE_COLOR,
      detail: inlined.length
        ? inlined
        : latest.length
          ? ['The sample records only the latest tuple:', ...latest]
          : [],
      payload: event.payload ?? null,
    });
  }

  for (const event of clientEvents) {
    const spec = CLIENT_EVENT_MARKERS[event.type];
    if (!spec) continue;
    markers.push({
      timestamp: event.at,
      label: spec.label,
      machine: 'client-event',
      component: spec.component,
      source: 'client',
      color: CLIENT_EVENT_COLOR,
      detail: clientMarkerDetail(event.payload),
      payload: event.payload,
    });
  }

  markers.sort((a, b) => a.timestamp - b.timestamp);

  if (lanes.length === 0 && markers.length === 0) return null;
  return { start, end, transportType, lanes, transitions, markers };
}
