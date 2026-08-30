/**
 * Turning bare reason keys into an account of the score.
 *
 *   node --experimental-strip-types scripts/scoreExplanation.test.ts
 *
 * Two wire vintages are in play. Samples up to schema 3.5 carry `scoreReasons`
 * as keys only, and nothing may claim how many points a reason cost — the
 * account is built from how often each fired. Schema 3.6 carries the magnitude
 * next to the key, and then the ranking must follow what things actually cost.
 * Both are exercised here, including a window that mixes them.
 */

import assert from 'node:assert/strict';
import {
  buildScoreExplanation,
  formatScoreReasons,
  scoreBand,
} from '../src/utils/scoreExplanation.ts';
import { SCORE_REASONS, getScoreReasonMeta, isRetiredScoreReason } from '../src/schema/ScoreReasons.ts';

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function at(i: number, score: number, reasons?: string[]) {
  return { timestamp: new Date(T0 + i * 1000), score, reasons };
}

/** A schema-3.6 tick: reason keys with the points each one subtracted. */
function measuredAt(i: number, score: number, penalties: Record<string, number>) {
  return {
    timestamp: new Date(T0 + i * 1000),
    score,
    reasons: Object.keys(penalties).sort((a, b) => penalties[b] - penalties[a]),
    penalties,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stats: any = {
  scores: {
    session: [
      at(0, 4.5),
      at(1, 3.0, ['high-packetloss']),
      at(2, 2.5, ['high-packetloss', 'high-rtt']),
      at(3, 4.2),
    ],
    perPc: {
      'pc-1': {
        values: [at(1, 3.5, ['high-packetloss']), at(2, 3.0, ['high-rtt', 'high-packetloss'])],
      },
    },
    perTrack: {
      'pc-1:track-a': { kind: 'inbound', values: [at(2, 2.0, ['frozen-video'])] },
      'pc-1:track-b': { kind: 'outbound', values: [at(2, 3.0, ['cpu-limitation'])] },
    },
  },
};

console.log('score bands');

check('bands follow the documented scale', () => {
  assert.equal(scoreBand(5), 'good');
  assert.equal(scoreBand(4), 'good');
  assert.equal(scoreBand(3.9), 'fair');
  assert.equal(scoreBand(2.9), 'poor');
  assert.equal(scoreBand(1.5), 'bad');
  assert.equal(scoreBand(0.4), 'very bad');
});

console.log('\nexplanation');

const ex = buildScoreExplanation(stats);

check('the average comes from the client score alone', () => {
  // (4.5 + 3.0 + 2.5 + 4.2) / 4 — peer connection and track scores are not
  // mixed in; the client score already folds them in on the client side.
  assert.ok(Math.abs((ex.average ?? 0) - 3.55) < 1e-9);
  assert.equal(ex.sampleCount, 4);
  assert.equal(ex.band, 'fair');
  assert.equal(ex.min, 2.5);
  assert.equal(ex.max, 4.5);
});

check('ticks below the good band are counted', () => {
  assert.equal(ex.belowGoodTicks, 2);
  assert.equal(ex.badTicks, 0);
});

check('reasons are counted across client, peer connection and track', () => {
  const loss = ex.reasons.find((r) => r.meta.key === 'high-packetloss')!;
  // twice on the client, twice on the peer connection
  assert.equal(loss.occurrences, 4);
  assert.deepEqual([...loss.scopes].sort(), ['client', 'peerConnection']);
  assert.equal(loss.entityCount, 2);
});

check('the most frequent reason leads', () => {
  assert.equal(ex.reasons[0].meta.key, 'high-packetloss');
  assert.equal(ex.totalOccurrences, 8);
  assert.ok(Math.abs(ex.reasons[0].share - 0.5) < 1e-9);
});

check('a tie is broken by how much the reason can cost', () => {
  // frozen-video and cpu-limitation both fired once; frozen-video can take
  // 2.0 and cpu-limitation 2.0, so add a lighter one to see the ordering.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tie: any = {
    scores: {
      session: [],
      perPc: {},
      perTrack: {
        t1: { kind: 'inbound', values: [at(0, 3, ['low-fps'])] },
        t2: { kind: 'inbound', values: [at(0, 3, ['frozen-video'])] },
      },
    },
  };
  const out = buildScoreExplanation(tie);
  assert.equal(out.reasons[0].meta.key, 'frozen-video');
  assert.equal(out.reasons[1].meta.key, 'low-fps');
});

check('trouble is grouped by where it came from', () => {
  const byGroup = new Map(ex.groups.map((g) => [g.group, g.occurrences]));
  // high-packetloss ×4 and high-rtt ×2 are both path reasons
  assert.equal(byGroup.get('path'), 6);
  assert.equal(byGroup.get('video-receive'), 1);
  assert.equal(byGroup.get('video-send'), 1);
  assert.equal(ex.groups[0].group, 'path');
});

check('the narrative states the number, the band and the leading reason', () => {
  const text = ex.narrative.join(' ');
  assert.ok(text.includes('3.55'), 'quotes the average');
  assert.ok(text.includes('fair'), 'names the band');
  assert.ok(text.includes('high-packetloss'), 'names the leading reason key');
  assert.ok(text.includes('Packet loss'), 'uses its human label');
});

console.log('\nedges');

check('a clean session says so rather than inventing a cause', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean: any = { scores: { session: [at(0, 5), at(1, 4.8)], perPc: {}, perTrack: {} } };
  const out = buildScoreExplanation(clean);
  assert.equal(out.totalOccurrences, 0);
  assert.equal(out.reasons.length, 0);
  assert.ok(out.narrative.join(' ').includes('never dropped out of the good band'));
  assert.ok(out.narrative.join(' ').includes('No score reasons were recorded'));
});

