/**
 * Per-interval deltas and registry metrics.
 *
 * The whole of the arithmetic lives here, and it is the part worth reading
 * carefully — every rule below exists because breaking it produces a plausible
 * number nobody can tell is wrong.
 *
 * ## Deltas, once, at stat scope
 *
 * WebRTC stats are cumulative counters. A metric is computed from the
 * difference between two consecutive readings **of the same stat id**, using
 * the stat's own timestamp rather than the sample's: a sample carries many
 * stats and they are not all read at the same instant, so dividing one stat's
 * byte delta by another's elapsed time quietly misreports bitrate.
 *
 * Counters are differenced once, here, before anything is aggregated. Summing
 * first and differencing after would subtract across unrelated streams.
 *
 * ## What makes an interval invalid
 *
 * - **Non-positive elapsed time.** A repeated or out-of-order timestamp adds no
 *   exposure. Treating it as an interval divides by zero or by a negative.
 * - **A gap longer than the policy's maximum.** A 40-second hole is not four
 *   10-second intervals of whatever was last seen, so it contributes nothing
 *   rather than an interpolation.
 * - **A counter that went backwards.** That is a reset or a correction, not
 *   negative traffic. The interval is dropped for that metric only — a reset
 *   inbound counter does not invalidate the transport's RTT.
 * - **A missing input.** Null is not zero. A metric whose counter is absent
 *   from one of the two readings has no delta, and inventing one as "0" would
 *   report a perfect stream for a platform that simply does not publish the
 *   field.
 * - **A stale remote report.** A receiver-side report whose own timestamp has
 *   not advanced is the same report again; carrying it forward would report one
 *   measurement as though it held for minutes.
 *
 * ## Three aggregations, and why the difference matters
 *
 * - `ratio-of-sums` — sum the numerators, sum the denominators, divide once at
 *   the end. Not a mean of per-interval ratios: a 2% loss interval carrying ten
 *   packets and a 0% interval carrying ten thousand are not equally weighted
 *   evidence, and averaging the ratios says they are.
 * - `duration-weighted-mean` — for a level held over an interval (jitter, RTT,
 *   FPS), weighted by how long it was held.
 * - `sum` — byte totals. Numerator only; the denominator is null.
 *
 * The histogram is always over **per-interval values** with duration weights,
 * which is why a ratio metric's distribution and its headline value can
 * legitimately differ: the headline is a ratio of sums, the distribution
 * describes what an interval felt like.
 */

import { CONSERVATIVE_V1_POLICY, METRIC_REGISTRY } from './registry.mjs';

const MAX_INTERVAL_MS = CONSERVATIVE_V1_POLICY.sampling.maxSupportedIntervalMs;

const DEFINITIONS = new Map(METRIC_REGISTRY.metrics.map((m) => [m.metricId, m]));

/* ── reading counters ──────────────────────────────────── */

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The increase in a counter between two readings, or null.
 *
 * Null for a missing reading and null for a decrease. Both are "no usable
 * delta", and the caller drops the interval for that metric rather than
 * substituting zero.
 */
function delta(prev, curr, field) {
  const a = num(prev?.[field]);
  const b = num(curr?.[field]);
  if (a === null || b === null) return null;
  const diff = b - a;
  return diff < 0 ? null : diff;
}

/** Sum of several deltas, or null when any one of them is unusable. */
function deltaSum(prev, curr, fields) {
  let total = 0;
  for (const field of fields) {
    const d = delta(prev, curr, field);
    if (d === null) return null;
    total += d;
  }
  return total;
}

/* ── the extractors ────────────────────────────────────── */

/**
 * One extractor per metric id: two readings and an elapsed time in, a
 * `{ numerator, denominator, value }` out, or null when this interval cannot
 * support the metric.
 *
 * `value` is the per-interval observation, used for the histogram and for
 * min/max. For a ratio metric it is the interval's own ratio; for a level it is
 * the reading. The registry's `min`/`max` are the extrema of these, never of
 * the cumulative counters behind them.
 *
 * Seconds-to-milliseconds conversions are explicit at every site, because the
 * W3C stats carry jitter, RTT, decode time, freeze duration and limitation
 * durations in **seconds** while the contract's units are milliseconds, and a
 * missing ×1000 looks like an impossibly good call.
 */
