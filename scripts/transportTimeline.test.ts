/**
 * The transport timeline model.
 *
 *   node --experimental-strip-types scripts/transportTimeline.test.ts
 *
 * Uses the real router sample in `scripts/fixtures/`: a WebRTC transport whose
 * history carries ICE, DTLS and SCTP transitions plus a tuple change. The point
 * of the model is that each state machine gets its own lane — a single
 * connected/not-connected bar cannot show DTLS still connecting while ICE has
 * completed, which is the shape most connection bugs have.
 *
 * Two things the model asserts that the raw history does not say outright: that
 * every machine begins at `new` before its first recorded change, and that only
 * a WebRTC transport has ICE and DTLS at all — plain and pipe run SCTP alone,
 * and direct runs nothing.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildClientServerData } from '../src/utils/routerServerData.ts';
import {
  buildTransportTimeline,
  TRANSPORT_LANE_COLORS,
} from '../src/utils/transportTimeline.ts';

const here = dirname(fileURLToPath(import.meta.url));
const rawRouter = JSON.parse(readFileSync(join(here, 'fixtures', 'mediasoup-router.json'), 'utf8'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routerSamples = new Map<string, any>([[rawRouter.routerId, rawRouter]]);

const A_SEND = '78f6007d-9e72-4682-bc73-bf4b7f5185bf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statsA: any = {
  peerConnections: [],
  timeSeries: {
    outboundRtp: {
      'track-1': { kind: 'audio', ssrc: 966900604, values: [{ timestamp: 1787297242000, ssrc: 966900604 }] },
    },
    inboundRtp: {},
  },
  allObjects: { outboundRtps: new Map(), inboundRtps: new Map() },
  scores: { perTrack: {} },
};

const serverData = buildClientServerData('client-A', routerSamples, statsA);
const sendTransport = serverData.transports.find((t) => t.id === A_SEND)!;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log('transport timeline');

check('each component gets one lane', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  assert.ok(model);
  // One row per component, not one per state machine: ICE, DTLS and SCTP are
  // aspects of a single connection.
  assert.deepEqual(model.lanes.map((l) => l.label), ['ICE', 'DTLS', 'SCTP']);
  assert.deepEqual(model.lanes.map((l) => l.component), ['ice', 'dtls', 'sctp']);
});

check('a state runs until the next change of the same machine', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const ice = model.lanes.find((l) => l.label === 'ICE')!;
  // connected at …396, completed at …448 — the DTLS and SCTP events in
  // between must not cut the ICE segment short. The leading `new` is the
  // stretch before the first recorded change.
  assert.deepEqual(ice.segments.map((s) => s.state), ['new', 'connected', 'completed']);
  assert.equal(ice.segments[1].start, 1787297241396);
  assert.equal(ice.segments[1].end, 1787297241448);
  // and the last state runs to the transport's close
  assert.equal(ice.segments[2].end, sendTransport.closedAt);
});

check('DTLS is still connecting while ICE reports connected', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const dtls = model.lanes.find((l) => l.label === 'DTLS')!;
  assert.deepEqual(dtls.segments.map((s) => s.state), ['new', 'connecting', 'connected']);
  const ice = model.lanes.find((l) => l.label === 'ICE')!;
  // The overlap the old single bar could not show: DTLS is still connecting
  // while ICE already reports connected.
  assert.ok(dtls.segments[1].start > ice.segments[1].start);
  assert.ok(dtls.segments[1].end > ice.segments[1].start);
});

check('the repeated SCTP connecting event does not create a zero-width segment', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const sctp = model.lanes.find((l) => l.label === 'SCTP')!;
  for (const seg of sctp.segments) assert.ok(seg.end > seg.start, `${seg.state} has no width`);
});

check('a tuple change becomes a marker with its addresses', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const tuple = model.markers.find((mk) => mk.label === 'ICE tuple changed')!;
  assert.ok(tuple, 'no tuple marker');
  assert.ok(tuple.detail.some((d) => d.includes('192.168.50.156:40080')));
  assert.ok(tuple.detail.some((d) => d.includes('192.168.50.1:58583')));
  assert.ok(tuple.detail.some((d) => d.includes('udp')));
});

check('the derived connected milestone is marked', () => {
  // mediasoup has no single "connected" event — the observer derives one per
  // transport flavour — so it is the one moment every type has in common.
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const connected = model.markers.find((mk) => mk.label === 'Transport connected');
  if (sendTransport.connectedAt != null) {
    assert.ok(connected, 'no connected marker');
    assert.equal(connected!.timestamp, sendTransport.connectedAt);
  } else {
    assert.equal(connected, undefined);
  }
});

check('markers are in time order', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  for (let i = 1; i < model.markers.length; i++) {
    assert.ok(model.markers[i].timestamp >= model.markers[i - 1].timestamp);
  }
});

console.log('\nthe client side of the same transport');

check("the client's path is a lane of its own", () => {
  const t0 = sendTransport.createdAt;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iceSelectedPair: any = [
    { timestamp: t0 + 1000, state: 'direct', candidateType: 'srflx', localAddress: '10.0.0.2', localPort: 5000, ip: '1.2.3.4' },
    { timestamp: t0 + 2000, state: 'direct', candidateType: 'srflx', localAddress: '10.0.0.2', localPort: 5000, ip: '1.2.3.4' },
    { timestamp: t0 + 3000, state: 'relay', candidateType: 'relay', localAddress: '10.0.0.2', localPort: 5000, ip: '9.9.9.9', relayProtocol: 'udp' },
  ];
  const model = buildTransportTimeline({ transport: sendTransport, iceSelectedPair })!;
  const path = model.lanes.find((l) => l.label === 'ICE path')!;
  assert.equal(path.source, 'client');
  // Consecutive identical samples collapse; the switch to relay starts a new one.
  assert.deepEqual(path.segments.map((s) => s.state), ['direct', 'relay']);
  assert.ok(path.segments[1].detail?.includes('Relay protocol: udp'));
});

check('no transport at all yields nothing to draw', () => {
  assert.equal(buildTransportTimeline({ transport: null }), null);
});

check('a WebRTC transport that never transitioned shows every machine stuck at new', () => {
  // The opposite of drawing nothing, and the reason the initial state exists:
  // a transport whose ICE never left `new` is the most interesting transport on
  // the page, and an empty timeline would say "no data" instead of "never
  // connected".
  const bare = { ...sendTransport, history: [] };
  const model = buildTransportTimeline({ transport: bare })!;
  assert.ok(model);
  assert.deepEqual(model.lanes.map((l) => l.label), ['ICE', 'DTLS', 'SCTP']);
  for (const lane of model.lanes) {
    assert.deepEqual(lane.segments.map((s) => s.state), ['new']);
    assert.equal(lane.segments[0].initial, true);
    assert.equal(lane.segments[0].start, model.start);
    assert.equal(lane.segments[0].end, model.end);
  }
  assert.equal(model.transitions.length, 0);
});

console.log('\nstate changes, and what changed');

check('every recorded change becomes a transition naming from and to', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const ice = model.transitions.filter((t) => t.machine === 'ice');
  assert.deepEqual(
    ice.map((t) => `${t.from}->${t.to}`),
    ['new->connected', 'connected->completed'],
  );
  assert.equal(ice[0].machineLabel, 'ICE');
  assert.equal(ice[0].attribute, 'mediasoup IceState');
  assert.equal(ice[0].timestamp, 1787297241396);
});

check('the first change reports leaving the inferred starting state', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const first = model.transitions.find((t) => t.machine === 'dtls')!;
  assert.equal(first.from, 'new');
  // Flagged, so the hover can say "starting state" rather than presenting an
  // inference as something the sample recorded.
  assert.equal(first.fromInitial, true);
});

check('a transition knows how long the previous state held', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const ice = model.transitions.filter((t) => t.machine === 'ice');
  assert.equal(ice[1].heldMs, 1787297241448 - 1787297241396);
});

check('transitions arrive in time order across machines', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  for (let i = 1; i < model.transitions.length; i++) {
    assert.ok(
      model.transitions[i].timestamp >= model.transitions[i - 1].timestamp,
      'transitions are not sorted',
    );
  }
});

console.log('\nonly the machines a transport actually has');

check('a pipe transport gets SCTP alone, never ICE or DTLS', () => {
  // Drawing an empty ICE lane here would read as "ICE never connected" when the
  // truth is that a pipe transport has no ICE to connect.
  const pipe = {
    ...sendTransport,
    transportType: 'pipe' as const,
    history: [{ timestamp: sendTransport.createdAt + 10, event: 'sctpstate-changed-to-connected' }],
  };
  const model = buildTransportTimeline({ transport: pipe })!;
  assert.deepEqual(model.lanes.map((l) => l.label), ['SCTP']);
  assert.equal(model.transportType, 'pipe');
});

check('a direct transport has no state machine to draw', () => {
  // Not even its connected milestone: with no lanes there is no timeline for a
  // lone tick to sit on.
  const direct = { ...sendTransport, transportType: 'direct' as const, history: [] };
  assert.equal(buildTransportTimeline({ transport: direct }), null);
});

check('a plain transport labels its RTP and RTCP tuple changes apart', () => {
  const plain = {
    ...sendTransport,
    transportType: 'plain' as const,
    history: [
      { timestamp: sendTransport.createdAt + 5, event: 'tuple-changed' },
      { timestamp: sendTransport.createdAt + 6, event: 'rtcptuple-changed' },
    ],
  };
  const model = buildTransportTimeline({ transport: plain })!;
  assert.deepEqual(
    model.markers.filter((mk) => mk.label.includes('tuple')).map((mk) => mk.label),
    ['RTP tuple changed', 'RTCP tuple changed'],
  );
});

check('a sample without a declared type is read from its events', () => {
  const untyped = { ...sendTransport, transportType: undefined };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = buildTransportTimeline({ transport: untyped as any })!;
  assert.equal(model.transportType, 'webrtc');
  assert.deepEqual(model.lanes.map((l) => l.label), ['ICE', 'DTLS', 'SCTP']);
});

check('client samples alone still produce a timeline', () => {
  // No router sample for this transport, but the browser saw the path.
  const t0 = 1787297241000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iceSelectedPair: any = [{ timestamp: t0, state: 'relay', candidateType: 'relay' }];
  const model = buildTransportTimeline({ transport: null, iceSelectedPair })!;
  assert.ok(model);
  assert.deepEqual(model.lanes.map((l) => l.label), ['ICE path']);
});

console.log('\nthe browser\'s own view of the same transport');

const PC_ID = sendTransport.id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clientSample(offsetMs: number, events: any[]): any {
  return { timestamp: sendTransport.createdAt + offsetMs, clientEvents: events };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientSamples: any[] = [
  clientSample(10, [
    {
      type: 'PEER_CONNECTION_OPENED',
      timestamp: sendTransport.createdAt + 10,
      payload: { peerConnectionId: PC_ID },
    },
  ]),
  clientSample(40, [
    {
      type: 'ICE_CONNECTION_STATE_CHANGED',
      timestamp: sendTransport.createdAt + 40,
      payload: { peerConnectionId: PC_ID, iceConnectionState: 'checking' },
    },
  ]),
  clientSample(90, [
    {
      type: 'ICE_CONNECTION_STATE_CHANGED',
      timestamp: sendTransport.createdAt + 90,
      payload: { peerConnectionId: PC_ID, iceConnectionState: 'connected' },
    },
    {
      type: 'PEER_CONNECTION_STATE_CHANGED',
      timestamp: sendTransport.createdAt + 90,
      payload: { peerConnectionId: PC_ID, connectionState: 'connected' },
    },
  ]),
];

check("the browser's machines become lanes of their own", () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  const labels = model.lanes.map((l) => l.label);
  // The SFU's ICE and the browser's ICE are two peers of one negotiation, so
  // they are separate lanes rather than one merged claim.
  // One ICE row carrying both ends, not one row per end.
  assert.equal(labels.filter((l) => l === 'ICE').length, 1, labels.join(', '));
  assert.ok(labels.includes('Connection'), labels.join(', '));
  const iceLane = model.lanes.find((l) => l.label === 'ICE')!;
  // Its episodes name which machine and which end each came from, since one
  // row can only ever show the most recent news about the component.
  assert.ok(iceLane.segments.some((seg) => seg.source === 'client'));
  assert.ok(iceLane.attribute?.includes('RTCPeerConnection.iceConnectionState'));
});

check('a client machine the samples never reported gets no lane', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  // Nothing reported signalling or gathering, so claiming a spec-default lane
  // for them would invent knowledge the samples do not carry.
  assert.equal(model.lanes.find((l) => l.label === 'Signaling'), undefined);
});

check('client transitions carry from, to and their source', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  const ice = model.transitions.filter((t) => t.machine === 'client-ice');
  assert.deepEqual(ice.map((t) => `${t.from}->${t.to}`), ['new->checking', 'checking->connected']);
  for (const t of ice) assert.equal(t.source, 'client');
  // The W3C starting state, flagged as inferred just like the SFU's.
  assert.equal(ice[0].fromInitial, true);
});

check('both ends land in one time-ordered list', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  assert.ok(model.transitions.some((t) => t.source === 'sfu'));
  assert.ok(model.transitions.some((t) => t.source === 'client'));
  for (let i = 1; i < model.transitions.length; i++) {
    assert.ok(model.transitions[i].timestamp >= model.transitions[i - 1].timestamp);
  }
});

check('a client point event becomes a marker', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  const opened = model.markers.find((mk) => mk.label === 'Peer connection opened')!;
  assert.ok(opened);
  assert.equal(opened.source, 'client');
  // Filed under the component it concerns, not into a generic events bucket.
  assert.equal(opened.component, 'connection');
});

check('ICE candidates are left out, being far too many to be useful', () => {
  const noisy = [
    clientSample(20, [
      { type: 'ICE_CANDIDATE', timestamp: sendTransport.createdAt + 20, payload: { peerConnectionId: PC_ID } },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: noisy,
    peerConnectionId: PC_ID,
  })!;
  assert.equal(model.markers.filter((mk) => mk.source === 'client').length, 0);
});

check('events naming another peer connection are ignored', () => {
  const other = [
    clientSample(20, [
      {
        type: 'ICE_CONNECTION_STATE_CHANGED',
        timestamp: sendTransport.createdAt + 20,
        payload: { peerConnectionId: 'someone-else', iceConnectionState: 'failed' },
      },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: other,
    peerConnectionId: PC_ID,
  })!;
  // Only the SFU's ICE remains — the browser reported none for this connection.
  const iceLane = model.lanes.find((l) => l.label === 'ICE')!;
  assert.ok(iceLane.segments.every((seg) => seg.source !== 'client'));
});

check('a re-announced client state is not counted as a change', () => {
  const repeated = [
    clientSample(30, [
      { type: 'ICE_CONNECTION_STATE_CHANGED', timestamp: sendTransport.createdAt + 30, payload: { peerConnectionId: PC_ID, iceConnectionState: 'connected' } },
    ]),
    clientSample(60, [
      { type: 'ICE_CONNECTION_STATE_CHANGED', timestamp: sendTransport.createdAt + 60, payload: { peerConnectionId: PC_ID, iceConnectionState: 'connected' } },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: repeated,
    peerConnectionId: PC_ID,
  })!;
  assert.equal(model.transitions.filter((t) => t.machine === 'client-ice').length, 1);
});

console.log('\nthe clock, and following a path by colour');

check('the clock starts at whichever end created its half first', () => {
  // Neither end reliably precedes the other — it depends on the signalling
  // flow — so the earlier of the SFU's `createdAt` and the browser's
  // `PEER_CONNECTION_OPENED` is what keeps the setup phase whole.
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  assert.equal(model.start, sendTransport.createdAt);
});

check('a browser that opened before the SFU allocated moves the clock back', () => {
  const earlyOpen = [
    clientSample(-250, [
      {
        type: 'PEER_CONNECTION_OPENED',
        timestamp: sendTransport.createdAt - 250,
        payload: { peerConnectionId: PC_ID },
      },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: earlyOpen,
    peerConnectionId: PC_ID,
  })!;
  assert.equal(model.start, sendTransport.createdAt - 250);
});

check('the state a peer connection opened in is reported, not inferred', () => {
  // `PEER_CONNECTION_OPENED` carries iceGatheringState / signalingState /
  // iceConnectionState. When it does, the opening stretch is a fact.
  // Signalling, because it is the one component the SFU reports nothing about —
  // so the opening episode can only have come from the browser.
  const seeded = [
    clientSample(0, [
      {
        type: 'PEER_CONNECTION_OPENED',
        timestamp: sendTransport.createdAt,
        payload: { peerConnectionId: PC_ID, signalingState: 'have-remote-offer' },
      },
    ]),
    clientSample(30, [
      {
        type: 'SIGNALING_STATE_CHANGE',
        timestamp: sendTransport.createdAt + 30,
        payload: { peerConnectionId: PC_ID, signalingState: 'stable' },
      },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: seeded,
    peerConnectionId: PC_ID,
  })!;
  const lane = model.lanes.find((l) => l.label === 'Signaling')!;
  // The spec default is `stable`; the client said it opened mid-negotiation.
  assert.equal(lane.segments[0].state, 'have-remote-offer');
  // Not flagged as a guess, because the client said so.
  assert.equal(lane.segments[0].initial, false);
  const change = model.transitions.find((t) => t.machine === 'client-signaling')!;
  assert.equal(change.from, 'have-remote-offer');
  assert.equal(change.fromInitial, false);
});

check('the two views of one component sit together', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  const iceLane = model.lanes.find((l) => l.label === 'ICE')!;
  // Both ends' episodes share the one row rather than sitting in two.
  const sources = new Set(iceLane.segments.map((seg) => seg.source));
  assert.ok(sources.has('sfu'), [...sources].join(', '));
  assert.ok(sources.has('client'), [...sources].join(', '));
});

check('a data channel event files under SCTP', () => {
  // Neither end reports SCTP state from the browser, so the data channel is
  // the only browser-side evidence the association came up.
  const dc = [
    clientSample(50, [
      {
        type: 'DATA_CHANNEL_OPEN',
        timestamp: sendTransport.createdAt + 50,
        payload: { peerConnectionId: PC_ID, label: 'chat', readyState: 'open' },
      },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: dc,
    peerConnectionId: PC_ID,
  })!;
  const marker = model.markers.find((mk) => mk.label === 'Data channel open')!;
  assert.ok(marker);
  assert.equal(marker.component, 'sctp');
});

check('with no client events at all it is the SFU createdAt', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  assert.equal(model.start, sendTransport.createdAt);
});

check('a whole-call fallback never stretches one late transport', () => {
  // `fallbackStart` is the call's window; folding it into a minimum would drag
  // a transport created 30s in back to the call's opening.
  const model = buildTransportTimeline({
    transport: sendTransport,
    fallbackStart: sendTransport.createdAt - 30_000,
  })!;
  assert.equal(model.start, sendTransport.createdAt);
});

check('an event recorded before the preferred origin is never clipped away', () => {
  const early = [
    clientSample(-500, [
      {
        type: 'ICE_CONNECTION_STATE_CHANGED',
        timestamp: sendTransport.createdAt - 500,
        payload: { peerConnectionId: PC_ID, iceConnectionState: 'checking' },
      },
    ]),
    ...clientSamples,
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: early,
    peerConnectionId: PC_ID,
  })!;
  assert.equal(model.start, sendTransport.createdAt - 500);
});

check('a transition carries the colour of the state it left', () => {
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const ice = model.transitions.filter((t) => t.machine === 'ice');
  // The second change leaves `connected`, so its `fromColor` must be the
  // colour `connected` was painted — that chain is what makes a channel's
  // path followable down the table.
  const connectedColor = TRANSPORT_LANE_COLORS.ice.connected;
  assert.equal(ice[1].from, 'connected');
  assert.equal(ice[1].fromColor, connectedColor);
  assert.equal(ice[0].color, connectedColor);
});

check('a transition carries the payload of the event that caused it', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  const first = model.transitions.find((t) => t.machine === 'client-ice')!;
  assert.equal(first.payload?.iceConnectionState, 'checking');
  assert.equal(first.payload?.peerConnectionId, PC_ID);
});

check('the gathering lane is named ICE Gathering', () => {
  const gathering = [
    clientSample(15, [
      {
        type: 'ICE_GATHERING_STATE_CHANGED',
        timestamp: sendTransport.createdAt + 15,
        payload: { peerConnectionId: PC_ID, iceGatheringState: 'gathering' },
      },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: gathering,
    peerConnectionId: PC_ID,
  })!;
  const gatheringLane = model.lanes.find((l) => l.label === 'ICE')!;
  assert.ok(gatheringLane);
  assert.ok(gatheringLane.attribute?.includes('RTCPeerConnection.iceGatheringState'));
  // `complete`, not `completed` — that one belongs to the ICE connection state,
  // and the two are routinely confused.
  assert.ok(gatheringLane.segments.some((seg) => seg.state === 'gathering'));
});

console.log('\nspec vocabulary');

check('every state machine names the spec attribute it tracks', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  for (const lane of model.lanes) {
    // The `ICE path` row is derived from candidate-pair stats rather than from
    // a spec attribute, so it is the one row without one.
    if (lane.label === 'ICE path') continue;
    assert.ok(lane.attribute, `${lane.label} names no attribute`);
    for (const seg of lane.segments) {
      assert.ok(seg.machineLabel, `${lane.label} has an episode with no machine`);
    }
  }
});

check('the SFU rows are labelled with mediasoup enums, not W3C ones', () => {
  // mediasoup's IceState is narrower than RTCIceTransportState — no `checking`,
  // no `failed` — so calling the SFU row by the W3C name would promise states
  // it can never show.
  const model = buildTransportTimeline({ transport: sendTransport })!;
  const ice = model.lanes.find((l) => l.label === 'ICE')!;
  assert.equal(ice.attribute, 'mediasoup IceState');
  for (const seg of ice.segments) {
    assert.ok(seg.state !== 'checking' && seg.state !== 'failed', seg.state);
  }
});

check('signalling starts at stable, and only signalling does', () => {
  const signaling = [
    clientSample(20, [
      {
        type: 'SIGNALING_STATE_CHANGE',
        timestamp: sendTransport.createdAt + 20,
        payload: { peerConnectionId: PC_ID, signalingState: 'have-local-offer' },
      },
    ]),
  ];
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples: signaling,
    peerConnectionId: PC_ID,
  })!;
  const lane = model.lanes.find((l) => l.label === 'Signaling')!;
  assert.equal(lane.segments[0].state, 'stable');
  assert.equal(lane.segments[0].initial, true);
  const change = model.transitions.find((t) => t.machine === 'client-signaling')!;
  assert.equal(change.from, 'stable');
});

check('point events group apart from the state machines', () => {
  const model = buildTransportTimeline({
    transport: sendTransport,
    clientSamples,
    peerConnectionId: PC_ID,
  })!;
  // Their own filter keys, so a reader can drop the moments and keep the
  // machines — or the reverse.
  assert.ok(model.markers.some((mk) => mk.machine === 'sfu-event'));
  assert.ok(model.markers.some((mk) => mk.machine === 'client-event'));
});

console.log(`\n${passed} checks passed`);
