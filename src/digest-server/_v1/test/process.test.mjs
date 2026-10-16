/**
 * The processor, end to end against the fixture, with no object storage.
 *
 *   node --experimental-strip-types test/process.test.mjs
 *
 * Storage is replaced by an in-memory map, so every check here is deterministic
 * and no bucket is touched. **Real object storage has not been tested** — see
 * the README for what that leaves unverified (conditional writes above all,
 * since `If-None-Match` support differs between AWS S3 and self-hosted
 * gateways).
 *
 * The output is validated by the generated validators, which is the handoff
 * gate: if what this writes does not pass the contract's own schema, the
 * dashboard cannot read it and no amount of agreement in prose helps.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateCallDigest,
  validateManifest,
  validatePage,
  validatePeriodDigest,
} from '../../digest/validators.mjs';
import { HISTOGRAM_REGISTRY, METRIC_REGISTRY, unimplementedMetricIds } from '../registry.mjs';
import { buildCallDigest, buildInventory, inventoryRevision } from '../callDigest.mjs';
import { buildContribution, buildPeriodDigest, daysInMonth } from '../periodDigest.mjs';
import { decodePatchedJsonl } from '../samplePatch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, '..', 'fixtures', 'tiny-call', 'demo-room', 'call-0001');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/* ── build the digest from the fixture ─────────────────── */

const files = readdirSync(FIXTURE);
const clients = files
  .filter((f) => f.endsWith('.jsonl'))
  .sort()
  .map((f) => {
    const clientId = f.replace(/\.jsonl$/, '');
    const samples = decodePatchedJsonl(readFileSync(join(FIXTURE, f), 'utf8'))
      .filter((s) => typeof s.timestamp === 'number')
      .sort((a, b) => a.timestamp - b.timestamp);
    return { clientId, instanceId: `${clientId}#0`, samples };
  });

const rawSummary = JSON.parse(readFileSync(join(FIXTURE, 'call-summary.json'), 'utf8'));
const summary = {
  peak: rawSummary.clients.peak,
  clientCount: rawSummary.clients.joined,
  durationInMs: rawSummary.durationInMs,
};

const sources = buildInventory([
  ...files.filter((f) => f.endsWith('.jsonl')).map((f, i) => ({ kind: 'client-samples', relativeKey: f, etag: `"etag-${i}"`, size: 1 })),
  { kind: 'observer-summary', relativeKey: 'call-summary.json', etag: '"etag-s"', size: 1 },
]);

const sourceRevision = await inventoryRevision(sources);

function makeDigest(over = {}) {
  return buildCallDigest({
    tenantId: 'demo',
    roomId: 'demo-room',
    callId: 'call-0001',
    revision: sourceRevision.slice(0, 16),
    sourceRevision,
    sources,
    clients,
    summary,
    generatedAt: 1_792_000_000_000,
    ...over,
  });
}

const digest = makeDigest();

console.log('the fixture decodes');

check('patch encoding round-trips to full samples', () => {
  assert.equal(clients.length, 2);
  // client-b is missing two ticks on purpose, to make a gap.
  assert.equal(clients[0].samples.length, 12);
  assert.equal(clients[1].samples.length, 10);
  // A patched field is present on a later sample even though only the first
  // line carried the whole object.
  assert.equal(clients[0].samples[5].peerConnections[0].inboundRtps[0].kind, 'audio');
  assert.ok(clients[0].samples[5].timestamp > clients[0].samples[4].timestamp);
});

console.log('\nthe digest passes the contract schema');

check('the call digest validates', () => {
  const { _detail, ...stored } = digest;
  assert.ok(validateCallDigest(stored), JSON.stringify(validateCallDigest.errors?.slice(0, 3), null, 2));
});

check('every required capability key is present', () => {
  for (const key of [
    'usage', 'joinOutcomes', 'audio', 'video',
    'network', 'connectivity', 'paths', 'topology', 'cohorts', 'scores',
  ]) {
    assert.ok(digest.capabilities[key], `missing capability ${key}`);
  }
});

