/**
 * Day and month summaries, aggregated from saved digests.
 *
 * A day aggregates call digests; a month aggregates DAY SUMMARIES, not calls.
 * That hierarchy is what keeps a month cheap, and it is why `sources` has to
 * say how complete each one was: a month built from 28 of 31 days is not a
 * quiet month, and nothing else in the document can tell them apart.
 *
 * ## The four aggregation rules, and where each is enforced
 *
 * 1. **Every count names its denominator.** `outcomeCounts.evaluated` travels
 *    with every roll-up. No rate is ever stored; the UI divides and can show
 *    the denominator beside the figure.
 *
 * 2. **Affected calls and sessions are unions over identity.** Sets, not sums,
 *    so re-reading a source cannot double-count and a rebuild is idempotent.
 *
 * 3. **A month sums numerators and denominators from its days.** It never
 *    averages daily percentages: a 2% day over 10 sessions and a 2% day over
 *    10,000 are not equal evidence.
 *
 * 4. **An unmergeable figure is omitted, not approximated.** `failedSeconds`
 *    disappears from a month if any contributing day lacked it, because a
 *    partial sum reads as a smaller problem than the real one.
 */

import { CHECK_IDS, RULES_VERSION, SCHEMA_VERSION } from './registry.mjs';

const CLASSES = ['qoeSymptom', 'qosOnly', 'noIssueWithinCoverage', 'insufficientEvidence'];
const CLASS_OF = {
  'qoe-symptom': 'qoeSymptom',
  'qos-only': 'qosOnly',
  'no-issue-within-coverage': 'noIssueWithinCoverage',
  'insufficient-evidence': 'insufficientEvidence',
};

/** How many drilldown entries a summary carries before it is capped. */
export const DRILLDOWN_CAP = 200;

const emptyCounts = () => ({ passed: 0, failed: 0, notAssessable: 0, notApplicable: 0, evaluated: 0 });

export const dayIdOf = (ms) => new Date(ms).toISOString().slice(0, 10);
export const monthIdOf = (ms) => new Date(ms).toISOString().slice(0, 7);
export const monthOfDay = (day) => day.slice(0, 7);

/** Every day id in a month, as `YYYY-MM-DD`. */
export function daysInMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/**
 * Build a day summary from call digests.
 *
 * `read` is the digests that parsed and validated; `failures` is every source
 * that did not, with a reason. A day with zero calls and a day whose sources
 * could not be read are different documents, and the difference is `sources`.
 */