const RATIO = (numerator, denominator) =>
  numerator === null || denominator === null || denominator === 0
    ? null
    : { numerator, denominator, value: numerator / denominator };

const LEVEL = (reading, intervalMs) =>
  reading === null ? null : { numerator: reading * intervalMs, denominator: intervalMs, value: reading };

export const EXTRACTORS = {
  // ── inbound RTP ──
  'audio.inbound.loss': (p, c) => inboundLoss(p, c),
  'video.inbound.loss': (p, c) => inboundLoss(p, c),

  'audio.inbound.jitter': (p, c, ms) => LEVEL(seconds(c.jitter), ms),
  'video.inbound.jitter': (p, c, ms) => LEVEL(seconds(c.jitter), ms),

  'audio.inbound.bitrate': (p, c, ms) => bitrate(p, c, ms, 'bytesReceived'),
  'video.inbound.bitrate': (p, c, ms) => bitrate(p, c, ms, 'bytesReceived'),

  'audio.inbound.speechConcealment': (p, c) => {
    // Both counters must exist. A missing silentConcealedSamples is NOT taken
    // as zero: silence concealment is not audible damage, and assuming zero
    // would inflate concealment on every platform that omits the field.
    const concealed = delta(p, c, 'concealedSamples');
    const silent = delta(p, c, 'silentConcealedSamples');
    const received = delta(p, c, 'totalSamplesReceived');
    if (concealed === null || silent === null || received === null) return null;
    return RATIO(Math.max(0, concealed - silent), received);
  },

  'audio.inbound.jitterBufferDelay': (p, c) =>
    RATIO(seconds(delta(p, c, 'jitterBufferDelay')), delta(p, c, 'jitterBufferEmittedCount')),

  'video.inbound.freezeShare': (p, c, ms) =>
    RATIO(seconds(delta(p, c, 'totalFreezesDuration')), ms),

  'video.inbound.decodeTime': (p, c) =>
    RATIO(seconds(delta(p, c, 'totalDecodeTime')), delta(p, c, 'framesDecoded')),

  'video.inbound.fps': (p, c, ms) => LEVEL(num(c.framesPerSecond), ms),

  // ── outbound RTP ──
  'audio.outbound.bitrate': (p, c, ms) => bitrate(p, c, ms, 'bytesSent'),
  'video.outbound.bitrate': (p, c, ms) => bitrate(p, c, ms, 'bytesSent'),

  'video.outbound.encodeTime': (p, c) =>
    RATIO(seconds(delta(p, c, 'totalEncodeTime')), delta(p, c, 'framesEncoded')),

  'video.outbound.cpuLimitedShare': (p, c) => limitationShare(p, c, 'cpu'),
  'video.outbound.bandwidthLimitedShare': (p, c) => limitationShare(p, c, 'bandwidth'),

  // ── remote (receiver-reported) ──
  'audio.outbound.remoteLoss': (p, c) => remoteLoss(p, c),
  'video.outbound.remoteLoss': (p, c) => remoteLoss(p, c),

  'audio.outbound.rtcpRtt': (p, c, ms) => LEVEL(seconds(c.roundTripTime), ms),
  'video.outbound.rtcpRtt': (p, c, ms) => LEVEL(seconds(c.roundTripTime), ms),

  // ── transport ──
  'transport.iceRtt': (p, c, ms) => LEVEL(seconds(c.currentRoundTripTime), ms),

  'transport.rtpBytesSent': (p, c) => {
    const d = delta(p, c, 'bytesSent');
    return d === null ? null : { numerator: d, denominator: null, value: d };
  },
  'transport.rtpBytesReceived': (p, c) => {
    const d = delta(p, c, 'bytesReceived');
    return d === null ? null : { numerator: d, denominator: null, value: d };
  },
};