check('detail pages validate as pages', () => {
  const page = { revision: digest.revision, items: digest._detail.streams.slice(0, 100), nextCursor: null };
  assert.ok(validatePage(page), JSON.stringify(validatePage.errors?.slice(0, 3)));
});

check('the manifest validates', () => {
  const manifest = {
    schemaVersion: 1,
    subject: { kind: 'call', id: digest.callId },
    currentRevision: digest.revision,
    digestKey: `calls/x/revisions/${digest.revision}/digest.json`,
    provenance: digest.provenance,
    supersedes: null,
  };
  assert.ok(validateManifest(manifest), JSON.stringify(validateManifest.errors?.slice(0, 3)));
});

console.log('\nthe registry is fully implemented');

check('no registry metric is silently missing an extractor', () => {
  // A registry entry with no extractor would be absent from every digest with
  // nothing to say it was never attempted.
  assert.deepEqual(unimplementedMetricIds(), []);
});

check('every metric in the digest exists in the registry', () => {
  const known = new Set(METRIC_REGISTRY.metrics.map((m) => m.metricId));
  for (const m of digest.metrics) assert.ok(known.has(m.metricId), `unknown metric ${m.metricId}`);
});

check('every histogram has weights.length === upperBounds.length + 1', () => {
  // The cross-document rule JSON Schema cannot express.
  const bounds = new Map(HISTOGRAM_REGISTRY.definitions.map((d) => [d.definitionId, d.upperBounds.length]));
  for (const m of digest.metrics) {
    if (!m.distribution) continue;
    const expected = bounds.get(m.distribution.definitionId);
    assert.ok(expected !== undefined, `unknown histogram ${m.distribution.definitionId}`);
    assert.equal(m.distribution.weights.length, expected + 1, m.metricId);
  }
});

console.log('\nunknown is distinct from zero');

check('an unavailable metric nulls every figure', () => {
  const unavailable = digest.metrics.filter((m) => m.status === 'unavailable');
  for (const m of unavailable) {
    assert.equal(m.numerator, null, m.metricId);
    assert.equal(m.denominator, null, m.metricId);
    assert.equal(m.min, null, m.metricId);
    assert.equal(m.max, null, m.metricId);
    assert.equal(m.distribution, null, m.metricId);
    assert.equal(m.validIntervals, 0, m.metricId);
    assert.ok(m.unavailableReasons.length > 0, `${m.metricId} must say why`);
  }
});

check('a capability nobody could support says why', () => {
  assert.equal(digest.capabilities.topology.state, 'unavailable');
  assert.deepEqual(digest.capabilities.topology.reasons, ['topology.relationship-unverified']);
  assert.equal(digest.capabilities.joinOutcomes.state, 'unavailable');
  assert.deepEqual(digest.capabilities.joinOutcomes.reasons, ['joins.adapter-missing']);
});

check('peak concurrency comes from the summary, never from sample overlap', () => {
  // Sample bounds say when a client was observed, not when a person was present.
  assert.equal(digest.usage.peakConcurrentParticipants, 2);
  const withoutSummary = makeDigest({ summary: null });
  assert.equal(withoutSummary.usage.peakConcurrentParticipants, null);
  assert.equal(withoutSummary.lifecycle, 'unknown');
});

check('connected participant time stays null without connection-state evidence', () => {
  assert.equal(digest.usage.connectedParticipantMs, null);
});

check('no publisher relationship is invented from equal SSRC', () => {
  // Both clients use ssrc 3333 for outbound audio in the fixture, which is
  // exactly the trap: joining on that would link two unrelated streams.
  for (const stream of digest._detail.streams) {
    assert.equal(stream.publisherStreamId, null);
    assert.equal(stream.relationshipSource, null);
  }
});

console.log('\nthe arithmetic');

check('loss is a ratio of sums, not a mean of interval ratios', () => {
  const loss = digest.metrics.find((m) => m.metricId === 'audio.inbound.loss');
  assert.ok(loss, 'audio.inbound.loss must be present');
  assert.notEqual(loss.status, 'unavailable');
  // Recomputed from the numerator and denominator the digest carries.
  const value = loss.numerator / loss.denominator;
  assert.ok(value >= 0 && value <= 1, `loss ${value} out of domain`);
  // client-b loses 12% over two intervals of twelve; the pooled figure must sit
  // well below that, because the ratio of sums weights by packets carried.
  assert.ok(value < 0.12, `pooled loss ${value} should be below the worst interval`);
  assert.ok(value > 0, 'the fixture does lose packets');
});

