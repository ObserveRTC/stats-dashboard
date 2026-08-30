/**
 * Turning tab-visibility events into backgrounded stretches.
 *
 *   node --experimental-strip-types scripts/tabVisibility.test.ts
 *
 * client-monitor 4.7.0 sends `TAB_VISIBILITY_CHANGED` with `{ visible }`, and
 * the flag is the state the tab moved **to**. Reading it as "the tab was
 * visible during this sample" inverts every span, so the direction is what most
 * of these checks are about — that, and never inventing a span for a client
 * that does not report the event at all.
 */

import assert from 'node:assert/strict';
import { buildTabVisibility, isHiddenAt, visibilitySegments } from '../src/utils/tabVisibility.ts';

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sample(offsetMs: number, events: any[] = []): any {
  return { timestamp: T0 + offsetMs, clientEvents: events };
}

function vis(offsetMs: number, visible: boolean) {
  return {
    type: 'TAB_VISIBILITY_CHANGED',
    timestamp: T0 + offsetMs,
    payload: { visible },
  };
}

console.log('no event, no claim');

check('a client that never reports visibility yields nothing', () => {
  const v = buildTabVisibility([sample(0), sample(1000), sample(2000)]);
  assert.equal(v.reported, false);
  assert.deepEqual(v.hidden, []);
  assert.equal(v.hiddenMs, 0);
  // Not 0% — that would claim the tab was never backgrounded.
  assert.equal(v.hiddenRatio, null);
});

check('no samples at all is not an error', () => {
  assert.equal(buildTabVisibility([]).reported, false);
  assert.equal(buildTabVisibility(null).reported, false);
  assert.equal(buildTabVisibility(undefined).reported, false);
});

check('an event without a readable flag is skipped, not guessed', () => {
  const v = buildTabVisibility([
    sample(0, [{ type: 'TAB_VISIBILITY_CHANGED', timestamp: T0, payload: {} }]),
  ]);
  assert.equal(v.reported, false);
});

console.log('\nthe flag is the state moved to');

check('hidden runs from visible:false to the next visible:true', () => {
  const v = buildTabVisibility([
    sample(0),
    sample(2000, [vis(2000, false)]),
    sample(6000, [vis(6000, true)]),
    sample(9000),
  ]);
  assert.equal(v.reported, true);
  assert.deepEqual(v.hidden, [{ start: T0 + 2000, end: T0 + 6000, openEnded: false }]);
  assert.equal(v.hiddenMs, 4000);
  assert.equal(v.switches, 2);
});

check('a leading visible:true proves the tab started backgrounded', () => {
  // The event says what the tab moved *to*, so something preceded it.
  const v = buildTabVisibility([sample(0), sample(3000, [vis(3000, true)]), sample(5000)]);
  assert.equal(v.hiddenAtStart, true);
  assert.deepEqual(v.hidden, [{ start: T0, end: T0 + 3000, openEnded: false }]);
});

check('a leading visible:false does not back-fill a span', () => {
  const v = buildTabVisibility([sample(0), sample(1000, [vis(1000, false)]), sample(4000, [vis(4000, true)])]);
  assert.equal(v.hiddenAtStart, false);
  assert.equal(v.hidden[0].start, T0 + 1000);
});

check('a span never closed runs to the end of the session', () => {
  const v = buildTabVisibility([sample(0), sample(3000, [vis(3000, false)]), sample(10_000)]);
  assert.equal(v.hidden.length, 1);
  assert.equal(v.hidden[0].end, T0 + 10_000);
  // Flagged, because "still hidden when the capture stopped" is not the same
  // claim as "came back at this moment".
  assert.equal(v.hidden[0].openEnded, true);
});

console.log('\nmessy streams');

check('a re-announced state does not split the span', () => {
  const v = buildTabVisibility([
    sample(0),
    sample(1000, [vis(1000, false)]),
    sample(2000, [vis(2000, false)]),
    sample(3000, [vis(3000, false)]),
    sample(5000, [vis(5000, true)]),
  ]);
  assert.equal(v.hidden.length, 1);
  assert.equal(v.hiddenMs, 4000);
  assert.equal(v.switches, 2);
});

check('events out of order inside a sample still resolve', () => {
  const v = buildTabVisibility([sample(5000, [vis(5000, true), vis(2000, false)])]);
  assert.deepEqual(v.hidden, [{ start: T0 + 2000, end: T0 + 5000, openEnded: false }]);
});

check('an event with no timestamp falls back to its sample', () => {
  const v = buildTabVisibility([
    sample(0),
    sample(2000, [{ type: 'TAB_VISIBILITY_CHANGED', payload: { visible: false } }]),
    sample(4000, [{ type: 'TAB_VISIBILITY_CHANGED', payload: { visible: true } }]),
  ]);
  assert.deepEqual(v.hidden, [{ start: T0 + 2000, end: T0 + 4000, openEnded: false }]);
});

check('a payload written as a JSON string is still read', () => {
  const v = buildTabVisibility([
    sample(0),
    sample(1000, [{ type: 'TAB_VISIBILITY_CHANGED', timestamp: T0 + 1000, payload: '{"visible":false}' }]),
    sample(3000, [{ type: 'TAB_VISIBILITY_CHANGED', timestamp: T0 + 3000, payload: '{"visible":true}' }]),
  ]);
  assert.equal(v.hiddenMs, 2000);
});

