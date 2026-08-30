/**
 * The call dashboard's view model.
 *
 *   node --experimental-strip-types scripts/callDashboard.test.ts
 *
 * Two things are being protected here. The first is the reason the Load button
 * exists at all: a call summary that carries no per-client metrics used to
 * render a table of em dashes on a call whose data was all there, so the checks
 * below are mostly about a loaded client's own stats filling those cells
 * in — and about the merge between the two sources not throwing away a real
 * number from either one. The second is that a fact the summary did not state
 * is left out rather than rendered as a placeholder.
 */

import assert from 'node:assert/strict';
import {
  buildDashboardModel,
  type DashboardClient,
} from '../src/utils/dashboardModel.ts';
import { buildClientMetrics } from '../src/utils/clientMetrics.ts';
import type { ClientLoadEntry } from '../src/stores/clientLoadStore.ts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const T0 = 1_700_000_000_000;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function callSession(clientIds: string[], names: Record<string, string> = {}): Any {
  return {
    callStart: T0,
    callEnd: T0 + 600_000,
    clientSessions: new Map(
      clientIds.map((id, i) => [id, { joined: T0 + i * 1000, left: T0 + 600_000 }]),
    ),
    _clientLabelMap: new Map(Object.entries(names)),
  };
}

function loadedEntry(metrics: Partial<ReturnType<typeof buildClientMetrics>>): ClientLoadEntry {
  return {
    status: 'loaded',
    metrics: {
      score: null,
      scoreSamples: [],
      rttMedianMs: null,
      lossP95: null,
      turnConnected: false,
      issueCount: 0,
      sampleCount: 0,
      startedAt: null,
      endedAt: null,
      ...metrics,
    },
  };
}

function client(model: Any, clientId: string): DashboardClient {
  const found = model.clients.find((p: DashboardClient) => p.clientId === clientId);
  assert.ok(found, `no client row for ${clientId}`);
  return found;
}

console.log('deriving a client from their own stats');

check('a score series yields the latest score, not the mean', () => {
  // The score column sits beside a sparkline whose right-hand bar is this
  // number. A mean there would not match the bar it points at.
  const m = buildClientMetrics(
    {
      scores: {
        session: [
          { timestamp: T0, score: 5 },
          { timestamp: T0 + 1000, score: 4 },
          { timestamp: T0 + 2000, score: 2 },
        ],
      },
      timeSeries: {},
    } as Any,
    [],
  );
  assert.equal(m.score, 2);
  assert.deepEqual(m.scoreSamples.map((s) => s.v), [5, 4, 2]);
  // Timestamped, because the dashboard plots several clients on one time axis.
  assert.deepEqual(m.scoreSamples.map((s) => s.t), [T0, T0 + 1000, T0 + 2000]);
  assert.equal(m.startedAt, T0);
  assert.equal(m.endedAt, T0 + 2000);
});

check('RTT is the median of the candidate pairs, in milliseconds', () => {
  const m = buildClientMetrics(
    {
      scores: { session: [] },
      timeSeries: {
        candidatePairs: {
          a: {
            values: [
              { timestamp: T0, currentRoundTripTime: 0.02 },
              { timestamp: T0 + 1000, currentRoundTripTime: 0.04 },
              // A wild outlier: one STUN response stuck behind a
              // retransmission. A mean would report ~186 ms for a path that
              // never left 40.
              { timestamp: T0 + 2000, currentRoundTripTime: 0.5 },
            ],
          },
        },
      },
    } as Any,
    [],
  );
  assert.equal(m.rttMedianMs, 40);
});

check('an RTT of zero is not a measurement', () => {
  // Browsers report 0 for a pair that has not measured yet. Counting those
  // pulls the median toward zero and makes a bad path look good.
  const m = buildClientMetrics(
    {
      scores: { session: [] },
      timeSeries: {
        candidatePairs: {
          a: {
            values: [
              { timestamp: T0, currentRoundTripTime: 0 },
              { timestamp: T0 + 1000, currentRoundTripTime: 0 },
              { timestamp: T0 + 2000, currentRoundTripTime: 0.1 },
            ],
          },
        },
      },
    } as Any,
    [],
  );
  assert.equal(m.rttMedianMs, 100);
});

check('loss is a percentile across every inbound stream', () => {
  // Concentrated loss is what matters: nine quiet samples and one at 12%
  // gives an unremarkable total and a p95 that says what happened.
  const values = Array.from({ length: 19 }, (_, i) => ({
    timestamp: T0 + i * 1000,
    _packetLossRatePct: 0,
  }));
  values.push({ timestamp: T0 + 19_000, _packetLossRatePct: 12 });
  const m = buildClientMetrics(
    { scores: { session: [] }, timeSeries: { inboundRtp: { a: { values } } } } as Any,
    [],
  );
  assert.ok(m.lossP95 !== null && m.lossP95 > 0, `expected a non-zero p95, got ${m.lossP95}`);
});

