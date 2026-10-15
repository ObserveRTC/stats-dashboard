/**
 * Reading a digest: folding a month out of its days, and rendering either.
 *
 *   node --experimental-strip-types scripts/digestModel.test.ts
 *
 * The dashboard does not build digests, so there is nothing here that turns a
 * call into a digest row — every input below is a `DigestDocument` of the shape
 * `docs/storage-layout.md` promises. Two things are worth testing about a
 * reader:
 *
 *   1. **The month fold.** It is the one place the dashboard still does
 *      arithmetic, and the arithmetic is the kind that produces a plausible
 *      wrong answer: summing peaks, or averaging averages, both look fine.
 *   2. **The view.** That an absent figure reads as absent rather than as zero,
 *      which is the difference between "nobody measured this" and "this is
 *      bad".
 */

import assert from 'node:assert/strict';
import {
  DIGEST_VERSION,
  type DigestCall,
  type DigestDocument,
  type DigestTotals,
} from '../src/schema/Digest.ts';
import {
  compactDuration,
  digestView,
  rollUpMonth,
  shiftDay,
} from '../src/utils/digestModel.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/** A call row, as a digest in the bucket carries one. */
function row(over: Partial<DigestCall> & { callId: string }): DigestCall {
  return {
    roomId: 'chess',
    startedAt: Date.UTC(2026, 9, 3, 14),
    durationMs: 600_000,
    clients: 2,
    peak: 2,
    issues: 0,
    turnClients: 0,
    score: 4,
    scoreSamples: 10,
    sfuIds: ['s1'],
    ...over,
  };
}

/** A day document, as the bucket carries one. */
function dayDoc(
  id: string,
  over: Omit<Partial<DigestDocument>, 'totals'> & { totals?: Partial<DigestTotals> } = {},
): DigestDocument {
  const { totals, ...rest } = over;
  return {
    version: DIGEST_VERSION,
    period: 'day',
    id,
    generatedAt: 1,
    totals: {
      calls: 1,
      joins: 2,
      busiestCall: 2,
      issues: 0,
      turnClients: 0,
      callTimeMs: 600_000,
      score: 4,
      scoreWeight: 10,
      ...totals,
    },
    buckets: Array.from({ length: 24 }, (_, i) => (i === 14 ? 1 : 0)),
    calls: [row({ callId: `call-${id}` })],
    worst: [],
    ...rest,
  };
}

console.log('a month folds from its days');

check('counts add', () => {
  const month = rollUpMonth(
    [
      dayDoc('2026-10-01', { totals: { calls: 2, joins: 5, issues: 3, turnClients: 1, callTimeMs: 1_000 } }),
      dayDoc('2026-10-02', { totals: { calls: 1, joins: 4, issues: 2, turnClients: 2, callTimeMs: 2_000 } }),
    ],
    '2026-10',
    { generatedAt: 1 },
  );
  assert.equal(month.period, 'month');
  assert.equal(month.id, '2026-10');
  assert.equal(month.totals.calls, 3);
  assert.equal(month.totals.joins, 9);
  assert.equal(month.totals.issues, 5);
  assert.equal(month.totals.turnClients, 3);
  assert.equal(month.totals.callTimeMs, 3_000);
});

check('peaks take the maximum, not the sum', () => {
  // Two days each peaking at four were not eight people at once, and nothing in
  // the data says whether anything overlapped.
  const month = rollUpMonth(
    [
      dayDoc('2026-10-01', { totals: { busiestCall: 4 } }),
      dayDoc('2026-10-02', { totals: { busiestCall: 7 } }),
      dayDoc('2026-10-03', { totals: { busiestCall: 3 } }),
    ],
    '2026-10',
  );
  assert.equal(month.totals.busiestCall, 7);
});

check('a month where no day counted a peak reports null, not zero', () => {
  const month = rollUpMonth([dayDoc('2026-10-01', { totals: { busiestCall: null } })], '2026-10');
  assert.equal(month.totals.busiestCall, null);
});

check('the score re-weights rather than averaging the days', () => {
  // Σ(score × weight) / Σ(weight). A plain mean of 2 and 5 would be 3.5 and
  // would let a near-empty day outvote a busy one.
  const month = rollUpMonth(
    [
      dayDoc('2026-10-01', { totals: { score: 2, scoreWeight: 100 } }),
      dayDoc('2026-10-02', { totals: { score: 5, scoreWeight: 10 } }),
    ],
    '2026-10',
  );
  assert.equal(month.totals.scoreWeight, 110);
  assert.ok(Math.abs((month.totals.score as number) - (2 * 100 + 5 * 10) / 110) < 1e-9);
  assert.notEqual(Number((month.totals.score as number).toFixed(2)), 3.5);
});

