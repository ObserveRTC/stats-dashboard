/**
 * End-to-end check against a real capture.
 *
 *   node --experimental-strip-types scripts/realFixture.test.ts
 *
 * `scripts/fixtures/` holds an unmodified `call-summary.json` and
 * `mediasoup-router-<id>.json` from a two-client call. The router sample tags
 * nothing with a client id (`"attachments": {}`), which is the case that
 * matters: every mapping below has to be earned from the RTP stats or from the
 * shape of the call.
 *
 * The call, for reference:
 *
 *   client A  send 78f6007d  (audio 8f52a3c5 ssrc 966900604, video 158bd4ec r0/r1)
 *             recv b3679042  (4 consumers, all of B's producers)
 *   client B  send 2f85be88  (4 producers)
 *             recv bd29f0a8  (2 consumers, both of A's producers)
 *   shared    direct daff539e  (dataConsumers only)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mergeCallSummaries, normalizeCallSummary } from '../src/schema/CallSummary.ts';
import {
  buildClientServerData,
  computeRouterCoverage,
} from '../src/utils/routerServerData.ts';

const here = dirname(fileURLToPath(import.meta.url));
const readFixture = (name: string) =>
  JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));

const rawSummary = readFixture('call-summary.json');
const rawRouter = readFixture('mediasoup-router.json');

const ROUTER_ID = '16b4864a-249b-43ab-9ed7-a50cdb73a2c7';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routerSamples = new Map<string, any>([[ROUTER_ID, rawRouter]]);

const A = 'bbf472c0-3f0f-4450-8c4c-224821885d8c';
const B = 'a5d2d139-5835-4fa1-b480-ca57f8cab6ca';

const A_SEND = '78f6007d-9e72-4682-bc73-bf4b7f5185bf';
const A_RECV = 'b3679042-a6c2-4047-99cc-5d52ff17adec';
const B_SEND = '2f85be88-2a7a-4969-8ad0-f4a2ead78091';
const B_RECV = 'bd29f0a8-c9ee-41e3-8622-e4c6ed8b2219';

const A_AUDIO = '8f52a3c5-de9f-43b9-bcbc-203b3d719ed5';
const A_VIDEO = '158bd4ec-a39b-4772-b3b9-9a36078fa5bc';
const B_PRODUCERS = [
  '448c4b35-98c4-47a3-87cf-8a85da2d7c21',
  '718889ee-9ffb-49f0-bc04-f614fdce9a7b',
  'fe2758a3-7519-4d75-9a7f-7517b1ecb4df',
  '4a68f5c8-843a-42dd-9e6f-06241ca73c54',
];

/* ── stat builders ─────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stats(outbound: any[], inbound: any[]): any {
  const toRecord = (arr: unknown[], prefix: string) =>
    Object.fromEntries(arr.map((e, i) => [`${prefix}${i}`, e]));
  return {
    peerConnections: [],
    timeSeries: {
      outboundRtp: toRecord(outbound, 'out-'),
      inboundRtp: toRecord(inbound, 'in-'),
    },
    allObjects: { outboundRtps: new Map(), inboundRtps: new Map() },
    scores: { perTrack: {} },
  };
}

/** What a client that tags nothing reports: SSRCs and RIDs, no ids at all. */
const untaggedA = stats(
  [
    { kind: 'audio', ssrc: 966900604, values: [{ timestamp: 1787297242000, ssrc: 966900604 }] },
    { kind: 'video', rid: 'r0', values: [{ timestamp: 1787297242000, rid: 'r0' }] },
    { kind: 'video', rid: 'r1', values: [{ timestamp: 1787297242000, rid: 'r1' }] },
  ],
  // Inbound RTP names the producer it is receiving, which observer-js fills in
  // from the consumer's producerId even when the app tags no track.
  B_PRODUCERS.map((pid) => ({ producerId: pid, values: [{ timestamp: 1787297246000 }] })),
);