check('nothing measured is null, never zero', () => {
  // A zero in these cells reads as "measured, and it was perfect". The table
  // renders null as an em dash, which is the truth.
  const m = buildClientMetrics({ scores: { session: [] }, timeSeries: {} } as Any, []);
  assert.equal(m.score, null);
  assert.equal(m.rttMedianMs, null);
  assert.equal(m.lossP95, null);
  assert.equal(m.turnConnected, false);
});

check('a relayed candidate anywhere in the session counts as TURN', () => {
  // Asked over the session, not at the end: a call that started relayed and
  // later found a direct path still used TURN.
  const m = buildClientMetrics(
    {
      scores: { session: [] },
      timeSeries: {
        iceSelectedPair: {
          a: {
            values: [
              { timestamp: T0, state: 'relay', relayProtocol: 'udp' },
              { timestamp: T0 + 1000, state: 'direct', relayProtocol: null },
            ],
          },
        },
      },
    } as Any,
    [],
  );
  assert.equal(m.turnConnected, true);
});

check('a resolution entry is not a second issue', () => {
  const m = buildClientMetrics({ scores: { session: [] }, timeSeries: {} } as Any, [
    { clientIssues: [{ type: 'freezed-video-track' }] },
    { clientIssues: [{ type: 'freezed-video-track-resolved' }] },
  ] as Any);
  assert.equal(m.issueCount, 1);
});

console.log('\nthe clients table');

check('a summary with no per-client metrics still lists everyone', () => {
  const model = buildDashboardModel(callSession(['a', 'b']), null, new Map());
  assert.equal(model.clients.length, 2);
  for (const p of model.clients) {
    assert.equal(p.scoreDisplay, '—');
    assert.equal(p.rttDisplay, '—');
    // ...and every one of them offers to fix that.
    assert.equal(p.loadStatus, 'idle');
    assert.equal(p.source, 'none');
  }
});

check('loading a client fills that row and leaves the others alone', () => {
  const loaded = new Map<string, ClientLoadEntry>([
    [
      'a',
      loadedEntry({
        score: 3.2,
        scoreSamples: [
          { t: T0, v: 4 },
          { t: T0 + 60_000, v: 3.2 },
        ],
        rttMedianMs: 84.4,
        lossP95: 1.25,
        issueCount: 7,
      }),
    ],
  ]);
  const model = buildDashboardModel(callSession(['a', 'b']), null, new Map(), loaded);

  const a = client(model, 'a');
  assert.equal(a.scoreDisplay, '3.2/5');
  assert.equal(a.rttDisplay, '84 ms');
  assert.equal(a.lossDisplay, '1.3%');
  assert.equal(a.issueCount, 7);
  assert.equal(a.source, 'loaded');
  assert.equal(a.loadStatus, 'loaded');

  const b = client(model, 'b');
  assert.equal(b.scoreDisplay, '—');
  assert.equal(b.loadStatus, 'idle');
});

check('a loaded client reaches the quality chart', () => {
  // The whole point of the Load button: the chart was empty because the
  // summary carried no series, and one load is enough to draw a line.
  const before = buildDashboardModel(callSession(['a']), null, new Map());
  assert.equal(before.qualityChart.empty, true);

  const after = buildDashboardModel(
    callSession(['a']),
    null,
    new Map(),
    new Map([
      [
        'a',
        loadedEntry({
          score: 4,
          scoreSamples: [
            { t: T0, v: 5 },
            { t: T0 + 60_000, v: 4.5 },
            { t: T0 + 120_000, v: 4 },
          ],
        }),
      ],
    ]),
  );
  assert.equal(after.qualityChart.empty, false);
  assert.equal(after.qualityChart.series.length, 1);
  // Measured timestamps, so the line is where the client actually was.
  assert.equal(after.qualityChart.series[0].approximateTiming, false);
  assert.deepEqual(
    after.qualityChart.series[0].points.map((pt) => pt.t),
    [T0, T0 + 60_000, T0 + 120_000],
  );
});

check('measured numbers win over the summary, field by field', () => {
  // Not row by row. The summary knowing an RTT the load never measured must
  // survive the load, or clicking Load would delete a real number.
  const summary = {
    clients: { a: { rttMedianMs: 999, lossP95: 8, score: 1 } },
    routerIds: [],
    roomId: 'room',
  } as Any;
  const loaded = new Map<string, ClientLoadEntry>([
    ['a', loadedEntry({ score: 4.4, scoreSamples: [{ t: T0, v: 4.4 }], rttMedianMs: null, lossP95: 2 })],
  ]);
  const p = client(buildDashboardModel(callSession(['a']), summary, new Map(), loaded), 'a');
  assert.equal(p.scoreDisplay, '4.4/5', 'the measured score should win');
  assert.equal(p.lossDisplay, '2.0%', 'the measured loss should win');
  assert.equal(p.rttDisplay, '999 ms', "the summary's RTT should survive a load that had none");
});

