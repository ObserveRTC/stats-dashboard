/**
 * Self-test for the router → client mapper.
 *
 *   node --experimental-strip-types scripts/routerServerData.test.ts
 *
 * Uses a synthetic two-client call: client-A produces audio + video, client-B
 * consumes both. Nothing in the fixture is tagged with a client id except one
 * transport, so the test exercises all three attribution signals.
 */

import assert from 'node:assert/strict';
import {
  buildClientServerData,
  buildProducerOwnership,
  buildRouterIndex,
  collectClientRtpIds,
  computeRouterCoverage,
  findRouterProducer,
} from '../src/utils/routerServerData.ts';

const T0 = 1_700_000_000_000;

/* ── fixture ───────────────────────────────────────────── */

const routerSample = {
  routerId: 'router-1',
  attachments: { sfuId: 'sfu-eu-1', region: 'eu-central' },
  createdAt: T0,
  transports: [
    // A's send transport — tagged by the SFU.
    {
      id: 'tr-A',
      type: 'webrtc',
      createdAt: T0,
      connectedAt: T0 + 500,
      attachments: { clientId: 'client-A' },
      tuple: { localAddress: '10.0.0.1', localPort: 40000, remoteIp: '1.2.3.4', remotePort: 50000, protocol: 'udp' },
      history: [{ type: 'dtlsstate-changed-to-connected', timestamp: T0 + 500 }],
    },
    // B's recv transport — untagged; must be reached via consumer RTP.
    {
      id: 'tr-B',
      type: 'webrtc',
      createdAt: T0 + 1000,
      attachments: {},
      history: [{ type: 'dtlsstate-changed-to-connected', timestamp: T0 + 1400 }],
    },
    // Another client entirely — must never leak into A's or B's view.
    {
      id: 'tr-C',
      type: 'webrtc',
      createdAt: T0 + 2000,
      attachments: { clientId: 'client-C' },
      history: [],
    },
  ],
  producers: [
    {
      id: 'prod-audio',
      transportId: 'tr-A',
      createdAt: T0 + 600,
      kind: 'audio',
      codecInfo: { mimeType: 'audio/opus', payloadType: 111, clockRate: 48000, channels: 2, parameters: { minptime: 10, useinbandfec: 1 } },
      history: [{ type: 'pause', timestamp: T0 + 5000 }, { type: 'resume', timestamp: T0 + 8000 }],
    },
    {
      id: 'prod-video',
      transportId: 'tr-A',
      createdAt: T0 + 700,
      kind: 'video',
      codecInfo: { mimeType: 'video/VP8', payloadType: 96, clockRate: 90000 },
      ssrcs: [1111, 2222],
      rids: ['q', 'h'],
      history: [],
    },
    // Never carried media, and lives on A's transport → transport-inferred.
    {
      id: 'prod-screen',
      transportId: 'tr-A',
      createdAt: T0 + 900,
      closedAt: T0 + 1000,
      kind: 'video',
      codecInfo: { mimeType: 'video/VP8', payloadType: 96, clockRate: 90000 },
      history: [],
    },
    { id: 'prod-other', transportId: 'tr-C', createdAt: T0 + 2100, kind: 'audio', codecInfo: { mimeType: 'audio/opus', payloadType: 111, clockRate: 48000 }, history: [] },
  ],
  consumers: [
    { id: 'cons-audio', producerId: 'prod-audio', transportId: 'tr-B', createdAt: T0 + 1500, kind: 'audio', history: [] },
    { id: 'cons-video', producerId: 'prod-video', transportId: 'tr-B', createdAt: T0 + 1600, kind: 'video', history: [{ type: 'producerPaused', timestamp: T0 + 5000 }] },
    { id: 'cons-other', producerId: 'prod-other', transportId: 'tr-C', createdAt: T0 + 2200, kind: 'audio', history: [] },
  ],
  dataProducers: [
    { id: 'dp-1', transportId: 'tr-A', createdAt: T0 + 800, label: 'chat', protocol: '' },
  ],
  dataConsumers: [
    { id: 'dc-1', dataProducerId: 'dp-1', transportId: 'tr-B', createdAt: T0 + 1700, label: 'chat', protocol: '' },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routerSamples = new Map<string, any>([['router-1', routerSample]]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function statsFor(outbound: Record<string, any>, inbound: Record<string, any>): any {
  return {
    peerConnections: [],
    timeSeries: { outboundRtp: outbound, inboundRtp: inbound },
    allObjects: { outboundRtps: new Map(), inboundRtps: new Map() },
    scores: { perTrack: {} },
  };
}

const statsA = statsFor(
  {
    's1': { producerId: 'prod-audio', kind: 'audio', values: [{ timestamp: T0 + 1000 }] },
    's2': { producerId: 'prod-video', kind: 'video', values: [{ timestamp: T0 + 1000 }] },
    // An outbound stream the router knows nothing about.
    's3': { producerId: 'prod-ghost', kind: 'video', values: [{ timestamp: T0 + 1000 }] },
  },
  {},
);

const statsB = statsFor(
  {},
  {
    'r1': { consumerId: 'cons-audio', kind: 'audio', values: [{ timestamp: T0 + 2000 }] },
    'r2': { consumerId: 'cons-video', kind: 'video', values: [{ timestamp: T0 + 2000 }] },
  },
);

/* ── tests ─────────────────────────────────────────────── */

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log('routerServerData');

check('client A gets its producers, transport and data producer', () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  assert.deepEqual(sd.producers.map((p) => p.id).sort(), ['prod-audio', 'prod-screen', 'prod-video']);
  assert.deepEqual(sd.transports.map((t) => t.id), ['tr-A']);
  assert.deepEqual(sd.dataProducers.map((d) => d.id), ['dp-1']);
  assert.deepEqual(sd.routerIds, ['router-1']);
  assert.deepEqual(sd.sfuIds, ['sfu-eu-1']);
});

check('attribution signals are recorded and ranked', () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  const by = Object.fromEntries(sd.producers.map((p) => [p.id, p.matchedBy]));
  assert.equal(by['prod-audio'], 'rtp');
  assert.equal(by['prod-video'], 'rtp');
  // Never carried media — only reachable through the transport.
  assert.equal(by['prod-screen'], 'transport');
  // Explicit attachment beats the transport inference.
  assert.equal(sd.transports[0].matchedBy, 'attachment');
});

check("another client's objects never leak in", () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  const ids = [...sd.producers, ...sd.consumers, ...sd.transports].map((o) => o.id);
  assert.ok(!ids.includes('prod-other'));
  assert.ok(!ids.includes('cons-other'));
  assert.ok(!ids.includes('tr-C'));
});

