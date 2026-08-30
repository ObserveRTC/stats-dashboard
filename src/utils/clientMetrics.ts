/**
 * Deriving the call dashboard's per-client numbers from a client's
 * own stats file.
 *
 * ## Why this exists
 *
 * The Clients table and the "Quality per client" chart read
 * `callSummary.clients[clientId]` — a score, a score series, a median RTT, a
 * loss percentile. Those fields are optional, and most observers do not write
 * them: the summary carries call-level aggregates and display names, and
 * nothing per client. The result is a table of em dashes and an empty
 * chart on a call whose data is all there, one fetch away, in each
 * client's `.jsonl`.
 *
 * So the numbers are computed here from the same `processWebRTCStats` result
 * the client report page builds, which means the dashboard shows exactly
 * what that page will show rather than a second, differently-derived figure.
 *
 * ## What loading a client costs, and why it is opt-in
 *
 * A client's stats file is the largest object in the call folder and has
 * to be fetched, decompressed and processed. Doing that for every client
 * on page load would make the dashboard — whose whole point is the overview —
 * the slowest page in the app. So each row loads on request, in parallel with
 * any other, and what it loads is kept: the samples land in the pane store,
 * which is the same cache the client report reads, so opening that
 * client afterwards renders immediately with no second fetch.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from './statsTypes.ts';
import { percentile } from './sessionSummary.ts';

/** What the dashboard needs from one client's stats. */
export interface ClientMetrics {
  /** Latest quality score on the 1–5 scale, or null when none was scored. */
  score: number | null;
  /**
   * Every score sample over the session, oldest first, each with the timestamp
   * it was taken at.
   *
   * Timestamped rather than a bare array because the call dashboard plots
   * several clients on one time axis. An ordered array can only be drawn by
   * index, which stretches every client across the whole width regardless of
   * when they were in the call — so a dip on one line lands under a dip on
   * another that happened twenty minutes apart.
   */
  scoreSamples: Array<{ t: number; v: number }>;
  /** Median round-trip time over the session, in ms. */
  rttMedianMs: number | null;
  /** 95th-percentile inbound packet loss, as a percentage. */
  lossP95: number | null;
  /** True when any selected candidate pair was relayed. */
  turnConnected: boolean;
  /** Client-reported issues raised during the session (resolutions excluded). */
  issueCount: number;
  /** How many stats samples the file held. */
  sampleCount: number;
  /** Wall-clock span of the samples, epoch ms. */
  startedAt: number | null;
  endedAt: number | null;
}

function tsOf(t: Date | number | undefined): number {
  if (t == null) return 0;
  return t instanceof Date ? t.getTime() : t;
}

/**
 * The score to show for a client: the last one they were given.
 *
 * Not the mean — the table's neighbour columns (median RTT, p95 loss) are
 * session-wide, but the score column sits beside a trend sparkline whose right
 * edge is this number, and a mean there would not match the bar it points at.
 */
function latestScore(samples: Array<{ v: number }>): number | null {
  return samples.length ? samples[samples.length - 1].v : null;
}

/**
 * Inbound loss at the 95th percentile across every inbound stream's samples.
 *
 * Percentile rather than a session total because loss that matters is
 * concentrated: a call with one bad minute and nine good ones has an
 * unremarkable total and a p95 that says what happened. Samples from every
 * inbound stream go into one pool — the question is "how bad did it get for
 * this client", not "which stream".
 */
function inboundLossP95(processed: ProcessWebRTCStatsResult): number | null {
  const values: number[] = [];
  for (const series of Object.values(processed.timeSeries?.inboundRtp ?? {})) {
    for (const v of series.values ?? []) {
      const pct = (v as { _packetLossRatePct?: number })._packetLossRatePct;
      if (typeof pct === 'number' && Number.isFinite(pct)) values.push(pct);
    }
  }
  return percentile(values, 0.95);
}

/**
 * Median RTT over every selected candidate pair.
 *
 * Median, not mean: RTT samples carry occasional wild outliers (a STUN
 * response that waited behind a retransmission) and one of them can move a
 * mean by tens of milliseconds while the path never changed.
 */
function medianRtt(processed: ProcessWebRTCStatsResult): number | null {
  const values: number[] = [];
  for (const series of Object.values(processed.timeSeries?.candidatePairs ?? {})) {
    for (const v of series.values ?? []) {
      const rtt = (v as { currentRoundTripTime?: number }).currentRoundTripTime;
      if (typeof rtt === 'number' && rtt > 0) values.push(rtt * 1000);
    }
  }
  return percentile(values, 0.5);
}

/**
 * Whether media was relayed.
 *
 * `relayProtocol` is set by the browser only on a relayed candidate, so its
 * presence anywhere in the session is the whole test. Asked over the session
 * rather than at the end, because a call that started relayed and later found
 * a direct path still used TURN.
 */
function usedTurn(processed: ProcessWebRTCStatsResult): boolean {
  for (const series of Object.values(processed.timeSeries?.iceSelectedPair ?? {})) {
    for (const v of series.values ?? []) {
      if (v.relayProtocol) return true;
      if (v.state === 'relay') return true;
      if (v.localCandidateType === 'relay') return true;
    }
  }
  return false;
}

/** Issues raised, not counting the `-resolved` half of each episode. */
function issueCount(samples: ClientSample[] | null | undefined): number {
  let count = 0;
  for (const sample of samples ?? []) {
    for (const issue of sample.clientIssues ?? []) {
      if (!issue?.type) continue;
      if (issue.type.endsWith('-resolved')) continue;
      count += 1;
    }
  }
  return count;
}

/**
 * Everything the dashboard shows for one client, from their own stats.
 *
 * Every field is independently optional: a client that never scored still
 * reports its RTT, and one with no candidate pair still reports its score. A
 * missing measurement is null, never zero — the table renders an em dash for
 * null, and a zero there would read as "measured, and it was zero".
 */
export function buildClientMetrics(
  processed: ProcessWebRTCStatsResult | null | undefined,
  samples: ClientSample[] | null | undefined,
): ClientMetrics {
  const scoreSamples = (processed?.scores?.session ?? [])
    .map((s) => ({ t: tsOf(s.timestamp), v: s.score }))
    .filter((s) => typeof s.v === 'number' && Number.isFinite(s.v) && s.t > 0);

  const timestamps = scoreSamples.map((s) => s.t);

  return {
    score: latestScore(scoreSamples),
    scoreSamples,
    rttMedianMs: processed ? medianRtt(processed) : null,
    lossP95: processed ? inboundLossP95(processed) : null,
    turnConnected: processed ? usedTurn(processed) : false,
    issueCount: issueCount(samples),
    sampleCount: samples?.length ?? 0,
    startedAt: timestamps.length ? Math.min(...timestamps) : null,
    endedAt: timestamps.length ? Math.max(...timestamps) : null,
  };
}
