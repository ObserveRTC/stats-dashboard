/**
 * Turning bare reason keys into an account of the score.
 *
 *   node --experimental-strip-types scripts/scoreExplanation.test.ts
 *
 * Since client-monitor 4.9.0 a reason key **is an issue type**, and the table
 * this reads is a projection of `schema/ClientIssueTypes` rather than a second
 * vocabulary. Two wire vintages are still in play: a sample may carry keys only,
 * in which case nothing may claim how many points a reason cost and the account
 * is built from how often each fired; or it carries the magnitude next to the
 * key, and then the ranking must follow what things actually cost. Both are
 * exercised here, including a window that mixes them.
 */

import assert from 'node:assert/strict';
import {
  buildScoreExplanation,
  formatScoreReasons,
  scoreBand,
} from '../src/utils/scoreExplanation.ts';
import { SCORE_REASONS, getScoreReasonMeta, isRetiredScoreReason } from '../src/schema/ScoreReasons.ts';
import { CLIENT_ISSUE_TYPES } from '../src/schema/ClientIssueTypes.ts';

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

/** A tick that carries reason keys with the points each one subtracted. */
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
      at(1, 3.0, ['transport-loss-sustained']),
      at(2, 2.5, ['transport-loss-sustained', 'transport-delay-degraded']),
      at(3, 4.2),
    ],
    perPc: {
      'pc-1': {
        values: [
          at(1, 3.5, ['transport-loss-sustained']),
          at(2, 3.0, ['transport-delay-degraded', 'transport-loss-sustained']),
        ],
      },
    },
    perTrack: {
      'pc-1:track-a': { kind: 'inbound', values: [at(2, 2.0, ['video-flow-disrupted'])] },
      'pc-1:track-b': { kind: 'outbound', values: [at(2, 3.0, ['encoder-bottleneck'])] },
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
  const loss = ex.reasons.find((r) => r.meta.key === 'transport-loss-sustained')!;
  // twice on the client, twice on the peer connection
  assert.equal(loss.occurrences, 4);
  assert.deepEqual([...loss.scopes].sort(), ['client', 'peerConnection']);
  assert.equal(loss.entityCount, 2);
});

check('the most frequent reason leads', () => {
  assert.equal(ex.reasons[0].meta.key, 'transport-loss-sustained');
  assert.equal(ex.totalOccurrences, 8);
  assert.ok(Math.abs(ex.reasons[0].share - 0.5) < 1e-9);
});

check('a tie is broken by how much the reason can cost', () => {
  // Both fired once. video-flow-disrupted is worth 4.0 of 5 at full weight and
  // audio-jitter-buffer-stress 1.5, so the heavier one leads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tie: any = {
    scores: {
      session: [],
      perPc: {},
      perTrack: {
        t1: { kind: 'inbound', values: [at(0, 3, ['audio-jitter-buffer-stress'])] },
        t2: { kind: 'inbound', values: [at(0, 3, ['video-flow-disrupted'])] },
      },
    },
  };
  const out = buildScoreExplanation(tie);
  assert.equal(out.reasons[0].meta.key, 'video-flow-disrupted');
  assert.equal(out.reasons[1].meta.key, 'audio-jitter-buffer-stress');
});

check('trouble is grouped by how the fault counted', () => {
  // The groups are the monitor's four score categories, not a media grouping:
  // they say whether a finding zeroed, capped or subtracted.
  const byGroup = new Map(ex.groups.map((g) => [g.group, g.occurrences]));
  // transport-loss-sustained ×4 and transport-delay-degraded ×2
  assert.equal(byGroup.get('transport-quality'), 6);
  assert.equal(byGroup.get('perceived-quality'), 1); // video-flow-disrupted
  assert.equal(byGroup.get('pipeline-disruption'), 1); // encoder-bottleneck
  assert.equal(ex.groups[0].group, 'transport-quality');
});

