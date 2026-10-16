/**
 * The call digest, built from the checked-in fixture.
 *
 *   node src/digest-server/test/callDigest.test.mjs
 *
 * Validated against the contract's own generated validators, which is the
 * handoff that matters: if what this writes does not pass, the dashboard cannot
 * read it, and there is exactly one arbiter of that.
 *
 * The fixture is two clients over 55 seconds, shaped so the honest answers are
 * known in advance:
 *
 *   client-a  clean audio and video throughout
 *   client-b  600 ms RTT, sustained inbound loss, one video freeze, a
 *             byte-counter reset, and a 20-second collection gap
 *
 * So a correct processor reports a freeze and loss for client-b, nothing for
 * client-a, `not-assessable` for every check whose statistic this minimal
 * fixture does not carry, and never a pass it did not earn.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePatchedJsonl } from '../samplePatch.mjs';
import { buildCallDigest, classify, reportingDayOf, unimplementedCheckIds } from '../callDigest.mjs';
import { CHECK_IDS, RULES_VERSION, SECTIONS, checkDefinition } from '../registry.mjs';
import { normalizeClient } from '../series.mjs';
import { validateCallDigest, validateClientDigest } from '../../digest/validators.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const CALL = resolve(HERE, '..', 'fixtures', 'tiny-call', 'demo-room', 'call-0001');

const files = readdirSync(CALL);
const summary = JSON.parse(readFileSync(join(CALL, files.find((f) => f.startsWith('call-summary'))), 'utf8'));
const clients = files
  .filter((f) => f.endsWith('.jsonl'))
  .sort()
  .map((f) => ({
    clientId: f.replace(/\.jsonl$/, ''),
    displayName: f.replace(/\.jsonl$/, ''),
    samples: decodePatchedJsonl(readFileSync(join(CALL, f), 'utf8')),
  }));

const AT = Date.parse('2026-10-16T12:00:00.000Z');
const build = (overrides = {}) =>
  buildCallDigest({ callId: 'call-0001', roomId: 'demo-room', clients, summary, generatedAt: AT, ...overrides });

const digest = build();
const byId = (list, id) => list.find((c) => c.id === id);
const clientA = digest.clients.find((c) => c.clientId === 'client-a');
const clientB = digest.clients.find((c) => c.clientId === 'client-b');

/* ── the contract handoff ────────────────────────────────────────────────── */

check('the digest validates against the contract', () => {
  const ok = validateCallDigest(digest);
  assert.ok(
    ok,
    'invalid:\n  ' +
      (validateCallDigest.errors ?? [])
        .slice(0, 8)
        .map((e) => `${e.instancePath || '/'} ${e.message}`)
        .join('\n  '),
  );
});

check('each client entry validates on its own', () => {
  // The client page reads one of these. If a sub-object only validates as part
  // of the whole, a reader that fetches and narrows is on its own.
  for (const c of digest.clients) {
    assert.ok(validateClientDigest(c), `${c.clientId}: ${JSON.stringify(validateClientDigest.errors?.[0])}`);
  }
});

check('provenance names the schema and the rules that produced it', () => {
  assert.equal(digest.provenance.schemaVersion, 2);
  assert.equal(digest.provenance.rulesVersion, RULES_VERSION);
  assert.equal(digest.provenance.generatedAt, '2026-10-16T12:00:00.000Z');
});

check('every catalogue check has a rule, and every check appears in the roll-up', () => {
  assert.deepEqual(unimplementedCheckIds(), [], 'a catalogue check with no rule renders a heading and never answers');
  assert.deepEqual(
    digest.checks.map((c) => c.id),
    CHECK_IDS,
    'the roll-up must cover the catalogue in catalogue order',
  );
  for (const c of digest.clients) {
    assert.deepEqual(c.checks.map((k) => k.id), CHECK_IDS, `${c.clientId} is missing checks`);
  }
});

/* ── the known shape of the fixture ──────────────────────────────────────── */

check('client-b froze and client-a did not', () => {
  assert.equal(byId(clientB.checks, 'video.receive.freeze').outcome, 'failed');
  assert.equal(byId(clientA.checks, 'video.receive.freeze').outcome, 'passed');
});

check('the freeze duration is milliseconds, not the W3C seconds', () => {
  // The fixture freezes for 2 seconds. Reported as 2 rather than 2000, a
  // two-second freeze reads as two milliseconds — the units error the contract
  // calls out by name.
  const observed = byId(clientB.checks, 'video.receive.freeze').observed;
  const total = observed.find((o) => o.label === 'Total freeze time');
  assert.equal(total.unit, 'ms');
  assert.equal(total.value, 2000);
});

check('client-b exceeded the round-trip threshold at 600 ms', () => {
  const rtt = byId(clientB.checks, 'transport.rtt');
  assert.equal(rtt.outcome, 'failed');
  const worst = rtt.observed.find((o) => o.label === 'Worst round-trip time');
  assert.equal(worst.value, 600);
  assert.equal(worst.threshold, 300);
  assert.equal(worst.unit, 'ms');
});

