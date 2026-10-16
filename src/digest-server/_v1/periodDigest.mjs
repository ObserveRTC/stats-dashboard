/**
 * Day and month digests, from per-call contributions.
 *
 * A contribution is one call's clipped share of one period, written when the
 * call is processed. The period digest is folded from those, which is what
 * makes the rules the contract insists on actually implementable:
 *
 * - **`callsWithExposure` is deduplicated by call identity**, so a call
 *   spanning three days is counted once in the month. Summing daily values
 *   would count it three times, and no amount of care downstream can undo that.
 * - **`largestCallPeakParticipants` is a maximum**, never a sum.
 * - **Exposure is clipped to the period**, including for a call that started
 *   earlier — a call running 23:50 to 00:30 contributes 10 minutes to one day
 *   and 30 to the next, and `callsStarted` counts it only in the first.
 * - **Updating a contribution replaces it.** Reprocessing a call never adds the
 *   same call twice, because the contribution is keyed by call id.
 *
 * This is why the contract says a month cannot be built from anonymous daily
 * totals: without per-call identity there is nothing to deduplicate against.
 */

import { CONSERVATIVE_V1_POLICY, POLICY_ID, PROCESSOR_VERSION } from './registry.mjs';

const DAY_MS = 86_400_000;

export const dayId = (at) => new Date(at).toISOString().slice(0, 10);
export const monthId = (at) => new Date(at).toISOString().slice(0, 7);

export function dayRange(id) {
  const startAt = Date.parse(`${id}T00:00:00.000Z`);
  return { startAt, endAt: startAt + DAY_MS };
}

export function monthRange(id) {
  const startAt = Date.parse(`${id}-01T00:00:00.000Z`);
  const [year, month] = id.split('-').map(Number);
  const endAt = Date.UTC(year, month, 1);
  return { startAt, endAt };
}

export function daysInMonth(id) {
  const [year, month] = id.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const overlapMs = (a, b) => Math.max(0, Math.min(a.endAt, b.endAt) - Math.max(a.startAt, b.startAt));

/**
 * One call's contribution to one period.
 *
 * Stored per call per period so a month can deduplicate and a reprocess can
 * replace. Carries the clipped figures rather than the raw ones, because
 * clipping needs the period and the period job should not have to re-derive it.
 */
export function buildContribution(digest, period) {
  const range = period === 'day' ? dayRange(dayId(digest.range?.startAt ?? Date.now())) : null;
  const callRange = digest.range;
  if (!callRange || !range) return null;

  const clipped = overlapMs(callRange, range);
  if (clipped <= 0) return null;

  // Participant exposure is clipped proportionally. An approximation, and
  // stated as one: exact clipping needs per-participant membership intervals,
  // which this demo does not establish. A production processor clips the
  // intervals themselves.
  const callSpan = callRange.endAt - callRange.startAt;
  const share = callSpan > 0 ? clipped / callSpan : 0;

  return {
    callId: digest.callId,
    roomId: digest.roomId,
    digestRevision: digest.revision,
    startedAt: callRange.startAt,
    startedInPeriod: callRange.startAt >= range.startAt && callRange.startAt < range.endAt,
    callExposureMs: clipped,
    observedParticipantMs: Math.round(digest.usage.observedParticipantMs * share),
    participantSessionsStarted: digest.usage.participantSessions ?? 0,
    peakParticipants: digest.usage.peakConcurrentParticipants,
    completeness: digest.coverage.completeness,
    impairments: digest.impairments.map((e) => ({
      category: e.category,
      assessedParticipantMs: Math.round(e.assessedParticipantMs * share),
      impairedParticipantMs: Math.round(e.impairedParticipantMs * share),
      unknownParticipantMs: Math.round(e.unknownParticipantMs * share),
    })),
    metrics: digest.metrics,
    exposureShare: share,
  };
}

/**
 * Fold contributions into a period digest.
 *
 * `contributions` must already be deduplicated by call id — pass a map's
 * values, not a concatenated list, so a reprocessed call appears once.
 */
export function buildPeriodDigest({
  tenantId,
  period,
  id,
  revision,
  sourceRevision,
  contributions,
  coverage,
  generatedAt = Date.now(),
}) {
  const range = period === 'day' ? dayRange(id) : monthRange(id);
  const bucketCount = period === 'day' ? 24 : daysInMonth(id);
  const bucketMs = period === 'day' ? 3_600_000 : DAY_MS;

  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    range: { startAt: range.startAt + i * bucketMs, endAt: range.startAt + (i + 1) * bucketMs },
    completeness: 'complete',
    callsStarted: 0,
    observedParticipantMs: 0,
    impairments: [],
  }));

  let callsStarted = 0;
  let observedParticipantMs = 0;
  let callExposureMs = 0;
  let participantSessionsStarted = 0;
  let largestPeak = null;
  const callIdsWithExposure = new Set();
  const impairments = new Map();

  for (const c of contributions) {
    if (c.startedInPeriod) {
      callsStarted += 1;
      participantSessionsStarted += c.participantSessionsStarted;
      const bucket = Math.floor((c.startedAt - range.startAt) / bucketMs);
      if (bucket >= 0 && bucket < buckets.length) buckets[bucket].callsStarted += 1;
    }

    observedParticipantMs += c.observedParticipantMs;
    callExposureMs += c.callExposureMs;
    // A Set, not a counter: this is the field a month must deduplicate.
    if (c.callExposureMs > 0 || c.observedParticipantMs > 0) callIdsWithExposure.add(c.callId);
    // Maximum, never a sum — two calls peaking at four were not eight people.
    if (c.peakParticipants != null) largestPeak = Math.max(largestPeak ?? 0, c.peakParticipants);

    for (const e of c.impairments) {
      const existing = impairments.get(e.category) ?? {
        category: e.category,
        assessedParticipantMs: 0,
        impairedParticipantMs: 0,
        unknownParticipantMs: 0,
      };
      existing.assessedParticipantMs += e.assessedParticipantMs;
      existing.impairedParticipantMs += e.impairedParticipantMs;
      existing.unknownParticipantMs += e.unknownParticipantMs;
      impairments.set(e.category, existing);
    }
  }

  return {
    kind: 'period-digest',
    schemaVersion: 1,
    tenantId,
    period,
    id,
    range,
    revision,
    provenance: { processorVersion: PROCESSOR_VERSION, policyId: POLICY_ID, sourceRevision, generatedAt },
    completeness: coverage.pendingCallDigests > 0 || coverage.failedCallDigests > 0 ? 'partial' : 'complete',
    coverage,
    totals: {
      callsStarted,
      callsWithExposure: callIdsWithExposure.size,
      participantSessionsStarted,
      observedParticipantMs,
      connectedParticipantMs: null,
      callExposureMs,
      largestCallPeakParticipants: largestPeak,
    },
    joins: {
      status: 'unavailable',
      attempts: null,
      succeeded: null,
      failed: null,
      canceled: null,
      pending: null,
      unknown: null,
    },
    impairments: [...impairments.values()],
    metrics: foldMetrics(contributions),
    findingCounts: [],
    // No cohort breakdown in this demo: attributing exposure to a dimension
    // needs interval-level evidence of which value was held when, and a
    // whole-session attribution would be wrong for exactly the participants
    // who moved between SFUs. Declared absent rather than approximated.
    cohorts: [],
    buckets,
    worstCalls: rankWorstCalls(contributions),
    callSearchResourceId: `${period}:${id}:${revision}:calls`,
  };
}

