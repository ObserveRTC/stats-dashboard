#!/usr/bin/env node
/**
 * Write the tiny fixture archive this app is tested against.
 *
 *   node test/makeFixture.mjs
 *
 * Two clients over 60 seconds at a 5-second cadence, patch-encoded exactly the
 * way the observer writes it — first line whole, every line after it a diff.
 * Small enough to read, and shaped to exercise the cases that matter:
 *
 *   client-a  clean audio and video, nominated pair with low RTT
 *   client-b  5 seconds of 12% inbound loss and 600ms RTT (a network positive),
 *             one video freeze delta (a video observation whose participant
 *             time stays unknown), a counter reset at 35s, and a 20-second gap
 *             with no samples at all
 *
 * So a correct processor reports: network impairment for client-b, measured
 * video freeze but no video participant-impairment time, an interval dropped at
 * the reset, and the gap contributing nothing rather than an interpolation.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'fixtures', 'tiny-call', 'demo-room', 'call-0001');

const START = Date.UTC(2026, 9, 15, 10, 0, 0);
const STEP = 5000;

/** A full sample at tick 0; later ticks are diffs against the previous one. */
function sampleAt(tick, { clientId, loss = 0, rtt = 0.02, freezeDelta = 0, resetAt = null }) {
  const at = START + tick * STEP;
  const packets = 250 * (tick + 1);
  const lost = Math.round(packets * loss);
  const reset = resetAt !== null && tick >= resetAt;
  // After a reset the byte counter restarts, which is what makes the first
  // post-reset interval undifferenceable.
  const bytes = reset ? 40_000 * (tick - resetAt + 1) : 40_000 * (tick + 1);
  // The ICE pair's counters are NOT reset. A track restarting does not restart
  // the transport, and keeping them monotonic is what lets the test show that a
  // reset drops only the metrics whose counter actually reset.
  const transportBytes = 40_000 * (tick + 1);

  return {
    timestamp: at,
    callId: 'call-0001',
    clientId,
    attachments: { roomId: 'demo-room', displayName: clientId, browserName: 'Chrome', operationSystem: 'macOS' },
    peerConnections: [
      {
        peerConnectionId: `${clientId}-pc1`,
        inboundRtps: [
          {
            id: `${clientId}-in-audio`,
            timestamp: at,
            kind: 'audio',
            ssrc: 1111,
            transportId: `${clientId}-t1`,
            packetsReceived: packets - lost,
            packetsLost: lost,
            bytesReceived: bytes,
            jitter: 0.004,
            totalSamplesReceived: 48_000 * (tick + 1),
            concealedSamples: 240 * (tick + 1),
            silentConcealedSamples: 120 * (tick + 1),
            jitterBufferDelay: 0.03 * (tick + 1),
            jitterBufferEmittedCount: 48_000 * (tick + 1),
          },
          {
            id: `${clientId}-in-video`,
            timestamp: at,
            kind: 'video',
            ssrc: 2222,
            transportId: `${clientId}-t1`,
            packetsReceived: packets * 4 - lost * 4,
            packetsLost: lost * 4,
            bytesReceived: bytes * 20,
            jitter: 0.008,
            framesPerSecond: 30,
            framesDecoded: 150 * (tick + 1),
            totalDecodeTime: 0.9 * (tick + 1),
            totalFreezesDuration: freezeDelta * Math.max(0, tick - 2),
            freezeCount: freezeDelta > 0 && tick > 2 ? 1 : 0,
          },
        ],
        outboundRtps: [
          {
            id: `${clientId}-out-audio`,
            timestamp: at,
            kind: 'audio',
            ssrc: 3333,
            transportId: `${clientId}-t1`,
            packetsSent: packets,
            bytesSent: bytes,
          },
          {
            id: `${clientId}-out-video`,
            timestamp: at,
            kind: 'video',
            ssrc: 4444,
            transportId: `${clientId}-t1`,
            packetsSent: packets * 4,
            bytesSent: bytes * 18,
            framesEncoded: 150 * (tick + 1),
            totalEncodeTime: 1.2 * (tick + 1),
            qualityLimitationDurations: {
              none: 4 * (tick + 1),
              cpu: 0.4 * (tick + 1),
              bandwidth: 0.6 * (tick + 1),
              other: 0,
            },
          },
        ],
        remoteInboundRtps: [
          {
            id: `${clientId}-remote-audio`,
            timestamp: at,
            kind: 'audio',
            ssrc: 3333,
            localId: `${clientId}-out-audio`,
            packetsReceived: packets - lost,
            packetsLost: lost,
            roundTripTime: rtt,
          },
        ],
        iceTransports: [{ id: `${clientId}-t1`, timestamp: at, state: 'connected' }],
        iceCandidatePairs: [
          {
            id: `${clientId}-pair-1`,
            timestamp: at,
            transportId: `${clientId}-t1`,
            state: 'succeeded',
            nominated: true,
            currentRoundTripTime: rtt,
            bytesSent: transportBytes,
            bytesReceived: transportBytes,
            packetsSent: packets,
            packetsReceived: packets,
            requestsSent: 10 * (tick + 1),
          },
        ],
      },
    ],
  };
}

