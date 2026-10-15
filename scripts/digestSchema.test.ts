/**
 * The digest layout and the stored document.
 *
 *   node --experimental-strip-types scripts/digestSchema.test.ts
 *
 * `normalizeDigest` is the boundary between a bucket written by something
 * outside this repository — possibly a different version of it, possibly
 * mid-PUT — and a page that does arithmetic on what comes back. The interesting cases are all about refusing
 * to be confidently wrong: a version that is not this one, a document filed
 * under a key that disagrees with its own id, a score with no weight behind it.
 */

import assert from 'node:assert/strict';
import {
  DIGEST_VERSION,
  daysInMonth,
  digestDay,
  digestDayKey,
  digestMonth,
  digestMonthFolder,
  digestMonthKey,
  isDigestDay,
  isDigestMonth,
  monthOfDay,
  normalizeDigest,
  parseDigestDayKey,
} from '../src/schema/Digest.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/** A minimal valid day document. */
function dayDoc(over: Record<string, unknown> = {}) {
  return {
    version: DIGEST_VERSION,
    period: 'day',
    id: '2026-10-03',
    generatedAt: 1_790_000_000_000,
    totals: {
      calls: 2,
      joins: 5,
      busiestCall: 3,
      issues: 1,
      turnClients: 0,
      callTimeMs: 600_000,
      score: 4.2,
      scoreWeight: 80,
    },
    buckets: Array.from({ length: 24 }, (_, i) => (i === 14 ? 2 : 0)),
    calls: [],
    worst: [],
    ...over,
  };
}

console.log('periods and keys');

check('a day and a month are both UTC readings of an instant', () => {
  assert.equal(digestDay(Date.UTC(2026, 9, 3, 23, 59)), '2026-10-03');
  assert.equal(digestMonth(Date.UTC(2026, 9, 3)), '2026-10');
  assert.equal(monthOfDay('2026-10-03'), '2026-10');
});

check('the day lives in its month folder; the month roll-up sits beside it', () => {
  // Beside, not inside, so listing `2026-10/` contains days and nothing else —
  // a reader iterating the month never has to recognise and skip a
  // differently-shaped object in the middle of them.
  assert.equal(digestDayKey('2026-10-03'), '2026-10/2026-10-03.json');
  assert.equal(digestMonthKey('2026-10'), '2026-10.json');
  assert.equal(digestMonthFolder('2026-10'), '2026-10/');
  assert.ok(!digestMonthKey('2026-10').startsWith(digestMonthFolder('2026-10')));
});

check('a day key round-trips', () => {
  for (const day of ['2026-01-01', '2026-10-03', '2024-02-29', '2026-12-31']) {
    assert.equal(parseDigestDayKey(digestDayKey(day)), day, day);
  }
});

check('a day filed in the wrong month is refused, not attributed to the folder', () => {
  // A writer bug, and a quiet one: reading the folder would put November's
  // calls into October's total.
  assert.equal(parseDigestDayKey('2026-10/2026-11-03.json'), null);
});

check('anything that is not a day digest returns null', () => {
  for (const key of [
    '',
    '2026-10.json',
    '2026-10/',
    '2026-10/2026-10-03.txt',
    '2026-10/2026-10-32.json',
    '2026-13/2026-13-01.json',
    '2026-10/nested/2026-10-03.json',
    '2026-10-03.json',
  ]) {
    assert.equal(parseDigestDayKey(key), null, `"${key}" should not parse`);
  }
});

console.log('\nperiod names are validated, not pattern-matched');

check('well-formed impossibilities are refused without throwing', () => {
  assert.equal(isDigestMonth('2026-13'), false);
  assert.equal(isDigestMonth('2026-00'), false);
  assert.equal(isDigestDay('2026-02-30'), false);
  assert.equal(isDigestDay('2025-02-29'), false);
  assert.ok(isDigestDay('2024-02-29'));
  assert.ok(isDigestMonth('2026-02'));
});

check('a month knows how many days it has, leap years included', () => {
  assert.equal(daysInMonth('2026-01'), 31);
  assert.equal(daysInMonth('2026-04'), 30);
  assert.equal(daysInMonth('2026-02'), 28);
  assert.equal(daysInMonth('2024-02'), 29);
  assert.equal(daysInMonth('2000-02'), 29);
  assert.equal(daysInMonth('1900-02'), 28);
  assert.equal(daysInMonth('2026-12'), 31);
});

console.log('\nreading a stored document');

check('a well-formed day is read as written', () => {
  const doc = normalizeDigest(dayDoc());
  assert.ok(doc);
  assert.equal(doc.period, 'day');
  assert.equal(doc.id, '2026-10-03');
  assert.equal(doc.totals.score, 4.2);
  assert.equal(doc.totals.scoreWeight, 80);
  assert.equal(doc.buckets.length, 24);
  assert.equal(doc.buckets[14], 2);
});

check('a document from another version is refused outright', () => {
  // Reading it field by field would mostly work, which is the problem:
  // "mostly" means a field whose meaning changed is rendered as if it had not.
  assert.equal(normalizeDigest(dayDoc({ version: DIGEST_VERSION + 1 })), null);
  assert.equal(normalizeDigest(dayDoc({ version: 0 })), null);
  assert.equal(normalizeDigest(dayDoc({ version: '1' })), null);
});

