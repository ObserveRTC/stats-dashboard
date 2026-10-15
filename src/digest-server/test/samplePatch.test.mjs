/**
 * The patch decoder.
 *
 *   node test/samplePatch.test.mjs
 *
 * This app's own copy of the decoder, tested on its own terms. The *other*
 * half of the safety story lives in the dashboard: `scripts/samplePatch.test.ts`
 * there extracts its Web Worker's inlined `applyPatch` and asserts it agrees
 * with this module, case by case. Neither test creates a runtime dependency —
 * the two apps share only the digest contract.
 */

import assert from 'node:assert/strict';
import { applyPatch, decodePatchedJsonl } from '../samplePatch.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log('applying one patch');

check('a scalar replaces', () => {
  assert.deepEqual(applyPatch({ a: 1 }, { a: 2 }), { a: 2 });
});

check('a new key is added, and an untouched one survives', () => {
  assert.deepEqual(applyPatch({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
});

check('a nested object merges rather than replacing', () => {
  // The reason this is not RFC 7386 Merge Patch for objects either way round:
  // a stats object changes a few counters per tick and the rest must persist.
  assert.deepEqual(applyPatch({ a: { x: 1, y: 2 } }, { a: { y: 3 } }), { a: { x: 1, y: 3 } });
});

check('null deletes rather than assigning null', () => {
  // Absent and present-and-null are different facts downstream: a missing stat
  // was never reported, while a null count means unknown.
  const out = applyPatch({ a: 1, b: 2 }, { b: null });
  assert.equal('b' in out, false);
  assert.deepEqual(out, { a: 1 });
});

check('null deletes a nested key too', () => {
  assert.deepEqual(applyPatch({ a: { x: 1, y: 2 } }, { a: { y: null } }), { a: { x: 1 } });
});

check('an array value is replaced, not merged element by element', () => {
  // Load-bearing: it means the encoder must send complete array elements. A
  // patch carrying only an element's changed fields would drop the rest, and a
  // dropped stat reads as a field the platform does not publish — a state this
  // system treats as normal, so the loss would be invisible.
  const out = applyPatch({ a: [{ x: 1, y: 2 }] }, { a: [{ x: 5 }] });
  assert.deepEqual(out.a, [{ x: 5 }]);
  assert.equal(out.a[0].y, undefined, 'y is gone, because the array was replaced');
});

check('a type change replaces outright, either direction', () => {
  assert.deepEqual(applyPatch({ a: { x: 1 } }, { a: 7 }), { a: 7 });
  assert.deepEqual(applyPatch({ a: 7 }, { a: { x: 1 } }), { a: { x: 1 } });
  assert.deepEqual(applyPatch({ a: null }, { a: { x: 1 } }), { a: { x: 1 } });
  assert.deepEqual(applyPatch({ a: 1 }, { a: [1, 2] }), { a: [1, 2] });
});

check('a patch that is not an object replaces the whole value', () => {
  assert.equal(applyPatch({ a: 1 }, null), null);
  assert.equal(applyPatch({ a: 1 }, 5), 5);
});

check('an empty patch changes nothing', () => {
  assert.deepEqual(applyPatch({ a: 1, b: { c: 2 } }, {}), { a: 1, b: { c: 2 } });
});

check('the base is not mutated', () => {
  // The decoder hands out one object per sample so two consecutive samples can
  // be differenced. Sharing structure would make every delta zero.
  const base = { a: { x: 1 } };
  applyPatch(base, { a: { x: 2 } });
  assert.equal(base.a.x, 1);
});

console.log('\ndecoding a stream');

check('the first line is whole and the rest are patches', () => {
  const jsonl = [
    JSON.stringify({ t: 1, keep: 'me', n: 1 }),
    JSON.stringify({ t: 2, n: 2 }),
    JSON.stringify({ t: 3, n: 3 }),
  ].join('\n');

  const samples = decodePatchedJsonl(jsonl);
  assert.equal(samples.length, 3);
  assert.deepEqual(
    samples.map((s) => s.n),
    [1, 2, 3],
  );
  // The field only the first line carried survives to the last sample.
  assert.deepEqual(
    samples.map((s) => s.keep),
    ['me', 'me', 'me'],
  );
});

check('each sample is a separate object, so two can be differenced', () => {
  const jsonl = [JSON.stringify({ n: 1 }), JSON.stringify({ n: 2 })].join('\n');
  const [first, second] = decodePatchedJsonl(jsonl);
  assert.notEqual(first, second);
  assert.equal(second.n - first.n, 1);
});

check('a realistic stats patch keeps the fields it does not mention', () => {
  const base = {
    timestamp: 1000,
    clientId: 'c1',
    peerConnections: [
      {
        peerConnectionId: 'pc1',
        inboundRtps: [{ id: 'in1', kind: 'audio', packetsReceived: 100, bytesReceived: 1000 }],
      },
    ],
  };
  const patch = {
    timestamp: 2000,
    peerConnections: [
      {
        peerConnectionId: 'pc1',
        inboundRtps: [{ id: 'in1', kind: 'audio', packetsReceived: 200, bytesReceived: 2000 }],
      },
    ],
  };

  const [, second] = decodePatchedJsonl([JSON.stringify(base), JSON.stringify(patch)].join('\n'));
  assert.equal(second.clientId, 'c1', 'a top-level field the patch omits persists');
  assert.equal(second.peerConnections[0].inboundRtps[0].kind, 'audio');
  assert.equal(second.peerConnections[0].inboundRtps[0].packetsReceived, 200);
});

check('blank lines and trailing newlines are ignored', () => {
  const jsonl = `${JSON.stringify({ n: 1 })}\n\n${JSON.stringify({ n: 2 })}\n`;
  assert.equal(decodePatchedJsonl(jsonl).length, 2);
  assert.deepEqual(decodePatchedJsonl(''), []);
  assert.deepEqual(decodePatchedJsonl('   \n  \n'), []);
  assert.deepEqual(decodePatchedJsonl(null), []);
});

check('a malformed line stops the decode and names itself', () => {
  // Continuing past a bad patch would build every later sample on a base that
  // never existed, producing plausible numbers from a fiction.
  const jsonl = [JSON.stringify({ n: 1 }), '{not json', JSON.stringify({ n: 3 })].join('\n');
  assert.throws(() => decodePatchedJsonl(jsonl), /line 2/);
});

console.log(`\n${passed} checks passed`);