check('an unknown reason key is counted, not dropped', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const custom: any = {
    scores: { session: [at(0, 3, ['my-app-reason'])], perPc: {}, perTrack: {} },
  };
  const out = buildScoreExplanation(custom);
  assert.equal(out.reasons.length, 1);
  assert.equal(out.reasons[0].occurrences, 1);
  assert.deepEqual(out.unknownKeys, ['my-app-reason']);
  // and it is labelled by its key rather than pretending to describe it
  assert.equal(out.reasons[0].meta.label, 'my-app-reason');
  assert.equal(out.reasons[0].meta.maxPenalty, 0);
});

check('warm-up samples are excluded', () => {
  const out = buildScoreExplanation(stats, { warmupEnd: T0 + 2000 });
  assert.equal(out.sampleCount, 2);
  const loss = out.reasons.find((r) => r.meta.key === 'high-packetloss')!;
  // one client tick and one peer-connection tick survive the cutoff
  assert.equal(loss.occurrences, 2);
});

check('nothing in yields an empty explanation', () => {
  const out = buildScoreExplanation(null);
  assert.equal(out.average, null);
  assert.deepEqual(out.reasons, []);
  assert.deepEqual(out.narrative, []);
});

console.log('\nreference table');

check('every documented reason carries a meaning and a max penalty', () => {
  const keys = Object.keys(SCORE_REASONS);
  assert.ok(keys.length >= 18, `expected the full table, got ${keys.length}`);
  for (const key of keys) {
    const meta = SCORE_REASONS[key];
    assert.equal(meta.key, key, `${key} is keyed inconsistently`);
    assert.ok(meta.label.length > 0, `${key} has no label`);
    assert.ok(meta.meaning.length > 0, `${key} has no meaning`);
    assert.ok(meta.guidance.length > 0, `${key} has no guidance`);
    assert.ok(meta.maxPenalty > 0, `${key} has no max penalty`);
    assert.ok(meta.entities.length > 0, `${key} names no entity`);
  }
});

check('the penalties match the 4.7.0 calculator reference', () => {
  assert.equal(getScoreReasonMeta('high-packetloss').maxPenalty, 5);
  // The heaviest video-receive penalty: a large, badly quantized picture.
  assert.equal(getScoreReasonMeta('pixelated-video').maxPenalty, 3);
  assert.equal(getScoreReasonMeta('frozen-video').maxPenalty, 2);
  assert.equal(getScoreReasonMeta('cpu-limitation').maxPenalty, 2);
  assert.equal(getScoreReasonMeta('downscaled-screenshare').maxPenalty, 2);
  assert.equal(getScoreReasonMeta('high-jitter').maxPenalty, 2);
  // 4.7.0 folded very-high-rtt in: one key, two steps, so the ceiling is 2.
  assert.equal(getScoreReasonMeta('high-rtt').maxPenalty, 2);
  assert.equal(getScoreReasonMeta('bandwidth-limitation').maxPenalty, 1);
});