check('a day with no score is left out, never counted as zero', () => {
  // Zero would drag a month down for the sin of containing a day nothing could
  // be scored.
  const month = rollUpMonth(
    [
      dayDoc('2026-10-01', { totals: { score: 4, scoreWeight: 20 } }),
      dayDoc('2026-10-02', { totals: { score: null, scoreWeight: 0 } }),
    ],
    '2026-10',
  );
  assert.equal(month.totals.score, 4);
  assert.equal(month.totals.scoreWeight, 20);
  assert.equal(month.totals.calls, 2, 'the day still happened');
});

check('a scored day with no weight still counts, as one unit of evidence', () => {
  const month = rollUpMonth([dayDoc('2026-10-01', { totals: { score: 3, scoreWeight: 1 } })], '2026-10');
  assert.equal(month.totals.score, 3);
});

check('a month with no days at all is a document, not an absence', () => {
  const month = rollUpMonth([], '2026-10', { generatedAt: 1 });
  assert.equal(month.totals.calls, 0);
  assert.equal(month.totals.score, null);
  assert.equal(month.totals.scoreWeight, 0);
  assert.equal(month.buckets.length, 31);
  assert.deepEqual(month.worst, []);
  assert.ok(digestView(month).empty);
});

console.log('\nthe month strip and what it includes');

check('one bucket per day of the month, 1-indexed', () => {
  const month = rollUpMonth(
    [
      dayDoc('2026-02-01', { totals: { calls: 2 } }),
      dayDoc('2026-02-28', { totals: { calls: 1 } }),
    ],
    '2026-02',
  );
  assert.equal(month.buckets.length, 28);
  assert.equal(month.buckets[0], 2);
  assert.equal(month.buckets[27], 1);
});

check('a missing day is a zero bucket, not a refusal to report the month', () => {
  // Withholding the month until every day is in would hide a whole month
  // because of one gap.
  const month = rollUpMonth([dayDoc('2026-10-09', { totals: { calls: 1 } })], '2026-10');
  assert.equal(month.totals.calls, 1);
  assert.equal(month.buckets[8], 1);
  assert.equal(month.buckets[6], 0);
});

check('days from another month are ignored rather than folded in', () => {
  // A listing is not a promise, and an object filed under the wrong key must
  // not silently join a total it does not belong to.
  const month = rollUpMonth(
    [dayDoc('2026-10-01'), dayDoc('2026-11-01'), dayDoc('2026-1-1')],
    '2026-10',
  );
  assert.equal(month.totals.calls, 1);
});

check('a month document handed in among the days is not folded as a day', () => {
  // It would double every total it carries.
  const alreadyRolled = rollUpMonth([dayDoc('2026-10-01')], '2026-10');
  const month = rollUpMonth([dayDoc('2026-10-01'), alreadyRolled], '2026-10');
  assert.equal(month.totals.calls, 1);
});

check('a month carries no call rows, only its worst', () => {
  const bad = row({ callId: 'bad', score: 1.4 });
  const month = rollUpMonth([dayDoc('2026-10-01', { worst: [bad] })], '2026-10');
  assert.equal(month.calls, undefined);
  assert.deepEqual(month.worst.map((c) => c.callId), ['bad']);
  assert.equal(digestView(month).calls, null);
});

check('the worst list is the worst of the days, worst first and capped at five', () => {
  const month = rollUpMonth(
    [
      dayDoc('2026-10-01', {
        worst: [1.1, 2.4, 4.9].map((score, i) => row({ callId: `a${i}`, score })),
      }),
      dayDoc('2026-10-02', {
        worst: [1.9, 2.0, 3.2, 3.9].map((score, i) => row({ callId: `b${i}`, score })),
      }),
    ],
    '2026-10',
  );
  assert.equal(month.worst.length, 5);
  assert.deepEqual(month.worst.map((c) => c.score), [1.1, 1.9, 2.0, 2.4, 3.2]);
  // 4.9 is not a bad call and must not reach a "look here first" list.
  assert.ok(!month.worst.some((c) => (c.score as number) >= 4));
});

console.log('\nfolding a month is idempotent and order-independent');

check('re-folding the same days gives the same document', () => {
  // Whatever writes the digests may re-roll a month repeatedly; the dashboard
  // folds it on every page load that misses the roll-up.
  const days = [dayDoc('2026-10-01'), dayDoc('2026-10-02')];
  const first = rollUpMonth(days, '2026-10', { generatedAt: 1 });
  assert.deepEqual(rollUpMonth(days, '2026-10', { generatedAt: 1 }), first);
});