check('inbound loss is a ratio of sums over the session, not a peak interval', () => {
  // The fixture loses 12% for ten seconds of a 55-second session. A mean of
  // interval ratios would report something near 12%; a ratio of sums reports
  // the session's actual share, which is what the rule claims to measure.
  const loss = byId(clientB.checks, 'transport.inboundLoss');
  assert.equal(loss.outcome, 'failed');
  const share = loss.observed.find((o) => o.label === 'Inbound loss').value;
  assert.ok(share > 5 && share < 12, `expected between the threshold and the peak, got ${share}%`);
});

check("client-b's collection gap is reported as unassessed time, not as healthy", () => {
  const confidence = byId(clientB.checks, 'confidence.clientTime');
  assert.equal(confidence.outcome, 'failed');
  assert.ok(clientB.coverage.unassessedSeconds > 0, 'the 20-second gap is missing from coverage');
  assert.equal(clientB.coverage.gaps?.[0]?.reason, 'stats-collection-gap');
});

/* ── the honesty rules ───────────────────────────────────────────────────── */

check('a statistic the fixture does not carry is not-assessable, never passed', () => {
  // The fixture reports no pliCount, no framesDropped, no media sources and no
  // remote-inbound reports. Every one of those checks must say so.
  for (const id of [
    'video.receive.assembly',
    'video.receive.playout',
    'video.receive.compression',
    'send.capture.keepUp',
    'send.source.audio',
    'transport.outboundLossRatio',
  ]) {
    for (const c of digest.clients) {
      const found = byId(c.checks, id);
      assert.equal(found.outcome, 'not-assessable', `${c.clientId}/${id} answered ${found.outcome}`);
      assert.ok(found.why && found.why.length > 10, `${id} must say what was missing`);
    }
  }
});

check('every not-assessable outcome explains itself', () => {
  for (const c of digest.clients) {
    for (const k of c.checks.filter((x) => x.outcome === 'not-assessable')) {
      assert.ok(k.why, `${c.clientId}/${k.id} is unassessable with no reason`);
    }
  }
});

check('a check resting only on a detector does not pass when nothing fired', () => {
  // Sync and congestion cannot be derived from the statistics here. With no
  // detector report the answer is "we cannot tell", not "in sync".
  for (const id of ['audio.receive.sync', 'transport.congestion']) {
    for (const c of digest.clients) {
      assert.notEqual(byId(c.checks, id).outcome, 'passed', `${id} passed on an absence of reports`);
    }
  }
});

check('the stored rule does not duplicate the catalogue prose', () => {
  // The catalogue holds the explanation; a digest holds the applied rule and
  // its threshold. Copying the prose into every check per client is how v1's
  // output grew to a size nobody would read.
  for (const c of digest.clients) {
    for (const k of c.checks) {
      if (!k.rule) continue;
      const catalogue = checkDefinition(k.id).rule;
      assert.notEqual(k.rule, catalogue, `${k.id} stored the catalogue rule verbatim`);
      assert.ok(k.rule.length <= 300, `${k.id} rule is ${k.rule.length} chars`);
    }
  }
});

/* ── roll-up arithmetic ──────────────────────────────────────────────────── */

check('roll-up counts match the per-client outcomes exactly', () => {
  for (const roll of digest.checks) {
    const outcomes = digest.clients.map((c) => byId(c.checks, roll.id).outcome);
    assert.equal(roll.counts.passed, outcomes.filter((o) => o === 'passed').length, roll.id);
    assert.equal(roll.counts.failed, outcomes.filter((o) => o === 'failed').length, roll.id);
    assert.equal(roll.counts.notAssessable, outcomes.filter((o) => o === 'not-assessable').length, roll.id);
    assert.equal(roll.counts.notApplicable, outcomes.filter((o) => o === 'not-applicable').length, roll.id);
    assert.equal(roll.counts.evaluated, outcomes.length, roll.id);
  }
});

check('evaluated equals the sum of the four outcomes', () => {
  for (const roll of digest.checks) {
    const c = roll.counts;
    assert.equal(c.passed + c.failed + c.notAssessable + c.notApplicable, c.evaluated, roll.id);
  }
});

check('a point-in-time failure contributes no duration', () => {
  // The worst round-trip observation happened AT an instant. Publishing
  // `failedSeconds: 0` for it would read as "failed for no time at all".
  const rtt = byId(digest.checks, 'transport.rtt');
  assert.equal(rtt.counts.failed, 1);
  assert.equal(rtt.failedSeconds, undefined);

  // An interval-bounded failure does carry one.
  assert.ok(byId(digest.checks, 'transport.inboundLoss').failedSeconds > 0);
});

check('coverage adds up and clientsAssessed is not clientsObserved by default', () => {
  assert.equal(digest.coverage.clientsObserved, 2);
  const summed = digest.clients.reduce((t, c) => t + c.coverage.assessedSeconds, 0);
  assert.ok(Math.abs(digest.coverage.assessedSeconds - summed) < 0.5);
  assert.ok(digest.coverage.unassessedSeconds > 0, 'the fixture has a gap; coverage must show it');
});

/* ── classification ──────────────────────────────────────────────────────── */