/** Minimal diff of two samples, with null for a removed key. */
function diff(prev, next) {
  if (next === null || typeof next !== 'object' || Array.isArray(next)) {
    return JSON.stringify(prev) === JSON.stringify(next) ? undefined : next;
  }
  const out = {};
  for (const [key, value] of Object.entries(next)) {
    if (Array.isArray(value)) {
      // Whole elements, not diffs of them. The decoder replaces an array value
      // rather than merging it positionally, so a partial element would drop
      // every field it left out. See src/samplePatch.mjs.
      if (JSON.stringify(prev?.[key]) !== JSON.stringify(value)) out[key] = value;
      continue;
    }
    if (value !== null && typeof value === 'object') {
      const nested = diff(prev?.[key], value);
      if (nested !== undefined) out[key] = nested;
      continue;
    }
    if (prev?.[key] !== value) out[key] = value;
  }
  for (const key of Object.keys(prev ?? {})) {
    if (!(key in next)) out[key] = null;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

function jsonl(samples) {
  const lines = [JSON.stringify(samples[0])];
  for (let i = 1; i < samples.length; i += 1) {
    lines.push(JSON.stringify(diff(samples[i - 1], samples[i]) ?? {}));
  }
  return lines.join('\n') + '\n';
}

mkdirSync(OUT, { recursive: true });

// client-a: 12 ticks, clean.
const a = Array.from({ length: 12 }, (_, t) => sampleAt(t, { clientId: 'client-a' }));

// client-b: loss and high RTT from tick 1, a freeze from tick 3, a byte-counter
// reset at tick 7, and ticks 9-10 omitted entirely to make a 20-second gap.
const b = Array.from({ length: 12 }, (_, t) =>
  sampleAt(t, {
    clientId: 'client-b',
    loss: t >= 1 && t <= 2 ? 0.12 : 0.001,
    rtt: t >= 1 && t <= 2 ? 0.6 : 0.03,
    freezeDelta: t >= 3 ? 0.4 : 0,
    resetAt: 7,
  }),
).filter((_, t) => t !== 9 && t !== 10);

writeFileSync(join(OUT, 'client-a.jsonl'), jsonl(a));
writeFileSync(join(OUT, 'client-b.jsonl'), jsonl(b));

writeFileSync(
  join(OUT, 'call-summary.json'),
  JSON.stringify(
    {
      callId: 'call-0001',
      attachments: { roomId: 'demo-room', clients: { 'client-a': {}, 'client-b': {} } },
      clients: { clientIds: ['client-a', 'client-b'], peak: 2, joined: 2, left: 2 },
      scores: { samples: 22, median: 4.1, min: 2.2, max: 4.8 },
      startedAt: START,
      endedAt: START + 11 * STEP,
      durationInMs: 11 * STEP,
    },
    null,
    2,
  ),
);

console.log(`wrote fixture to ${OUT}`);
console.log(`  client-a.jsonl   ${a.length} samples, clean`);
console.log(`  client-b.jsonl   ${b.length} samples, loss + high RTT + freeze + reset + 20s gap`);
console.log('  call-summary.json');
