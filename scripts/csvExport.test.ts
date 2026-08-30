/**
 * Copying a stats subsection to the clipboard as CSV.
 *
 *   node --experimental-strip-types scripts/csvExport.test.ts
 *
 * The three ways this conversion silently ruins data — a field that only shows
 * up in later samples, a value carrying commas or quotes, and text a
 * spreadsheet executes as a formula — are what most of these checks are about.
 */

import assert from 'node:assert/strict';
import { toCsv, escapeCsvValue } from '../src/utils/csvExport.ts';

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/** Split a CSV back into rows, for asserting on shape. */
function lines(csv: string): string[] {
  return csv.split('\r\n');
}

console.log('nothing to copy');

check('no rows yields an empty string, not a lone header', () => {
  // The button uses this to stay inert rather than putting a header row with
  // no data on someone's clipboard.
  assert.equal(toCsv([]), '');
  assert.equal(toCsv(null), '');
  assert.equal(toCsv(undefined), '');
});

check('rows with no fields yield nothing', () => {
  assert.equal(toCsv([{}, {}]), '');
});

console.log('\nthe column union');

check('a field appearing only in a later sample is still a column', () => {
  // The bug this exists to prevent: browsers start reporting some fields only
  // once they have a value, so reading columns off the first row drops them —
  // and the copy looks complete while missing data.
  const csv = toCsv([
    { timestamp: T0, packetsReceived: 10 },
    { timestamp: T0 + 1000, packetsReceived: 25, framesDecoded: 3 },
  ]);
  const [header, first, second] = lines(csv);
  assert.equal(header, 'timestamp,timestampIso,packetsReceived,framesDecoded');
  // The row that predates the field gets an empty cell, not a zero.
  assert.ok(first.endsWith(',10,'), first);
  assert.ok(second.endsWith(',25,3'), second);
});

check('columns keep first-seen order', () => {
  assert.equal(lines(toCsv([{ b: 1, a: 2 }, { c: 3 }]))[0], 'b,a,c');
});

check('the timestamp leads and carries an ISO column beside it', () => {
  const [header, row] = lines(toCsv([{ jitter: 0.01, timestamp: T0 }]));
  assert.equal(header, 'timestamp,timestampIso,jitter');
  assert.equal(row, `${T0},2023-11-14T22:13:20.000Z,0.01`);
});

check('explicit leading columns win over the timestamp default', () => {
  const csv = toCsv([{ a: 1, ssrc: 42, timestamp: T0 }], { leadingColumns: ['ssrc', 'timestamp'] });
  assert.equal(lines(csv)[0], 'ssrc,timestamp,timestampIso,a');
});

check('a leading column that does not exist is skipped, not emitted empty', () => {
  assert.equal(lines(toCsv([{ a: 1 }], { leadingColumns: ['nope', 'a'] }))[0], 'a');
});

console.log('\nquoting');

check('commas, quotes and newlines follow RFC 4180', () => {
  assert.equal(escapeCsvValue('a,b'), '"a,b"');
  assert.equal(escapeCsvValue('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvValue('one\ntwo'), '"one\ntwo"');
  assert.equal(escapeCsvValue('trailing '), '"trailing "');
});

check('a candidate URL with a comma survives the round trip', () => {
  const csv = toCsv([{ timestamp: T0, url: 'turn:1.2.3.4:3478?transport=udp,tcp' }]);
  assert.ok(lines(csv)[1].includes('"turn:1.2.3.4:3478?transport=udp,tcp"'));
});

check('plain values are not quoted needlessly', () => {
  assert.equal(escapeCsvValue('opus'), 'opus');
  assert.equal(escapeCsvValue(42), '42');
});

console.log('\nvalues');

check('a missing reading is empty, never the word null', () => {
  assert.equal(lines(toCsv([{ timestamp: T0, jitter: null, rtt: undefined }]))[1],
    `${T0},2023-11-14T22:13:20.000Z,,`);
});

check('booleans read as words, not 0 and 1', () => {
  assert.equal(escapeCsvValue(true), 'true');
  assert.equal(escapeCsvValue(false), 'false');
});

check('NaN and Infinity become empty rather than poisoning a column', () => {
  assert.equal(escapeCsvValue(NaN), '');
  assert.equal(escapeCsvValue(Infinity), '');
});

check('a nested object is JSON, not [object Object]', () => {
  assert.equal(escapeCsvValue({ a: 1 }), '"{""a"":1}"');
});

check('a Date renders as ISO', () => {
  assert.equal(escapeCsvValue(new Date(T0)), '2023-11-14T22:13:20.000Z');
});

console.log('\nformula injection');

check('text a spreadsheet would execute is defused', () => {
  // Excel and Sheets run these on paste. The apostrophe is stripped on display.
  assert.equal(escapeCsvValue('=1+1'), "'=1+1");
  assert.equal(escapeCsvValue('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(escapeCsvValue('+HYPERLINK("http://x")'), '"\'+HYPERLINK(""http://x"")"');
});

check('a negative number is a number, not an attack', () => {
  // Why the guard tests the type and not just the leading character: blanket
  // escaping a leading `-` would mangle every negative reading.
  assert.equal(escapeCsvValue(-42), '-42');
  assert.equal(escapeCsvValue(-0.001), '-0.001');
});

console.log('\na realistic subsection');

check('an inbound RTP series carries every field it ever reported', () => {
  const csv = toCsv([
    { timestamp: T0, ssrc: 966900604, kind: 'video', packetsReceived: 0, packetsLost: 0 },
    { timestamp: T0 + 1000, ssrc: 966900604, kind: 'video', packetsReceived: 120, packetsLost: 1, framesDecoded: 24 },
    { timestamp: T0 + 2000, ssrc: 966900604, kind: 'video', packetsReceived: 245, packetsLost: 1, framesDecoded: 49, qualityLimitationReason: 'cpu' },
  ]);
  const rows = lines(csv);
  assert.equal(rows.length, 4);
  assert.equal(
    rows[0],
    'timestamp,timestampIso,ssrc,kind,packetsReceived,packetsLost,framesDecoded,qualityLimitationReason',
  );
  // Every row the same width, which is what a paste into a spreadsheet needs.
  const widths = new Set(rows.map((r) => r.split(',').length));
  assert.equal(widths.size, 1, `ragged rows: ${[...widths].join(', ')}`);
});

check('the first line is the header, with no title above it', () => {
  // The compact clipboard CSV in `metricSeriesExport` opens with a title line;
  // this one must not, or every column name lands one row down on paste.
  const rows = lines(toCsv([{ timestamp: T0, jitter: 1 }]));
  assert.ok(rows[0].startsWith('timestamp,'), rows[0]);
});

console.log(`\n${passed} checks passed`);