/** What a fully instrumented client reports: explicit producer / consumer ids. */
const taggedA = stats(
  [
    { producerId: A_AUDIO, kind: 'audio', ssrc: 966900604, values: [{ timestamp: 1787297242000 }] },
    { producerId: A_VIDEO, kind: 'video', rid: 'r0', values: [{ timestamp: 1787297242000 }] },
  ],
  [
    { consumerId: '7d320563-6e8b-43fd-8030-b905cd94fcc5', values: [{ timestamp: 1787297246000 }] },
    { consumerId: 'a3669466-617f-4a86-ac2e-a88ae12e9e30', values: [{ timestamp: 1787297246000 }] },
    { consumerId: '2eb3bc2c-9480-46bd-a72e-5bf9192b17a3', values: [{ timestamp: 1787297251000 }] },
    { consumerId: 'c0128d7e-689d-419b-988e-0182fb01891f', values: [{ timestamp: 1787297251000 }] },
  ],
);

/** Client B, untagged, from the other side of the same call. */
const untaggedB = stats(
  [
    { kind: 'audio', ssrc: 2852710241, values: [{ timestamp: 1787297246000, ssrc: 2852710241 }] },
    { kind: 'video', ssrc: 2636516491, values: [{ timestamp: 1787297251000, ssrc: 2636516491 }] },
    { kind: 'audio', ssrc: 3603680898, values: [{ timestamp: 1787297251000, ssrc: 3603680898 }] },
  ],
  [A_AUDIO, A_VIDEO].map((pid) => ({ producerId: pid, values: [{ timestamp: 1787297246000 }] })),
);

/* ── harness ───────────────────────────────────────────── */

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}
const ids = (arr: { id: string }[]) => arr.map((o) => o.id).sort();

console.log('call-summary.json');

check('the real summary normalizes', () => {
  const s = normalizeCallSummary(rawSummary);
  assert.ok(s);
  assert.equal(s.roomId, 'chess');
  assert.equal(s.callId, '08d57413-8d52-4ff4-bdb7-4837b1ed2cd8');
  // This is the field whose absence left the whole SFU view empty.
  assert.deepEqual(s.routerIds, [ROUTER_ID]);
  assert.deepEqual(Object.keys(s.clients).sort(), [B, A].sort());
  assert.equal(s.clients[A].displayName, 'Guest');
  assert.equal(s.clients[B].displayName, 'Guest');
  assert.equal(s.clientCounts?.peak, 2);
  assert.equal(s.numberOfClientIssues, 10);
  assert.equal(s.startedAt, 1787297239302);
  assert.equal(s.endedAt, 1787297353772);
  assert.equal(s.durationInMs, 114470);
  assert.ok(Math.abs((s.scores?.median ?? 0) - 3.7541666666666664) < 1e-9);
  assert.deepEqual(s.clientsUsedTurn, []);
});

check('the real summary passes through the merge untouched', () => {
  // Every summary now goes through `mergeCallSummaries`, including the single
  // `call-summary.json` a one-SFU call writes. That path must not lose a field
  // — least of all the median, which a multi-SFU merge deliberately drops.
  const direct = normalizeCallSummary(rawSummary)!;
  const merged = mergeCallSummaries([{ summary: direct, key: 'call-summary.json' }])!;
  assert.equal(merged.roomId, direct.roomId);
  assert.equal(merged.callId, direct.callId);
  assert.deepEqual(merged.routerIds, direct.routerIds);
  assert.deepEqual(Object.keys(merged.clients).sort(), Object.keys(direct.clients).sort());
  assert.equal(merged.clients[A].displayName, 'Guest');
  assert.equal(merged.scores?.median, direct.scores?.median);
  assert.equal(merged.numberOfClientIssues, direct.numberOfClientIssues);
  assert.equal(merged.startedAt, direct.startedAt);
  assert.equal(merged.endedAt, direct.endedAt);
  assert.equal(merged.durationInMs, direct.durationInMs);
  assert.equal(merged.clientCounts?.peak, 2);
  assert.equal(merged.unmergeable, undefined);
  assert.equal(merged.sources?.length, 1);
});

