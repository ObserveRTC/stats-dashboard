/**
 * One call, many summaries.
 *
 *   node --experimental-strip-types scripts/callSummaryMerge.test.ts
 *
 * A call can be spread across several SFUs, with an observer on each writing
 * its own `call-summary-<sfuId>.json`. No single file is the call. What is
 * tested here is the part that is easy to get wrong: merging is not summing,
 * and the fields that cannot be recombined have to be dropped rather than
 * approximated.
 */

import assert from 'node:assert/strict';
import {
  isCallSummaryName,
  mergeCallSummaries,
  normalizeCallSummary,
  sfuIdFromSummaryName,
  type CallSummaryPart,
} from '../src/schema/CallSummary.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function part(name: string, raw: unknown): CallSummaryPart {
  const summary = normalizeCallSummary(raw);
  assert.ok(summary, `${name} did not normalize`);
  return { summary, key: name, sfuId: sfuIdFromSummaryName(name) };
}

console.log('summary object names');

check('the legacy name and the per-SFU name are both summaries', () => {
  assert.equal(isCallSummaryName('call-summary.json'), true);
  assert.equal(isCallSummaryName('call-summary-sfu-eu-1.json'), true);
});

check('a client file is never mistaken for a summary', () => {
  // This is the bug the prefix match exists to prevent: a per-SFU summary read
  // as a client file becomes a phantom client named after an SFU.
  assert.equal(isCallSummaryName('bbf472c0-3f0f-4450-8c4c-224821885d8c.jsonl'), false);
  assert.equal(isCallSummaryName('mediasoup-router-16b4864a.json'), false);
  assert.equal(isCallSummaryName('call-summaries.json'), false);
  assert.equal(isCallSummaryName('call-summary'), false);
});

check('the SFU id comes off the filename, and only off a suffixed one', () => {
  assert.equal(sfuIdFromSummaryName('call-summary-sfu-eu-1.json'), 'sfu-eu-1');
  assert.equal(sfuIdFromSummaryName('call-summary.json'), undefined);
  assert.equal(sfuIdFromSummaryName('call-summary-.json'), undefined);
  assert.equal(sfuIdFromSummaryName('whatever.json'), undefined);
});

console.log('\nbackward compatibility');

const single = {
  callId: 'call-1',
  attachments: {
    roomId: 'chess',
    clients: { 'client-a': { displayName: 'Ada' } },
    routerIds: ['router-1'],
    numberOfClientIssues: 3,
    clientsUsedTurn: ['client-a'],
  },
  clients: { clientIds: ['client-a'], peak: 2, joined: 2, left: 2 },
  scores: { samples: 40, min: 2, max: 5, median: 4.2 },
  startedAt: 1000,
  endedAt: 5000,
  durationInMs: 4000,
  closedAt: 6000,
};

check('a single call-summary.json survives the merge unchanged', () => {
  const merged = mergeCallSummaries([part('call-summary.json', single)]);
  assert.ok(merged);
  assert.equal(merged.roomId, 'chess');
  assert.equal(merged.callId, 'call-1');
  assert.deepEqual(merged.routerIds, ['router-1']);
  assert.equal(merged.clients['client-a'].displayName, 'Ada');
  assert.equal(merged.clients['client-a'].turnConnected, true);
  assert.equal(merged.numberOfClientIssues, 3);
  // The one thing a merge of one must never do is drop the median.
  assert.equal(merged.scores?.median, 4.2);
  assert.equal(merged.unmergeable, undefined);
});

check('even a merge of one records where it came from', () => {
  const merged = mergeCallSummaries([part('call-summary.json', single)]);
  assert.equal(merged?.sources?.length, 1);
  assert.equal(merged?.sources?.[0].key, 'call-summary.json');
  // No suffix, no attachment — so nothing claims to know the SFU.
  assert.equal(merged?.sources?.[0].sfuId, undefined);
  assert.equal(merged?.sfuIds, undefined);
});

check('nothing in is null, not an empty summary', () => {
  // A call still running has no summary yet, which must stay distinguishable
  // from a call that ended with nothing in it.
  assert.equal(mergeCallSummaries([]), null);
});

console.log('\ntwo SFUs, one call');