check('a measured zero is evidence, not an absence', () => {
  const cpu = digest.metrics.find((m) => m.metricId === 'video.outbound.cpuLimitedShare');
  assert.notEqual(cpu.status, 'unavailable');
  // 0.4 cpu of (0.4 + 0.6) limited seconds per tick.
  assert.ok(Math.abs(cpu.numerator / cpu.denominator - 0.4) < 1e-6);
});

check('bitrate is bits per second, from byte deltas over elapsed ms', () => {
  const bitrate = digest.metrics.find((m) => m.metricId === 'audio.inbound.bitrate');
  // 40_000 bytes per 5000 ms = 64_000 bps.
  assert.ok(Math.abs(bitrate.numerator / bitrate.denominator - 64_000) < 1_000);
});

check('seconds-valued stats are converted to milliseconds', () => {
  const jitter = digest.metrics.find((m) => m.metricId === 'audio.inbound.jitter');
  // 0.004 s held throughout -> 4 ms, not 0.004.
  assert.ok(Math.abs(jitter.numerator / jitter.denominator - 4) < 0.01);

  const rtt = digest.metrics.find((m) => m.metricId === 'transport.iceRtt');
  // Mostly 30ms with two 600ms intervals, duration-weighted.
  const value = rtt.numerator / rtt.denominator;
  assert.ok(value > 30 && value < 600, `ice rtt ${value} should sit between the two levels`);
});

check('min and max are interval extrema, not counter extrema', () => {
  const bytes = digest.metrics.find((m) => m.metricId === 'transport.rtpBytesReceived');
  // The counter reaches ~480k; a per-interval delta is ~40k. A max near the
  // cumulative total would mean the extrema came from the counter itself.
  assert.ok(bytes.max < 2_000_000, `max ${bytes.max} looks like a cumulative reading`);
  assert.equal(bytes.denominator, null, 'a sum metric has no denominator');
});

check('a counter reset drops only the metrics whose counter reset', () => {
  // Compared per client, because interval counts are per subject: the byte
  // metrics cover two RTP streams each while iceRtt covers one pair, so the
  // call-level totals are not comparable to each other.
  //
  // client-a: 12 samples, no gap, no reset -> 11 intervals per subject.
  // client-b: 10 samples with a 20s gap -> 8 intervals per subject, and its RTP
  //           byte counter resets at tick 7, splitting that series into two
  //           epochs and losing the interval that straddles the reset -> 7.
  const per = (clientId, metricId) => {
    const participant = digest._detail.participants.find((p) => p.clientId === clientId);
    return participant.metrics.find((m) => m.metricId === metricId).validIntervals;
  };

  const streams = 2; // inbound audio + inbound video
  assert.equal(per('client-a', 'transport.rtpBytesReceived'), 11 * streams);
  assert.equal(per('client-a', 'transport.iceRtt'), 11);

  assert.equal(per('client-b', 'transport.iceRtt'), 8, 'the gap costs one interval');
  assert.equal(
    per('client-b', 'transport.rtpBytesReceived'),
    7 * streams,
    'and the reset costs one more, but only for the counter that reset',
  );
});

check('a long gap contributes nothing rather than an interpolation', () => {
  // client-b is missing ticks 9 and 10, a 20s hole against a 10s policy limit.
  const observed = digest.usage.observedParticipantMs;
  const naive = 11 * 5000 * 2;
  assert.ok(observed < naive, `observed ${observed} should exclude the gap, not span it`);
  assert.ok(observed > 11 * 5000, 'but both clients contribute their own time');
});

check('observed participant time is a union per client, not count times duration', () => {
  const observed = digest.usage.observedParticipantMs;
  const perClient = digest._detail.participants.map((p) => p.observedDurationMs);
  assert.equal(observed, perClient.reduce((a, b) => a + b, 0));
  const callSpan = digest.range.endAt - digest.range.startAt;
  assert.notEqual(observed, callSpan * clients.length);
});

