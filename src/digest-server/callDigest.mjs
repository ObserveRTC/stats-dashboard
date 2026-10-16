/**
 * Assemble one call's digest from its clients' checks.
 *
 * The roll-up in `checks` is computed from `clients[].checks` in this one pass.
 * That is deliberate and it is the reason there is no separate client digest:
 * two documents built by two code paths disagree eventually, and a quality tool
 * that contradicts itself is worse than one that says less.
 */

import { CHECK_IDS, RULES_VERSION, SCHEMA_VERSION, SECTIONS, checkDefinition } from './registry.mjs';
import { IMPLEMENTED, runChecks } from './checks.mjs';
import { normalizeClient } from './series.mjs';

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : undefined);

/** The UTC day a call is assigned to: the day it STARTED. Never split. */
export function reportingDayOf(startedAtMs) {
  return new Date(startedAtMs).toISOString().slice(0, 10);
}

/**
 * Sections whose failures are symptoms a person could notice.
 *
 * `transport-continuity` is excluded on purpose: a transport condition is a
 * cause, not an experience, and claiming otherwise without symptom evidence is
 * the causation error the contract forbids. `data-confidence` is excluded
 * because it describes the evidence, not the call.
 */
const SYMPTOM_SECTIONS = new Set(['received-video', 'received-audio', 'capture-sending']);
const QOS_SECTIONS = new Set(['transport-continuity']);
const EVIDENCE_SECTIONS = new Set(['data-confidence']);

const sectionOf = (id) => checkDefinition(id).section;

/**
 * What one client session's evidence amounts to.
 *
 * Ordered, and the order is the claim: a session showing a symptom is
 * `qoe-symptom` even when it also had a transport condition, because the
 * symptom is what happened to the person. The four are disjoint by
 * construction, so they can be summed to the session total and nothing else.
 */
export function classify(checks) {
  const quality = checks.filter((c) => !EVIDENCE_SECTIONS.has(sectionOf(c.id)));
  const failed = quality.filter((c) => c.outcome === 'failed');

  if (failed.some((c) => SYMPTOM_SECTIONS.has(sectionOf(c.id)))) return 'qoe-symptom';
  if (failed.some((c) => QOS_SECTIONS.has(sectionOf(c.id)))) return 'qos-only';

  const assessed = quality.filter((c) => c.outcome === 'passed' || c.outcome === 'failed');
  if (assessed.length === 0) return 'insufficient-evidence';
  return 'no-issue-within-coverage';
}

