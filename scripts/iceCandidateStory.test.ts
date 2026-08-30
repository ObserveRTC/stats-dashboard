/**
 * The story behind one ICE candidate.
 *
 *   node --experimental-strip-types scripts/iceCandidateStory.test.ts
 *
 * The candidates table reads the latest value of everything, which answers
 * "what did this client gather" and nothing else. Every question a reader
 * actually has — was it paired, did the checks pass, was it nominated, did it
 * carry the call, why did it vanish — is a change over time. These checks are
 * about reading those changes correctly and, just as much, about not inventing
 * ones that were never reported.
 */

import assert from 'node:assert/strict';
import { buildIceCandidateStories } from '../src/utils/iceCandidateStory.ts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/** One sample of one peer connection, at `T0 + n * 1000`. */
function sample(
  n: number,
  opts: {
    candidates?: Any[];
    pairs?: Any[];
    selected?: string | null;
    events?: Any[];
  },
): Any {
  const at = T0 + n * 1000;
  return {
    timestamp: at,
    peerConnections: [
      {
        peerConnectionId: 'pc-1',
        iceCandidates: (opts.candidates ?? []).map((c) => ({ timestamp: at, ...c })),
        iceCandidatePairs: (opts.pairs ?? []).map((p) => ({ timestamp: at, ...p })),
        iceTransports:
          opts.selected === undefined
            ? []
            : [{ timestamp: at, selectedCandidatePairId: opts.selected ?? undefined }],
      },
    ],
    clientEvents: opts.events,
  };
}

const HOST = { id: 'cand-host', candidateType: 'host', address: '192.168.1.9', port: 51000, protocol: 'udp' };
const RELAY = { id: 'cand-relay', candidateType: 'relay', address: '10.0.0.1', port: 3478, protocol: 'udp', url: 'turn:turn.example:3478' };
const REMOTE = { id: 'cand-remote', candidateType: 'srflx', address: '203.0.113.7', port: 40000, protocol: 'udp' };

function storyOf(samples: Any[], candidateId: string) {
  const found = buildIceCandidateStories(samples).get('pc-1')?.get(candidateId);
  assert.ok(found, `no story for ${candidateId}`);
  return found;
}

function kinds(story: Any): string[] {
  return story.events.map((e: Any) => e.kind);
}

console.log('a candidate that carried the call');

const happy = [
  sample(0, { candidates: [HOST, REMOTE], pairs: [], selected: null }),
  sample(1, {
    candidates: [HOST, REMOTE],
    pairs: [{ id: 'pair-1', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'in-progress', bytesSent: 0, bytesReceived: 0 }],
    selected: null,
  }),
  sample(2, {
    candidates: [HOST, REMOTE],
    pairs: [{ id: 'pair-1', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true, bytesSent: 500, bytesReceived: 400, currentRoundTripTime: 0.03 }],
    selected: 'pair-1',
  }),
  sample(12, {
    candidates: [HOST, REMOTE],
    pairs: [{ id: 'pair-1', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true, bytesSent: 90_000, bytesReceived: 80_000, currentRoundTripTime: 0.05 }],
    selected: 'pair-1',
  }),
];

