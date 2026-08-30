/**
 * Rebuilding the client's score reasons from the components that raised them.
 *
 *   node --experimental-strip-types scripts/sampleScoreReasons.test.ts
 *
 * client-monitor 4.7.0 stopped shipping the aggregate on the client entry: each
 * entity now ships only what it is itself responsible for, and the client
 * subtracts nothing of its own. Nothing was lost — the client-level view is
 * re-aggregated from the components of the same sample — but it has to be put
 * back together, and the attribution has to survive the trip.
 */

import assert from 'node:assert/strict';
import {
  buildSampleScoreReasons,
  nearestEntryIndex,
} from '../src/utils/sampleScoreReasons.ts';

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function at(i: number, score: number, reasons?: string[], penalties?: Record<string, number>) {
  return { timestamp: new Date(T0 + i * 1000), score, reasons, penalties };
}

// A 4.7.0-shaped stats object: the client line carries scores but no reasons.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stats: any = {
  scores: {
    session: [at(0, 4.9), at(1, 3.2), at(2, 4.8)],
    perPc: {
      'pc-1': {
        direction: 'recv',
        values: [at(1, 3.0, ['high-packetloss'], { 'high-packetloss': 1.5 })],
      },
    },
    perTrack: {
      'pc-1:track-a': {
        kind: 'inbound',
        trackId: 'track-a',
        values: [at(1, 2.4, ['pixelated-video'], { 'pixelated-video': 1 })],
      },
    },
  },
};

console.log('re-aggregating the client view');

check('every sample is listed, quiet ones included', () => {
  // The list is driven by clicking the score chart, so it has to be one row per
  // sample: drop the quiet ones and a click on a clean stretch lands on some
  // other moment's reasons while the marker says otherwise.
  const entries = buildSampleScoreReasons(stats);
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map((e) => e.reasons.length), [0, 2, 0]);
});

check('a sample gathers the reasons of every component beneath it', () => {
  const entries = buildSampleScoreReasons(stats);
  const entry = entries.find((e) => e.timestamp === T0 + 1000)!;
  assert.deepEqual(
    entry.reasons.map((r) => r.key).sort(),
    ['high-packetloss', 'pixelated-video'],
  );
});

check('every reason keeps the component that raised it', () => {
  const entry = buildSampleScoreReasons(stats)[1];
  const loss = entry.reasons.find((r) => r.key === 'high-packetloss')!;
  assert.equal(loss.origin, 'peerConnection');
  assert.equal(loss.entityId, 'pc-1');
  assert.equal(loss.direction, 'recv');
  // The component's own score, which is the number the reason actually explains.
  assert.equal(loss.entityScore, 3.0);

  const pixel = entry.reasons.find((r) => r.key === 'pixelated-video')!;
  assert.equal(pixel.origin, 'track');
  assert.equal(pixel.entityLabel, 'Inbound track track-a');
});

check("the client's own score rides along with the sample", () => {
  const entry = buildSampleScoreReasons(stats)[1];
  // 3.2 while its components sit at 3.0 and 2.4: a weighted aggregate, not a
  // subtraction. This is the pairing that makes the scope error visible.
  assert.equal(entry.clientScore, 3.2);
});

check('points sum only when every reason carried one', () => {
  assert.equal(buildSampleScoreReasons(stats)[1].totalPoints, 2.5);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partial: any = {
    scores: {
      session: [at(0, 4)],
      perPc: { 'pc-1': { values: [at(0, 3, ['high-rtt'])] } },
      perTrack: {
        'pc-1:t': { kind: 'inbound', values: [at(0, 3, ['frozen-video'], { 'frozen-video': 2 })] },
      },
    },
  };
  // A partial sum would read as the sample's whole cost while omitting the
  // reason that carried no magnitude.
  assert.equal(buildSampleScoreReasons(partial)[0].totalPoints, undefined);
});

check('the heaviest reason leads within a sample', () => {
  assert.equal(buildSampleScoreReasons(stats)[1].reasons[0].key, 'high-packetloss');
});

console.log('\nlinking a reason back to its section');

