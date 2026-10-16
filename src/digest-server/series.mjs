/**
 * One client's samples, normalized into something a rule can read.
 *
 * Every check rule reads from the object this module builds and from nothing
 * else. That boundary is the point: the arithmetic that is easy to get wrong —
 * differencing counters, noticing a reset, refusing to interpolate across a gap
 * — happens once here, and a rule afterwards is a comparison.
 *
 * ## The four mistakes this exists to make unavailable
 *
 * 1. **Differencing across a reset.** A counter that goes backwards means a
 *    reset or a new object under a reused id. Differenced naively it produces a
 *    huge positive delta, which reads as a traffic spike at exactly the moment
 *    something went wrong.
 *
 * 2. **Using the sample's timestamp for a stat's interval.** One ClientSample
 *    carries many stats read at different instants. Dividing one stat's bytes
 *    by another stat's elapsed time misreports every rate.
 *
 * 3. **Interpolating across a gap.** A 60-second hole between samples is not a
 *    60-second interval of average behaviour. It contributes nothing, and the
 *    time is recorded as unassessed instead.
 *
 * 4. **Reading a missing field as zero.** `undefined` means the platform did
 *    not report it; 0 means it reported none. The first makes a check
 *    `not-assessable`, the second can make it pass. They are never conflated.
 */

/**
 * Longest span between consecutive samples that still counts as continuous.
 *
 * The page samples every 2s, so 10s is five missed beats — comfortably beyond
 * jitter, comfortably short of "something stopped". Time beyond it is still
 * *observed* (the client was there) but not *assessed* (nothing was measured).
 */
export const MAX_INTERVAL_MS = 10_000;