check('the sequence is first seen, paired, checked, nominated, selected', () => {
  const story = storyOf(happy, HOST.id);
  const order = kinds(story);
  assert.equal(order[0], 'first-seen');
  assert.ok(order.includes('paired'));
  assert.ok(order.includes('pair-state'), 'the change to succeeded is an event');
  assert.ok(order.includes('nominated'));
  assert.ok(order.includes('selected'));
  // Chronological, whatever order they were derived in.
  const times = story.events.map((e: Any) => e.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

check('time selected runs to the last sample while it is still selected', () => {
  const story = storyOf(happy, HOST.id);
  // Selected at +2s, last sample at +12s.
  assert.equal(story.selectedMs, 10_000);
  assert.equal(story.verdictTone, 'good');
  assert.match(story.verdict, /Carried the connection/);
});

check('the first state is part of "paired", not a change', () => {
  // Reporting "check in-progress" as a transition on the sample the pair first
  // appeared would double-count the pair's creation.
  const story = storyOf(happy, HOST.id);
  const stateEvents = story.events.filter((e: Any) => e.kind === 'pair-state');
  assert.equal(stateEvents.length, 1);
  assert.match(stateEvents[0].title, /succeeded/);
});

check('the remote end gets its own story, told from its side', () => {
  const story = storyOf(happy, REMOTE.id);
  assert.equal(story.role, 'remote');
  assert.match(story.events[0].title, /Received from the remote peer/);
  // Its pair names the local candidate, not itself.
  assert.match(story.pairs[0].peerLabel, /192\.168\.1\.9/);
});

check('a pair reports its lifetime total, not what changed while we watched', () => {
  // These counters start at zero when the pair is created, so the last reading
  // is already the total. Subtracting the first observation would throw away
  // everything that flowed before the first stats poll.
  const story = storyOf(happy, HOST.id);
  const pair = story.pairs[0];
  assert.equal(pair.bytesSent, 90_000);
  assert.equal(pair.bytesReceived, 80_000);
  assert.ok(pair.rttMs);
  assert.equal(Math.round(pair.rttMs!.min), 30);
  assert.equal(Math.round(pair.rttMs!.max), 50);
});

console.log('\ncandidates that did not work out');

check('a candidate no pair ever contained says exactly that', () => {
  const lonely = [
    sample(0, { candidates: [HOST, RELAY, REMOTE], pairs: [] }),
    sample(1, {
      candidates: [HOST, RELAY, REMOTE],
      pairs: [{ id: 'pair-1', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }],
    }),
  ];
  const story = storyOf(lonely, RELAY.id);
  assert.equal(story.pairs.length, 0);
  assert.match(story.verdict, /Never paired/);
  assert.equal(story.verdictTone, 'warn');
  assert.equal(story.role, 'unknown');
});

check('nominated but never selected is distinguished from selected', () => {
  // The two are different facts — the agent judging a pair usable, and the
  // transport actually using it — and conflating them hides the interesting case.
  const nominatedOnly = [
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'pair-1', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
    sample(1, { candidates: [HOST, REMOTE], pairs: [{ id: 'pair-1', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true }] }),
  ];
  const story = storyOf(nominatedOnly, HOST.id);
  assert.equal(story.selectedMs, 0);
  assert.ok(kinds(story).includes('nominated'));
  assert.ok(!kinds(story).includes('selected'));
  assert.match(story.verdict, /Nominated but never selected/);
});

check('checks that all failed read as a dead route', () => {
  const failed = [
    sample(0, { candidates: [RELAY, REMOTE], pairs: [{ id: 'p', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'in-progress' }] }),
    sample(3, { candidates: [RELAY, REMOTE], pairs: [{ id: 'p', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'failed' }] }),
  ];
  const story = storyOf(failed, RELAY.id);
  assert.equal(story.pairs[0].finalState, 'failed');
  assert.match(story.verdict, /Every connectivity check on it failed/);
  assert.equal(story.verdictTone, 'bad');
});

check('checks still in flight are not called a failure', () => {
  const pending = [
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'frozen' }] }),
    sample(1, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'waiting' }] }),
  ];
  const story = storyOf(pending, HOST.id);
  assert.match(story.verdict, /never completed/);
  assert.equal(story.verdictTone, 'warn');
});