check('the keys 4.7.0 dropped are still described, and marked as dropped', () => {
  // A dashboard reads recordings older than the client that made them. The
  // entries stay so an old sample explains itself; `retired` is what stops
  // anyone reading them as current behaviour.
  for (const key of ['very-high-rtt', 'low-bitrate-per-pixel']) {
    assert.ok(isRetiredScoreReason(key), `${key} should be marked retired`);
    assert.ok(getScoreReasonMeta(key).retired?.includes('4.7.0'), `${key} should name the version`);
  }
  // Everything else is current.
  const retired = Object.keys(SCORE_REASONS).filter(isRetiredScoreReason);
  assert.deepEqual(retired.sort(), ['low-bitrate-per-pixel', 'very-high-rtt']);
});

check('path reasons belong to the peer connection alone', () => {
  // Before 4.7.0 jitter and loss were also subtracted on tracks. They are not
  // any more — the audio track score is bitrate-derived and the video track
  // score has its own reasons — so attributing either to a track would send a
  // reader looking at the wrong entity.
  assert.deepEqual(getScoreReasonMeta('high-jitter').entities, ['peer-connection']);
  assert.deepEqual(getScoreReasonMeta('high-packetloss').entities, ['peer-connection']);
  assert.deepEqual(getScoreReasonMeta('high-rtt').entities, ['peer-connection']);
});

check('every current reason key is one DefaultScoreCalculator can emit', () => {
  // Transcribed from DefaultScoreCalculatorSubtractionReason in 4.7.0. A key
  // here that the calculator cannot raise is a table that documents fiction.
  const emitted = new Set([
    'high-rtt', 'high-jitter', 'high-packetloss', 'low-fps', 'volatile-fps',
    'dropped-video-frames', 'video-frame-corruptions', 'high-deviation-from-target-bitrate',
    'cpu-limitation', 'bandwidth-limitation', 'high-volatile-bitrate', 'frozen-video',
    'pixelated-video', 'audio-concealment', 'audio-time-stretch',
    'high-jitter-buffer-delay', 'downscaled-screenshare',
  ]);
  const current = Object.keys(SCORE_REASONS).filter((k) => !isRetiredScoreReason(k));
  assert.deepEqual(current.sort(), [...emitted].sort());
});

console.log('\nmeasured magnitudes (schema >= 3.6)');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const measuredStats: any = {
  scores: {
    session: [
      measuredAt(0, 4.5, { 'high-rtt': 0.5 }),
      measuredAt(1, 2.0, { 'frozen-video': 2, 'high-rtt': 0.5 }),
    ],
    perPc: {},
    perTrack: {
      'pc-1:track-a': { kind: 'inbound', values: [measuredAt(1, 2.0, { 'frozen-video': 1 })] },
    },
  },
};

check('magnitudes on the wire are summed rather than counted', () => {
  const e = buildScoreExplanation(measuredStats);
  assert.equal(e.measured, true);
  // frozen-video: 2 on the client line + 1 on the track. high-rtt: 0.5 twice.
  assert.equal(e.totalPoints, 4);
  const frozen = e.reasons.find((r) => r.meta.key === 'frozen-video');
  assert.equal(frozen?.points, 3);
  assert.equal(frozen?.measuredTicks, 2);
  assert.equal(frozen?.peakPoints, 2);
  assert.equal(frozen?.averagePoints, 1.5);
});

check('what a reason cost outranks how often it fired', () => {
  const e = buildScoreExplanation(measuredStats);
  // high-rtt fired as often as frozen-video but took a third as much off.
  assert.equal(e.reasons[0].meta.key, 'frozen-video');
  assert.equal(e.reasons[1].meta.key, 'high-rtt');
});