/** Seconds to milliseconds, preserving null. */
function seconds(value) {
  const n = num(value);
  return n === null ? null : n * 1000;
}

function inboundLoss(prev, curr) {
  const lost = delta(prev, curr, 'packetsLost');
  const received = delta(prev, curr, 'packetsReceived');
  if (lost === null || received === null) return null;
  // An all-loss interval is real evidence, not a divide-by-zero to discard:
  // lost > 0 with received === 0 gives a denominator of lost and a ratio of 1.
  return RATIO(lost, lost + received);
}

function remoteLoss(prev, curr) {
  // Expected packets come from the receiver's own report, never from the
  // sender's packetsSent: dividing one endpoint's count by another's
  // misreports loss exactly when the two disagree, which is when it matters.
  const lost = delta(prev, curr, 'packetsLost');
  const received = delta(prev, curr, 'packetsReceived');
  if (lost === null || received === null) return null;
  return RATIO(lost, lost + received);
}

function bitrate(prev, curr, intervalMs, field) {
  const bytes = delta(prev, curr, field);
  if (bytes === null) return null;
  return RATIO(8000 * bytes, intervalMs);
}

function limitationShare(prev, curr, reason) {
  const prevDurations = prev?.qualityLimitationDurations;
  const currDurations = curr?.qualityLimitationDurations;
  if (!prevDurations || !currDurations) return null;

  const wanted = delta(prevDurations, currDurations, reason);
  // `none` is excluded from the denominator on purpose. This answers "when the
  // encoder was limited, how often was CPU the reason" — not "what share of the
  // call was CPU-bound". Including unlimited time would make a flawless stream
  // report a tiny CPU share rather than no limitation at all.
  const limited = deltaSum(prevDurations, currDurations, ['cpu', 'bandwidth', 'other']);
  if (wanted === null || limited === null) return null;
  return RATIO(seconds(wanted), seconds(limited));
}

/* ── accumulation ──────────────────────────────────────── */

/**
 * An accumulator per (metricId, subject).
 *
 * Holds sums rather than a running value, so the division happens once at the
 * end — see the note on `ratio-of-sums` above.
 */
export function newAccumulator(metricId) {
  const definition = DEFINITIONS.get(metricId);
  if (!definition) throw new Error(`metric ${metricId} is not in the registry`);
  return {
    metricId,
    definition,
    numerator: 0,
    denominator: 0,
    validIntervals: 0,
    measuredDurationMs: 0,
    min: null,
    max: null,
    weights: definition.histogram ? newWeights(definition.histogram) : null,
    reasons: new Set(),
  };
}

function newWeights(definitionId) {
  const found = HISTOGRAMS.get(definitionId);
  if (!found) throw new Error(`histogram ${definitionId} is not in the registry`);
  return new Array(found.upperBounds.length + 1).fill(0);
}

let HISTOGRAMS = new Map();

/** Injected rather than imported, so this module stays usable in a test. */
export function useHistograms(registry) {
  HISTOGRAMS = new Map(registry.definitions.map((d) => [d.definitionId, d]));
}

/**
 * Add one valid interval's observation.
 *
 * An out-of-domain value is rejected rather than clamped into an edge bucket: a
 * loss ratio of 1.3 is a producer bug, and filing it under "<= 1" hides it.
 */