export function buildDaySummary({ day, read, failures = [], found, generatedAt = Date.now(), provisional = false }) {
  const calls = new Set();
  const sessions = new Set();
  const sessionsAssessed = new Set();
  const classification = Object.fromEntries(CLASSES.map((c) => [c, 0]));

  const perCheck = new Map(CHECK_IDS.map((id) => [id, {
    counts: emptyCounts(),
    callsAffected: new Set(),
    failedSeconds: 0,
    anyFailedSeconds: false,
    everyFailureHadSeconds: true,
    calls: new Map(),
    sessions: [],
  }]));

  // Hour buckets, by the hour the SESSION started, matching the call-to-day
  // rule so one session is counted once.
  const buckets = new Map();

  let observedSeconds = 0;
  let assessedSeconds = 0;
  let unassessedSeconds = 0;
  let callSeconds = 0;

  for (const digest of read) {
    const { callId, roomId, startedAt, endedAt } = digest.call;
    calls.add(callId);

    observedSeconds += digest.coverage.observedSeconds ?? 0;
    assessedSeconds += digest.coverage.assessedSeconds ?? 0;
    unassessedSeconds += digest.coverage.unassessedSeconds ?? 0;
    const started = Date.parse(startedAt);
    const ended = Date.parse(endedAt);
    if (Number.isFinite(started) && Number.isFinite(ended) && ended > started) {
      callSeconds += (ended - started) / 1000;
    }

    const hour = `${new Date(started).toISOString().slice(0, 13)}:00:00.000Z`;
    const bucket = buckets.get(hour) ?? { clientSessions: 0, clientSessionsFailed: 0, clientSessionsAssessed: 0 };

    for (const client of digest.clients) {
      const identity = `${callId}/${client.clientId}`;
      if (sessions.has(identity)) continue; // a union, so a rebuild cannot inflate it
      sessions.add(identity);
      bucket.clientSessions += 1;

      const bucketClass = CLASS_OF[client.classification];
      if (bucketClass) classification[bucketClass] += 1;

      const assessed = client.checks.some((k) => k.outcome === 'passed' || k.outcome === 'failed');
      if (assessed) {
        sessionsAssessed.add(identity);
        bucket.clientSessionsAssessed += 1;
      }
      if (client.checks.some((k) => k.outcome === 'failed')) bucket.clientSessionsFailed += 1;

      for (const check of client.checks) {
        const agg = perCheck.get(check.id);
        if (!agg) continue; // a check this build's catalogue does not have
        agg.counts.evaluated += 1;
        if (check.outcome === 'passed') agg.counts.passed += 1;
        else if (check.outcome === 'not-assessable') agg.counts.notAssessable += 1;
        else if (check.outcome === 'not-applicable') agg.counts.notApplicable += 1;
        else if (check.outcome === 'failed') {
          agg.counts.failed += 1;
          agg.callsAffected.add(callId);
          agg.calls.set(callId, { roomId, callId, startedAt, clientsFailed: (agg.calls.get(callId)?.clientsFailed ?? 0) + 1 });
          agg.sessions.push({
            roomId,
            callId,
            clientId: client.clientId,
            ...(client.displayName ? { displayName: client.displayName } : {}),
          });
        }
      }
    }

    // failedSeconds is summable only when every contributing failure had one.
    for (const roll of digest.checks) {
      const agg = perCheck.get(roll.id);
      if (!agg) continue;
      if (roll.counts.failed > 0) {
        if (roll.failedSeconds === undefined) agg.everyFailureHadSeconds = false;
        else {
          agg.failedSeconds += roll.failedSeconds;
          agg.anyFailedSeconds = true;
        }
      }
    }

    buckets.set(hour, bucket);
  }

  const checks = CHECK_IDS.map((id) => {
    const agg = perCheck.get(id);
    const out = { id, counts: agg.counts, callsAffected: agg.callsAffected.size };
    if (agg.anyFailedSeconds && agg.everyFailureHadSeconds) {
      out.failedSeconds = Number(agg.failedSeconds.toFixed(1));
    }
    return out;
  });

  const affected = CHECK_IDS.map((id) => {
    const agg = perCheck.get(id);
    if (agg.counts.failed === 0) return null;
    const truncated = agg.sessions.length > DRILLDOWN_CAP || agg.calls.size > DRILLDOWN_CAP;
    return {
      id,
      calls: [...agg.calls.values()].slice(0, DRILLDOWN_CAP),
      clientSessions: agg.sessions.slice(0, DRILLDOWN_CAP),
      ...(truncated ? { truncated: true } : {}),
    };
  }).filter(Boolean);

  const complete = failures.length === 0 && (found === undefined || found === read.length);

  return {
    provenance: {
      schemaVersion: SCHEMA_VERSION,
      rulesVersion: RULES_VERSION,
      generatedAt: new Date(generatedAt).toISOString(),
    },
    period: { kind: 'day', id: day, timezone: 'UTC', ...(provisional ? { provisional: true } : {}) },
    sources: {
      kind: 'calls',
      found: found ?? read.length + failures.length,
      read: read.length,
      failed: failures.length,
      complete,
      ...(failures.length ? { failures } : {}),
    },
    totals: {
      calls: calls.size,
      clientSessions: sessions.size,
      clientSessionsAssessed: sessionsAssessed.size,
      observedSeconds: Number(observedSeconds.toFixed(1)),
      assessedSeconds: Number(assessedSeconds.toFixed(1)),
      unassessedSeconds: Number(unassessedSeconds.toFixed(1)),
      callSeconds: Number(callSeconds.toFixed(1)),
    },
    checks,
    classification,
    trend: {
      bucket: 'hour',
      buckets: [...buckets.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([at, b]) => ({ at, ...b })),
    },
    ...(affected.length ? { affected } : {}),
  };
}

/**
 * Build a month summary from day summaries.
 *
 * Sums numerators and denominators. Never averages a daily rate, and never
 * reconstructs a figure a day did not carry.
 */