function intervalSeconds(interval) {
  if (!interval?.from || !interval?.to) return undefined;
  const from = Date.parse(interval.from);
  const to = Date.parse(interval.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return undefined;
  return (to - from) / 1000;
}

/**
 * Count how the client sessions answered one check.
 *
 * `evaluated` is stored rather than left to the reader to add up, because a
 * reader that sums the four will be wrong the day a fifth outcome exists.
 */
function rollUp(id, perClient) {
  const counts = { passed: 0, failed: 0, notAssessable: 0, notApplicable: 0, evaluated: 0 };
  let failedSeconds;

  for (const checks of perClient) {
    const found = checks.find((c) => c.id === id);
    if (!found) continue;
    counts.evaluated += 1;
    if (found.outcome === 'passed') counts.passed += 1;
    else if (found.outcome === 'failed') {
      counts.failed += 1;
      // A zero-length interval is a navigational instant, not a duration: the
      // worst round-trip observation happened AT a moment, it did not last.
      // Counting it would publish `failedSeconds: 0`, which reads as "it failed
      // for no time at all" rather than "this rule has no duration".
      const seconds = intervalSeconds(found.interval);
      if (seconds !== undefined && seconds > 0) failedSeconds = (failedSeconds ?? 0) + seconds;
    } else if (found.outcome === 'not-assessable') counts.notAssessable += 1;
    else if (found.outcome === 'not-applicable') counts.notApplicable += 1;
  }

  return {
    id,
    counts,
    // Null rather than 0 when nothing failed with an interval: a rule with no
    // interval concept has no duration, and 0 would read as "it failed for no
    // time at all".
    ...(failedSeconds === undefined ? {} : { failedSeconds: Number(failedSeconds.toFixed(1)) }),
  };
}

/**
 * Build the call digest.
 *
 * `clients` is `[{ clientId, displayName, samples }]` with samples already
 * decoded. `summary` is the call-summary object or undefined — context only: it
 * supplies call bounds, display names and SFU ids, and may not contribute a
 * finding.
 */
export function buildCallDigest({ callId, roomId, clients, summary, generatedAt = Date.now() }) {
  const context = { callSummaryPresent: Boolean(summary) };

  const assembled = clients.map(({ clientId, displayName, samples }) => {
    const normalized = normalizeClient(clientId, samples);
    const checks = runChecks(normalized, context);
    const cov = normalized.coverage;

    return {
      clientId,
      ...(displayName ? { displayName } : {}),
      coverage: {
        observedSeconds: Number(cov.observedSeconds.toFixed(1)),
        assessedSeconds: Number(cov.assessedSeconds.toFixed(1)),
        unassessedSeconds: Number(cov.unassessedSeconds.toFixed(1)),
        ...(cov.gaps.length
          ? {
              gaps: cov.gaps.map((g) => ({
                from: iso(g.fromMs),
                to: iso(g.toMs),
                reason: g.reason,
              })),
            }
          : {}),
      },
      classification: classify(checks),
      checks,
      _normalized: normalized,
    };
  });

  const perClient = assembled.map((c) => c.checks);

  // Call bounds from the summary where it exists, otherwise from the samples.
  // Inferring them is weaker and `callSummaryPresent` is how a reader knows.
  const firstAt = Math.min(
    ...assembled.map((c) => c._normalized.coverage.firstAt ?? Infinity),
  );
  const lastAt = Math.max(...assembled.map((c) => c._normalized.coverage.lastAt ?? -Infinity));
  const startedAtMs = Number.isFinite(summary?.startedAt) ? summary.startedAt : firstAt;
  const endedAtMs = Number.isFinite(summary?.endedAt) ? summary.endedAt : lastAt;

  const limitations = [];
  if (!summary) {
    limitations.push('No call summary was readable, so the call bounds and display names are inferred from samples.');
  }
  for (const c of assembled) {
    const notApplicable = c.checks.filter((k) => k.outcome === 'not-applicable').length;
    if (notApplicable >= CHECK_IDS.length / 2) {
      limitations.push(
        `${c.displayName ?? c.clientId} sent or received little media, so ${notApplicable} of ${CHECK_IDS.length} checks do not apply to it.`,
      );
    }
  }

  const sumBy = (field) =>
    Number(assembled.reduce((total, c) => total + (c.coverage[field] ?? 0), 0).toFixed(1));

  const digest = {
    provenance: {
      schemaVersion: SCHEMA_VERSION,
      rulesVersion: RULES_VERSION,
      generatedAt: new Date(generatedAt).toISOString(),
    },
    call: {
      callId,
      roomId,
      startedAt: iso(startedAtMs),
      endedAt: iso(endedAtMs),
      reportingDay: reportingDayOf(startedAtMs),
      ...(summary?.sfuIds?.length ? { sfuIds: summary.sfuIds } : {}),
    },
    coverage: {
      observedSeconds: sumBy('observedSeconds'),
      assessedSeconds: sumBy('assessedSeconds'),
      unassessedSeconds: sumBy('unassessedSeconds'),
      clientsObserved: assembled.length,
      // Assessed means at least one check reached a real answer. The gap
      // between this and clientsObserved is the honest unknown.
      clientsAssessed: assembled.filter((c) =>
        c.checks.some((k) => k.outcome === 'passed' || k.outcome === 'failed'),
      ).length,
      callSummaryPresent: context.callSummaryPresent,
      ...(limitations.length ? { limitations } : {}),
      ...(assembled.some((c) => c.coverage.gaps?.length)
        ? { gaps: assembled.flatMap((c) => c.coverage.gaps ?? []) }
        : {}),
    },
    checks: CHECK_IDS.map((id) => rollUp(id, perClient)),
    clients: assembled.map(({ _normalized, ...rest }) => rest),
  };

  return digest;
}

/** Catalogue ids with no rule. Exported so a test can assert it is empty. */
export function unimplementedCheckIds() {
  return CHECK_IDS.filter((id) => !IMPLEMENTED.has(id));
}

export { SECTIONS };