check('the client line is reported apart from the per-entity lines', () => {
  const e = buildScoreExplanation(measuredStats);
  assert.equal(e.clientPoints, 3); // 0.5 + (2 + 0.5)
  assert.equal(e.clientMeasuredTicks, 2);
});

check('groups are weighted by points once magnitudes exist', () => {
  const e = buildScoreExplanation(measuredStats);
  assert.equal(e.groups[0].points, 3); // frozen-video's group leads on cost
  assert.ok((e.groups[0].pointShare ?? 0) > 0.7);
});

check('the narrative leads with what was subtracted, not how often', () => {
  const text = buildScoreExplanation(measuredStats).narrative.join(' ');
  assert.match(text, /biggest contributor/);
  assert.match(text, /3\.0 points/);
});

check('a keys-only window says the ranking is by frequency', () => {
  const e = buildScoreExplanation(stats);
  assert.equal(e.measured, false);
  assert.equal(e.totalPoints, null);
  assert.equal(e.clientPoints, null);
  assert.equal(e.reasons[0].points, null);
  assert.match(e.narrative.join(' '), /predate schema 3\.6\.0/);
});

check('a mixed window counts every tick but sums only the measured ones', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mixed: any = {
    scores: {
      session: [at(0, 3, ['high-rtt']), measuredAt(1, 3, { 'high-rtt': 1 })],
      perPc: {},
      perTrack: {},
    },
  };
  const e = buildScoreExplanation(mixed);
  assert.equal(e.measured, true);
  assert.equal(e.totalOccurrences, 2);
  assert.equal(e.reasons[0].occurrences, 2);
  assert.equal(e.reasons[0].measuredTicks, 1);
  assert.equal(e.reasons[0].points, 1);
  assert.match(e.narrative.join(' '), /written before schema 3\.6\.0/);
});

check('an all-zero window is read as unmeasured, not as free of cost', () => {
  // observer-js folds a pre-3.6 `string[]` into the record shape with a
  // magnitude of 0 on the way through, so this is what an old client relayed
  // through the observer looks like — keys, no real magnitudes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relayed: any = {
    scores: {
      session: [measuredAt(0, 3, { 'high-rtt': 0 }), measuredAt(1, 3, { 'high-rtt': 0 })],
      perPc: {},
      perTrack: {},
    },
  };
  const e = buildScoreExplanation(relayed);
  assert.equal(e.measured, false);
  assert.equal(e.totalPoints, null);
  assert.equal(e.reasons[0].points, null);
  // The occurrences are still real and still counted.
  assert.equal(e.reasons[0].occurrences, 2);
});

check('a genuine zero among real costs stays a zero', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mixedMagnitudes: any = {
    scores: {
      session: [measuredAt(0, 3, { 'frozen-video': 2, 'high-rtt': 0 })],
      perPc: {},
      perTrack: {},
    },
  };
  const e = buildScoreExplanation(mixedMagnitudes);
  assert.equal(e.measured, true);
  assert.equal(e.reasons.find((r) => r.meta.key === 'high-rtt')?.points, 0);
});

check('formatScoreReasons appends points only where the wire had them', () => {
  assert.deepEqual(formatScoreReasons(['frozen-video'], { 'frozen-video': 1.5 }), [
    'frozen-video \u22121.5',
  ]);
  // A whole number reads without a trailing .0.
  assert.deepEqual(formatScoreReasons(['high-rtt'], { 'high-rtt': 2 }), ['high-rtt \u22122']);
  // Keys-only samples render bare rather than with an invented magnitude.
  assert.deepEqual(formatScoreReasons(['high-rtt'], undefined), ['high-rtt']);
  assert.deepEqual(formatScoreReasons(['a', 'b'], { a: 1 }), ['a \u22121', 'b']);
  // A zero is what observer-js writes when it relays a pre-3.6 array, so it
  // renders bare rather than as a meaningless "−0".
  assert.deepEqual(formatScoreReasons(['high-rtt'], { 'high-rtt': 0 }), ['high-rtt']);
  assert.deepEqual(formatScoreReasons(undefined, { a: 1 }), []);
});

console.log(`\n${passed} checks passed`);