check('a document with no usable period or id is refused', () => {
  assert.equal(normalizeDigest(dayDoc({ period: 'week' })), null);
  assert.equal(normalizeDigest(dayDoc({ id: '2026-10' })), null);
  assert.equal(normalizeDigest(dayDoc({ id: '2026-02-30' })), null);
  assert.equal(normalizeDigest(dayDoc({ totals: undefined })), null);
  assert.equal(normalizeDigest(null), null);
  assert.equal(normalizeDigest([dayDoc()]), null);
  assert.equal(normalizeDigest('{}'), null);
});

check('a month is identified by a YYYY-MM id and gets that month width', () => {
  const doc = normalizeDigest({ ...dayDoc(), period: 'month', id: '2026-02', calls: undefined });
  assert.ok(doc);
  assert.equal(doc.buckets.length, 28);
  // A month carries no call rows. `calls` absent is the shape, not an error.
  assert.equal(doc.calls, undefined);
});

check('buckets are padded and truncated to the period, never trusted', () => {
  // The axis is presentation: a short array is still worth rendering, and the
  // gap draws as a quiet hour rather than crashing the strip.
  assert.equal(normalizeDigest(dayDoc({ buckets: [1, 2] }))?.buckets.length, 24);
  assert.equal(normalizeDigest(dayDoc({ buckets: undefined }))?.buckets.length, 24);
  const long = normalizeDigest(dayDoc({ buckets: Array.from({ length: 50 }, () => 1) }));
  assert.equal(long?.buckets.length, 24);
  // Negatives and non-numbers become zero rather than drawing a bar upwards.
  assert.deepEqual(normalizeDigest(dayDoc({ buckets: [-3, 'x', null, 4] }))?.buckets.slice(0, 4), [
    0, 0, 0, 4,
  ]);
});

check('a score with no stated weight is given weight 1, not weight 0', () => {
  // Weight 0 would make the score invisible to a month's roll-up — the figure
  // would be on the day and absent from the month, which reads as a bug in the
  // month rather than a gap in the day.
  const doc = normalizeDigest(dayDoc({ totals: { ...dayDoc().totals, scoreWeight: undefined } }));
  assert.equal(doc?.totals.score, 4.2);
  assert.equal(doc?.totals.scoreWeight, 1);
});

check('no score means no weight, so nothing is averaged in', () => {
  const doc = normalizeDigest(
    dayDoc({ totals: { ...dayDoc().totals, score: undefined, scoreWeight: 999 } }),
  );
  assert.equal(doc?.totals.score, null);
  assert.equal(doc?.totals.scoreWeight, 0);
});

check('a missing busiestCall is null, which is not zero', () => {
  // Zero would claim no call had any participants; null says nobody counted.
  const doc = normalizeDigest(dayDoc({ totals: { ...dayDoc().totals, busiestCall: undefined } }));
  assert.equal(doc?.totals.busiestCall, null);
});

check('counts cannot go negative, whatever the object says', () => {
  const doc = normalizeDigest(
    dayDoc({ totals: { ...dayDoc().totals, calls: -5, joins: 'many', issues: Number.NaN } }),
  );
  assert.equal(doc?.totals.calls, 0);
  assert.equal(doc?.totals.joins, 0);
  assert.equal(doc?.totals.issues, 0);
});

check('a call row survives a missing field without losing the row', () => {
  const doc = normalizeDigest(
    dayDoc({ calls: [{ callId: 'c1' }, { callId: 'c2', score: 3, roomId: '' }, 'nonsense'] }),
  );
  assert.equal(doc?.calls?.length, 3);
  assert.deepEqual(doc?.calls?.[0], {
    callId: 'c1',
    durationMs: null,
    clients: null,
    peak: null,
    issues: 0,
    turnClients: 0,
    score: null,
    scoreSamples: 0,
    sfuIds: [],
  });
  // An empty roomId is dropped rather than carried, so the UI's "can I open
  // this" check is a simple presence test.
  assert.equal(doc?.calls?.[1]?.roomId, undefined);
  assert.equal(doc?.calls?.[1]?.scoreSamples, 1);
  assert.equal(doc?.calls?.[2]?.callId, '');
});

check('a field this version does not know is dropped, not carried through', () => {
  // `incomplete` existed in an earlier draft, when this repository also
  // produced the digests. It has no defined meaning now, so it must not survive
  // into the shape the UI reads: a number whose meaning the reader cannot vouch
  // for is worse than no number. Same for a field a future producer adds — it
  // is ignored until this version knows what it means.
  const read = normalizeDigest(dayDoc({ incomplete: 3, somethingNewer: true }));
  assert.ok(read);
  assert.equal('incomplete' in read, false);
  assert.equal('somethingNewer' in read, false);
});

check('the per-call peak is read, because the fold recomputes the maximum', () => {
  // A maximum cannot be recomputed from a maximum once one of the rows behind
  // it changes, so the peak has to survive the round trip per call.
  const read = normalizeDigest(dayDoc({ calls: [{ callId: 'c1', clients: 9, peak: 4 }] }));
  assert.equal(read?.calls?.[0]?.peak, 4);
  // Absent is null, not zero: zero would claim nobody was ever in the call.
  assert.equal(normalizeDigest(dayDoc({ calls: [{ callId: 'c2' }] }))?.calls?.[0]?.peak, null);
});

console.log(`\n${passed} checks passed`);