check('a track links to the consumer or producer that owns it', () => {
  // A track has no section of its own — it is rendered inside the consumer
  // that renders it, or the producer that sends it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linked: any = {
    scores: {
      session: [at(0, 4)],
      perPc: { 'pc-1': { values: [at(0, 3, ['high-rtt'])] } },
      perTrack: {
        'pc-1:in': {
          kind: 'inbound',
          trackId: 'in',
          consumerId: 'consumer-9',
          values: [at(0, 3, ['frozen-video'])],
        },
        'pc-1:out': {
          kind: 'outbound',
          trackId: 'out',
          producerId: 'producer-7',
          values: [at(0, 3, ['cpu-limitation'])],
        },
      },
    },
  };
  const [entry] = buildSampleScoreReasons(linked);
  const byKey = new Map(entry.reasons.map((r) => [r.key, r]));
  assert.equal(byKey.get('frozen-video')?.targetHash, 'consumer/consumer-9');
  assert.equal(byKey.get('cpu-limitation')?.targetHash, 'producer/producer-7');
  assert.equal(byKey.get('high-rtt')?.targetHash, 'transport/pc-1');
});

check('a track never matched to an owner stays unlinked', () => {
  // Rather than pointing somewhere wrong: an unlinked id is honest, a link to
  // a section that does not hold this track is not.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orphan: any = {
    scores: {
      session: [at(0, 4)],
      perPc: {},
      perTrack: {
        'pc-1:in': { kind: 'inbound', trackId: 'in', values: [at(0, 3, ['frozen-video'])] },
      },
    },
  };
  assert.equal(buildSampleScoreReasons(orphan)[0].reasons[0].targetHash, undefined);
});

console.log('\nedges');

check('a client entry that still ships reasons is not dropped', () => {
  // 4.7.0 says the client subtracts nothing today — but if a client-level
  // penalty is ever added it lands on `scoreReasons` like any other and must
  // appear here without a code change.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withClientReason: any = {
    scores: { session: [at(0, 3, ['cpu-limitation'])], perPc: {}, perTrack: {} },
  };
  const [entry] = buildSampleScoreReasons(withClientReason);
  assert.equal(entry.reasons[0].origin, 'client');
});

check('a clean session still lists its samples', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean: any = { scores: { session: [at(0, 5), at(1, 5)], perPc: {}, perTrack: {} } };
  const entries = buildSampleScoreReasons(clean);
  assert.equal(entries.length, 2);
  // "No component raised a reason here" is an answer, not an empty row.
  for (const entry of entries) assert.deepEqual(entry.reasons, []);
});

check('nothing in yields nothing out', () => {
  assert.deepEqual(buildSampleScoreReasons(null), []);
  assert.deepEqual(buildSampleScoreReasons(undefined), []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.deepEqual(buildSampleScoreReasons({} as any), []);
});

check('entries come back oldest first', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spread: any = {
    scores: {
      session: [at(0, 4), at(5, 4)],
      perPc: { 'pc-1': { values: [at(5, 3, ['high-rtt']), at(0, 3, ['high-jitter'])] } },
      perTrack: {},
    },
  };
  const entries = buildSampleScoreReasons(spread);
  assert.deepEqual(entries.map((e) => e.timestamp - T0), [0, 5000]);
});

console.log('\nthe chart-to-browser jump');

check('a click lands on the sample it pointed at', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spread: any = {
    scores: {
      session: [at(0, 4), at(10, 4)],
      perPc: { 'pc-1': { values: [at(0, 3, ['high-rtt']), at(10, 3, ['high-jitter'])] } },
      perTrack: {},
    },
  };
  const entries = buildSampleScoreReasons(spread);
  // Every sample is listed, so a click lands on the sample it pointed at.
  assert.equal(nearestEntryIndex(entries, T0 + 1000), 0);
  assert.equal(nearestEntryIndex(entries, T0 + 9000), 1);
  assert.equal(nearestEntryIndex(entries, T0 - 5000), 0);
  assert.equal(nearestEntryIndex([], T0), -1);
});

console.log(`\n${passed} checks passed`);