check('a symptom outranks a transport condition', () => {
  // client-b has both a freeze (symptom) and loss (QoS). The symptom is what
  // happened to the person, so that is the classification.
  assert.equal(clientB.classification, 'qoe-symptom');
  assert.equal(clientA.classification, 'no-issue-within-coverage');
});

check('classification is disjoint and transport-only is not a symptom', () => {
  const only = (ids) =>
    CHECK_IDS.map((id) => ({ id, outcome: ids.includes(id) ? 'failed' : 'passed' }));

  assert.equal(classify(only(['transport.inboundLoss'])), 'qos-only');
  assert.equal(classify(only(['video.receive.freeze'])), 'qoe-symptom');
  assert.equal(classify(only(['video.receive.freeze', 'transport.inboundLoss'])), 'qoe-symptom');
  assert.equal(classify(only([])), 'no-issue-within-coverage');

  // A failing data-confidence check describes the evidence, not the call, and
  // must not classify a session as having a quality symptom.
  assert.equal(classify(only(['confidence.clientTime'])), 'no-issue-within-coverage');

  // Nothing assessed at all is its own answer, not a clean bill of health.
  assert.equal(
    classify(CHECK_IDS.map((id) => ({ id, outcome: 'not-assessable' }))),
    'insufficient-evidence',
  );
});

/* ── identity, day assignment, determinism ───────────────────────────────── */

check('a call is assigned to the UTC day it started, and is never split', () => {
  assert.equal(reportingDayOf(Date.parse('2026-10-15T23:50:00Z')), '2026-10-15');
  assert.equal(reportingDayOf(Date.parse('2026-10-16T00:10:00Z')), '2026-10-16');
  // Server-absolute: a client in UTC+13 does not move the call to tomorrow.
  assert.equal(reportingDayOf(Date.parse('2026-10-15T23:50:00+13:00')), '2026-10-15');
  assert.equal(digest.call.reportingDay, '2026-10-15');
});

check('the digest carries roomId, so a reader can link back without a lookup', () => {
  assert.equal(digest.call.roomId, 'demo-room');
  assert.equal(digest.call.callId, 'call-0001');
});

check('processing the same inputs twice produces the same digest', () => {
  assert.deepEqual(build(), digest, 'the build is not deterministic');
});

check('a missing call summary is recorded rather than hidden', () => {
  const without = build({ summary: undefined });
  assert.equal(without.coverage.callSummaryPresent, false);
  assert.ok(
    (without.coverage.limitations ?? []).some((l) => l.includes('call summary')),
    'a reader must be told the bounds were inferred',
  );
  assert.ok(validateCallDigest(without));
});

check('a client with no samples at all does not throw and claims nothing', () => {
  const empty = build({ clients: [...clients, { clientId: 'client-ghost', samples: [] }] });
  const ghost = empty.clients.find((c) => c.clientId === 'client-ghost');
  assert.equal(ghost.classification, 'insufficient-evidence');
  assert.equal(ghost.coverage.observedSeconds, 0);
  // Nothing may PASS. Something may well fail: `confidence.assessment` reporting
  // "this client session has no samples" is a true finding about the evidence,
  // and suppressing it would hide a participant whose session was never
  // recorded. The rule is about unearned passes, not about staying silent.
  assert.deepEqual(
    ghost.checks.filter((k) => k.outcome === 'passed').map((k) => k.id),
    [],
    'a client with no samples passed a check it could not have earned',
  );
  assert.ok(
    ghost.checks.some((k) => k.id === 'confidence.assessment' && k.outcome === 'failed'),
    'a session with no samples should be reported, not merely unassessed',
  );
  assert.ok(validateCallDigest(empty));
});

/* ── scope boundary ──────────────────────────────────────────────────────── */

check('extension stats are never read, even when present', () => {
  // The scope boundary, exercised rather than asserted in prose. Extension
  // stats are top-level on a ClientSample and are the first thing excluded.
  const polluted = clients.map((c) => ({
    ...c,
    samples: c.samples.map((s) => ({
      ...s,
      extensionStats: [{ type: 'invented', payload: { freezeCount: 9999 } }],
    })),
  }));
  const withExt = build({ clients: polluted });
  assert.deepEqual(
    withExt.checks,
    digest.checks,
    'an extension stat changed an outcome, so the scope boundary leaks',
  );
});

check('the normalizer finds stats under peerConnections, not at the top level', () => {
  // The nesting that cost an afternoon: these arrays live on each
  // PeerConnectionSample. Read at the top level they are all absent and every
  // check answers not-applicable, which looks like a quiet call.
  const normalized = normalizeClient('client-b', clients[1].samples);
  assert.ok(normalized.inboundAll.length > 0, 'no inbound RTP series was found');
  assert.ok(normalized.candidatePairs.length > 0, 'no candidate pair series was found');
});

check('the five sections are stable and ordered', () => {
  assert.deepEqual(SECTIONS.map((s) => s.id), [
    'received-video',
    'received-audio',
    'capture-sending',
    'transport-continuity',
    'data-confidence',
  ]);
});

console.log(`\n${passed} checks passed`);