check('counts are not mistaken for a per-client map', () => {
  const s = normalizeCallSummary(rawSummary)!;
  // `clients: {clientIds, peak, joined, left}` must not become four "clients"
  // named clientIds / peak / joined / left.
  assert.ok(!('peak' in s.clients));
  assert.ok(!('clientIds' in s.clients));
});

check('the older flat format still normalizes', () => {
  const s = normalizeCallSummary({
    roomId: 'legacy',
    routerIds: ['r1'],
    clients: { c1: { displayName: 'Ann', score: 4.2, turnConnected: true } },
  })!;
  assert.equal(s.roomId, 'legacy');
  assert.deepEqual(s.routerIds, ['r1']);
  assert.equal(s.clients.c1.displayName, 'Ann');
  assert.equal(s.clients.c1.score, 4.2);
});

check('junk is rejected rather than half-parsed', () => {
  assert.equal(normalizeCallSummary(null), null);
  assert.equal(normalizeCallSummary('nope'), null);
  assert.equal(normalizeCallSummary([1, 2]), null);
  const bare = normalizeCallSummary({})!;
  assert.deepEqual(bare.routerIds, []);
  assert.deepEqual(bare.clients, {});
});

console.log('\nrouter → client, untagged call');

check('client A: producers found by SSRC, simulcast video via its transport', () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  assert.deepEqual(ids(sd.producers), [A_VIDEO, A_AUDIO].sort());
  // The audio producer lists ssrc 966900604 — an exact join.
  assert.equal(sd.producers.find((p) => p.id === A_AUDIO)!.matchedBy, 'rtp');
  // The simulcast video producer lists no SSRC at all, only rids; it is reached
  // because it shares the transport the audio producer just proved is A's.
  assert.equal(sd.producers.find((p) => p.id === A_VIDEO)!.matchedBy, 'transport');
  assert.deepEqual(sd.routerIds, [ROUTER_ID]);
});

check("client A: both of A's transports resolve, B's do not", () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  assert.deepEqual(ids(sd.transports), [A_SEND, A_RECV].sort());
  const send = sd.transports.find((t) => t.id === A_SEND)!;
  const recv = sd.transports.find((t) => t.id === A_RECV)!;
  assert.equal(send.role, 'send');
  assert.equal(recv.role, 'recv');
  // Both were reached through objects the client's RTP identified, not deduced.
  assert.equal(send.matchedBy, 'transport');
  assert.equal(recv.matchedBy, 'transport');
});

check("client A: consumers are all four of B's streams", () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  assert.equal(sd.consumers.length, 4);
  assert.deepEqual(sd.consumers.map((c) => c.producerId).sort(), [...B_PRODUCERS].sort());
  // In a two-party call each producer has exactly one consumer, so naming the
  // producer in the inbound RTP identifies the consumer outright.
  for (const c of sd.consumers) assert.equal(c.matchedBy, 'rtp');
});

check('client B maps symmetrically from the other side', () => {
  const sd = buildClientServerData(B, routerSamples, untaggedB);
  assert.deepEqual(ids(sd.transports), [B_SEND, B_RECV].sort());
  assert.equal(sd.producers.length, 4);
  assert.equal(sd.consumers.length, 2);
  assert.deepEqual(sd.consumers.map((c) => c.producerId).sort(), [A_VIDEO, A_AUDIO].sort());
});

check("neither client claims the other's objects", () => {
  const a = buildClientServerData(A, routerSamples, untaggedA);
  const b = buildClientServerData(B, routerSamples, untaggedB);
  const overlap = ids(a.producers).filter((id) => ids(b.producers).includes(id));
  assert.deepEqual(overlap, []);
  const tOverlap = ids(a.transports).filter((id) => ids(b.transports).includes(id));
  assert.deepEqual(tOverlap, []);
});

check('the shared direct transport is claimed by nobody', () => {
  const a = buildClientServerData(A, routerSamples, untaggedA);
  const b = buildClientServerData(B, routerSamples, untaggedB);
  const DIRECT = 'daff539e-df56-4e2a-99f0-d1668407aef2';
  assert.ok(!ids(a.transports).includes(DIRECT));
  assert.ok(!ids(b.transports).includes(DIRECT));
});