console.log('\nimpairment is classified honestly');

check('network impairment is measured, because its evidence is interval-resolution', () => {
  const network = digest.impairments.find((e) => e.category === 'network');
  assert.ok(network.assessedParticipantMs > 0, 'network must be assessable');
  assert.ok(network.impairedParticipantMs > 0, 'the fixture has 12% loss and 600ms RTT');
  assert.ok(network.impairedParticipantMs <= network.assessedParticipantMs);
});

check('video freeze is measured as a stream metric but not as participant time', () => {
  // The restriction the policy is named for: a cumulative freeze delta locates
  // freeze inside an interval without bounding when, so participant impairment
  // duration from that evidence stays unknown.
  const freeze = digest.metrics.find((m) => m.metricId === 'video.inbound.freezeShare');
  assert.notEqual(freeze.status, 'unavailable', 'freeze must be measured as a stream metric');
  assert.ok(freeze.numerator > 0, 'the fixture does freeze');

  const video = digest.impairments.find((e) => e.category === 'video');
  assert.equal(video.impairedParticipantMs, 0, 'freeze must not become participant-impaired time');
  assert.equal(video.assessedParticipantMs, 0, 'and the category is not assessed, not healthy');
  assert.ok(video.unknownParticipantMs > 0, 'the time is unknown, which must be reported');
});

check('`any` is a union of categories, never their sum', () => {
  const any = digest.impairments.find((e) => e.category === 'any');
  const categories = digest.impairments.filter((e) => e.category !== 'any');
  const summed = categories.reduce((n, e) => n + e.impairedParticipantMs, 0);
  assert.ok(any.impairedParticipantMs <= summed + 1, 'any must not exceed the sum');
  assert.ok(any.impairedParticipantMs > 0);
  assert.ok(any.assessedParticipantMs <= digest.usage.observedParticipantMs);
});

check('unknown time is reported rather than counted as healthy', () => {
  for (const e of digest.impairments) {
    assert.ok(e.unknownParticipantMs >= 0);
    assert.ok(
      e.impairedParticipantMs <= e.assessedParticipantMs,
      `${e.category}: impaired exceeds assessed`,
    );
  }
});

console.log('\nretries are deterministic');

check('the same inputs produce the same revision and the same digest', () => {
  const again = makeDigest();
  assert.equal(again.revision, digest.revision);
  const { _detail: _a, ...left } = digest;
  const { _detail: _b, ...right } = again;
  assert.deepEqual(right, left);
});

check('a changed source changes the revision', async () => {
  const altered = [...sources];
  altered[0] = { ...altered[0], revision: 'etag-changed' };
  const other = await inventoryRevision(altered);
  assert.notEqual(other, sourceRevision);
});

check('the inventory hash does not depend on source order', async () => {
  const shuffled = [...sources].reverse();
  assert.equal(await inventoryRevision(shuffled), sourceRevision);
});

console.log('\nperiods');

const contribution = buildContribution(digest, 'day');

function period(id, contributions, over = {}) {
  return buildPeriodDigest({
    tenantId: 'demo',
    period: id.length === 7 ? 'month' : 'day',
    id,
    revision: 'rev1',
    sourceRevision: 'src1',
    contributions,
    coverage: {
      indexedCalls: contributions.length,
      readableCallDigests: contributions.length,
      pendingCallDigests: 0,
      failedCallDigests: 0,
      unknownCallDigests: 0,
      expectedChildPeriods: id.length === 7 ? daysInMonth(id) : 24,
      includedChildPeriods: id.length === 7 ? daysInMonth(id) : 24,
    },
    generatedAt: 1_792_000_000_000,
    ...over,
  });
}

check('a day digest validates', () => {
  const day = period('2026-10-15', [contribution]);
  assert.ok(validatePeriodDigest(day), JSON.stringify(validatePeriodDigest.errors?.slice(0, 3), null, 2));
  assert.equal(day.buckets.length, 24);
  assert.equal(day.totals.callsStarted, 1);
});

