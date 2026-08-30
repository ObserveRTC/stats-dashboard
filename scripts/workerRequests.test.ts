/**
 * Reply correlation for the shared stats worker.
 *
 *   node --experimental-strip-types scripts/workerRequests.test.ts
 *
 * The bug these exist for: a `Worker`'s `message` event is a broadcast, so the
 * old "attach a listener, post, resolve on the next message" pattern gave two
 * overlapping callers the *same* reply — each resolved with whichever client's
 * samples came back first. Loading one client at a time never showed it;
 * "Load all" on the call dashboard showed identical RTT, loss and issue counts
 * on rows that should have differed, in pairs matching whichever loads
 * happened to overlap.
 *
 * Nothing threw and nothing was logged, which is what makes it worth a test:
 * the failure mode is confidently rendered wrong numbers.
 */

import assert from 'node:assert/strict';
import { PendingWorkerRequests } from '../src/utils/workerRequests.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/** Records how each request settled, without needing to await anything. */
function tracker<T>() {
  const value = new Map<string, T>();
  const error = new Map<string, string>();
  return {
    value,
    error,
    handlers(name: string) {
      return [
        (v: T) => value.set(name, v),
        (e: Error) => error.set(name, e.message),
      ] as const;
    },
  };
}

const identity = (results: unknown[]) => results;

console.log('one reply settles one request');

check('two overlapping requests each get their own reply', () => {
  // The whole bug, in four lines.
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();

  const [resolveA, rejectA] = t.handlers('alice');
  const [resolveB, rejectB] = t.handlers('bob');
  const idA = pending.open(resolveA, rejectA);
  const idB = pending.open(resolveB, rejectB);

  assert.notEqual(idA, idB, 'concurrent requests must not share an id');

  pending.settle({ id: idA, results: ['alice-samples'] }, identity);
  pending.settle({ id: idB, results: ['bob-samples'] }, identity);

  assert.deepEqual(t.value.get('alice'), ['alice-samples']);
  assert.deepEqual(t.value.get('bob'), ['bob-samples']);
  assert.equal(pending.size, 0);
});

check('a reply arriving out of order still finds its own request', () => {
  // The worker is free to answer in any order, and a slow first client must
  // not hold up — or capture — a fast second one.
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const idA = pending.open(...t.handlers('a'));
  const idB = pending.open(...t.handlers('b'));
  const idC = pending.open(...t.handlers('c'));

  pending.settle({ id: idC, results: ['c'] }, identity);
  pending.settle({ id: idA, results: ['a'] }, identity);
  pending.settle({ id: idB, results: ['b'] }, identity);

  assert.deepEqual(t.value.get('a'), ['a']);
  assert.deepEqual(t.value.get('b'), ['b']);
  assert.deepEqual(t.value.get('c'), ['c']);
});

check('four at once, as "Load all" does', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const names = ['balazs', 'guest', 'budello83', 'jenia'];
  const ids = names.map((n) => pending.open(...t.handlers(n)));

  // Replies interleaved, the way a queue drains under load.
  for (const i of [1, 3, 0, 2]) {
    pending.settle({ id: ids[i], results: [names[i]] }, identity);
  }

  for (const name of names) assert.deepEqual(t.value.get(name), [name]);
  // ...and no two rows ended up with the same data, which is the symptom.
  const seen = new Set(names.map((n) => JSON.stringify(t.value.get(n))));
  assert.equal(seen.size, names.length, 'two requests settled with the same payload');
});

console.log('\nreplies that match nothing');

check('an unknown id settles nobody', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  pending.open(...t.handlers('a'));

  assert.equal(pending.settle({ id: 999, results: ['stray'] }, identity), false);
  assert.equal(t.value.size, 0, 'a stray reply must not be handed to a live request');
  assert.equal(pending.size, 1, 'the live request is still waiting');
});

check('a reply with no id is dropped, not guessed at', () => {
  // This is the shape the old worker sent — a bare array — and taking it would
  // reintroduce the bug for anyone running a stale worker build.
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  pending.open(...t.handlers('a'));

  assert.equal(pending.settle({ results: ['no id'] }, identity), false);
  assert.equal(pending.settle(null, identity), false);
  assert.equal(pending.settle(undefined, identity), false);
  assert.equal(t.value.size, 0);
  assert.equal(t.error.size, 0);
});

check('a request is settled once, and a duplicate reply changes nothing', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const id = pending.open(...t.handlers('a'));

  assert.equal(pending.settle({ id, results: ['first'] }, identity), true);
  assert.equal(pending.settle({ id, results: ['second'] }, identity), false);
  assert.deepEqual(t.value.get('a'), ['first']);
});

check('an id is never reused, so a late reply cannot hit a new request', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const first = pending.open(...t.handlers('first'));
  pending.settle({ id: first, results: ['first'] }, identity);

  const second = pending.open(...t.handlers('second'));
  assert.notEqual(second, first);

  // The abandoned request's reply arrives late; it must not land on `second`.
  assert.equal(pending.settle({ id: first, results: ['late'] }, identity), false);
  assert.equal(t.value.get('second'), undefined);
});

console.log('\nfailure');

check('an error reply rejects only its own request', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const idA = pending.open(...t.handlers('a'));
  const idB = pending.open(...t.handlers('b'));

  pending.settle({ id: idA, error: 'bad json on line 4' }, identity);
  pending.settle({ id: idB, results: ['fine'] }, identity);

  assert.equal(t.error.get('a'), 'bad json on line 4');
  assert.deepEqual(t.value.get('b'), ['fine']);
});

check('a reply that is neither results nor error is a failure, not a hang', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const id = pending.open(...t.handlers('a'));
  pending.settle({ id }, identity);
  assert.match(t.error.get('a') ?? '', /Unexpected/);
});

check('a decoder that throws rejects rather than escaping', () => {
  // asClientSamples is the real decoder here; a malformed payload must fail
  // the one request, not the worker's message handler.
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  const idA = pending.open(...t.handlers('a'));
  const idB = pending.open(...t.handlers('b'));

  pending.settle({ id: idA, results: ['x'] }, () => {
    throw new Error('malformed sample');
  });
  pending.settle({ id: idB, results: ['ok'] }, identity);

  assert.equal(t.error.get('a'), 'malformed sample');
  assert.deepEqual(t.value.get('b'), ['ok'], 'one bad payload must not poison the queue');
});

check('a worker-level failure rejects everything outstanding', () => {
  // Nothing identifies which request an ErrorEvent belongs to, so failing one
  // arbitrarily would leave the rest spinning for ever.
  const pending = new PendingWorkerRequests<unknown[]>();
  const t = tracker<unknown[]>();
  pending.open(...t.handlers('a'));
  pending.open(...t.handlers('b'));
  pending.open(...t.handlers('c'));

  pending.failAll(new Error('worker died'));

  assert.equal(t.error.size, 3);
  assert.equal(pending.size, 0);
});

check('failAll on nothing outstanding is harmless', () => {
  const pending = new PendingWorkerRequests<unknown[]>();
  pending.failAll(new Error('teardown'));
  assert.equal(pending.size, 0);
});

console.log(`\n${passed} checks passed`);
