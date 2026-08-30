/**
 * The four things worth knowing about a client's session at a glance:
 * how far away it was, what went wrong, how much it moved, and how hard the
 * machine had to work.
 *
 * Each group is computed once here rather than inline in the view, so the
 * numbers behind the cards can be tested without rendering anything.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import { baseIssueType, isResolvedIssueType } from '../schema/ClientIssueTypes.ts';
import { buildTabVisibility, type TabVisibility } from './tabVisibility.ts';
import type { ProcessWebRTCStatsResult } from './statsTypes.ts';

/* ── percentiles ───────────────────────────────────────── */

/**
 * Linear-interpolated percentile over an unsorted sample set.
 *
 * `p` is a fraction (0.95 for p95). Returns null for an empty set rather than
 * NaN, so a missing metric renders as an em dash instead of "NaN ms".
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * Math.min(Math.max(p, 0), 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* ── issue classification ──────────────────────────────── */

export type IssueCategory = 'audio' | 'video' | 'network' | 'other';


/**
 * Which family an issue type belongs to.
 *
 * The matchers are lifted from observer-js's own `IssueConclusion` family table
 * so the dashboard and the observer agree on what counts as an audio issue.
 * Its five families collapse into the four buckets shown here: congestion and
 * connectivity are both network, and endpoint capacity falls in with anything
 * unrecognised — detectors are extensible and applications add their own types,
 * so `other` is a real bucket, not a leftover.
 */
export function classifyIssue(type: string): IssueCategory {
  const t = baseIssueType(type).toLowerCase();

  if (t.startsWith('congestion') || t.includes('bandwidth')) return 'network';
  if (t.startsWith('ice-') || t.includes('turn') || t === 'unstable-ice-path') return 'network';
  if (t.startsWith('audio-') || t.includes('concealment') || t.includes('jitter-buffer')) return 'audio';
  if (t.includes('video') || t.includes('freeze') || t.includes('keyframe') || t.includes('decoder')) return 'video';
  return 'other';
}

/**
 * The `-resolved` convention has one definition, in `schema/ClientIssueTypes`.
 *
 * client-monitor 4.6.0 made it load-bearing — a resolution entry is the client
 * saying an issue cleared — so two copies of the rule deciding which half of an
 * issue an entry is would be two chances to disagree. Re-exported here because
 * callers of this module read issues in the same breath as summaries.
 */
export { baseIssueType, isResolvedIssueType as isResolutionEntry } from '../schema/ClientIssueTypes.ts';

/* ── result shape ──────────────────────────────────────── */

export interface LatencySummary {
  /** Round-trip time in ms. */
  median: number | null;
  average: number | null;
  p75: number | null;
  p95: number | null;
  sampleCount: number;
}

export interface IssueSummary {
  audio: number;
  video: number;
  network: number;
  other: number;
  total: number;
  /** Distinct issue types seen, per category — shown as the card's tooltip. */
  typesByCategory: Record<IssueCategory, string[]>;
}

export interface TransmissionSummary {
  /** Bytes sent across every outbound stream. */
  bytesSent: number | null;
  /** Bytes received across every inbound stream. */
  bytesReceived: number | null;
  packetsLost: number;
  /** Packet loss as a percentage of inbound packets. */
  lossRatePct: number | null;
  /** Mean of every inbound stream's bitrate, in kbps. */
  avgInboundKbps: number | null;
  /** Mean of every outbound stream's bitrate, in kbps. */
  avgOutboundKbps: number | null;
}

export interface CpuSummary {
  /** Video encode+decode CPU as a percentage of one core. */
  median: number | null;
  average: number | null;
  max: number | null;
  p75: number | null;
  p95: number | null;
  /**
   * Share of send time the browser itself attributed to CPU quality
   * limitation. Unlike the figures above — which are derived from video encode
   * and decode timers — this is the browser's own verdict on whether the
   * machine was the bottleneck, so it reflects the whole endpoint rather than
   * just our video pipeline.
   */
  cpuLimitedPct: number | null;
  sampleCount: number;
}

/** How long this client was actually reporting. */
export interface SessionSpan {
  startedAt: number | null;
  endedAt: number | null;
  /** Wall-clock span of the client's samples, in ms. */
  durationMs: number | null;
}

