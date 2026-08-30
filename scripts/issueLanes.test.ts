/**
 * Client issues as timeline intervals, and which object each one belongs to.
 *
 *   node --experimental-strip-types scripts/issueLanes.test.ts
 *
 * client-monitor 4.6.0 reports a stateful issue twice — a raise and, later, a
 * `<type>-resolved` entry sharing a `key`, whose payload carries `raisedAt`
 * (a secondary join), a `comment` and `durationInMs`. A resolution is the
 * client saying the issue cleared: the end of one episode, never an episode of
 * its own. Pairing them turns point-in-time symptom reports into intervals,
 * which is what makes an issue drawable as a lane beneath the producer,
 * consumer or transport it concerns — and what keeps a recovery from being
 * counted as a second fault.
 */

import assert from 'node:assert/strict';
import { buildClientIssueEpisodes } from '../src/utils/clientIssueEpisodes.ts';
import {
  collectProducerTrackIds,
  collectConsumerTrackIds,
  matchProducerEpisodes,
  matchConsumerEpisodes,
  matchTransportEpisodes,
  producerIssueLaneItems,
  consumerIssueLaneItems,
  toIssueLaneItems,
  uniqueIssueLaneTypes,
} from '../src/utils/issueTimelinePlacement.ts';
import { issueTimelineTarget, getIssueTypeMeta } from '../src/schema/ClientIssueTypes.ts';

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sample(offsetMs: number, issues: any[]): any {
  return { timestamp: T0 + offsetMs, clientIssues: issues };
}

console.log('issue episodes');

check('a raise and its resolution become one interval', () => {
  const samples = [
    sample(0, [{ type: 'freezed-video-track', key: 'k1', timestamp: T0, payload: { trackId: 't-1' } }]),
    sample(5000, []),
    sample(9000, [
      { type: 'freezed-video-track-resolved', key: 'k1', timestamp: T0 + 9000, payload: { comment: 'recovered' } },
    ]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].type, 'freezed-video-track');
  assert.equal(episodes[0].raisedAt, T0);
  assert.equal(episodes[0].resolvedAt, T0 + 9000);
  assert.equal(episodes[0].durationMs, 9000);
  assert.equal(episodes[0].stillOpen, false);
});

check('an unresolved raise stays open when the client does send resolutions', () => {
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'k9', timestamp: T0 }]),
    // Something else resolving proves this client reports resolutions at all.
    sample(1000, [{ type: 'stuck-decoder', key: 'other', timestamp: T0 + 1000 }]),
    sample(2000, [{ type: 'stuck-decoder-resolved', key: 'other', timestamp: T0 + 2000 }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  const ice = episodes.find((e) => e.type === 'ice-disconnected')!;
  assert.equal(ice.stillOpen, true);
  assert.equal(ice.resolvedAt, undefined);
});

check('a client that never sends resolutions gets point-in-time issues', () => {
  // Older client-monitor-js does not report resolutions. Treating an
  // unresolved raise as "still open" there would draw a bar to the end of the
  // session for what was only ever a momentary report.
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'k9', timestamp: T0 }]),
    sample(1000, [{ type: 'audio-concealment', key: 'k8', timestamp: T0 + 1000 }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(episodes.length, 2);
  for (const e of episodes) assert.equal(e.stillOpen, false);
});

