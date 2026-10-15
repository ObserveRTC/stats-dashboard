/**
 * The Web Worker's sample decoder agrees with the processor's.
 *
 *   node scripts/samplePatch.test.mjs
 *
 * There are two implementations of one wire format, and there is no arrangement
 * in which there is only one. This dashboard decodes a client's patch-encoded
 * `.jsonl` in a Web Worker, and a Worker built from a Blob cannot `import`
 * anything — so its copy is necessarily inlined in a string. The processor
 * (`src/digest-server/`) is a separate application in this same repository, and
 * it has an ordinary module. Sharing a checkout does not help: the Worker's
 * copy cannot be an import whatever is next to it.
 *
 * The risk that creates is the worst kind in this system: the dashboard and the
 * processor reading one archive and reporting different numbers, with nothing on
 * either screen to say which is wrong. A wrongly-dropped field does not look
 * like a bug — it looks like a stat the platform does not publish, which is a
 * state both apps treat as normal.
 *
 * So this extracts the Worker's `applyPatch` from the source it actually ships
 * and runs both against the same inputs. It is dev-time only; neither app
 * imports the other at runtime.
 *
 * If `src/digest-server/` is absent — extracted to its own repository — this
 * skips with a message rather than failing, and the agreement then has to be
 * kept by the contract between the two repos instead. While it is in this
 * repository that skip should never fire, and it is not the thing standing
 * between you and a vanished processor: scripts/noWritePath.test.ts asserts the
 * folder is there and really does write, and fails rather than skipping.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PROCESSOR_DECODER = new URL('../src/digest-server/samplePatch.mjs', import.meta.url);

if (!existsSync(fileURLToPath(PROCESSOR_DECODER))) {
  console.log('skipped: src/digest-server/ is not present, so there is no second decoder to compare');
  process.exit(0);
}

const { applyPatch: processorPatch } = await import(PROCESSOR_DECODER.href);

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/**
 * The Worker's own `applyPatch`, pulled out of the template literal it ships in.
 *
 * Read from the file rather than duplicated here, so this test cannot pass
 * against a copy that has drifted from what actually runs in the browser.
 */
function workerApplyPatch() {
  const source = readFileSync(new URL('../src/hooks/useStatsWorker.ts', import.meta.url), 'utf8');
  const start = source.indexOf('function applyPatch(');
  assert.notEqual(start, -1, 'the worker must still contain an applyPatch');

  const end = source.indexOf('`;', start);
  assert.notEqual(end, -1, 'could not find the end of the worker source');

  // Unescape the two sequences the template literal escapes.
  const code = source.slice(start, end).replace(/\\\\n/g, '\\n').replace(/\\\\`/g, '`');
  return new Function(`${code}; return applyPatch;`)();
}

const workerPatch = workerApplyPatch();

/** Inputs chosen to hit every branch either implementation has. */
const CASES = [
  ['a scalar replaces', { a: 1 }, { a: 2 }],
  ['a new key is added', { a: 1 }, { b: 2 }],
  ['null deletes', { a: 1, b: 2 }, { b: null }],
  ['a nested object merges', { a: { x: 1, y: 2 } }, { a: { y: 3 } }],
  ['a nested object gains a key', { a: { x: 1 } }, { a: { z: 9 } }],
  ['null deletes a nested key', { a: { x: 1, y: 2 } }, { a: { y: null } }],
  ['an array value replaces wholesale', { a: [1, 2, 3] }, { a: [9] }],
  ['an array of objects replaces wholesale', { a: [{ x: 1, y: 2 }] }, { a: [{ x: 5 }] }],
  ['an array replacing a scalar', { a: 1 }, { a: [1, 2] }],
  ['a scalar replacing an object', { a: { x: 1 } }, { a: 7 }],
  ['an object replacing a scalar', { a: 7 }, { a: { x: 1 } }],
  ['an object replacing null', { a: null }, { a: { x: 1 } }],
  ['a patch that is null', { a: 1 }, null],
  ['a patch that is a scalar', { a: 1 }, 5],
  ['an empty patch changes nothing', { a: 1, b: { c: 2 } }, {}],
  ['deeply nested merge', { a: { b: { c: { d: 1, e: 2 } } } }, { a: { b: { c: { e: 3 } } } }],
  [
    'a realistic stats patch',
    {
      timestamp: 1000,
      clientId: 'c1',
      peerConnections: [
        {
          peerConnectionId: 'pc1',
          inboundRtps: [{ id: 'in1', kind: 'audio', packetsReceived: 100, bytesReceived: 1000 }],
        },
      ],
    },
    {
      timestamp: 2000,
      peerConnections: [
        {
          peerConnectionId: 'pc1',
          inboundRtps: [{ id: 'in1', kind: 'audio', packetsReceived: 200, bytesReceived: 2000 }],
        },
      ],
    },
  ],
];

console.log('the worker and the processor decode identically');

for (const [name, base, patch] of CASES) {
  check(name, () => {
    const mine = workerPatch(structuredClone(base), structuredClone(patch));
    const theirs = processorPatch(structuredClone(base), structuredClone(patch));
    assert.deepEqual(
      mine,
      theirs,
      `the Worker and digest-server disagree on: ${name}\n` +
        `  worker:    ${JSON.stringify(mine)}\n` +
        `  processor: ${JSON.stringify(theirs)}`,
    );
  });
}

console.log(`\n${passed} checks passed`);