check("the summary's TURN list tags a client with no metrics of its own", () => {
  const summary = { clients: {}, routerIds: [], clientsUsedTurn: ['b'], roomId: 'r' } as Any;
  const model = buildDashboardModel(callSession(['a', 'b']), summary, new Map());
  assert.equal(client(model, 'a').turnConnected, false);
  assert.equal(client(model, 'b').turnConnected, true);
});

check('a failed load leaves the row retryable and says why', () => {
  const loaded = new Map<string, ClientLoadEntry>([
    ['a', { status: 'error', error: 'network unreachable' }],
  ]);
  const p = client(buildDashboardModel(callSession(['a']), null, new Map(), loaded), 'a');
  assert.equal(p.loadStatus, 'error');
  assert.equal(p.loadError, 'network unreachable');
  assert.equal(p.scoreDisplay, '—');
});

console.log('\nduration');

check('the observer’s duration wins over the sample span', () => {
  const summary = {
    clients: {},
    routerIds: [],
    roomId: 'r',
    startedAt: T0,
    endedAt: T0 + 600_000,
    durationInMs: 900_000,
  } as Any;
  const model = buildDashboardModel(callSession(['a']), summary, new Map());
  assert.equal(model.durationLabel, '15m');
  const card = model.statCards.find((c) => c.key === 'duration');
  assert.equal(card?.value, '15m');
});

check('a zero duration in the summary is not believed', () => {
  // An unfinished summary writes one, and the span is the better answer.
  const summary = { clients: {}, routerIds: [], roomId: 'r', durationInMs: 0 } as Any;
  const model = buildDashboardModel(callSession(['a']), summary, new Map());
  assert.equal(model.durationLabel, '10m');
});

check('no summary at all still gets a duration from the span', () => {
  const model = buildDashboardModel(callSession(['a']), null, new Map());
  assert.equal(model.statCards[0].key, 'duration');
  assert.equal(model.statCards[0].value, '10m');
});

console.log('\ncall details');

function factsOf(model: Any, groupKey: string): Record<string, string> {
  const group = model.factGroups.find((g: Any) => g.key === groupKey);
  if (!group) return {};
  return Object.fromEntries(group.facts.map((f: Any) => [f.key, f.value]));
}

check('a summary the observer filled in is reported in full', () => {
  const summary = {
    clients: {},
    routerIds: ['r1'],
    roomId: 'daily',
    startedAt: T0,
    endedAt: T0 + 600_000,
    clientCounts: { peak: 4, joined: 4, left: 4 },
    scores: { samples: 1588, min: 0, max: 5, median: 4.85 },
    numberOfClientIssues: 69,
    clientsUsedTurn: [],
    sfuIds: ['2b233490'],
  } as Any;
  const model = buildDashboardModel(callSession(['a']), summary, new Map());

  assert.equal(factsOf(model, 'who').joined, '4');
  assert.equal(factsOf(model, 'who').left, '4');
  assert.equal(factsOf(model, 'who').peak, '4');
  assert.equal(factsOf(model, 'quality').range, '0.0 – 5.0');
  assert.equal(factsOf(model, 'quality').median, '4.85');
  assert.equal(factsOf(model, 'quality').samples, (1588).toLocaleString());
  assert.equal(factsOf(model, 'quality')['client-issues'], '69');
  assert.equal(factsOf(model, 'infra').sfus, '2b233490');
});

check('an empty TURN list is not a fact', () => {
  // "Used TURN: " with nothing after it is worse than no row at all.
  const summary = { clients: {}, routerIds: [], roomId: 'r', clientsUsedTurn: [] } as Any;
  const model = buildDashboardModel(callSession(['a']), summary, new Map());
  assert.equal(factsOf(model, 'who').turn, undefined);
});

check('TURN users are named, not counted', () => {
  const summary = { clients: {}, routerIds: [], roomId: 'r', clientsUsedTurn: ['a'] } as Any;
  const model = buildDashboardModel(callSession(['a'], { a: 'Alice' }), summary, new Map());
  assert.equal(factsOf(model, 'who').turn, 'Alice');
});