/** Numerators and denominators sum; the division happens once, on read. */
function foldMetrics(contributions) {
  const byId = new Map();
  for (const c of contributions) {
    for (const m of c.metrics ?? []) {
      const existing = byId.get(m.metricId);
      if (!existing) {
        byId.set(m.metricId, { ...m });
        continue;
      }
      if (m.status === 'unavailable') continue;
      if (existing.status === 'unavailable') {
        byId.set(m.metricId, { ...m });
        continue;
      }
      existing.validIntervals += m.validIntervals;
      existing.measuredDurationMs += m.measuredDurationMs;
      existing.numerator = (existing.numerator ?? 0) + (m.numerator ?? 0);
      if (existing.denominator !== null && m.denominator !== null) {
        existing.denominator += m.denominator;
      }
      existing.min = existing.min === null ? m.min : m.min === null ? existing.min : Math.min(existing.min, m.min);
      existing.max = existing.max === null ? m.max : m.max === null ? existing.max : Math.max(existing.max, m.max);
      if (
        existing.distribution &&
        m.distribution &&
        existing.distribution.definitionId === m.distribution.definitionId
      ) {
        existing.distribution.weights = existing.distribution.weights.map(
          (w, i) => w + (m.distribution.weights[i] ?? 0),
        );
      }
      if (m.status === 'partial') existing.status = 'partial';
    }
  }
  return [...byId.values()];
}

/**
 * The worst-call ranking, computed here so the UI never invents one.
 *
 * All-category union exposure, not a sum of categories. Calls with no assessed
 * evidence are excluded and stay findable through the missing-data filter.
 * Ordering is impaired ms desc, then share desc, then call id asc — fully
 * deterministic, because a ranking that reshuffles between reads is unusable.
 */
function rankWorstCalls(contributions) {
  return contributions
    .map((c) => {
      const any = c.impairments.find((e) => e.category === 'any');
      if (!any || any.assessedParticipantMs <= 0) return null;
      return {
        callId: c.callId,
        roomId: c.roomId,
        digestRevision: c.digestRevision,
        startedAt: c.startedAt,
        impairedParticipantMs: any.impairedParticipantMs,
        assessedParticipantMs: any.assessedParticipantMs,
        completeness: c.completeness,
      };
    })
    .filter(Boolean)
    .filter((r) => r.impairedParticipantMs > 0)
    .sort(
      (a, b) =>
        b.impairedParticipantMs - a.impairedParticipantMs ||
        b.impairedParticipantMs / b.assessedParticipantMs -
          a.impairedParticipantMs / a.assessedParticipantMs ||
        a.callId.localeCompare(b.callId),
    )
    .slice(0, 20);
}

export { CONSERVATIVE_V1_POLICY };