check('client B is reached through consumer RTP alone', () => {
  const sd = buildClientServerData('client-B', routerSamples, statsB);
  assert.deepEqual(sd.consumers.map((c) => c.id).sort(), ['cons-audio', 'cons-video']);
  // tr-B carries no client id, so it can only be inherited from the consumers.
  assert.deepEqual(sd.transports.map((t) => t.id), ['tr-B']);
  assert.equal(sd.transports[0].matchedBy, 'transport');
  assert.equal(sd.transports[0].role, 'recv');
  // The data consumer rides the same transport.
  assert.deepEqual(sd.dataConsumers.map((d) => d.id), ['dc-1']);
});

check('producer ownership resolves the far end of a consumer', () => {
  // Nothing tags prod-audio, so ownership has to come from A's own RTP.
  const learned = new Map<string, string>();
  for (const id of collectClientRtpIds(statsA).producerIds) learned.set(id, 'client-A');
  const ownership = buildProducerOwnership(buildRouterIndex(routerSamples), learned);

  const sd = buildClientServerData('client-B', routerSamples, statsB, { producerOwnership: ownership });
  const audio = sd.consumers.find((c) => c.id === 'cons-audio')!;
  assert.equal(audio.producingClientId, 'client-A');
  // The consumer inherits the codec of the producer it is decoding.
  assert.equal(audio.codecInfo?.mimeType, 'audio/opus');
});

check('codec parameters are rebuilt into an fmtp line', () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  const audio = sd.producers.find((p) => p.id === 'prod-audio')!;
  assert.equal(audio.codecInfo?.sdpFmtpLine, 'minptime=10;useinbandfec=1');
  assert.equal(audio.codecInfo?.channels, 2);
});

check('history is converted to {timestamp, event} and sorted', () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  const audio = sd.producers.find((p) => p.id === 'prod-audio')!;
  assert.deepEqual(audio.history, [
    { timestamp: T0 + 5000, event: 'pause' },
    { timestamp: T0 + 8000, event: 'resume' },
  ]);
});

check('transport tuple is flattened and connectedAt derived', () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  const tr = sd.transports[0];
  assert.deepEqual(tr.tuple, {
    localIp: '10.0.0.1', localPort: 40000, remoteIp: '1.2.3.4', remotePort: 50000, protocol: 'udp',
  });
  assert.equal(tr.connectedAt, T0 + 500);
  assert.equal(tr.role, 'send');

  const sdB = buildClientServerData('client-B', routerSamples, statsB);
  // No connectedAt field on tr-B — must fall back to the DTLS history event.
  assert.equal(sdB.transports[0].connectedAt, T0 + 1400);
});

check('coverage reports both kinds of gap', () => {
  const sd = buildClientServerData('client-A', routerSamples, statsA);
  const cov = computeRouterCoverage(sd, statsA, routerSamples);
  assert.deepEqual(cov.producersWithoutRtp.map((p) => p.id), ['prod-screen']);
  assert.deepEqual(cov.orphanProducerIds, ['prod-ghost']);
  assert.equal(cov.matchCounts.attachment, 1);
  assert.equal(cov.matchCounts.rtp, 2);
  // 2 of 3 producers confirmed, no consumers.
  assert.ok(cov.confirmedRatio != null && Math.abs(cov.confirmedRatio - 2 / 3) < 1e-9);
});

