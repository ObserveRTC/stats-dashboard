/**
 * Building one call's digest from its archive.
 *
 * The shape is the contract's; the honesty is in what this refuses to claim.
 * Three things it deliberately leaves unknown:
 *
 * - **Peak concurrency** needs membership intervals. Sample bounds tell you
 *   when a client was being observed, not when the person joined, so unless the
 *   summary states an authoritative peak this is null rather than a count of
 *   clients that happened to overlap in the capture.
 * - **Publisher/subscriber links** need verified signalling evidence. Joining
 *   SFU tracks on equal SSRC would silently compare two different people's
 *   media, so `topology` is unavailable and every `publisherStreamId` is null.
 * - **Participant impairment duration from a freeze counter.** A nonzero freeze
 *   delta says there was freeze somewhere inside a sampling interval. It does
 *   not say when, so the video category contributes a measured stream metric
 *   and an uncertain observation, and leaves that interval's participant time
 *   *unknown* rather than impaired. Only connectivity and network — which have
 *   interval-resolution evidence — classify participant time here.
 *
 * That last one is the policy working as designed, and it is why a call can
 * show measured video trouble with a small impaired-time figure. The UI shows
 * both; it must not add them together.
 */

import { decodePatchedJsonl } from './samplePatch.mjs';
import {
  ALL_METRIC_IDS,
  CAPABILITY_REGISTRY,
  CONSERVATIVE_V1_POLICY,
  HISTOGRAM_REGISTRY,
  METRICS_BY_FAMILY,
  POLICY_ID,
  PROCESSOR_VERSION,
} from './registry.mjs';
import {
  accumulateSeries,
  finishMetric,
  MAX_INTERVAL_MS,
  newAccumulator,
  useHistograms,
} from './metrics.mjs';

useHistograms(HISTOGRAM_REGISTRY);

const POLICY = CONSERVATIVE_V1_POLICY;

/* ── sources ───────────────────────────────────────────── */

/**
 * The immutable input inventory.
 *
 * Each source carries the object's ETag as its revision, which is a content
 * hash for a single-part upload. That is what makes a retry deterministic and a
 * late arrival detectable: the same inventory hashes the same way, and one
 * changed byte changes `sourceRevision`.
 */