/** A monotonic field to detect a reset on. Null when the stat has none. */
function resetMarker(stat) {
  for (const field of [
    'bytesReceived',
    'bytesSent',
    'packetsReceived',
    'packetsSent',
    'requestsSent',
    'framesDecoded',
    'framesEncoded',
    'totalSamplesReceived',
  ]) {
    const value = stat?.[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Group one client's samples into per-stat-id time series.
 *
 * Keyed by stat id **plus an epoch**, so a stat id reused after a reconnect
 * starts a new series rather than being differenced against its predecessor.
 * The epoch advances whenever a monotonic field goes backwards on an id, which
 * is the only signal available: a reset counter means either a reset or a new
 * stream object under the same id, and both call for a fresh series.
 */
export function seriesByStatId(samples, pluck) {
  const series = new Map();
  const epochs = new Map();
  const lastValue = new Map();
  const resets = [];

  for (const sample of samples) {
    for (const stat of pluck(sample) ?? []) {
      const id = stat?.id;
      if (typeof id !== 'string' || id === '') continue;

      const marker = resetMarker(stat);
      const previous = lastValue.get(id);
      if (previous !== undefined && marker !== null && previous !== null && marker < previous) {
        epochs.set(id, (epochs.get(id) ?? 0) + 1);
        resets.push({ id, at: stat.timestamp ?? sample.timestamp ?? null });
      }
      if (marker !== null) lastValue.set(id, marker);

      const epoch = epochs.get(id) ?? 0;
      const key = `${id}#${epoch}`;
      const entry = series.get(key) ?? { id, epoch, readings: [] };
      entry.readings.push(stat);
      series.set(key, entry);
    }
  }

  // Sorted by the stat's OWN timestamp. Archives hold out-of-order records, and
  // differencing them in arrival order produces negative intervals.
  for (const entry of series.values()) {
    entry.readings.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }

  return { series: [...series.values()], resets };
}

/** A top-level array on the ClientSample itself. */
const topLevel = (sample, field) => (Array.isArray(sample?.[field]) ? sample[field] : []);

/**
 * A stats array flattened across the sample's peer connections.
 *
 * This is the nesting that matters and it is easy to get wrong: `inboundRtps`,
 * `outboundRtps`, `remoteInboundRtps`, `iceTransports`, `iceCandidatePairs` and
 * `mediaSources` live on each `PeerConnectionSample`, NOT on the ClientSample.
 * Reading them at the top level finds nothing and every check answers
 * `not-applicable` — which looks like a quiet call rather than a bug.
 *
 * Each stat is shallow-copied with its `peerConnectionId` attached, so a
 * finding's subject and its evidence link can name the connection the stat came
 * from without a second traversal.
 *
 * `extensionStats` is also top-level and is deliberately never read anywhere in
 * this process: the contract restricts findings to baseline statistics, and
 * extension stats are the first thing the scope boundary excludes.
 */
function pcStats(sample, field) {
  const out = [];
  for (const pc of topLevel(sample, 'peerConnections')) {
    const list = Array.isArray(pc?.[field]) ? pc[field] : [];
    for (const stat of list) {
      out.push(pc.peerConnectionId ? { ...stat, peerConnectionId: pc.peerConnectionId } : stat);
    }
  }
  return out;
}

/**
 * Consecutive deltas within one stat series.
 *
 * Each entry carries the interval it spans and a `delta(field)` that returns
 * `undefined` — never 0 — when either end did not report the field. A rule that
 * wants "did this increase" therefore cannot accidentally read a missing field
 * as no increase.
 */
export function intervalsOf(entry) {
  const out = [];
  for (let i = 1; i < entry.readings.length; i += 1) {
    const prev = entry.readings[i - 1];
    const curr = entry.readings[i];
    const from = prev.timestamp;
    const to = curr.timestamp;
    if (typeof from !== 'number' || typeof to !== 'number') continue;
    const elapsedMs = to - from;
    if (elapsedMs <= 0 || elapsedMs > MAX_INTERVAL_MS) continue;

    out.push({
      statId: entry.id,
      from,
      to,
      elapsedMs,
      prev,
      curr,
      delta(field) {
        const a = prev?.[field];
        const b = curr?.[field];
        if (typeof a !== 'number' || typeof b !== 'number') return undefined;
        if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
        const d = b - a;
        return d < 0 ? undefined : d;
      },
      value(field) {
        const v = curr?.[field];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
      },
    });
  }
  return out;
}

/** Observed span and assessable span for one client, plus the gaps between. */
function coverageOf(samples, events) {
  const stamps = samples
    .map((s) => s.timestamp)
    .filter((t) => typeof t === 'number' && Number.isFinite(t))
    .sort((a, b) => a - b);

  if (stamps.length < 2) {
    return {
      observedSeconds: 0,
      assessedSeconds: 0,
      unassessedSeconds: 0,
      gaps: [],
      firstAt: stamps[0] ?? null,
      lastAt: stamps[0] ?? null,
    };
  }

  const firstAt = stamps[0];
  const lastAt = stamps[stamps.length - 1];
  const observedMs = lastAt - firstAt;

  let assessedMs = 0;
  const gaps = [];
  for (let i = 1; i < stamps.length; i += 1) {
    const span = stamps[i] - stamps[i - 1];
    if (span <= 0) continue;
    if (span <= MAX_INTERVAL_MS) {
      assessedMs += span;
    } else {
      // A hole. Whether the tab was hidden or collection stopped is answered by
      // the events, which is strictly better evidence than the hole's length.
      const hidden = events.some(
        (e) =>
          e.type === 'TAB_VISIBILITY_CHANGED' &&
          typeof e.timestamp === 'number' &&
          e.timestamp >= stamps[i - 1] &&
          e.timestamp <= stamps[i],
      );
      gaps.push({
        fromMs: stamps[i - 1],
        toMs: stamps[i],
        reason: hidden ? 'tab-hidden' : 'stats-collection-gap',
      });
    }
  }

  return {
    observedSeconds: observedMs / 1000,
    assessedSeconds: assessedMs / 1000,
    unassessedSeconds: Math.max(0, observedMs - assessedMs) / 1000,
    gaps,
    firstAt,
    lastAt,
  };
}

/**
 * Normalize one client's decoded samples.
 *
 * The returned object is the entire input to every rule. Anything a rule needs
 * and cannot find here is evidence the platform did not report — which is a
 * `not-assessable` outcome, not a reason to reach back into raw samples.
 */
export function normalizeClient(clientId, samples) {
  const ordered = [...samples].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  // Built-in events and issues, flattened across samples and sorted. These are
  // the only non-statistical evidence in scope: no application events, no
  // enriched metadata, no Observer-side detector findings.
  const events = ordered
    .flatMap((s) => topLevel(s, 'clientEvents'))
    .filter((e) => typeof e?.type === 'string')
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  const issues = ordered
    .flatMap((s) => topLevel(s, 'clientIssues'))
    .filter((i) => typeof i?.type === 'string')
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  const meta = ordered.flatMap((s) => topLevel(s, 'clientMetaItems'));

  const inbound = seriesByStatId(ordered, (s) => pcStats(s, 'inboundRtps'));
  const outbound = seriesByStatId(ordered, (s) => pcStats(s, 'outboundRtps'));
  const pairs = seriesByStatId(ordered, (s) => pcStats(s, 'iceCandidatePairs'));
  const sources = seriesByStatId(ordered, (s) => pcStats(s, 'mediaSources'));
  const remoteInbound = seriesByStatId(ordered, (s) => pcStats(s, 'remoteInboundRtps'));
  const transports = seriesByStatId(ordered, (s) => pcStats(s, 'iceTransports'));

  const byKind = (built, kind) =>
    built.series.filter((e) => {
      const k = e.readings[0]?.kind ?? e.readings[0]?.mediaType;
      return kind === undefined || k === kind;
    });

  return {
    clientId,
    sampleCount: ordered.length,
    samples: ordered,
    events,
    issues,
    meta,
    coverage: coverageOf(ordered, events),
    resets: [
      ...inbound.resets,
      ...outbound.resets,
      ...pairs.resets,
      ...sources.resets,
    ],
    inboundAudio: byKind(inbound, 'audio'),
    inboundVideo: byKind(inbound, 'video'),
    outboundAudio: byKind(outbound, 'audio'),
    outboundVideo: byKind(outbound, 'video'),
    inboundAll: inbound.series,
    outboundAll: outbound.series,
    candidatePairs: pairs.series,
    mediaSources: sources.series,
    remoteInbound: remoteInbound.series,
    iceTransports: transports.series,

    /** Built-in issues of any of these types, in order. */
    issuesOfType(types) {
      const want = types instanceof Set ? types : new Set(types);
      return this.issues.filter((i) => want.has(i.type));
    },

    eventsOfType(types) {
      const want = types instanceof Set ? types : new Set(types);
      return this.events.filter((e) => want.has(e.type));
    },
  };
}