check('empty inputs produce a well-formed empty result', () => {
  const sd = buildClientServerData('client-A', new Map(), null);
  assert.equal(sd.empty, true);
  assert.deepEqual(sd.producers, []);
  assert.deepEqual(sd.routerIds, []);
  assert.equal(sd.createdAt, 0);
  assert.equal(sd.closedAt, undefined);
});

check('a client with no router match yields an empty view', () => {
  const sd = buildClientServerData('client-unknown', routerSamples, statsFor({}, {}));
  assert.equal(sd.empty, true);
});

check('findRouterProducer reaches producers of other clients', () => {
  const p = findRouterProducer(routerSamples, 'prod-other');
  assert.equal(p?.kind, 'audio');
  assert.equal(p?.routerId, 'router-1');
  assert.equal(findRouterProducer(routerSamples, 'nope'), null);
});

/* ── topology inference: three clients, every producer multiply consumed ── */

console.log('\ntopology inference');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mesh(clients: string[]): any {
  // Each client gets a send transport with one audio producer, and a receive
  // transport consuming every other client's producer.
  const producers = clients.map((c, i) => ({
    id: `p-${c}`,
    transportId: `t-${c}-send`,
    createdAt: T0 + i,
    kind: 'audio',
    codecInfo: { mimeType: 'audio/opus', payloadType: 111, clockRate: 48000 },
    ssrcs: [1000 + i],
    history: [],
  }));
  const consumers = clients.flatMap((c) =>
    clients
      .filter((other) => other !== c)
      .map((other) => ({
        id: `c-${c}-from-${other}`,
        producerId: `p-${other}`,
        transportId: `t-${c}-recv`,
        createdAt: T0 + 100,
        kind: 'audio',
        history: [],
      })),
  );
  const transports = clients.flatMap((c) => [
    { id: `t-${c}-send`, type: 'webrtc', createdAt: T0, attachments: {}, history: [] },
    { id: `t-${c}-recv`, type: 'webrtc', createdAt: T0, attachments: {}, history: [] },
  ]);
  return {
    routerId: 'mesh',
    attachments: {},
    createdAt: T0,
    producers,
    consumers,
    transports,
    dataProducers: [],
    dataConsumers: [],
  };
}

check('the receive transport is deduced when no consumer is identifiable', () => {
  const clients = ['A', 'B', 'C'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const samples = new Map<string, any>([['mesh', mesh(clients)]]);

  // A tags nothing: one SSRC out, and the producers it receives in. Every
  // producer here has two consumers, so the unique-consumer shortcut cannot
  // fire — only the topology deduction can.
  const statsA = statsFor(
    { 'o1': { kind: 'audio', ssrc: 1000, values: [{ timestamp: T0 + 200, ssrc: 1000 }] } },
    {
      'i1': { producerId: 'p-B', values: [{ timestamp: T0 + 300 }] },
      'i2': { producerId: 'p-C', values: [{ timestamp: T0 + 300 }] },
    },
  );

  const sd = buildClientServerData('A', samples, statsA);
  assert.deepEqual(sd.transports.map((t) => t.id).sort(), ['t-A-recv', 't-A-send']);
  assert.equal(sd.transports.find((t) => t.id === 't-A-recv')!.matchedBy, 'inferred');
  assert.deepEqual(sd.consumers.map((c) => c.producerId).sort(), ['p-B', 'p-C']);
  assert.deepEqual(sd.producers.map((p) => p.id), ['p-A']);
});

check('an ambiguous topology is left unmapped rather than guessed', () => {
  // B and C are pure listeners of A, so their receive transports are
  // indistinguishable from each other. Nothing should be claimed.
  const router = {
    routerId: 'listeners',
    attachments: {},
    createdAt: T0,
    producers: [
      { id: 'p-A', transportId: 't-A-send', createdAt: T0, kind: 'audio', codecInfo: { mimeType: 'audio/opus', payloadType: 111, clockRate: 48000 }, ssrcs: [7], history: [] },
    ],
    consumers: [
      { id: 'c-B', producerId: 'p-A', transportId: 't-B-recv', createdAt: T0 + 10, kind: 'audio', history: [] },
      { id: 'c-C', producerId: 'p-A', transportId: 't-C-recv', createdAt: T0 + 10, kind: 'audio', history: [] },
    ],
    transports: [
      { id: 't-A-send', type: 'webrtc', createdAt: T0, attachments: {}, history: [] },
      { id: 't-B-recv', type: 'webrtc', createdAt: T0, attachments: {}, history: [] },
      { id: 't-C-recv', type: 'webrtc', createdAt: T0, attachments: {}, history: [] },
    ],
    dataProducers: [],
    dataConsumers: [],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const samples = new Map<string, any>([['listeners', router]]);

  const statsB = statsFor({}, { 'i1': { producerId: 'p-A', values: [{ timestamp: T0 + 50 }] } });
  const sd = buildClientServerData('B', samples, statsB);
  assert.equal(sd.empty, true);
});

console.log(`\n${passed} checks passed`);