check('what a multi-SFU merge could not do is said outright', () => {
  const summary = {
    clients: {},
    routerIds: [],
    roomId: 'r',
    sfuIds: ['sfu-a', 'sfu-b'],
    sources: [{ key: 'call-summary-sfu-a.json', routerIds: [], clientIds: [] }, { key: 'call-summary-sfu-b.json', routerIds: [], clientIds: [] }],
    missingSources: 1,
    unmergeable: ['scores.median', 'clientCounts.peak'],
    clientCounts: { peak: 3 },
    scores: { mean: 4.1 },
  } as Any;
  const model = buildDashboardModel(callSession(['a']), summary, new Map());
  const infra = factsOf(model, 'infra');
  assert.equal(infra.sources, '2 summaries');
  assert.equal(infra.missing, '1');
  assert.equal(infra.unmergeable, 'scores.median, clientCounts.peak');
  // A peak that is a lower bound must not be printed as a peak.
  assert.equal(factsOf(model, 'who').peak, '≥3');
  // No median survived the merge, so the mean stands in and says so.
  assert.equal(factsOf(model, 'quality').mean, '4.10');
  assert.equal(factsOf(model, 'quality').median, undefined);
});

check('a summary that says nothing produces no empty groups', () => {
  const model = buildDashboardModel(callSession(['a']), null, new Map());
  for (const group of model.factGroups) {
    assert.ok(group.facts.length > 0, `${group.key} is an empty group`);
  }
  // The span alone is enough for a "When" group, and nothing else.
  assert.deepEqual(model.factGroups.map((g) => g.key), ['when']);
});

console.log('\nthe quality chart');

check('a summary series with no timestamps is spread over the client’s own window', () => {
  // Plotting by index put everyone's first sample on the left edge, so a
  // client who joined at minute nine drew across the whole call and lined up
  // against people who were never on at the same time.
  const summary = { clients: { b: { scoreSeries: [5, 4, 3] } }, routerIds: [], roomId: 'r' } as Any;
  const session = callSession(['a', 'b']);
  // b joined halfway through and stayed to the end.
  session.clientSessions.set('b', { joined: T0 + 300_000, left: T0 + 600_000 });

  const model = buildDashboardModel(session, summary, new Map());
  const line = model.qualityChart.series.find((s: Any) => s.clientId === 'b');
  assert.ok(line);
  assert.equal(line.approximateTiming, true, 'timing is derived, and must say so');
  assert.equal(line.points[0].t, T0 + 300_000);
  assert.equal(line.points[line.points.length - 1].t, T0 + 600_000);
});

check('the x domain is the call, not the union of the lines', () => {
  const summary = { clients: { a: { scoreSeries: [5, 4] } }, routerIds: [], roomId: 'r' } as Any;
  const session = callSession(['a']);
  session.clientSessions.set('a', { joined: T0 + 120_000, left: T0 + 180_000 });
  const model = buildDashboardModel(session, summary, new Map());
  // A client present for one minute of a ten-minute call draws in that minute.
  assert.equal(model.qualityChart.xStart, T0);
  assert.equal(model.qualityChart.xEnd, T0 + 600_000);
});

check('a sample outside the call span widens the axis rather than being clipped', () => {
  const loaded = new Map<string, ClientLoadEntry>([
    ['a', loadedEntry({ scoreSamples: [{ t: T0 - 5_000, v: 5 }, { t: T0 + 900_000, v: 2 }] })],
  ]);
  const model = buildDashboardModel(callSession(['a']), null, new Map(), loaded);
  assert.equal(model.qualityChart.xStart, T0 - 5_000);
  assert.equal(model.qualityChart.xEnd, T0 + 900_000);
});

check('a single sample is not a line', () => {
  // One point has no shape to read and would draw as an invisible zero-length
  // path with a legend entry promising something.
  const loaded = new Map<string, ClientLoadEntry>([
    ['a', loadedEntry({ score: 4, scoreSamples: [{ t: T0, v: 4 }] })],
  ]);
  const model = buildDashboardModel(callSession(['a']), null, new Map(), loaded);
  assert.equal(model.qualityChart.empty, true);
  // The row still shows the score, though.
  assert.equal(client(model, 'a').scoreDisplay, '4.0/5');
});

check('loading a client replaces its approximate line with the measured one', () => {
  const summary = { clients: { a: { scoreSeries: [5, 1] } }, routerIds: [], roomId: 'r' } as Any;
  const before = buildDashboardModel(callSession(['a']), summary, new Map());
  assert.equal(before.qualityChart.series[0].approximateTiming, true);

  const after = buildDashboardModel(
    callSession(['a']),
    summary,
    new Map(),
    new Map([
      ['a', loadedEntry({ scoreSamples: [{ t: T0 + 1000, v: 4 }, { t: T0 + 2000, v: 3 }] })],
    ]),
  );
  assert.equal(after.qualityChart.series[0].approximateTiming, false);
  assert.deepEqual(after.qualityChart.series[0].points.map((pt: Any) => pt.v), [4, 3]);
});

console.log(`\n${passed} checks passed`);