check('two issues sharing a type but not a key stay separate', () => {
  const samples = [
    sample(0, [{ type: 'stuck-decoder', key: 'a', timestamp: T0 }]),
    sample(1000, [{ type: 'stuck-decoder', key: 'b', timestamp: T0 + 1000 }]),
    sample(2000, [{ type: 'stuck-decoder-resolved', key: 'a', timestamp: T0 + 2000 }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(episodes.length, 2);
  const byKey = new Map(episodes.map((e) => [e.key, e]));
  assert.equal(byKey.get('a')!.stillOpen, false);
  assert.equal(byKey.get('b')!.stillOpen, true);
});

check('a resolution never becomes an episode of its own', () => {
  // The bug this pins: read entry-by-entry, `<type>-resolved` looks like a new
  // issue, so every stateful issue is counted twice and a recovery is drawn as
  // a fault.
  const samples = [
    sample(0, [{ type: 'stuck-decoder', key: 'k1', timestamp: T0 }]),
    sample(3000, [{ type: 'stuck-decoder-resolved', key: 'k1', timestamp: T0 + 3000 }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].type, 'stuck-decoder');
  assert.ok(!episodes.some((e) => e.type.endsWith('-resolved')));
});

check('the resolution comment and its duration reach the episode', () => {
  // 4.6.0 flattens only what was explicitly passed to the resolution into its
  // payload — the raise payload is not repeated — so both halves are read.
  const samples = [
    sample(0, [
      { type: 'freezed-video-track', key: 'k1', timestamp: T0, payload: { trackId: 't-1' } },
    ]),
    sample(4000, [
      {
        type: 'freezed-video-track-resolved',
        key: 'k1',
        timestamp: T0 + 4000,
        payload: { raisedAt: T0, comment: 'frames flowing again', durationInMs: 4000 },
      },
    ]),
  ];
  const [episode] = buildClientIssueEpisodes(samples);
  assert.equal(episode.resolvedByClient, true);
  assert.equal(episode.resolveComment, 'frames flowing again');
  assert.equal(episode.durationMs, 4000);
  // The raise payload is still the one carrying the track id.
  assert.equal(episode.trackId, 't-1');
  assert.deepEqual(episode.resolvePayload?.comment, 'frames flowing again');
});

check('raisedAt joins a resolution whose key went missing', () => {
  // `raisedAt` equals the raise entry's timestamp and is documented as the
  // secondary join, which is what saves a stream written with the key dropped.
  const samples = [
    sample(0, [{ type: 'stuck-decoder', timestamp: T0 }]),
    sample(2500, [
      { type: 'stuck-decoder-resolved', timestamp: T0 + 2500, payload: { raisedAt: T0 } },
    ]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].resolvedAt, T0 + 2500);
  assert.equal(episodes[0].resolvedByClient, true);
});

check('an issue auto-resolved at close() reads as resolved, not open', () => {
  // 4.6.0 auto-resolves anything still active when the monitor closes, so the
  // final sample carries the resolution and nothing should look abandoned.
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'k1', timestamp: T0 }]),
    sample(8000, [
      {
        type: 'ice-disconnected-resolved',
        key: 'k1',
        timestamp: T0 + 8000,
        payload: { raisedAt: T0, comment: 'client closed', durationInMs: 8000 },
      },
    ]),
  ];
  const [episode] = buildClientIssueEpisodes(samples);
  assert.equal(episode.stillOpen, false);
  assert.equal(episode.resolvedByClient, true);
  assert.equal(episode.resolveComment, 'client closed');
});

check('a duration-carrying raise is a report, not an open issue', () => {
  // Some detectors describe a finished condition in the raise itself. That is
  // resolved-by-inference, and must not claim the client said so.
  const samples = [
    sample(0, [{ type: 'audio-concealment', key: 'k1', timestamp: T0, payload: { durationInMs: 1200 } }]),
  ];
  const [episode] = buildClientIssueEpisodes(samples);
  assert.equal(episode.stillOpen, false);
  assert.equal(episode.resolvedByClient, false);
  assert.equal(episode.durationMs, 1200);
});

console.log('\nwhich object an issue belongs to');

check('issue types route to the right timeline', () => {
  assert.equal(issueTimelineTarget('audio-concealment'), 'consumer');
  assert.equal(issueTimelineTarget('freezed-video-track'), 'consumer');
  assert.equal(issueTimelineTarget('encoder-bottleneck'), 'producer');
  assert.equal(issueTimelineTarget('capture-bottleneck'), 'producer');
  assert.equal(issueTimelineTarget('ice-disconnected'), 'transport');
});