check('a month digest validates and has one bucket per day', () => {
  const month = period('2026-10', [contribution]);
  assert.ok(validatePeriodDigest(month), JSON.stringify(validatePeriodDigest.errors?.slice(0, 3)));
  assert.equal(month.buckets.length, 31);
  assert.equal(period('2026-02', []).buckets.length, 28);
  assert.equal(period('2024-02', []).buckets.length, 29);
});

check('callsWithExposure deduplicates the same call, and does not sum', () => {
  // The month rule. The same call contributed twice — as it would be if a
  // month naively concatenated its days — must still count once.
  const twice = period('2026-10', [contribution, { ...contribution }]);
  assert.equal(twice.totals.callsWithExposure, 1, 'the same call must not count twice');

  const second = { ...contribution, callId: 'call-0002' };
  assert.equal(period('2026-10', [contribution, second]).totals.callsWithExposure, 2);
});

check('the largest call peak is a maximum, never a sum', () => {
  const a = { ...contribution, callId: 'a', peakParticipants: 4 };
  const b = { ...contribution, callId: 'b', peakParticipants: 7 };
  assert.equal(period('2026-10', [a, b]).totals.largestCallPeakParticipants, 7);
});

check('exposure is clipped to the period', () => {
  assert.ok(contribution.callExposureMs <= 86_400_000);
  assert.ok(contribution.exposureShare > 0 && contribution.exposureShare <= 1);
});

check('calls started are bucketed by start hour', () => {
  const day = period('2026-10-15', [contribution]);
  // The fixture starts at 10:00 UTC.
  assert.equal(day.buckets[10].callsStarted, 1);
  assert.equal(day.buckets.reduce((n, b) => n + b.callsStarted, 0), 1);
});

check('the worst-call ranking is deterministic and excludes unassessed calls', () => {
  const ranked = period('2026-10-15', [contribution]).worstCalls;
  for (const row of ranked) {
    assert.ok(row.assessedParticipantMs > 0, 'an unassessed call must not be ranked');
    assert.ok(row.impairedParticipantMs > 0);
    assert.ok(row.digestRevision, 'a row must pin the revision it came from');
  }
  const noEvidence = { ...contribution, callId: 'quiet', impairments: contribution.impairments.map((e) => ({ ...e, impairedParticipantMs: 0, assessedParticipantMs: 0 })) };
  assert.ok(!period('2026-10-15', [noEvidence]).worstCalls.some((r) => r.callId === 'quiet'));
});

check('period metrics sum numerators and denominators, not values', () => {
  const one = period('2026-10-15', [contribution]);
  const two = period('2026-10-15', [contribution, { ...contribution, callId: 'call-0002' }]);
  const pick = (d) => d.metrics.find((m) => m.metricId === 'audio.inbound.loss');
  assert.equal(pick(two).numerator, pick(one).numerator * 2);
  assert.equal(pick(two).denominator, pick(one).denominator * 2);
  // The ratio is unchanged, which is the point: doubling identical evidence
  // does not change the rate.
  assert.ok(
    Math.abs(pick(two).numerator / pick(two).denominator - pick(one).numerator / pick(one).denominator) < 1e-12,
  );
});

check('an incomplete period says so', () => {
  const incomplete = period('2026-10-15', [contribution], {
    coverage: {
      indexedCalls: 3,
      readableCallDigests: 1,
      pendingCallDigests: 1,
      failedCallDigests: 1,
      unknownCallDigests: 0,
      expectedChildPeriods: 24,
      includedChildPeriods: 20,
    },
  });
  assert.equal(incomplete.completeness, 'partial');
  const { coverage } = incomplete;
  assert.equal(
    coverage.readableCallDigests + coverage.pendingCallDigests + coverage.failedCallDigests + coverage.unknownCallDigests,
    coverage.indexedCalls,
  );
});

check('a verified empty period is a document, not an absence', () => {
  const empty = period('2026-10-16', []);
  assert.ok(validatePeriodDigest(empty));
  assert.equal(empty.totals.callsStarted, 0);
  assert.equal(empty.completeness, 'complete');
  assert.deepEqual(empty.worstCalls, []);
});

console.log(`\n${passed} checks passed`);