check('data channels follow the transports', () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  assert.deepEqual(ids(sd.dataProducers), ['36f589b9-5d01-4ec6-8295-571264fde4d9']);
  // A's receive transport also carries a dataConsumer of its own dataProducer.
  assert.deepEqual(ids(sd.dataConsumers), []);
  const sdB = buildClientServerData(B, routerSamples, untaggedB);
  assert.deepEqual(ids(sdB.dataProducers), ['d75ac77e-cf79-4b49-97b4-0a5bdc420e5d']);
  assert.deepEqual(ids(sdB.dataConsumers), ['28267137-108b-4375-b9c2-46907e45488a']);
});

console.log('\nrouter → client, fully tagged call');

check('explicit ids win and every object is confirmed', () => {
  const sd = buildClientServerData(A, routerSamples, taggedA);
  assert.deepEqual(ids(sd.transports), [A_SEND, A_RECV].sort());
  assert.equal(sd.consumers.length, 4);
  for (const c of sd.consumers) assert.equal(c.matchedBy, 'rtp');
  assert.equal(sd.producers.find((p) => p.id === A_AUDIO)!.matchedBy, 'rtp');
  // Nothing had to be deduced this time.
  const cov = computeRouterCoverage(sd, taggedA, routerSamples);
  assert.equal(cov.matchCounts.inferred, 0);
  assert.deepEqual(cov.orphanProducerIds, []);
  assert.deepEqual(cov.orphanConsumerIds, []);
});

console.log('\nreshaping');

check('codec parameters survive the round trip', () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  const audio = sd.producers.find((p) => p.id === A_AUDIO)!;
  assert.equal(audio.codecInfo?.mimeType, 'audio/opus');
  assert.equal(audio.codecInfo?.channels, 2);
  assert.equal(
    audio.codecInfo?.sdpFmtpLine,
    'minptime=10;useinbandfec=1;sprop-stereo=0;usedtx=0;ptime=20',
  );
});

check('the tuple reads localIp as well as localAddress', () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  const send = sd.transports.find((t) => t.id === A_SEND)!;
  assert.equal(send.tuple?.localIp, '192.168.50.156');
  assert.equal(send.tuple?.localPort, 40080);
  assert.equal(send.tuple?.remoteIp, '192.168.50.1');
  assert.equal(send.tuple?.remotePort, 58583);
  assert.equal(send.tuple?.protocol, 'udp');
});

check('transport history keeps the tuple payload of iceselectedtuple-changed', () => {
  const sd = buildClientServerData(A, routerSamples, untaggedA);
  const send = sd.transports.find((t) => t.id === A_SEND)!;
  assert.equal(send.history?.length, 8);
  const tupleEvent = send.history!.find((h) => h.event === 'iceselectedtuple-changed')!;
  assert.equal(tupleEvent.payload?.remotePort, 58583);
  assert.equal(send.connectedAt, 1787297241403);
  assert.equal(send.closedAt, 1787297356141);
});

check('a consumer names the client on the far end', () => {
  // A's producers are learned from A's own RTP, then handed to B's view.
  const learned = new Map<string, string>([
    [A_AUDIO, A],
    [A_VIDEO, A],
  ]);
  const sdB = buildClientServerData(B, routerSamples, untaggedB, {
    producerOwnership: learned,
  });
  for (const c of sdB.consumers) assert.equal(c.producingClientId, A);
  // And it decodes the codec of the producer it is consuming.
  const audioConsumer = sdB.consumers.find((c) => c.producerId === A_AUDIO)!;
  assert.equal(audioConsumer.codecInfo?.mimeType, 'audio/opus');
});

check('the paused producer keeps its history', () => {
  const sd = buildClientServerData(B, routerSamples, untaggedB);
  const paused = sd.producers.find((p) => p.id === '448c4b35-98c4-47a3-87cf-8a85da2d7c21')!;
  assert.deepEqual(paused.history, [{ timestamp: 1787297247680, event: 'pause' }]);
});

console.log(`\n${passed} checks passed`);