export function accumulate(acc, { numerator, denominator, value }, intervalMs) {
  const definition = acc.definition;

  if (definition.unit === 'ratio' && (value < 0 || value > 1 || !Number.isFinite(value))) {
    acc.reasons.add('metric.out-of-domain');
    return;
  }
  if (!Number.isFinite(value) || value < 0) {
    acc.reasons.add('metric.out-of-domain');
    return;
  }

  acc.numerator += numerator;
  if (denominator !== null) acc.denominator += denominator;
  acc.validIntervals += 1;
  acc.measuredDurationMs += intervalMs;
  acc.min = acc.min === null ? value : Math.min(acc.min, value);
  acc.max = acc.max === null ? value : Math.max(acc.max, value);

  if (acc.weights) {
    const bounds = HISTOGRAMS.get(definition.histogram).upperBounds;
    let bucket = bounds.length;
    for (let i = 0; i < bounds.length; i += 1) {
      if (value <= bounds[i]) {
        bucket = i;
        break;
      }
    }
    acc.weights[bucket] += intervalMs;
  }
}

/**
 * Close an accumulator into a contract `MetricAggregate`.
 *
 * Zero valid intervals is `unavailable` with every figure null — not a zero.
 * That distinction is the one the whole contract is built on: "nobody measured
 * this" and "this measured zero" are different facts and the UI renders them
 * differently.
 */
export function finishMetric(acc, { eligibleDurationMs = null } = {}) {
  if (acc.validIntervals === 0) {
    return {
      metricId: acc.metricId,
      status: 'unavailable',
      unavailableReasons: [...(acc.reasons.size ? acc.reasons : ['metric.no-valid-intervals'])],
      validIntervals: 0,
      eligibleDurationMs,
      measuredDurationMs: 0,
      numerator: null,
      denominator: null,
      min: null,
      max: null,
      distribution: null,
    };
  }

  const isSum = acc.definition.aggregation === 'sum';
  // Partial when some evidence existed but the eligible window was not fully
  // covered — a real state, and distinct from both measured and unavailable.
  const partial =
    acc.reasons.size > 0 ||
    (eligibleDurationMs !== null && acc.measuredDurationMs < eligibleDurationMs * 0.99);

  return {
    metricId: acc.metricId,
    status: partial ? 'partial' : 'measured',
    unavailableReasons: partial ? [...acc.reasons] : [],
    validIntervals: acc.validIntervals,
    eligibleDurationMs,
    measuredDurationMs: acc.measuredDurationMs,
    numerator: acc.numerator,
    denominator: isSum ? null : acc.denominator,
    min: acc.min,
    max: acc.max,
    distribution: acc.weights ? { definitionId: acc.definition.histogram, weights: acc.weights } : null,
  };
}

/**
 * Walk consecutive readings of one stat id and accumulate every metric that
 * applies to it.
 *
 * `readings` is already sorted by the stat's own timestamp. `metricIds` are the
 * registry metrics this stat family can support; one that this particular
 * platform does not publish simply never produces a valid interval and comes
 * out unavailable, which is the honest answer rather than a configuration flag.
 */
export function accumulateSeries(readings, metricIds, accumulators, { requireAdvancingTimestamp = false } = {}) {
  for (let i = 1; i < readings.length; i += 1) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const intervalMs = (num(curr.timestamp) ?? 0) - (num(prev.timestamp) ?? 0);

    if (intervalMs <= 0) continue;
    if (intervalMs > MAX_INTERVAL_MS) {
      for (const id of metricIds) accumulators.get(id)?.reasons.add('coverage.gap-exceeds-max-interval');
      continue;
    }
    // A receiver-side report is only fresh if its own timestamp moved. Without
    // this a single remote report would be counted once per local sample.
    if (requireAdvancingTimestamp && num(curr.timestamp) === num(prev.timestamp)) {
      for (const id of metricIds) accumulators.get(id)?.reasons.add('metric.remote-report-stale');
      continue;
    }

    for (const id of metricIds) {
      const acc = accumulators.get(id);
      if (!acc) continue;
      const extract = EXTRACTORS[id];
      if (!extract) continue;

      const observation = extract(prev, curr, intervalMs);
      if (observation === null) {
        acc.reasons.add('metric.counter-missing');
        continue;
      }
      accumulate(acc, observation, intervalMs);
    }
  }
}

export { MAX_INTERVAL_MS, DEFINITIONS };