const sfuA = {
  callId: 'call-1',
  attachments: {
    roomId: 'chess',
    sfuId: 'sfu-eu',
    clients: { 'client-a': { displayName: 'Ada' }, 'client-shared': {} },
    routerIds: ['router-eu'],
    numberOfClientIssues: 3,
    clientsUsedTurn: ['client-a'],
  },
  clients: { clientIds: ['client-a', 'client-shared'], peak: 2, joined: 2, left: 1 },
  scores: { samples: 40, min: 2, max: 5, median: 4.2, mean: 4 },
  startedAt: 1000,
  endedAt: 5000,
  closedAt: 6000,
};

const sfuB = {
  callId: 'call-1',
  attachments: {
    roomId: 'chess',
    clients: { 'client-b': { displayName: 'Grace' }, 'client-shared': {} },
    routerIds: ['router-us'],
    numberOfClientIssues: 4,
    clientsUsedTurn: [],
  },
  clients: { clientIds: ['client-b', 'client-shared'], peak: 3, joined: 2, left: 2 },
  scores: { samples: 10, min: 3, max: 4.5, median: 3.9, mean: 3.5 },
  startedAt: 2000,
  endedAt: 9000,
  closedAt: 9500,
};

const both = () => [
  part('call-summary-sfu-eu.json', sfuA),
  part('call-summary-sfu-us.json', sfuB),
];

check('clients and routers union rather than collide', () => {
  const merged = mergeCallSummaries(both());
  assert.deepEqual(Object.keys(merged!.clients).sort(), [
    'client-a',
    'client-b',
    'client-shared',
  ]);
  assert.deepEqual(merged!.routerIds, ['router-eu', 'router-us']);
  assert.deepEqual(merged!.clientsUsedTurn, ['client-a']);
});

check('the call spans the outer bound of every part', () => {
  const merged = mergeCallSummaries(both());
  assert.equal(merged!.startedAt, 1000);
  assert.equal(merged!.endedAt, 9000);
  assert.equal(merged!.durationInMs, 8000);
  assert.equal(merged!.closedAt, 9500);
});

check('issue counts sum across the observers that raised them', () => {
  assert.equal(mergeCallSummaries(both())!.numberOfClientIssues, 7);
});

check('the median is dropped, not averaged, across SFUs', () => {
  const merged = mergeCallSummaries(both());
  assert.equal(merged!.scores?.median, undefined);
  assert.deepEqual(merged!.unmergeable?.includes('scores.median'), true);
});

check('bounds and sample counts still merge', () => {
  const merged = mergeCallSummaries(both());
  assert.equal(merged!.scores?.samples, 50);
  assert.equal(merged!.scores?.min, 2);
  assert.equal(merged!.scores?.max, 5);
});

check('the mean is recovered by weighting on sample count', () => {
  // (4 x 40 + 3.5 x 10) / 50 = 3.9 — not the 3.75 an unweighted average gives.
  const merged = mergeCallSummaries(both());
  assert.equal(merged!.scores?.mean, 3.9);
});

check('the peak is reported as the lower bound it is', () => {
  const merged = mergeCallSummaries(both());
  assert.equal(merged!.clientCounts?.peak, 3);
  assert.deepEqual(merged!.unmergeable?.includes('clientCounts.peak'), true);
  // The union of ids stays exact even though the counts around it cannot.
  assert.deepEqual(merged!.clientCounts?.clientIds?.sort(), [
    'client-a',
    'client-b',
    'client-shared',
  ]);
});

check('the SFU is read from attachments first, then from the filename', () => {
  const merged = mergeCallSummaries(both());
  // sfu-eu names itself in attachments; sfu-us only in its filename.
  assert.deepEqual(merged!.sfuIds, ['sfu-eu', 'sfu-us']);
  assert.deepEqual(
    merged!.sources?.map((s) => s.sfuId),
    ['sfu-eu', 'sfu-us'],
  );
});

check('a part that knows its SFU places its routers under it', () => {
  const merged = mergeCallSummaries(both());
  assert.deepEqual(merged!.sfus, [
    { sfuId: 'sfu-eu', region: undefined, routerIds: ['router-eu'] },
    { sfuId: 'sfu-us', region: undefined, routerIds: ['router-us'] },
  ]);
});

console.log('\na client seen by two SFUs');

