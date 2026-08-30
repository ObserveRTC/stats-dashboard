/**
 * Joins between the client's own view and the SFU's.
 *
 *   node --experimental-strip-types scripts/clientJoins.test.ts
 *
 * Two joins are covered:
 *   - media tracks → producers / consumers, via `attachments.producerId` and
 *     `attachments.consumerId`
 *   - data channels → dataProducers / dataConsumers, via the channel's
 *     attachments, falling back to a unique label
 */

import assert from 'node:assert/strict';
import { toReasonList, toReasonMap, reasonsToText } from '../src/schema/clientSampleParse.ts';
import { buildClientTrackIndex, trackScoreChartData } from '../src/utils/clientTracks.ts';
import { collectClientDataChannels, joinDataChannels } from '../src/utils/dataChannelJoin.ts';
import { buildClientRollups, formatBitrateKbps } from '../src/utils/clientRollups.ts';
import {
  buildSessionSummary,
  classifyIssue,
  percentile,
} from '../src/utils/sessionSummary.ts';

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/* ── fixtures ──────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sample(index: number, over: any = {}): any {
  return {
    timestamp: T0 + index * 1000,
    peerConnections: [
      {
        peerConnectionId: 'pc-1',
        outboundTracks: [
          {
            id: 'track-out-audio',
            kind: 'audio',
            timestamp: T0 + index * 1000,
            score: 5 - index * 0.5,
            // schema >= 3.3 shape
            scoreReasons: index === 2 ? ['high packet loss on the send path'] : undefined,
            attachments: { producerId: 'prod-audio', label: 'mic' },
          },
          // Untagged: no producerId anywhere in its attachments.
          {
            id: 'track-out-screen',
            kind: 'video',
            timestamp: T0 + index * 1000,
            score: 4,
            attachments: {},
          },
        ],
        inboundTracks: [
          {
            id: 'track-in-video',
            kind: 'video',
            timestamp: T0 + index * 1000,
            score: 3 + index * 0.25,
            // schema <= 3.2 shape, still in storage
            scoreReasons: 'frozen frames',
            attachments: { consumerId: 'cons-video' },
          },
        ],
        dataChannels: [
          {
            id: 'dc-1',
            timestamp: T0 + index * 1000,
            label: 'observertc-samples',
            protocol: '',
            state: 'open',
            bytesSent: 100 * (index + 1),
            messagesSent: index + 1,
            attachments: { dataProducerId: 'dp-1' },
          },
          {
            id: 'dc-2',
            timestamp: T0 + index * 1000,
            label: 'chat',
            protocol: '',
            state: 'open',
            bytesReceived: 50 * (index + 1),
            messagesReceived: index + 1,
          },
        ],
        ...over,
      },
    ],
  };
}

const samples = [sample(0), sample(1), sample(2)];

console.log('scoreReasons across schema versions');

check('a string[] (schema >= 3.3) passes through', () => {
  assert.deepEqual(toReasonList(['low bitrate', 'high rtt']), ['low bitrate', 'high rtt']);
});

check('a single string (schema <= 3.2) becomes a one-item list', () => {
  assert.deepEqual(toReasonList('high packet loss'), ['high packet loss']);
});

check('a JSON-encoded array is unwrapped', () => {
  assert.deepEqual(toReasonList('["a","b"]'), ['a', 'b']);
});

check('a string that merely starts with [ is kept whole', () => {
  assert.deepEqual(toReasonList('[not json after all'), ['[not json after all']);
});

check('empty and absent values yield an empty list', () => {
  assert.deepEqual(toReasonList(undefined), []);
  assert.deepEqual(toReasonList(null), []);
  assert.deepEqual(toReasonList(''), []);
  assert.deepEqual(toReasonList('   '), []);
  assert.deepEqual(toReasonList([]), []);
  assert.deepEqual(toReasonList(['', '  ']), []);
});

check('unexpected shapes are rendered, not dropped or thrown on', () => {
  assert.deepEqual(toReasonList({ reason: 'weird' }), ['{"reason":"weird"}']);
  assert.deepEqual(toReasonList(42), ['42']);
  assert.deepEqual(toReasonList([1, 2]), ['1', '2']);
});

check('a record (schema >= 3.6) yields keys ordered by points descending', () => {
  assert.deepEqual(toReasonList({ 'high-rtt': 0.5, 'frozen-video': 2 }), [
    'frozen-video',
    'high-rtt',
  ]);
});

check('a record tie falls back to a stable alphabetical order', () => {
  assert.deepEqual(toReasonList({ b: 1, a: 1 }), ['a', 'b']);
});

check('toReasonMap reads magnitudes only from a record', () => {
  assert.deepEqual(toReasonMap({ 'high-rtt': 0.5, 'frozen-video': 2 }), {
    'high-rtt': 0.5,
    'frozen-video': 2,
  });
  // A key that applied and cost nothing is a fact the wire stated, so 0 stays.
  assert.deepEqual(toReasonMap({ 'high-rtt': 0 }), { 'high-rtt': 0 });
});

check('toReasonMap refuses to invent magnitudes for older vintages', () => {
  assert.equal(toReasonMap(['a', 'b']), undefined);
  assert.equal(toReasonMap('high packet loss'), undefined);
  assert.equal(toReasonMap(undefined), undefined);
  assert.equal(toReasonMap(null), undefined);
});

check('toReasonMap drops entries that are not finite numbers', () => {
  assert.deepEqual(toReasonMap({ good: 1, bad: 'nope', worse: NaN, '': 3 }), { good: 1 });
  assert.equal(toReasonMap({ bad: 'nope' }), undefined);
});

check('a non-reason object still renders rather than dropping out', () => {
  // No numeric values, so it is not a 3.6 reason record — the old fallback holds.
  assert.deepEqual(toReasonList({ reason: 'weird' }), ['{"reason":"weird"}']);
});

check('reasonsToText joins for single-line contexts', () => {
  assert.equal(reasonsToText(['a', 'b']), 'a · b');
  assert.equal(reasonsToText([]), undefined);
  assert.equal(reasonsToText(undefined), undefined);
});

console.log('\ntracks → producers / consumers');

check('an outbound track lands on its producer', () => {
  const index = buildClientTrackIndex(samples);
  const tracks = index.byProducerId.get('prod-audio');
  assert.equal(tracks?.length, 1);
  assert.equal(tracks![0].trackId, 'track-out-audio');
  assert.equal(tracks![0].direction, 'outbound');
  assert.equal(tracks![0].seenCount, 3);
});

check('an inbound track lands on its consumer', () => {
  const index = buildClientTrackIndex(samples);
  const tracks = index.byConsumerId.get('cons-video');
  assert.equal(tracks?.length, 1);
  assert.equal(tracks![0].trackId, 'track-in-video');
  assert.equal(tracks![0].direction, 'inbound');
  // This track carries the old single-string shape; it still reads as a list.
  assert.deepEqual(tracks![0].latestScoreReasons, ['frozen frames']);
});

check('an untagged track is reported rather than dropped', () => {
  const index = buildClientTrackIndex(samples);
  assert.deepEqual(index.unassociatedOutbound.map((t) => t.trackId), ['track-out-screen']);
  assert.deepEqual(index.unassociatedInbound, []);
});

check('score reasons ride along with each score', () => {
  const index = buildClientTrackIndex(samples);
  const track = index.byProducerId.get('prod-audio')![0];
  assert.equal(track.scoreSeries.length, 3);
  assert.equal(track.latestScore, 4);
  assert.deepEqual(track.latestScoreReasons, ['high packet loss on the send path']);

  const chart = trackScoreChartData(track);
  assert.deepEqual(chart.map((d) => d.value), [5, 4.5, 4]);
  // The note is what the chart tooltip shows on hover.
  assert.deepEqual(chart[2].notes, ['high packet loss on the send path']);
  assert.deepEqual(chart[0].notes, []);
});

check('a producerId that appears late is still picked up', () => {
  // The first sample has no attachments at all; the id arrives in the second.
  const late = [
    {
      timestamp: T0,
      peerConnections: [
        {
          peerConnectionId: 'pc-1',
          outboundTracks: [{ id: 't1', kind: 'audio', timestamp: T0, attachments: {} }],
        },
      ],
    },
    {
      timestamp: T0 + 1000,
      peerConnections: [
        {
          peerConnectionId: 'pc-1',
          outboundTracks: [
            { id: 't1', kind: 'audio', timestamp: T0 + 1000, attachments: { producerId: 'p9' } },
          ],
        },
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any;
  const index = buildClientTrackIndex(late);
  assert.equal(index.byProducerId.get('p9')?.length, 1);
  assert.deepEqual(index.unassociatedOutbound, []);
});

check('empty input is handled', () => {
  const index = buildClientTrackIndex(null);
  assert.deepEqual(index.outbound, []);
  assert.equal(index.byProducerId.size, 0);
});

console.log('\ndata channels → dataProducers / dataConsumers');

const dataProducers = [
  { id: 'dp-1', transportId: 't-send', label: 'observertc-samples', protocol: '', createdAt: T0, matchedBy: 'rtp' as const },
];
const dataConsumers = [
  { id: 'dc-sfu-1', dataProducerId: 'dp-other', transportId: 't-recv', label: 'chat', protocol: '', createdAt: T0, matchedBy: 'rtp' as const },
];

check('an attachment id beats everything else', () => {
  const client = collectClientDataChannels(samples);
  const pairs = joinDataChannels(dataProducers, dataConsumers, client);
  const samplesChannel = pairs.find((p) => p.client?.channelId === 'dc-1')!;
  assert.equal(samplesChannel.sfuProducer?.id, 'dp-1');
  assert.equal(samplesChannel.matchedBy, 'attachment');
  assert.equal(samplesChannel.direction, 'producer');
});

check('a unique label pairs the rest', () => {
  const client = collectClientDataChannels(samples);
  const pairs = joinDataChannels(dataProducers, dataConsumers, client);
  const chat = pairs.find((p) => p.client?.channelId === 'dc-2')!;
  assert.equal(chat.sfuConsumer?.id, 'dc-sfu-1');
  assert.equal(chat.matchedBy, 'label');
  assert.equal(chat.direction, 'consumer');
});

check('an ambiguous label is not matched', () => {
  const duplicated = [
    { ...dataConsumers[0], id: 'dc-a' },
    { ...dataConsumers[0], id: 'dc-b' },
  ];
  const client = collectClientDataChannels(samples);
  const pairs = joinDataChannels(dataProducers, duplicated, client);
  const chat = pairs.find((p) => p.client?.channelId === 'dc-2')!;
  assert.equal(chat.sfuConsumer, undefined);
  assert.equal(chat.matchedBy, 'none');
  // Both SFU consumers still appear, on their own.
  assert.equal(pairs.filter((p) => p.sfuConsumer && !p.client).length, 2);
});

check('counters and their series are accumulated', () => {
  const client = collectClientDataChannels(samples);
  const sent = client.find((c) => c.channelId === 'dc-1')!;
  assert.equal(sent.latest.bytesSent, 300);
  assert.equal(sent.latest.messagesSent, 3);
  assert.deepEqual(sent.series.bytesSent.map((p) => p.value), [100, 200, 300]);
  assert.equal(sent.dataProducerId, 'dp-1');
});

check('an SFU channel the browser never reported still shows up', () => {
  const orphan = [
    { id: 'dp-orphan', transportId: 't-send', label: 'nobody', protocol: '', createdAt: T0, matchedBy: 'rtp' as const },
  ];
  const pairs = joinDataChannels(orphan, [], []);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].sfuProducer?.id, 'dp-orphan');
  assert.equal(pairs[0].client, undefined);
  assert.equal(pairs[0].matchedBy, 'none');
});

console.log('\nwhole-client rollups');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rollupStats: any = {
  timeSeries: {
    outboundRtp: {
      a: {
        values: [
          { timestamp: new Date(T0), _actualBitrateKbps: 100 },
          { timestamp: new Date(T0 + 1000), _actualBitrateKbps: 150 },
        ],
      },
      b: {
        values: [
          { timestamp: new Date(T0), _actualBitrateKbps: 400 },
          { timestamp: new Date(T0 + 1000), _actualBitrateKbps: 450 },
        ],
      },
    },
    inboundRtp: {
      c: {
        values: [
          { timestamp: new Date(T0), _actualBitrateKbps: 80 },
          // No bitrate on this sample — it still counts as an active stream.
          { timestamp: new Date(T0 + 1000) },
        ],
      },
    },
  },
};

check('bitrates are summed per timestamp across streams', () => {
  const r = buildClientRollups(rollupStats);
  assert.deepEqual(r.totalSend.map((p) => p.value), [500, 600]);
  assert.deepEqual(r.totalRecv.map((p) => p.value), [80]);
});

check('active streams count both directions, bitrate or not', () => {
  const r = buildClientRollups(rollupStats);
  assert.deepEqual(r.activeStreams.map((p) => p.value), [3, 3]);
});

check('points come out in time order', () => {
  const r = buildClientRollups(rollupStats);
  const times = r.totalSend.map((p) => p.timestamp.getTime());
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

check('no stats yields empty rollups', () => {
  const r = buildClientRollups(null);
  assert.deepEqual(r.totalSend, []);
  assert.deepEqual(r.totalRecv, []);
  assert.deepEqual(r.activeStreams, []);
});

check('bitrate switches to Mbps above 1000 kbps', () => {
  assert.equal(formatBitrateKbps(750), '750kbps');
  assert.equal(formatBitrateKbps(1500), '1.5Mbps');
});

console.log('\nsession summary');

check('percentiles interpolate and handle the edges', () => {
  const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentile(v, 0.5), 5.5);
  assert.equal(percentile(v, 0), 1);
  assert.equal(percentile(v, 1), 10);
  assert.equal(percentile([], 0.5), null);
  assert.equal(percentile([42], 0.95), 42);
  // Unsorted input must not change the answer.
  assert.equal(percentile([10, 1, 5], 0.5), 5);
});

check('issues follow observer-js families, collapsed into four buckets', () => {
  // network = observer-js "congestion" + "connectivity"
  assert.equal(classifyIssue('congestion'), 'network');
  assert.equal(classifyIssue('outbound-bandwidth-limited'), 'network');
  assert.equal(classifyIssue('ice-disconnected'), 'network');
  assert.equal(classifyIssue('unstable-ice-path'), 'network');
  assert.equal(classifyIssue('turn-unreachable'), 'network');

  assert.equal(classifyIssue('audio-desync'), 'audio');
  assert.equal(classifyIssue('high-concealment'), 'audio');
  assert.equal(classifyIssue('jitter-buffer-growth'), 'audio');

  assert.equal(classifyIssue('video-freeze'), 'video');
  assert.equal(classifyIssue('stuck-decoder'), 'video');
  assert.equal(classifyIssue('keyframe-storm'), 'video');

  // endpoint capacity and anything unrecognised both land in "other"
  assert.equal(classifyIssue('cpu-limitation'), 'other');
  assert.equal(classifyIssue('app-specific-thing'), 'other');
});

check('a resolution entry does not double-count its raise', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withIssues: any = [
    {
      timestamp: T0,
      clientIssues: [
        { type: 'video-freeze', key: 'k1', timestamp: T0 },
        { type: 'congestion', key: 'k2', timestamp: T0 },
      ],
    },
    {
      timestamp: T0 + 1000,
      clientIssues: [
        // the closing half of the freeze raised above
        { type: 'video-freeze-resolved', key: 'k1', timestamp: T0 + 1000 },
        { type: 'audio-desync', key: 'k3', timestamp: T0 + 1000 },
      ],
    },
  ];
  const sum = buildSessionSummary(null, withIssues);
  assert.equal(sum.issues.video, 1);
  assert.equal(sum.issues.network, 1);
  assert.equal(sum.issues.audio, 1);
  assert.equal(sum.issues.other, 0);
  assert.equal(sum.issues.total, 3);
  // The resolved suffix is stripped for the type listing.
  assert.deepEqual(sum.issues.typesByCategory.video, ['video-freeze']);
});

check('latency stats come from candidate-pair RTT, in ms', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {
    timeSeries: {
      candidatePairs: {
        p: {
          values: [
            { timestamp: T0, currentRoundTripTime: 0.02 },
            { timestamp: T0 + 1000, currentRoundTripTime: 0.04 },
            { timestamp: T0 + 2000, currentRoundTripTime: 0.06 },
          ],
        },
      },
      outboundRtp: {},
      inboundRtp: {},
    },
  };
  const sum = buildSessionSummary(stats, null);
  assert.equal(sum.latency.median, 40);
  assert.equal(sum.latency.average, 40);
  assert.equal(sum.latency.sampleCount, 3);
});

check('transmission totals use counter deltas and survive a reset', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {
    timeSeries: {
      candidatePairs: {},
      outboundRtp: {
        a: {
          kind: 'video',
          values: [
            { timestamp: T0, bytesSent: 1000, _actualBitrateKbps: 100 },
            { timestamp: T0 + 1000, bytesSent: 5000, _actualBitrateKbps: 300 },
          ],
        },
        // A stream whose counter went backwards must not subtract.
        b: {
          kind: 'audio',
          values: [
            { timestamp: T0, bytesSent: 900 },
            { timestamp: T0 + 1000, bytesSent: 100 },
          ],
        },
      },
      inboundRtp: {
        c: {
          kind: 'video',
          values: [
            { timestamp: T0, bytesReceived: 0, packetsLost: 0, packetsReceived: 0, _actualBitrateKbps: 200 },
            { timestamp: T0 + 1000, bytesReceived: 8000, packetsLost: 5, packetsReceived: 95, _actualBitrateKbps: 400 },
          ],
        },
      },
    },
  };
  const sum = buildSessionSummary(stats, null);
  assert.equal(sum.transmission.bytesSent, 4000);
  assert.equal(sum.transmission.bytesReceived, 8000);
  assert.equal(sum.transmission.packetsLost, 5);
  assert.equal(sum.transmission.lossRatePct, 5);
  assert.equal(sum.transmission.avgOutboundKbps, 200);
  assert.equal(sum.transmission.avgInboundKbps, 300);
});

check('video CPU sums encode and decode at the same instant', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {
    timeSeries: {
      candidatePairs: {},
      outboundRtp: {
        a: {
          kind: 'video',
          values: [
            { timestamp: T0, encodeCpuPercent: 20, _qlCpuPct: 0 },
            { timestamp: T0 + 1000, encodeCpuPercent: 40, _qlCpuPct: 50 },
          ],
        },
        // Audio carries no encode timer, so it contributes nothing.
        b: { kind: 'audio', values: [{ timestamp: T0, encodeCpuPercent: 999 }] },
      },
      inboundRtp: {
        c: {
          kind: 'video',
          values: [
            { timestamp: T0, decodeCpuPercent: 10 },
            { timestamp: T0 + 1000, decodeCpuPercent: 10 },
          ],
        },
      },
    },
  };
  const sum = buildSessionSummary(stats, null);
  // 20+10 at T0, 40+10 at T0+1000
  assert.equal(sum.cpu.max, 50);
  assert.equal(sum.cpu.median, 40);
  assert.equal(sum.cpu.sampleCount, 2);
  // The browser's own CPU-limitation verdict, averaged.
  assert.equal(sum.cpu.cpuLimitedPct, 25);
});

check('warm-up samples are excluded', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {
    timeSeries: {
      candidatePairs: {
        p: {
          values: [
            { timestamp: T0, currentRoundTripTime: 5 },
            { timestamp: T0 + 10_000, currentRoundTripTime: 0.02 },
          ],
        },
      },
      outboundRtp: {},
      inboundRtp: {},
    },
  };
  const sum = buildSessionSummary(stats, null, { warmupEnd: T0 + 5000 });
  assert.equal(sum.latency.sampleCount, 1);
  assert.equal(sum.latency.median, 20);
});

check('session span comes from the samples themselves', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spanSamples: any = [
    { timestamp: T0 },
    { timestamp: T0 + 30_000 },
    { timestamp: T0 + 12_000 },
  ];
  const sum = buildSessionSummary(null, spanSamples);
  assert.equal(sum.span.startedAt, T0);
  assert.equal(sum.span.endedAt, T0 + 30_000);
  assert.equal(sum.span.durationMs, 30_000);
});

check('span falls back to the time series when no raw samples are given', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {
    timeSeries: {
      candidatePairs: {},
      outboundRtp: {
        a: { kind: 'video', values: [{ timestamp: T0 + 1000 }, { timestamp: T0 + 9000 }] },
      },
      inboundRtp: {},
    },
  };
  const sum = buildSessionSummary(stats, null);
  assert.equal(sum.span.durationMs, 8000);
});

check('cpu carries an average alongside the percentiles', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {
    timeSeries: {
      candidatePairs: {},
      inboundRtp: {},
      outboundRtp: {
        a: {
          kind: 'video',
          values: [
            { timestamp: T0, encodeCpuPercent: 10 },
            { timestamp: T0 + 1000, encodeCpuPercent: 20 },
            { timestamp: T0 + 2000, encodeCpuPercent: 60 },
          ],
        },
      },
    },
  };
  const sum = buildSessionSummary(stats, null);
  assert.equal(sum.cpu.average, 30);
  assert.equal(sum.cpu.median, 20);
  assert.equal(sum.cpu.max, 60);
});

check('nothing in, well-formed zeroes out', () => {
  const sum = buildSessionSummary(null, null);
  assert.equal(sum.latency.median, null);
  assert.equal(sum.issues.total, 0);
  assert.equal(sum.transmission.bytesSent, null);
  assert.equal(sum.transmission.packetsLost, 0);
  assert.equal(sum.cpu.median, null);
  assert.equal(sum.cpu.average, null);
  assert.equal(sum.span.durationMs, null);
});

console.log(`\n${passed} checks passed`);