export function buildMonthSummary({ month, read, failures = [], generatedAt = Date.now(), provisional = false }) {
  const expected = daysInMonth(month);
  const present = new Set(read.map((d) => d.period.id));
  const missingDays = expected.filter((d) => !present.has(d) && !failures.some((f) => f.id === d));

  const perCheck = new Map(CHECK_IDS.map((id) => [id, {
    counts: emptyCounts(),
    callsAffected: 0,
    failedSeconds: 0,
    anyFailedSeconds: false,
    everyDayHadSeconds: true,
    calls: [],
    sessions: [],
  }]));

  const classification = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  const totals = {
    calls: 0,
    clientSessions: 0,
    clientSessionsAssessed: 0,
    observedSeconds: 0,
    assessedSeconds: 0,
    unassessedSeconds: 0,
    callSeconds: 0,
  };
  const buckets = [];

  for (const day of read) {
    for (const key of Object.keys(totals)) totals[key] += day.totals?.[key] ?? 0;
    for (const c of CLASSES) classification[c] += day.classification?.[c] ?? 0;

    // One bucket per day, carrying its own denominator so a two-session day is
    // not drawn as confidently as a two-hundred-session one.
    const failedSessions = (day.trend?.buckets ?? []).reduce((t, b) => t + (b.clientSessionsFailed ?? 0), 0);
    const assessedSessions = (day.trend?.buckets ?? []).reduce((t, b) => t + (b.clientSessionsAssessed ?? 0), 0);
    buckets.push({
      at: `${day.period.id}T00:00:00.000Z`,
      clientSessions: day.totals?.clientSessions ?? 0,
      clientSessionsFailed: failedSessions,
      clientSessionsAssessed: assessedSessions,
    });

    for (const roll of day.checks ?? []) {
      const agg = perCheck.get(roll.id);
      if (!agg) continue;
      for (const k of Object.keys(agg.counts)) agg.counts[k] += roll.counts?.[k] ?? 0;
      // callsAffected is a union per day and the days are disjoint by the
      // call-to-day rule, so summing day unions IS the month union.
      agg.callsAffected += roll.callsAffected ?? 0;
      if ((roll.counts?.failed ?? 0) > 0) {
        if (roll.failedSeconds === undefined) agg.everyDayHadSeconds = false;
        else {
          agg.failedSeconds += roll.failedSeconds;
          agg.anyFailedSeconds = true;
        }
      }
    }

    for (const entry of day.affected ?? []) {
      const agg = perCheck.get(entry.id);
      if (!agg) continue;
      agg.calls.push(...(entry.calls ?? []));
      agg.sessions.push(...(entry.clientSessions ?? []));
      if (entry.truncated) agg.truncated = true;
    }
  }

  const checks = CHECK_IDS.map((id) => {
    const agg = perCheck.get(id);
    const out = { id, counts: agg.counts, callsAffected: agg.callsAffected };
    if (agg.anyFailedSeconds && agg.everyDayHadSeconds) {
      out.failedSeconds = Number(agg.failedSeconds.toFixed(1));
    }
    return out;
  });

  const affected = CHECK_IDS.map((id) => {
    const agg = perCheck.get(id);
    if (agg.counts.failed === 0) return null;
    const truncated = Boolean(agg.truncated) || agg.sessions.length > DRILLDOWN_CAP;
    return {
      id,
      calls: agg.calls.slice(0, DRILLDOWN_CAP),
      clientSessions: agg.sessions.slice(0, DRILLDOWN_CAP),
      ...(truncated ? { truncated: true } : {}),
    };
  }).filter(Boolean);

  for (const key of Object.keys(totals)) totals[key] = Number(totals[key].toFixed(1));
  totals.calls = Math.round(totals.calls);
  totals.clientSessions = Math.round(totals.clientSessions);
  totals.clientSessionsAssessed = Math.round(totals.clientSessionsAssessed);

  return {
    provenance: {
      schemaVersion: SCHEMA_VERSION,
      rulesVersion: RULES_VERSION,
      generatedAt: new Date(generatedAt).toISOString(),
    },
    period: { kind: 'month', id: month, timezone: 'UTC', ...(provisional ? { provisional: true } : {}) },
    sources: {
      kind: 'days',
      found: read.length + failures.length,
      read: read.length,
      failed: failures.length,
      complete: failures.length === 0 && missingDays.length === 0,
      ...(failures.length ? { failures } : {}),
      ...(missingDays.length ? { missingDays } : {}),
    },
    totals,
    checks,
    classification,
    trend: { bucket: 'day', buckets },
    ...(affected.length ? { affected } : {}),
  };
}