check('the order a listing happens to return the days in does not matter', () => {
  const days = [dayDoc('2026-10-01'), dayDoc('2026-10-02'), dayDoc('2026-10-09')];
  const forward = rollUpMonth(days, '2026-10', { generatedAt: 1 });
  assert.deepEqual(rollUpMonth([...days].reverse(), '2026-10', { generatedAt: 1 }), forward);
});

console.log('\nthe view adds the words back');

check('a stat exists for every figure, with a hint and no missing value', () => {
  const view = digestView(dayDoc('2026-10-03'));
  assert.deepEqual(view.stats.map((s) => s.key), ['calls', 'joins', 'quality', 'issues', 'turn', 'time']);
  for (const stat of view.stats) {
    assert.ok(stat.label, `${stat.key} needs a label`);
    assert.ok(stat.value !== '' && stat.value != null, `${stat.key} needs a value`);
    assert.ok(stat.hint && stat.hint.length > 20, `${stat.key} needs a hint`);
  }
});

check('an absent score shows a dash in muted grey, never 0.0', () => {
  const view = digestView(
    dayDoc('2026-10-03', {
      totals: { score: null, scoreWeight: 0 },
      calls: [row({ callId: 'c1', score: null, scoreSamples: 0 })],
    }),
  );
  const quality = view.stats.find((s) => s.key === 'quality');
  assert.equal(quality?.value, '—');
  assert.equal(quality?.unit, undefined);
  assert.equal(quality?.color, 'var(--text-muted)');
  assert.equal(view.calls?.[0]?.scoreColor, 'var(--text-muted)');
});

check('an absent busiest call leaves the brackets off rather than printing null', () => {
  const view = digestView(dayDoc('2026-10-03', { totals: { busiestCall: null } }));
  assert.equal(view.stats.find((s) => s.key === 'joins')?.unit, undefined);
  assert.equal(
    digestView(dayDoc('2026-10-03', { totals: { busiestCall: 5 } })).stats.find(
      (s) => s.key === 'joins',
    )?.unit,
    '(busiest call 5)',
  );
});

check('the hints say "day" for a day and "month" for a month', () => {
  const day = digestView(dayDoc('2026-10-03'));
  const month = digestView(rollUpMonth([dayDoc('2026-10-01')], '2026-10'));
  assert.ok(day.stats.find((s) => s.key === 'quality')?.hint?.includes('day'));
  assert.ok(month.stats.find((s) => s.key === 'quality')?.hint?.includes('month'));
  assert.equal(day.bucketUnit, 'hour');
  assert.equal(month.bucketUnit, 'day');
});

check('a score colour follows the same thresholds the rest of the dashboard uses', () => {
  const view = digestView(
    dayDoc('2026-10-03', {
      calls: [
        row({ callId: 'good', score: 4.5 }),
        row({ callId: 'fair', score: 3 }),
        row({ callId: 'poor', score: 1 }),
      ],
    }),
  );
  const byId = new Map(view.calls?.map((c) => [c.callId, c.scoreColor]));
  assert.equal(byId.get('good'), 'var(--quality-good)');
  assert.equal(byId.get('fair'), 'var(--quality-fair)');
  assert.equal(byId.get('poor'), 'var(--quality-poor)');
});

check('a period with calls is not empty, and one without is', () => {
  // `empty` drives which of two very different messages the panel shows, so it
  // follows the digest's own call count rather than whether rows were carried —
  // a month has no rows and is not empty.
  assert.equal(digestView(dayDoc('2026-10-03')).empty, false);
  assert.equal(digestView(dayDoc('2026-10-03', { totals: { calls: 0 } })).empty, true);
  assert.equal(digestView(rollUpMonth([dayDoc('2026-10-01')], '2026-10')).empty, false);
});

check('the write time is carried through, because nothing here is live', () => {
  assert.equal(digestView(dayDoc('2026-10-03', { generatedAt: 1_790_000_000_000 })).generatedAt, 1_790_000_000_000);
});

console.log('\ndate arithmetic in the stepper');

check('stepping a day crosses months and years, in UTC', () => {
  assert.equal(shiftDay('2026-10-03', -1), '2026-10-02');
  assert.equal(shiftDay('2026-10-01', -1), '2026-09-30');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDay('2024-02-28', 1), '2024-02-29');
  assert.equal(shiftDay('2026-02-28', 1), '2026-03-01');
});

check('a duration reads compactly, and nothing reads as 0m', () => {
  assert.equal(compactDuration(null), '—');
  assert.equal(compactDuration(0), '—');
  assert.equal(compactDuration(-5), '—');
  assert.equal(compactDuration(Number.NaN), '—');
  assert.equal(compactDuration(600_000), '10m');
  assert.equal(compactDuration(3_600_000), '1h 0m');
  assert.equal(compactDuration(5_400_000), '1h 30m');
});

console.log(`\n${passed} checks passed`);