check('the worse reading wins, so a bad leg is not averaged away', () => {
  const good = { attachments: { clients: {} }, clients: { 'c': { score: 4.5, rttMedianMs: 20, lossP95: 0.1 } } };
  const bad = { attachments: { clients: {} }, clients: { 'c': { score: 1.8, rttMedianMs: 320, lossP95: 7 } } };
  const merged = mergeCallSummaries([
    part('call-summary-a.json', good),
    part('call-summary-b.json', bad),
  ]);
  assert.equal(merged!.clients['c'].score, 1.8);
  assert.equal(merged!.clients['c'].rttMedianMs, 320);
  assert.equal(merged!.clients['c'].lossP95, 7);
});

check('a display name from either observer is kept', () => {
  const named = { attachments: { clients: { c: { displayName: 'Ada' } } } };
  const anon = { attachments: { clients: { c: {} } } };
  const merged = mergeCallSummaries([
    part('call-summary-a.json', anon),
    part('call-summary-b.json', named),
  ]);
  assert.equal(merged!.clients['c'].displayName, 'Ada');
});

check('TURN on one SFU is TURN for the client', () => {
  const withTurn = { attachments: { clients: { c: {} }, clientsUsedTurn: ['c'] } };
  const without = { attachments: { clients: { c: {} }, clientsUsedTurn: [] } };
  const merged = mergeCallSummaries([
    part('call-summary-a.json', without),
    part('call-summary-b.json', withTurn),
  ]);
  assert.equal(merged!.clients['c'].turnConnected, true);
});

check('rejoins take the max, so one reconnect is not counted twice', () => {
  const a = { attachments: { clients: {} }, clients: { c: { rejoins: 2 } } };
  const b = { attachments: { clients: {} }, clients: { c: { rejoins: 2 } } };
  const merged = mergeCallSummaries([
    part('call-summary-a.json', a),
    part('call-summary-b.json', b),
  ]);
  assert.equal(merged!.clients['c'].rejoins, 2);
});

console.log('\npipe links between SFUs');

check('a link reported from both ends counts once', () => {
  const a = { attachments: { pipeLinks: [{ fromRouterId: 'r1', toRouterId: 'r2', count: 2 }] } };
  const b = { attachments: { pipeLinks: [{ fromRouterId: 'r2', toRouterId: 'r1', count: 2 }] } };
  const merged = mergeCallSummaries([
    part('call-summary-a.json', a),
    part('call-summary-b.json', b),
  ]);
  assert.equal(merged!.pipeLinks?.length, 1);
  assert.equal(merged!.pipeLinks?.[0].count, 2);
});

check('distinct links are all kept', () => {
  const a = { attachments: { pipeLinks: [{ fromRouterId: 'r1', toRouterId: 'r2' }] } };
  const b = { attachments: { pipeLinks: [{ fromRouterId: 'r2', toRouterId: 'r3' }] } };
  const merged = mergeCallSummaries([
    part('call-summary-a.json', a),
    part('call-summary-b.json', b),
  ]);
  assert.equal(merged!.pipeLinks?.length, 2);
});

console.log('\npartial and malformed parts');

check('a part with nothing in it does not erase the others', () => {
  const merged = mergeCallSummaries([
    part('call-summary-sfu-eu.json', sfuA),
    part('call-summary-sfu-empty.json', {}),
  ]);
  assert.equal(merged!.roomId, 'chess');
  assert.deepEqual(merged!.routerIds, ['router-eu']);
  assert.equal(merged!.scores?.median, 4.2, 'one scoring part still yields its median');
  assert.equal(merged!.sources?.length, 2);
});

console.log('\nwhich objects the call folder browser may read');

check('summaries and router samples are browsable, nothing else is', () => {
  // The samples browser takes the object name from a URL, so this list is a
  // security boundary: an allowlist of shapes, not a denylist of tricks.
  const browsable = (name: string) =>
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('..') &&
    (isCallSummaryName(name) || (name.startsWith('mediasoup-router-') && name.endsWith('.json')));

  assert.equal(browsable('call-summary.json'), true);
  assert.equal(browsable('call-summary-sfu-eu-1.json'), true);
  assert.equal(browsable('mediasoup-router-16b4864a.json'), true);

  // A client stream is served through its own presigned URL, not this route.
  assert.equal(browsable('bbf472c0-3f0f-4450-8c4c-224821885d8c.jsonl'), false);
  // And nothing may walk out of the call folder.
  assert.equal(browsable('../../other-room/call-summary.json'), false);
  assert.equal(browsable('nested/call-summary.json'), false);
  assert.equal(browsable('..'), false);
});

console.log(`\n${passed} checks passed`);