export function buildInventory(objects) {
  return objects.map((obj, i) => ({
    sourceId: `s${i + 1}`,
    kind: obj.kind,
    logicalKey: obj.relativeKey,
    revision: (obj.etag ?? '').replace(/"/g, '') || `size:${obj.size}`,
  }));
}

/** `sourceRevision` hashes the inventory together with policy identity. */
export async function inventoryRevision(sources) {
  const { createHash } = await import('node:crypto');
  const canonical = JSON.stringify({
    policyId: POLICY_ID,
    processorVersion: PROCESSOR_VERSION,
    sources: [...sources]
      .map((s) => [s.kind, s.logicalKey, s.revision])
      .sort((a, b) => a.join('/').localeCompare(b.join('/'))),
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

/* ── per-client normalization ──────────────────────────── */

/**
 * Group one client's samples into per-stat-id time series.
 *
 * Keyed by stat id **plus an epoch**, so a stat id reused after a reconnect
 * starts a new series. Without that, two unrelated counter runs would be
 * differenced into one impossible delta — usually a huge one, which then reads
 * as a traffic spike.
 *
 * The epoch advances whenever a counter goes backwards on an id, which is the
 * only signal available here: a reset counter means either a reset or a new
 * stream object under the same id, and both call for a fresh series.
 */
function seriesByStatId(samples, pluck) {
  const series = new Map();
  const epochs = new Map();
  const lastValue = new Map();

  for (const sample of samples) {
    for (const stat of pluck(sample)) {
      const id = stat?.id;
      if (typeof id !== 'string' || id === '') continue;

      const marker = resetMarker(stat);
      const previous = lastValue.get(id);
      if (previous !== undefined && marker !== null && previous !== null && marker < previous) {
        epochs.set(id, (epochs.get(id) ?? 0) + 1);
      }
      if (marker !== null) lastValue.set(id, marker);

      const epoch = epochs.get(id) ?? 0;
      const key = `${id}#${epoch}`;
      const list = series.get(key) ?? { id, epoch, readings: [] };
      list.readings.push(stat);
      series.set(key, list);
    }
  }

  // Sorted by the stat's own timestamp. Archives can hold out-of-order records,
  // and differencing them in arrival order produces negative intervals.
  for (const entry of series.values()) {
    entry.readings.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }
  return [...series.values()];
}

/** A monotonic field to detect a reset on. Null when the stat has none. */
function resetMarker(stat) {
  for (const field of ['bytesReceived', 'bytesSent', 'packetsReceived', 'packetsSent', 'requestsSent']) {
    const value = stat?.[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/** Observation intervals for one client: consecutive samples within the gap limit. */
function observationIntervals(samples) {
  const intervals = [];
  for (let i = 1; i < samples.length; i += 1) {
    const from = samples[i - 1].timestamp;
    const to = samples[i].timestamp;
    if (typeof from !== 'number' || typeof to !== 'number') continue;
    const span = to - from;
    if (span <= 0 || span > MAX_INTERVAL_MS) continue;
    intervals.push({ startAt: from, endAt: to });
  }
  return intervals;
}

const totalMs = (intervals) => intervals.reduce((sum, i) => sum + (i.endAt - i.startAt), 0);

/* ── one client ────────────────────────────────────────── */

const pcs = (sample) => sample.peerConnections ?? [];
const flat = (sample, field) => pcs(sample).flatMap((pc) => pc?.[field] ?? []);
const byKind = (stats, kind) => stats.filter((s) => s?.kind === kind);

/**
 * Process one client's decoded samples into metrics, streams, paths and
 * impairment exposure.
 */
function processClient({ clientId, instanceId, samples }) {
  const accumulators = new Map(ALL_METRIC_IDS.map((id) => [id, newAccumulator(id)]));
  const streams = [];
  const paths = [];

  const intervals = observationIntervals(samples);
  const observedDurationMs = totalMs(intervals);

  // Per-stream accumulators are kept separately from the call-level ones so a
  // stream's own figures can be reported beside the rollup. Both accumulate
  // from the same intervals; neither is derived from the other.
  const addFamily = (pluck, metricIds, { remote = false, streamMeta = null } = {}) => {
    for (const entry of seriesByStatId(samples, pluck)) {
      const local = new Map(metricIds.map((id) => [id, newAccumulator(id)]));
      accumulateSeries(entry.readings, metricIds, local, {
        requireAdvancingTimestamp: remote,
      });
      accumulateSeries(entry.readings, metricIds, accumulators, {
        requireAdvancingTimestamp: remote,
      });

      if (streamMeta) {
        const first = entry.readings[0] ?? {};
        streams.push({
          streamId: `${clientId}:${entry.id}#${entry.epoch}`,
          participantId: instanceId,
          peerConnectionId: String(first.transportId ?? 'unknown'),
          trackId: first.trackIdentifier ?? null,
          encodingId: first.rid ?? null,
          direction: streamMeta.direction,
          mediaKind: streamMeta.mediaKind,
          epoch: String(entry.epoch),
          // Null without verified signalling or resolver evidence. Equal SSRC
          // is not evidence: SSRCs are reassigned, and a wrong join compares
          // two different people's media.
          publisherStreamId: null,
          relationshipSource: null,
          metrics: metricIds.map((id) => finishMetric(local.get(id))),
        });
      }
    }
  };

  for (const [kind, direction, field, family] of [
    ['audio', 'inbound', 'inboundRtps', 'inboundRtpAudio'],
    ['video', 'inbound', 'inboundRtps', 'inboundRtpVideo'],
    ['audio', 'outbound', 'outboundRtps', 'outboundRtpAudio'],
    ['video', 'outbound', 'outboundRtps', 'outboundRtpVideo'],
  ]) {
    addFamily((s) => byKind(flat(s, field), kind), METRICS_BY_FAMILY[family], {
      streamMeta: { direction, mediaKind: kind },
    });
  }

  for (const [kind, family] of [
    ['audio', 'remoteInboundAudio'],
    ['video', 'remoteInboundVideo'],
  ]) {
    addFamily((s) => byKind(flat(s, 'remoteInboundRtps'), kind), METRICS_BY_FAMILY[family], {
      remote: true,
    });
  }

  // Only the nominated pair: a non-selected pair measures a path no media took.
  addFamily(
    (s) => flat(s, 'iceCandidatePairs').filter((p) => p?.nominated === true),
    METRICS_BY_FAMILY.candidatePair,
  );

  addFamily((s) => flat(s, 'outboundRtps'), METRICS_BY_FAMILY.transportBytesOut);
  addFamily((s) => flat(s, 'inboundRtps'), METRICS_BY_FAMILY.transportBytesIn);

  // Selected-path records, one per nominated pair run. `relayed` and the
  // protocol fields stay null: establishing them needs the candidate metadata
  // this demo does not join, and guessing from an id would be a fabrication.
  for (const entry of seriesByStatId(samples, (s) =>
    flat(s, 'iceCandidatePairs').filter((p) => p?.nominated === true),
  )) {
    const first = entry.readings[0];
    const last = entry.readings[entry.readings.length - 1];
    if (!first || !last) continue;
    paths.push({
      pathId: `${clientId}:${entry.id}#${entry.epoch}`,
      participantId: instanceId,
      peerConnectionId: String(first.transportId ?? 'unknown'),
      transportId: String(first.transportId ?? 'unknown'),
      range: { startAt: first.timestamp, endAt: last.timestamp },
      selectedCandidatePairId: entry.id,
      relayed: null,
      relayServer: null,
      protocol: null,
      relayProtocol: null,
      evidence: [{ sourceId: clientId, at: first.timestamp, recordId: null, statId: entry.id }],
    });
  }

  const metrics = ALL_METRIC_IDS.map((id) =>
    finishMetric(accumulators.get(id), { eligibleDurationMs: observedDurationMs }),
  );

  return {
    clientId,
    instanceId,
    intervals,
    observedDurationMs,
    metrics,
    streams,
    paths,
    impairments: classifyImpairment(samples, intervals, observedDurationMs),
    dimensions: readDimensions(samples),
    displayName: readDisplayName(samples),
  };
}

/* ── impairment ────────────────────────────────────────── */

/**
 * Classify participant time, per interval, under `conservative-v1`.
 *
 * Network and connectivity classify participant time because their evidence
 * has interval resolution — a loss ratio or an RTT describes the whole interval,
 * and a connection state is a state. Audio and video do not: a concealment
 * ratio and a freeze-duration delta say something happened inside the interval
 * without saying when or for how long, so those intervals are *assessed as
 * unknown* for participant time while still contributing their stream metrics
 * and an observation.
 *
 * Reported as four categories plus `any`. `any` is a union, never a sum —
 * categories overlap, and a known positive stays affected even when another
 * category is unknown.
 */
function classifyImpairment(samples, intervals, observedDurationMs) {
  const positive = { audio: 0, video: 0, network: 0, connectivity: 0 };
  const assessed = { audio: 0, video: 0, network: 0, connectivity: 0 };
  let anyPositive = 0;
  let anyAssessed = 0;

  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const span = (curr.timestamp ?? 0) - (prev.timestamp ?? 0);
    if (span <= 0 || span > MAX_INTERVAL_MS) continue;

    const network = networkVerdict(prev, curr);
    const connectivity = connectivityVerdict(curr);

    let knownPositive = false;
    let allEvaluable = true;

    for (const [category, verdict] of [
      ['network', network],
      ['connectivity', connectivity],
    ]) {
      if (verdict === null) {
        allEvaluable = false;
        continue;
      }
      assessed[category] += span;
      if (verdict) {
        positive[category] += span;
        knownPositive = true;
      }
    }

    // Audio and video: the evidence cannot bound participant time, so these
    // intervals are not assessed. The stream metrics above still carry them.
    if (knownPositive) anyPositive += span;
    if (knownPositive || allEvaluable) anyAssessed += span;
  }

  const exposure = (category, impaired, assessedMs) => ({
    category,
    assessedParticipantMs: assessedMs,
    impairedParticipantMs: impaired,
    // Observed time nobody could judge. Not "healthy time".
    unknownParticipantMs: Math.max(0, observedDurationMs - assessedMs),
  });

  return [
    exposure('audio', 0, 0),
    exposure('video', 0, 0),
    exposure('network', positive.network, assessed.network),
    exposure('connectivity', positive.connectivity, assessed.connectivity),
    exposure('any', anyPositive, anyAssessed),
  ];
}

function networkVerdict(prev, curr) {
  const triggers = [];
  for (const field of ['inboundRtps']) {
    for (const stat of flat(curr, field)) {
      const prevStat = flat(prev, field).find((s) => s?.id === stat?.id);
      if (!prevStat) continue;
      const lost = (stat.packetsLost ?? 0) - (prevStat.packetsLost ?? 0);
      const received = (stat.packetsReceived ?? 0) - (prevStat.packetsReceived ?? 0);
      if (lost < 0 || received < 0) continue;
      if (lost + received > 0) triggers.push(lost / (lost + received) > 0.05);
    }
  }
  for (const pair of flat(curr, 'iceCandidatePairs').filter((p) => p?.nominated)) {
    const rtt = pair?.currentRoundTripTime;
    if (typeof rtt === 'number') triggers.push(rtt * 1000 > 400);
  }
  if (triggers.length === 0) return null;
  return triggers.some(Boolean);
}

function connectivityVerdict(sample) {
  const states = flat(sample, 'iceTransports')
    .map((t) => t?.iceState ?? t?.state)
    .filter((s) => typeof s === 'string');
  if (states.length === 0) return null;
  return states.some((s) => s === 'failed' || s === 'disconnected');
}

/* ── attachments ───────────────────────────────────────── */

function readDimensions(samples) {
  // Only invariant values. A dimension that changed during the call is omitted
  // here, because putting it in the participant's map would attribute the whole
  // session to whichever value happened to be last.
  const seen = {};
  for (const sample of samples) {
    const a = sample.attachments ?? {};
    for (const [key, field] of [
      ['browser', 'browserName'],
      ['os', 'operationSystem'],
      ['appVersion', 'appVersion'],
      ['sdkVersion', 'sdkVersion'],
      ['producer', 'producer'],
    ]) {
      const value = a[field];
      if (typeof value !== 'string' || value === '') continue;
      if (seen[key] === undefined) seen[key] = value;
      else if (seen[key] !== value) seen[key] = null;
    }
  }
  return Object.fromEntries(Object.entries(seen).filter(([, v]) => v !== null));
}

function readDisplayName(samples) {
  for (const sample of samples) {
    const name = sample.attachments?.displayName;
    if (typeof name === 'string' && name !== '') return name;
  }
  return null;
}

/* ── the call digest ───────────────────────────────────── */

const unavailable = (reasons) => ({ state: 'unavailable', reasons });
const available = () => ({ state: 'available', reasons: [] });

export function buildCallDigest({
  tenantId,
  roomId,
  callId,
  revision,
  sourceRevision,
  sources,
  clients,
  summary,
  generatedAt = Date.now(),
}) {
  const processed = clients.map(processClient);

  const allIntervals = processed.flatMap((c) => c.intervals);
  const observedParticipantMs = processed.reduce((sum, c) => sum + c.observedDurationMs, 0);

  const starts = allIntervals.map((i) => i.startAt);
  const ends = allIntervals.map((i) => i.endAt);
  const range =
    starts.length > 0 ? { startAt: Math.min(...starts), endAt: Math.max(...ends) } : null;

  const metrics = rollupMetrics(processed.map((c) => c.metrics));
  const impairments = rollupImpairment(processed.map((c) => c.impairments));

  const summaryOnly = processed.length === 0 && Boolean(summary);
  const hasSamples = processed.length > 0;

  return {
    kind: 'call-digest',
    schemaVersion: 1,
    digestId: `${callId}:${revision}`,
    tenantId,
    callId,
    roomId: roomId ?? null,
    revision,
    provenance: {
      processorVersion: PROCESSOR_VERSION,
      policyId: POLICY_ID,
      sourceRevision,
      generatedAt,
    },
    // A call is only closed when a summary says so. Sample bounds cannot
    // distinguish "ended" from "stopped being observed".
    lifecycle: summary ? 'closed' : 'unknown',
    range,
    coverage: {
      completeness: summaryOnly || !summary ? 'partial' : 'complete',
      expectedSources: null,
      processedSources: sources.length,
      rejectedRecords: 0,
      duplicateRecords: 0,
      gapDurationMs: null,
      truncated: false,
      warnings: [
        ...(summaryOnly ? ['source.summary-only'] : []),
        ...(summary ? [] : ['lifecycle.evidence-missing']),
      ],
    },
    capabilities: {
      usage: hasSamples ? available() : unavailable(['source.summary-only']),
      joinOutcomes: unavailable(['joins.adapter-missing']),
      audio: hasSamples ? available() : unavailable(['source.summary-only']),
      video: hasSamples ? available() : unavailable(['source.summary-only']),
      network: hasSamples ? available() : unavailable(['source.summary-only']),
      connectivity: hasSamples ? available() : unavailable(['source.summary-only']),
      paths: unavailable(['path.on-change-metadata-insufficient']),
      topology: unavailable(['topology.relationship-unverified']),
      cohorts: hasSamples ? available() : unavailable(['source.summary-only']),
      scores: unavailable(['policy.capability-disabled']),
    },
    sources,
    usage: {
      participantSessions: hasSamples ? processed.length : (summary?.clientCount ?? null),
      // Needs membership intervals, which sample bounds are not.
      peakConcurrentParticipants: summary?.peak ?? null,
      observedParticipantMs,
      // Needs explicit connection-state evidence over the whole call.
      connectedParticipantMs: null,
      callDurationMs: summary?.durationInMs ?? (range ? range.endAt - range.startAt : null),
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
    impairments,
    metrics,
    findingCounts: [],
    participants: { resourceId: `${callId}:${revision}:participants`, records: processed.length },
    streamDetails: {
      resourceId: `${callId}:${revision}:streams`,
      records: processed.reduce((n, c) => n + c.streams.length, 0),
    },
    pathDetails: {
      resourceId: `${callId}:${revision}:paths`,
      records: processed.reduce((n, c) => n + c.paths.length, 0),
    },
    // No timeline or findings resource in this demo. Null means unavailable,
    // which is the honest answer — a ref with records 0 would claim they were
    // evaluated and empty.
    timeline: null,
    findings: null,
    _detail: {
      participants: processed.map((c) => ({
        participantId: c.instanceId,
        clientId: c.clientId,
        instanceId: c.instanceId,
        displayName: c.displayName,
        membership: [],
        dimensions: c.dimensions,
        capabilities: { usage: available() },
        observedDurationMs: c.observedDurationMs,
        metrics: c.metrics,
        impairments: c.impairments,
      })),
      streams: processed.flatMap((c) => c.streams),
      paths: processed.flatMap((c) => c.paths),
    },
  };
}

/**
 * Combine like metric ids across clients.
 *
 * Numerators and denominators sum; the division happens once. Never a mean of
 * the clients' means — a client measured for ten seconds and one measured for
 * an hour are not equal evidence.
 */
function rollupMetrics(perClient) {
  const byId = new Map();
  for (const list of perClient) {
    for (const metric of list) {
      const existing = byId.get(metric.metricId);
      byId.set(metric.metricId, existing ? mergeMetric(existing, metric) : { ...metric });
    }
  }
  return [...byId.values()];
}

function mergeMetric(a, b) {
  if (a.status === 'unavailable' && b.status === 'unavailable') {
    return { ...a, unavailableReasons: [...new Set([...a.unavailableReasons, ...b.unavailableReasons])] };
  }
  if (a.status === 'unavailable') return { ...b };
  if (b.status === 'unavailable') return { ...a };

  return {
    metricId: a.metricId,
    status: a.status === 'partial' || b.status === 'partial' ? 'partial' : 'measured',
    unavailableReasons: [...new Set([...a.unavailableReasons, ...b.unavailableReasons])],
    validIntervals: a.validIntervals + b.validIntervals,
    eligibleDurationMs:
      a.eligibleDurationMs === null && b.eligibleDurationMs === null
        ? null
        : (a.eligibleDurationMs ?? 0) + (b.eligibleDurationMs ?? 0),
    measuredDurationMs: a.measuredDurationMs + b.measuredDurationMs,
    numerator: (a.numerator ?? 0) + (b.numerator ?? 0),
    denominator:
      a.denominator === null && b.denominator === null ? null : (a.denominator ?? 0) + (b.denominator ?? 0),
    min: a.min === null ? b.min : b.min === null ? a.min : Math.min(a.min, b.min),
    max: a.max === null ? b.max : b.max === null ? a.max : Math.max(a.max, b.max),
    // Only identical definition ids may be merged; two sets of bounds have no
    // common refinement, so combining them would invent data.
    distribution:
      a.distribution && b.distribution && a.distribution.definitionId === b.distribution.definitionId
        ? {
            definitionId: a.distribution.definitionId,
            weights: a.distribution.weights.map((w, i) => w + (b.distribution.weights[i] ?? 0)),
          }
        : (a.distribution ?? b.distribution),
  };
}

/** Category exposure adds across participants. Categories never add together. */
function rollupImpairment(perClient) {
  const byCategory = new Map();
  for (const list of perClient) {
    for (const e of list) {
      const existing = byCategory.get(e.category) ?? {
        category: e.category,
        assessedParticipantMs: 0,
        impairedParticipantMs: 0,
        unknownParticipantMs: 0,
      };
      existing.assessedParticipantMs += e.assessedParticipantMs;
      existing.impairedParticipantMs += e.impairedParticipantMs;
      existing.unknownParticipantMs += e.unknownParticipantMs;
      byCategory.set(e.category, existing);
    }
  }
  return [...byCategory.values()];
}

export { decodePatchedJsonl, processClient, POLICY };