check('the narrative states the number, the band and the leading reason', () => {
  const text = ex.narrative.join(' ');
  assert.ok(text.includes('3.55'), 'quotes the average');
  assert.ok(text.includes('fair'), 'names the band');
  assert.ok(text.includes('transport-loss-sustained'), 'names the leading reason key');
  assert.ok(text.includes('Sustained packet loss'), 'uses its human label');
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
  assert.deepEqual(out.retiredKeys, []);
  // and it is labelled by its key rather than pretending to describe it
  assert.equal(out.reasons[0].meta.label, 'my-app-reason');
  assert.equal(out.reasons[0].meta.maxPenalty, 0);
});

check('a pre-4.9.0 key is separated from an unknown one', () => {
  // Different statements: one dates the recording, the other says a detector
  // this build has never heard of raised something.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const old: any = {
    scores: { session: [at(0, 3, ['high-rtt', 'my-app-reason'])], perPc: {}, perTrack: {} },
  };
  const out = buildScoreExplanation(old);
  assert.deepEqual(out.retiredKeys, ['high-rtt']);
  assert.deepEqual(out.unknownKeys, ['my-app-reason']);
});

check('warm-up samples are excluded', () => {
  const out = buildScoreExplanation(stats, { warmupEnd: T0 + 2000 });
  assert.equal(out.sampleCount, 2);
  const loss = out.reasons.find((r) => r.meta.key === 'transport-loss-sustained')!;
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

check('the table is the 4.9.0 issue table, projected', () => {
  // One vocabulary, not two: a reason key is an issue type, so a row here that
  // is not an issue type is a table documenting fiction.
  assert.deepEqual(Object.keys(SCORE_REASONS).sort(), Object.keys(CLIENT_ISSUE_TYPES).sort());
  assert.equal(Object.keys(SCORE_REASONS).length, 37);
});

check('every reason carries a meaning, guidance and an entity', () => {
  for (const [key, meta] of Object.entries(SCORE_REASONS)) {
    assert.equal(meta.key, key, `${key} is keyed inconsistently`);
    assert.ok(meta.label.length > 0, `${key} has no label`);
    assert.ok(meta.meaning.length > 0, `${key} has no meaning`);
    assert.ok(meta.guidance.length > 0, `${key} has no guidance`);
    assert.ok(meta.effect.length > 0, `${key} does not say how it counts`);
    assert.ok(meta.entities.length > 0, `${key} names no entity`);
    assert.ok(meta.maxPenalty >= 0, `${key} has a negative max penalty`);
  }
});

check('the penalties are weight x 5 from ISSUE_SCORING', () => {
  // Connectivity: the whole score.
  assert.equal(getScoreReasonMeta('ice-connection-failed').maxPenalty, 5);
  assert.equal(getScoreReasonMeta('unstable-ice-path').maxPenalty, 3);
  // Pipeline disruption: a cap of this depth.
  assert.equal(getScoreReasonMeta('dry-inbound-track').maxPenalty, 5);
  assert.equal(getScoreReasonMeta('video-recovery-failed').maxPenalty, 4.5);
  assert.equal(getScoreReasonMeta('encoder-bottleneck').maxPenalty, 3.5);
  assert.equal(getScoreReasonMeta('cpulimitation').maxPenalty, 3);
  // Perceived quality: a subtraction from the track.
  assert.equal(getScoreReasonMeta('video-flow-disrupted').maxPenalty, 4);
  assert.equal(getScoreReasonMeta('invented-speech').maxPenalty, 3);
  assert.equal(getScoreReasonMeta('pixelated-video').maxPenalty, 2.5);
  assert.equal(getScoreReasonMeta('audio-jitter-buffer-stress').maxPenalty, 1.5);
  // Transport quality: a subtraction from the connection.
  assert.equal(getScoreReasonMeta('blocked-stun-requests').maxPenalty, 5);
  assert.equal(getScoreReasonMeta('uplink-congestion').maxPenalty, 4);
  assert.equal(getScoreReasonMeta('transport-loss-sustained').maxPenalty, 3.5);
  assert.equal(getScoreReasonMeta('transport-delay-degraded').maxPenalty, 2.5);
});

check('the deprecated congestion finding is priced at zero, not omitted', () => {
  // Both directional detectors also emit an event of that name, so pricing it
  // would charge one episode twice. Listed rather than dropped, because
  // omission is how the library reports a detector nobody got around to
  // scoring.
  assert.ok('congestion' in SCORE_REASONS);
  assert.equal(getScoreReasonMeta('congestion').maxPenalty, 0);
});

check('the three self-measuring detectors declare a severity field', () => {
  // Most detectors only say yes or no, and for those the weight is the whole
  // story. These three report how deep the finding is, and the score scales
  // the weight by it rather than assuming the worst case.
  const withSeverity = Object.entries(CLIENT_ISSUE_TYPES)
    .filter(([, meta]) => meta.scoring.severityField)
    .map(([type]) => type)
    .sort();
  assert.deepEqual(withSeverity, ['cpulimitation', 'downlink-congestion', 'uplink-congestion']);
  assert.equal(CLIENT_ISSUE_TYPES['cpulimitation'].scoring.severityField, 'minUtilization');
  assert.equal(CLIENT_ISSUE_TYPES['uplink-congestion'].scoring.severityField, 'severity');
});

check('the keys 4.9.0 dropped are still described, and marked as dropped', () => {
  // A dashboard reads recordings older than the client that made them. These
  // entries exist so an old sample explains itself; `retired` is what stops
  // anyone reading them as current behaviour.
  for (const key of ['high-rtt', 'high-packetloss', 'frozen-video', 'audio-concealment']) {
    assert.ok(isRetiredScoreReason(key), `${key} should be marked retired`);
    assert.ok(getScoreReasonMeta(key).retired?.includes('4.9.0'), `${key} should name the version`);
  }
  // Nothing in the current table is retired.
  assert.deepEqual(Object.keys(SCORE_REASONS).filter(isRetiredScoreReason), []);
});

check('path faults belong to the peer connection, damage to the track', () => {
  // The rule that keeps a degradation from being charged twice: loss, delay
  // and congestion are properties of the transport, so they are subtracted
  // once, there. Freezes and invented speech are measurements of what a person
  // experienced, so they are raised on the track.
  assert.deepEqual(getScoreReasonMeta('transport-loss-sustained').entities, ['peer-connection']);
  assert.deepEqual(getScoreReasonMeta('transport-delay-degraded').entities, ['peer-connection']);
  assert.deepEqual(getScoreReasonMeta('uplink-congestion').entities, ['peer-connection']);
  assert.deepEqual(getScoreReasonMeta('video-flow-disrupted').entities, ['inbound-track']);
  assert.deepEqual(getScoreReasonMeta('invented-speech').entities, ['inbound-track']);
  assert.deepEqual(getScoreReasonMeta('encoder-bottleneck').entities, ['outbound-track']);
  // The one issue that is a statement about the whole endpoint.
  assert.deepEqual(getScoreReasonMeta('cpulimitation').entities, ['client']);
});

console.log('\nmeasured magnitudes');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const measuredStats: any = {
  scores: {
    session: [
      measuredAt(0, 4.5, { 'transport-delay-degraded': 0.5 }),
      measuredAt(1, 2.0, { 'video-flow-disrupted': 2, 'transport-delay-degraded': 0.5 }),
    ],
    perPc: {},
    perTrack: {
      'pc-1:track-a': { kind: 'inbound', values: [measuredAt(1, 2.0, { 'video-flow-disrupted': 1 })] },
    },
  },
};

check('magnitudes on the wire are summed rather than counted', () => {
  const e = buildScoreExplanation(measuredStats);
  assert.equal(e.measured, true);
  // video-flow-disrupted: 2 on the client line + 1 on the track.
  // transport-delay-degraded: 0.5 twice.
  assert.equal(e.totalPoints, 4);
  const frozen = e.reasons.find((r) => r.meta.key === 'video-flow-disrupted');
  assert.equal(frozen?.points, 3);
  assert.equal(frozen?.measuredTicks, 2);
  assert.equal(frozen?.peakPoints, 2);
  assert.equal(frozen?.averagePoints, 1.5);
});

check('what a reason cost outranks how often it fired', () => {
  const e = buildScoreExplanation(measuredStats);
  // transport-delay-degraded fired as often but took a third as much off.
  assert.equal(e.reasons[0].meta.key, 'video-flow-disrupted');
  assert.equal(e.reasons[1].meta.key, 'transport-delay-degraded');
});

check('the client line is reported apart from the per-entity lines', () => {
  const e = buildScoreExplanation(measuredStats);
  assert.equal(e.clientPoints, 3); // 0.5 + (2 + 0.5)
  assert.equal(e.clientMeasuredTicks, 2);
});

check('groups are weighted by points once magnitudes exist', () => {
  const e = buildScoreExplanation(measuredStats);
  assert.equal(e.groups[0].group, 'perceived-quality');
  assert.equal(e.groups[0].points, 3);
  assert.ok((e.groups[0].pointShare ?? 0) > 0.7);
});

check('the narrative leads with what was subtracted, not how often', () => {
  const text = buildScoreExplanation(measuredStats).narrative.join(' ');
  assert.match(text, /biggest contributor/);
  assert.match(text, /3\.0 points/);
});

check('a capping finding is called out as one', () => {
  // Two pipeline-disruption findings in a tick do not add up — only the deepest
  // cap applies — so the narrative has to say the totals rank rather than sum.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capped: any = {
    scores: {
      session: [measuredAt(0, 2, { 'dry-inbound-track': 5 })],
      perPc: {},
      perTrack: {},
    },
  };
  const text = buildScoreExplanation(capped).narrative.join(' ');
  assert.match(text, /cap or zero a score rather than subtracting/);
});

check('a keys-only window says the ranking is by frequency', () => {
  const e = buildScoreExplanation(stats);
  assert.equal(e.measured, false);
  assert.equal(e.totalPoints, null);
  assert.equal(e.clientPoints, null);
  assert.equal(e.reasons[0].points, null);
  assert.match(e.narrative.join(' '), /without saying what each one cost/);
});

check('a mixed window counts every tick but sums only the measured ones', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mixed: any = {
    scores: {
      session: [
        at(0, 3, ['transport-delay-degraded']),
        measuredAt(1, 3, { 'transport-delay-degraded': 1 }),
      ],
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
  assert.match(e.narrative.join(' '), /without magnitudes/);
});

check('an all-zero window is read as unmeasured, not as free of cost', () => {
  // observer-js folds a keys-only array into the record shape with a magnitude
  // of 0 on the way through, so this is what an old client relayed through the
  // observer looks like — keys, no real magnitudes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relayed: any = {
    scores: {
      session: [
        measuredAt(0, 3, { 'transport-delay-degraded': 0 }),
        measuredAt(1, 3, { 'transport-delay-degraded': 0 }),
      ],
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
      session: [measuredAt(0, 3, { 'video-flow-disrupted': 2, 'transport-delay-degraded': 0 })],
      perPc: {},
      perTrack: {},
    },
  };
  const e = buildScoreExplanation(mixedMagnitudes);
  assert.equal(e.measured, true);
  assert.equal(e.reasons.find((r) => r.meta.key === 'transport-delay-degraded')?.points, 0);
});

check('formatScoreReasons appends points only where the wire had them', () => {
  assert.deepEqual(formatScoreReasons(['video-flow-disrupted'], { 'video-flow-disrupted': 1.5 }), [
    'video-flow-disrupted −1.5',
  ]);
  // A whole number reads without a trailing .0.
  assert.deepEqual(formatScoreReasons(['pixelated-video'], { 'pixelated-video': 2 }), [
    'pixelated-video −2',
  ]);
  // Keys-only samples render bare rather than with an invented magnitude.
  assert.deepEqual(formatScoreReasons(['pixelated-video'], undefined), ['pixelated-video']);
  assert.deepEqual(formatScoreReasons(['a', 'b'], { a: 1 }), ['a −1', 'b']);
  // A zero is what observer-js writes when it relays a keys-only array, so it
  // renders bare rather than as a meaningless "−0".
  assert.deepEqual(formatScoreReasons(['pixelated-video'], { 'pixelated-video': 0 }), [
    'pixelated-video',
  ]);
  assert.deepEqual(formatScoreReasons(undefined, { a: 1 }), []);
});

console.log(`\n${passed} checks passed`);