check('several stretches are all kept, in order', () => {
  const v = buildTabVisibility([
    sample(0),
    sample(1000, [vis(1000, false)]),
    sample(2000, [vis(2000, true)]),
    sample(5000, [vis(5000, false)]),
    sample(6000, [vis(6000, true)]),
    sample(8000),
  ]);
  assert.equal(v.hidden.length, 2);
  assert.deepEqual(v.hidden.map((h) => h.start - T0), [1000, 5000]);
  assert.equal(v.hiddenMs, 2000);
  assert.equal(v.switches, 4);
});

console.log('\nreading the result');

check('the ratio is of the session, not of the events', () => {
  const v = buildTabVisibility(
    [sample(0), sample(2000, [vis(2000, false)]), sample(6000, [vis(6000, true)]), sample(10_000)],
    { sessionStart: T0, sessionEnd: T0 + 10_000 },
  );
  assert.equal(v.hiddenRatio, 0.4);
});

check('the session bounds passed in win over the sample bounds', () => {
  // The call started before this client's first sample, so the span is wider.
  const v = buildTabVisibility(
    [sample(1000), sample(2000, [vis(2000, false)]), sample(4000, [vis(4000, true)])],
    { sessionStart: T0 - 6000, sessionEnd: T0 + 14_000 },
  );
  assert.equal(v.hiddenMs, 2000);
  assert.equal(v.hiddenRatio, 0.1);
});

check('isHiddenAt answers for a moment inside a stretch', () => {
  const v = buildTabVisibility([
    sample(0),
    sample(2000, [vis(2000, false)]),
    sample(6000, [vis(6000, true)]),
  ]);
  assert.equal(isHiddenAt(v, T0 + 1000), false);
  assert.equal(isHiddenAt(v, T0 + 3000), true);
  assert.equal(isHiddenAt(v, T0 + 6000), true);
  assert.equal(isHiddenAt(v, T0 + 7000), false);
});

check('other client events are ignored', () => {
  const v = buildTabVisibility([
    sample(0, [{ type: 'MEDIA_TRACK_MUTED', timestamp: T0, payload: { visible: false } }]),
  ]);
  assert.equal(v.reported, false);
});

console.log('\nthe lane: back-to-back segments');

const twoStretches = buildTabVisibility([
  sample(0),
  sample(2000, [vis(2000, false)]),
  sample(4000, [vis(4000, true)]),
  sample(7000, [vis(7000, false)]),
  sample(8000, [vis(8000, true)]),
  sample(10_000),
]);

check('the gaps between hidden stretches are filled in as visible', () => {
  // A lane has to say what the tab was doing at every moment, so `hidden`
  // alone cannot be drawn — the visible stretches have to be materialised.
  const segments = visibilitySegments(twoStretches, T0, T0 + 10_000);
  assert.deepEqual(
    segments.map((s) => [s.start - T0, s.end - T0, s.visible]),
    [
      [0, 2000, true],
      [2000, 4000, false],
      [4000, 7000, true],
      [7000, 8000, false],
      [8000, 10_000, true],
    ],
  );
});

check('segments are contiguous and cover the range exactly', () => {
  const segments = visibilitySegments(twoStretches, T0, T0 + 10_000);
  assert.equal(segments[0].start, T0);
  assert.equal(segments[segments.length - 1].end, T0 + 10_000);
  for (let i = 1; i < segments.length; i++) {
    assert.equal(segments[i].start, segments[i - 1].end, `gap before segment ${i}`);
  }
});

check('a narrower chart domain clips rather than overflows', () => {
  const segments = visibilitySegments(twoStretches, T0 + 3000, T0 + 5000);
  assert.deepEqual(
    segments.map((s) => [s.start - T0, s.end - T0, s.visible]),
    [
      [3000, 4000, false],
      [4000, 5000, true],
    ],
  );
});

check('a client that never reported gets no lane at all', () => {
  // Not one long "visible" segment — that would be a claim nothing supports.
  const none = buildTabVisibility([sample(0), sample(5000)]);
  assert.deepEqual(visibilitySegments(none, T0, T0 + 5000), []);
});

check('an empty or inverted range yields nothing', () => {
  assert.deepEqual(visibilitySegments(twoStretches, T0, T0), []);
  assert.deepEqual(visibilitySegments(twoStretches, T0 + 5000, T0), []);
});

check('a stretch that never closed stays flagged in the lane', () => {
  const open = buildTabVisibility([sample(0), sample(3000, [vis(3000, false)]), sample(9000)]);
  const segments = visibilitySegments(open, T0, T0 + 9000);
  assert.equal(segments.length, 2);
  assert.equal(segments[1].visible, false);
  assert.equal(segments[1].openEnded, true);
});

check('a session that opened backgrounded starts the lane grey', () => {
  const late = buildTabVisibility([sample(0), sample(3000, [vis(3000, true)]), sample(6000)]);
  const segments = visibilitySegments(late, T0, T0 + 6000);
  assert.equal(segments[0].visible, false);
  assert.equal(segments[0].start, T0);
});

console.log(`\n${passed} checks passed`);