check('a succeeded pair that was never needed is neutral, not a problem', () => {
  const backup = [
    sample(0, { candidates: [RELAY, REMOTE], pairs: [{ id: 'p', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
    sample(1, { candidates: [RELAY, REMOTE], pairs: [{ id: 'p', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
  ];
  const story = storyOf(backup, RELAY.id);
  assert.match(story.verdict, /never nominated/);
  assert.equal(story.verdictTone, 'neutral');
});

console.log('\nlosing and regaining the path');

check('a path lost and re-selected is two stretches, and says so', () => {
  const flapping = [
    sample(0, { candidates: [HOST, RELAY, REMOTE], pairs: [
      { id: 'direct', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true },
      { id: 'relayed', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'succeeded' },
    ], selected: 'direct' }),
    sample(10, { candidates: [HOST, RELAY, REMOTE], pairs: [
      { id: 'direct', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'failed', nominated: true },
      { id: 'relayed', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true },
    ], selected: 'relayed' }),
    sample(20, { candidates: [HOST, RELAY, REMOTE], pairs: [
      { id: 'direct', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true },
      { id: 'relayed', localCandidateId: RELAY.id, remoteCandidateId: REMOTE.id, state: 'succeeded', nominated: true },
    ], selected: 'direct' }),
  ];

  const host = storyOf(flapping, HOST.id);
  assert.equal(host.pairs[0].selectedWindows.length, 2, 'two separate selections');
  assert.ok(kinds(host).includes('deselected'));
  assert.match(host.verdict, /2 stretches/);
  assert.equal(host.verdictTone, 'warn', 'a flapping path is not a clean success');

  // ...and the relay's story covers exactly the gap.
  const relay = storyOf(flapping, RELAY.id);
  assert.equal(relay.selectedMs, 10_000);
});

check('deselection is timed from the transport, not from the pair state', () => {
  const flapping = buildIceCandidateStories([
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'direct', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }], selected: 'direct' }),
    sample(5, { candidates: [HOST, REMOTE], pairs: [{ id: 'direct', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }], selected: null }),
  ]).get('pc-1')!.get(HOST.id)!;
  const off = flapping.events.find((e: Any) => e.kind === 'deselected');
  assert.ok(off);
  assert.equal(off.at, T0 + 5000);
  assert.equal(flapping.selectedMs, 5000);
});

console.log('\nvanishing');

check('a candidate that stops being reported is flagged, with the restart that explains it', () => {
  const restarted = [
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
    sample(5, {
      candidates: [REMOTE],
      pairs: [],
      events: [
        {
          type: 'ICE_RESTART',
          timestamp: T0 + 5000,
          payload: { peerConnectionId: 'pc-1', outcome: 'recovered', iceGeneration: 2 },
        },
      ],
    }),
    sample(9, { candidates: [REMOTE], pairs: [] }),
  ];
  const story = storyOf(restarted, HOST.id);
  assert.equal(story.disappeared, true);
  assert.ok(kinds(story).includes('last-seen'));
  assert.ok(kinds(story).includes('ice-restart'));
});

check('a candidate reported to the end is not flagged as vanished', () => {
  const story = storyOf(happy, HOST.id);
  assert.equal(story.disappeared, false);
  assert.ok(!kinds(story).includes('last-seen'));
});

check('a candidate error is attached only to the server it names', () => {
  // A TURN failure on every host candidate's timeline would be noise that
  // reads as evidence.
  const withError = [
    sample(0, {
      candidates: [HOST, RELAY],
      pairs: [],
      events: [
        {
          type: 'ICE_CANDIDATE_ERROR',
          timestamp: T0,
          payload: { url: 'turn:turn.example:3478', errorCode: 401, errorText: 'Unauthorized' },
        },
      ],
    }),
    sample(1, { candidates: [HOST, RELAY], pairs: [] }),
  ];
  assert.ok(kinds(storyOf(withError, RELAY.id)).includes('candidate-error'));
  assert.ok(!kinds(storyOf(withError, HOST.id)).includes('candidate-error'));
});

console.log('\nreading the reports carefully');

check('the "inprogress" spelling is not a state change', () => {
  // The schema accepts a browser variant alongside the spec's `in-progress`.
  // Treating them as different values invents a transition that never happened.
  const spelled = [
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'in-progress' }] }),
    sample(1, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'inprogress' }] }),
    sample(2, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
  ];
  const story = storyOf(spelled, HOST.id);
  assert.deepEqual(story.pairs[0].states.map((s: Any) => s.state), ['in-progress', 'succeeded']);
});

check('samples out of order are read in time order', () => {
  const shuffled = [happy[3], happy[0], happy[2], happy[1]];
  const story = storyOf(shuffled, HOST.id);
  assert.equal(story.firstSeen, T0);
  assert.equal(story.selectedMs, 10_000);
});

check('a pair first seen mid-flight still reports everything it carried', () => {
  // The first poll can land after the pair connected. Reporting only the
  // change from there would say this pair carried 2 kB when it carried 7.
  const late = [
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', bytesSent: 5000 }] }),
    sample(1, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded', bytesSent: 7000 }] }),
  ];
  assert.equal(storyOf(late, HOST.id).pairs[0].bytesSent, 7000);
});

check('a counter the browser never reported is unknown, not zero', () => {
  const quiet = [
    sample(0, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
    sample(1, { candidates: [HOST, REMOTE], pairs: [{ id: 'p', localCandidateId: HOST.id, remoteCandidateId: REMOTE.id, state: 'succeeded' }] }),
  ];
  const pair = storyOf(quiet, HOST.id).pairs[0];
  assert.equal(pair.bytesSent, null);
  assert.equal(pair.requestsSent, null);
});

check('no samples yields no stories rather than an error', () => {
  assert.equal(buildIceCandidateStories([]).size, 0);
  assert.equal(buildIceCandidateStories([sample(0, {})]).get('pc-1')?.size, 0);
});

console.log(`\n${passed} checks passed`);