export interface SessionSummary {
  latency: LatencySummary;
  issues: IssueSummary;
  transmission: TransmissionSummary;
  cpu: CpuSummary;
  span: SessionSpan;
  /**
   * How much of the session the client's tab spent in the background.
   *
   * It belongs beside the other four because it qualifies all of them: a
   * browser throttles a backgrounded tab, so frame rate, CPU and bitrate
   * readings from those stretches describe the browser's power saving rather
   * than the call. `reported` is false for a client that does not send
   * `TAB_VISIBILITY_CHANGED` — absent, never assumed to mean "always visible".
   */
  visibility: TabVisibility;
}

/* ── builder ───────────────────────────────────────────── */

function tsOf(t: Date | number | undefined): number {
  if (t == null) return 0;
  return t instanceof Date ? t.getTime() : t;
}

/**
 * Sum of (last − first) per stream, for a cumulative counter.
 *
 * Typed loosely on purpose: the same walk serves `bytesSent` on outbound
 * series and `bytesReceived` on inbound ones, which are different value types.
 */
function counterDelta(
  seriesList: Array<{ values?: Array<{ timestamp: Date | number }> }>,
  field: string,
  warmupEnd: number,
): number | null {
  let total = 0;
  let seen = false;
  for (const series of seriesList) {
    const vals = (series.values ?? []).filter((v) => tsOf(v.timestamp) >= warmupEnd);
    if (vals.length < 2) continue;
    const first = (vals[0] as Record<string, unknown>)[field];
    const last = (vals[vals.length - 1] as Record<string, unknown>)[field];
    if (typeof first !== 'number' || typeof last !== 'number') continue;
    const delta = last - first;
    if (delta < 0) continue; // counter reset — not a negative transfer
    total += delta;
    seen = true;
  }
  return seen ? total : null;
}

export interface BuildSessionSummaryOptions {
  /**
   * Ignore samples before this timestamp. Startup ramp distorts every one of
   * these figures, so the caller passes the same warm-up boundary it uses
   * elsewhere.
   */
  warmupEnd?: number;
}

