/**
 * The router's own account of what it held.
 *
 *   node --experimental-strip-types scripts/routerEntityTimeline.test.ts
 *
 * Uses the real router sample in `scripts/fixtures/`. Each producer, consumer
 * and data channel is a simple state machine — one state at a time, changed by
 * named events — so each is one lane, and the interesting part is that the two
 * ways a consumer can fall silent stay apart: paused here, or paused at the
 * producer.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildRouterEntityTimeline } from '../src/utils/routerEntityTimeline.ts';

const here = dirname(fileURLToPath(import.meta.url));
const rawRouter = JSON.parse(readFileSync(join(here, 'fixtures', 'mediasoup-router.json'), 'utf8'));

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const T0 = 1_700_000_000_000;

console.log('the real router sample');

check('every kind the sample holds becomes a group', () => {
  const model = buildRouterEntityTimeline(rawRouter)!;
  assert.ok(model);
  const kinds = model.groups.map((g) => g.kind);
  assert.ok(kinds.includes('producer'), kinds.join(', '));
  assert.ok(kinds.includes('consumer'), kinds.join(', '));
});

check('the window covers everything the router held', () => {
  const model = buildRouterEntityTimeline(rawRouter)!;
  for (const group of model.groups) {
    for (const lane of group.lanes) {
      assert.ok(lane.createdAt >= model.start, `${lane.id} starts before the window`);
      for (const episode of lane.episodes) {
        assert.ok(episode.end <= model.end, `${lane.id} runs past the window`);
        assert.ok(episode.end > episode.start, `${lane.id} has a zero-width episode`);
      }
    }
  }
});

check('lanes are contiguous — no gaps inside a lifetime', () => {
  const model = buildRouterEntityTimeline(rawRouter)!;
  for (const group of model.groups) {
    for (const lane of group.lanes) {
      for (let i = 1; i < lane.episodes.length; i++) {
        assert.equal(
          lane.episodes[i].start,
          lane.episodes[i - 1].end,
          `${lane.id} has a gap between episodes`,
        );
      }
    }
  }
});

check('a producer carries its transport, ssrcs and codec', () => {
  const model = buildRouterEntityTimeline(rawRouter)!;
  const producers = model.groups.find((g) => g.kind === 'producer')!;
  const lane = producers.lanes[0];
  assert.ok(lane.meta.some((row) => row.startsWith('Transport:')));
  assert.ok(lane.detail && (lane.detail.includes('audio') || lane.detail.includes('video')));
});

console.log('\nstate machines');

function producerSample(history: { type: string; timestamp: number }[]) {
  return {
    routerId: 'r',
    attachments: {},
    createdAt: T0,
    closedAt: T0 + 10_000,
    transports: [],
    consumers: [],
    dataProducers: [],
    dataConsumers: [],
    producers: [
      {
        id: 'p1',
        transportId: 't1',
        createdAt: T0,
        kind: 'video',
        codecInfo: { mimeType: 'video/VP8', payloadType: 96, clockRate: 90000 },
        history,
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

check('a producer is created running, and that opening state is flagged', () => {
  // mediasoup creates a producer active; the first stretch is the documented
  // starting point rather than something the sample stated.
  const model = buildRouterEntityTimeline(
    producerSample([{ type: 'pause', timestamp: T0 + 2000 }]),
  )!;
  const lane = model.groups[0].lanes[0];
  assert.equal(lane.episodes[0].state, 'active');
  assert.equal(lane.episodes[0].initial, true);
  assert.equal(lane.episodes[1].state, 'paused');
});

check('degraded is a colour, not a stop — the producer is still producing', () => {
  const model = buildRouterEntityTimeline(
    producerSample([
      { type: 'degraded', timestamp: T0 + 1000 },
      { type: 'restored', timestamp: T0 + 3000 },
    ]),
  )!;
  const states = model.groups[0].lanes[0].episodes.map((e) => e.state);
  assert.deepEqual(states, ['active', 'degraded', 'active']);
});

check('a re-announced state does not split the episode', () => {
  const model = buildRouterEntityTimeline(
    producerSample([
      { type: 'pause', timestamp: T0 + 1000 },
      { type: 'pause', timestamp: T0 + 2000 },
      { type: 'resume', timestamp: T0 + 4000 },
    ]),
  )!;
  const lane = model.groups[0].lanes[0];
  assert.deepEqual(lane.episodes.map((e) => e.state), ['active', 'paused', 'active']);
  assert.equal(lane.changes, 2);
});

check("a consumer's own pause is kept apart from its producer's", () => {
  // The distinction is the whole point of the lane: one is this subscriber's
  // doing, the other is everyone's — a room full of `producer paused` at one
  // instant is a publisher problem, not four subscriber problems.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sample: any = {
    routerId: 'r',
    attachments: {},
    createdAt: T0,
    closedAt: T0 + 10_000,
    transports: [],
    producers: [],
    dataProducers: [],
    dataConsumers: [],
    consumers: [
      {
        id: 'c1',
        producerId: 'p1',
        transportId: 't1',
        createdAt: T0,
        kind: 'video',
        history: [
          { type: 'producerPaused', timestamp: T0 + 1000 },
          { type: 'producerResumed', timestamp: T0 + 2000 },
          { type: 'pause', timestamp: T0 + 3000 },
        ],
      },
    ],
  };
  const states = buildRouterEntityTimeline(sample)!.groups[0].lanes[0].episodes.map((e) => e.state);
  assert.deepEqual(states, ['active', 'producer paused', 'active', 'paused']);
});

check('an entity still open runs to the end of the window', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sample: any = producerSample([]);
  sample.producers[0].closedAt = undefined;
  const model = buildRouterEntityTimeline(sample)!;
  const lane = model.groups[0].lanes[0];
  assert.equal(lane.closedAt, undefined);
  assert.equal(lane.episodes[lane.episodes.length - 1].end, model.end);
});

console.log('\nedges');

check('a data channel with no history is one lifetime bar', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sample: any = {
    routerId: 'r',
    attachments: {},
    createdAt: T0,
    closedAt: T0 + 5000,
    transports: [],
    producers: [],
    consumers: [],
    dataConsumers: [],
    dataProducers: [
      { id: 'dp1', transportId: 't1', createdAt: T0 + 100, label: 'chat', protocol: '' },
    ],
  };
  const lane = buildRouterEntityTimeline(sample)!.groups[0].lanes[0];
  assert.equal(lane.episodes.length, 1);
  assert.equal(lane.episodes[0].state, 'active');
  assert.equal(lane.detail, 'chat');
});

check('an empty router yields nothing to draw', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bare: any = {
    routerId: 'r',
    attachments: {},
    createdAt: T0,
    transports: [],
    producers: [],
    consumers: [],
    dataProducers: [],
    dataConsumers: [],
  };
  assert.equal(buildRouterEntityTimeline(bare), null);
  assert.equal(buildRouterEntityTimeline(null), null);
});

console.log(`\n${passed} checks passed`);