check('a producer issue matches on its id', () => {
  const samples = [
    sample(0, [{ type: 'encoder-bottleneck', key: 'p1', timestamp: T0, payload: { producerId: 'prod-A' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set()).length, 1);
  assert.equal(matchProducerEpisodes(episodes, 'prod-B', new Set()).length, 0);
});

check('a producer issue also matches through its track id', () => {
  // Detectors report the track, not the SFU object, so the producer's own
  // track ids are the join.
  const samples = [
    sample(0, [{ type: 'capture-bottleneck', key: 'p2', timestamp: T0, payload: { trackId: 'track-9' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set(['track-9'])).length, 1);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set(['track-8'])).length, 0);
});

check('a consumer issue matches on id or track', () => {
  const samples = [
    sample(0, [{ type: 'audio-concealment', key: 'c1', timestamp: T0, payload: { consumerId: 'cons-A' } }]),
    sample(10, [{ type: 'freezed-video-track', key: 'c2', timestamp: T0 + 10, payload: { trackId: 'track-3' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchConsumerEpisodes(episodes, 'cons-A', new Set()).length, 1);
  assert.equal(matchConsumerEpisodes(episodes, 'cons-Z', new Set(['track-3'])).length, 1);
  assert.equal(matchConsumerEpisodes(episodes, 'cons-Z', new Set()).length, 0);
});

check('a transport issue matches the peer connection standing in for it', () => {
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 't1', timestamp: T0, payload: { peerConnectionId: 'pc-1' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchTransportEpisodes(episodes, 'pc-1').length, 1);
  assert.equal(matchTransportEpisodes(episodes, 'pc-2').length, 0);
});

check('an issue never lands on the wrong kind of object', () => {
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'x', timestamp: T0, payload: { trackId: 'track-1' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  // A transport issue must not be drawn on a producer just because it
  // happens to carry a trackId.
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set(['track-1'])).length, 0);
  assert.equal(matchConsumerEpisodes(episodes, 'cons-A', new Set(['track-1'])).length, 0);
});

check('an unknown type is routed by the ids in its payload', () => {
  // Detectors are extensible and applications raise their own types. Routing
  // by name alone would drop these from every object timeline even though the
  // payload names the exact object they concern.
  const samples = [
    sample(0, [{ type: 'my-app-encoder-stall', key: 'u1', timestamp: T0, payload: { producerId: 'prod-A' } }]),
    sample(10, [{ type: 'my-app-glitch', key: 'u2', timestamp: T0 + 10, payload: { consumerId: 'cons-A' } }]),
    sample(20, [{ type: 'my-app-path-flap', key: 'u3', timestamp: T0 + 20, payload: { peerConnectionId: 'pc-1' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);

  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set()).length, 1);
  assert.equal(matchConsumerEpisodes(episodes, 'cons-A', new Set()).length, 1);
  assert.equal(matchTransportEpisodes(episodes, 'pc-1').length, 1);

  // Each still lands on exactly one kind of object.
  assert.equal(matchConsumerEpisodes(episodes, 'prod-A', new Set()).length, 0);
  assert.equal(matchProducerEpisodes(episodes, 'cons-A', new Set()).length, 0);
});

check('an unknown type with only a track id follows track ownership', () => {
  const samples = [
    sample(0, [{ type: 'weird-detector', key: 'u4', timestamp: T0, payload: { trackId: 'track-7' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set(['track-7'])).length, 1);
  assert.equal(matchConsumerEpisodes(episodes, 'cons-A', new Set(['track-7'])).length, 1);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set(['track-8'])).length, 0);
});

check('a session-level known type stays off every object timeline', () => {
  // `congestion` and `cpulimitation` describe the client as a whole; they
  // belong in the Client Issues section, not on one stream's lane.
  const samples = [
    sample(0, [{ type: 'congestion', key: 'c', timestamp: T0, payload: { producerId: 'prod-A' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set()).length, 0);
  assert.equal(matchConsumerEpisodes(episodes, 'prod-A', new Set()).length, 0);
  assert.equal(matchTransportEpisodes(episodes, 'prod-A').length, 0);
});

check('a known type is still routed by its category, not its ids', () => {
  // An ICE issue that happens to carry a producerId must not be drawn on a
  // producer — the built-in detectors mean what the table says they mean.
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'k', timestamp: T0, payload: { producerId: 'prod-A' } }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  assert.equal(matchProducerEpisodes(episodes, 'prod-A', new Set()).length, 0);
});

console.log('\nconnecting an issue to an untagged client\'s streams');

// The detectors only ever name a trackId. When the application tags no track
// with a producerId/consumerId — the case the router mapping already has to
// cope with — the SSRC and the consumed producerId are the only links left.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untaggedProcessed: any = {
  timeSeries: { outboundRtp: {}, inboundRtp: {} },
  allObjects: {
    outboundRtps: new Map([
      ['track-out-1', { ssrc: 966900604, trackIdentifier: 'track-out-1' }],
      ['track-out-other', { ssrc: 111, trackIdentifier: 'track-out-other' }],
    ]),
    inboundRtps: new Map([
      ['track-in-1', { producerId: 'remote-prod-1', trackIdentifier: 'track-in-1' }],
      ['track-in-other', { producerId: 'remote-prod-2', trackIdentifier: 'track-in-other' }],
    ]),
  },
};

check("a producer finds its track through its SSRC", () => {
  const ids = collectProducerTrackIds(undefined, untaggedProcessed, {
    id: 'prod-A',
    ssrcs: [966900604],
  });
  assert.deepEqual([...ids], ['track-out-1']);
});

check('a consumer finds its track through the producer it consumes', () => {
  const ids = collectConsumerTrackIds(undefined, untaggedProcessed, {
    id: 'cons-A',
    producerId: 'remote-prod-1',
  });
  assert.deepEqual([...ids], ['track-in-1']);
});

check('an untagged producer still gets its issue lane end to end', () => {
  const samples = [
    sample(0, [{ type: 'encoder-bottleneck', key: 'e1', timestamp: T0, payload: { trackId: 'track-out-1' } }]),
  ];
  const lane = producerIssueLaneItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    samples as any,
    untaggedProcessed,
    { id: 'prod-A', ssrcs: [966900604] },
    'UTC',
  );
  assert.equal(lane.length, 1);
  assert.equal(lane[0].type, 'encoder-bottleneck');

  // and not on a producer whose SSRC does not match
  const other = producerIssueLaneItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    samples as any,
    untaggedProcessed,
    { id: 'prod-B', ssrcs: [111] },
    'UTC',
  );
  assert.equal(other.length, 0);
});

check('an untagged consumer still gets its issue lane end to end', () => {
  const samples = [
    sample(0, [{ type: 'freezed-video-track', key: 'f1', timestamp: T0, payload: { trackId: 'track-in-1' } }]),
  ];
  const lane = consumerIssueLaneItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    samples as any,
    untaggedProcessed,
    { id: 'cons-A', producerId: 'remote-prod-1' },
    'UTC',
  );
  assert.equal(lane.length, 1);

  const other = consumerIssueLaneItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    samples as any,
    untaggedProcessed,
    { id: 'cons-B', producerId: 'remote-prod-2' },
    'UTC',
  );
  assert.equal(other.length, 0);
});

console.log('\nlane items');

check('an open episode is drawn to the end of the session', () => {
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'k', timestamp: T0 }]),
    sample(500, [{ type: 'stuck-decoder', key: 'z', timestamp: T0 + 500 }]),
    sample(600, [{ type: 'stuck-decoder-resolved', key: 'z', timestamp: T0 + 600 }]),
  ];
  const episodes = buildClientIssueEpisodes(samples);
  const sessionEnd = T0 + 60_000;
  const items = toIssueLaneItems(episodes, sessionEnd, 'UTC').filter(
    (i) => i.type === 'ice-disconnected',
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].start, T0);
  assert.equal(items[0].end, sessionEnd);
  assert.equal(items[0].stillOpen, true);
  // The label and colour come from the issue type table, so the lane and the
  // legend agree.
  assert.equal(items[0].label, getIssueTypeMeta('ice-disconnected').label);
  assert.ok(items[0].tooltipHtml.length > 0);
});

check('the legend lists each type once', () => {
  const samples = [
    sample(0, [{ type: 'ice-disconnected', key: 'a', timestamp: T0 }]),
    sample(10, [{ type: 'ice-disconnected', key: 'b', timestamp: T0 + 10 }]),
    sample(20, [{ type: 'ice-transport-stalled', key: 'c', timestamp: T0 + 20 }]),
  ];
  const items = toIssueLaneItems(buildClientIssueEpisodes(samples), T0 + 1000, 'UTC');
  assert.equal(items.length, 3);
  assert.deepEqual(
    uniqueIssueLaneTypes(items).map((t) => t.type).sort(),
    ['ice-disconnected', 'ice-transport-stalled'],
  );
});

check('no issues yields no lane', () => {
  assert.deepEqual(buildClientIssueEpisodes([]), []);
  assert.deepEqual(toIssueLaneItems([], T0, 'UTC'), []);
});

console.log(`\n${passed} checks passed`);