export function buildSessionSummary(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  samples: ClientSample[] | null | undefined,
  options: BuildSessionSummaryOptions = {},
): SessionSummary {
  const warmupEnd = options.warmupEnd ?? 0;
  const ts = processedStats?.timeSeries;

  /* latency */
  const rtt: number[] = [];
  for (const series of Object.values(ts?.candidatePairs ?? {})) {
    for (const v of series.values ?? []) {
      if (tsOf(v.timestamp) < warmupEnd) continue;
      if ((v.currentRoundTripTime ?? 0) > 0) rtt.push(v.currentRoundTripTime! * 1000);
    }
  }

  /* issues */
  const counts: Record<IssueCategory, number> = { audio: 0, video: 0, network: 0, other: 0 };
  const types: Record<IssueCategory, Set<string>> = {
    audio: new Set(),
    video: new Set(),
    network: new Set(),
    other: new Set(),
  };
  for (const sample of samples ?? []) {
    for (const issue of sample.clientIssues ?? []) {
      if (!issue?.type) continue;
      // A raise and its resolution describe one issue; count the raise only.
      if (isResolvedIssueType(issue.type)) continue;
      const category = classifyIssue(issue.type);
      counts[category] += 1;
      types[category].add(baseIssueType(issue.type));
    }
  }

  /* transmission */
  const outboundSeries = Object.values(ts?.outboundRtp ?? {});
  const inboundSeries = Object.values(ts?.inboundRtp ?? {});

  const inboundKbps: number[] = [];
  const outboundKbps: number[] = [];
  let packetsLost = 0;
  let packetsReceived = 0;

  for (const series of outboundSeries) {
    for (const v of series.values ?? []) {
      if (tsOf(v.timestamp) < warmupEnd) continue;
      if (v._actualBitrateKbps != null) outboundKbps.push(v._actualBitrateKbps);
    }
  }
  for (const series of inboundSeries) {
    const vals = (series.values ?? []).filter((v) => tsOf(v.timestamp) >= warmupEnd);
    for (const v of vals) {
      if (v._actualBitrateKbps != null) inboundKbps.push(v._actualBitrateKbps);
    }
    if (vals.length >= 2) {
      const first = vals[0];
      const last = vals[vals.length - 1];
      const lost = (last.packetsLost ?? 0) - (first.packetsLost ?? 0);
      const recv = (last.packetsReceived ?? 0) - (first.packetsReceived ?? 0);
      if (lost > 0) packetsLost += lost;
      if (recv > 0) packetsReceived += recv;
    }
  }

  /* cpu */
  const cpuTotals: number[] = [];
  const cpuByTs = new Map<number, number>();
  for (const series of outboundSeries) {
    if (series.kind !== 'video') continue;
    for (const v of series.values ?? []) {
      const t = tsOf(v.timestamp);
      if (t < warmupEnd || v.encodeCpuPercent == null) continue;
      cpuByTs.set(t, (cpuByTs.get(t) ?? 0) + v.encodeCpuPercent);
    }
  }
  for (const series of inboundSeries) {
    if (series.kind !== 'video') continue;
    for (const v of series.values ?? []) {
      const t = tsOf(v.timestamp);
      if (t < warmupEnd || v.decodeCpuPercent == null) continue;
      cpuByTs.set(t, (cpuByTs.get(t) ?? 0) + v.decodeCpuPercent);
    }
  }
  cpuTotals.push(...cpuByTs.values());

  const qlCpu: number[] = [];
  for (const series of outboundSeries) {
    for (const v of series.values ?? []) {
      if (tsOf(v.timestamp) < warmupEnd) continue;
      if (v._qlCpuPct != null) qlCpu.push(v._qlCpuPct);
    }
  }

  /* span — measured from the samples themselves, not from any SFU record, so
     it says how long the client was reporting rather than how long the server
     believed it was present. Warm-up is deliberately not excluded here. */
  let firstSeen = Infinity;
  let lastSeen = -Infinity;
  for (const sample of samples ?? []) {
    const t = typeof sample.timestamp === 'number' ? sample.timestamp : NaN;
    if (!Number.isFinite(t)) continue;
    firstSeen = Math.min(firstSeen, t);
    lastSeen = Math.max(lastSeen, t);
  }
  if (!Number.isFinite(firstSeen)) {
    // No raw samples handed in — fall back to the processed time series.
    for (const group of [ts?.candidatePairs, ts?.outboundRtp, ts?.inboundRtp]) {
      for (const series of Object.values(group ?? {})) {
        for (const v of (series as { values?: Array<{ timestamp: Date | number }> }).values ?? []) {
          const t = tsOf(v.timestamp);
          if (!t) continue;
          firstSeen = Math.min(firstSeen, t);
          lastSeen = Math.max(lastSeen, t);
        }
      }
    }
  }
  const hasSpan = Number.isFinite(firstSeen) && Number.isFinite(lastSeen) && lastSeen >= firstSeen;

  return {
    span: {
      startedAt: hasSpan ? firstSeen : null,
      endedAt: hasSpan ? lastSeen : null,
      durationMs: hasSpan ? lastSeen - firstSeen : null,
    },
    visibility: buildTabVisibility(samples, {
      sessionStart: hasSpan ? firstSeen : undefined,
      sessionEnd: hasSpan ? lastSeen : undefined,
    }),
    latency: {
      median: percentile(rtt, 0.5),
      average: mean(rtt),
      p75: percentile(rtt, 0.75),
      p95: percentile(rtt, 0.95),
      sampleCount: rtt.length,
    },
    issues: {
      ...counts,
      total: counts.audio + counts.video + counts.network + counts.other,
      typesByCategory: {
        audio: [...types.audio].sort(),
        video: [...types.video].sort(),
        network: [...types.network].sort(),
        other: [...types.other].sort(),
      },
    },
    transmission: {
      bytesSent: counterDelta(outboundSeries, 'bytesSent', warmupEnd),
      bytesReceived: counterDelta(inboundSeries, 'bytesReceived', warmupEnd),
      packetsLost,
      lossRatePct:
        packetsReceived + packetsLost > 0
          ? (packetsLost / (packetsLost + packetsReceived)) * 100
          : null,
      avgInboundKbps: mean(inboundKbps),
      avgOutboundKbps: mean(outboundKbps),
    },
    cpu: {
      median: percentile(cpuTotals, 0.5),
      average: mean(cpuTotals),
      max: cpuTotals.length ? Math.max(...cpuTotals) : null,
      p75: percentile(cpuTotals, 0.75),
      p95: percentile(cpuTotals, 0.95),
      cpuLimitedPct: mean(qlCpu),
      sampleCount: cpuTotals.length,
    },
  };
}
