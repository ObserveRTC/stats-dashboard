/**
 * Pure view-model builder for the call quality dashboard — no React, no store
 * access.
 *
 * Inputs are the three things the call route already loads:
 *   - callSession:   client list with joined/left times
 *   - callSummary:   server-side summary; optionally carries per-client
 *                    quality metrics and SFU/pipe topology
 *   - routerSamples: mediasoup router snapshots
 *
 * Per-client quality (score, RTT, loss, trend) comes from the summary.
 * When the summary predates those fields the client rows still render,
 * with em dashes in place of the missing numbers — the topology, router
 * counts and diagnostics do not depend on them.
 */

import type { CallSession, CallSummary, MediasoupRouterSample } from '../api/types.ts';
import type { CallSummaryPipeLink } from '../schema/CallSummary.ts';
import type { MediasoupTransportSample } from '../schema/MediasoupRouter.ts';
import type { ClientLoadEntry } from '../stores/clientLoadStore.ts';
import { CLIENT_LANE_COLORS } from '../constants.ts';

/* ── quality scale ─────────────────────────────────────── */

/** Thresholds match the design: ≥4 good, ≥2.5 fair, below that poor. */
export function qualityColor(score: number): string {
  if (score >= 4) return 'var(--quality-good)';
  if (score >= 2.5) return 'var(--quality-fair)';
  return 'var(--quality-poor)';
}

/** A quality sample at or below this counts as an "issue". */
export const POOR_SCORE_THRESHOLD = 2.5;

/** Per-client line colours, alternating the accent and neutral ramps. */
/**
 * Per-client line and swatch colours, assigned by join order.
 *
 * This used to alternate the theme's accent and neutral ramps, which put two
 * greys and four shades of one accent on the same axis — with more than three
 * clients the lines were not distinguishable, which is most of what a
 * per-client chart is for. `CLIENT_LANE_COLORS` is ten distinct hues instead,
 * and the same index is used for the chart line, the legend swatch and the
 * table row, so one client reads as one colour across the whole page.
 *
 * Fixed hues rather than theme tokens on purpose: these are identities, not
 * semantics, and they have to stay apart from each other in both themes.
 */
const CLIENT_COLORS = CLIENT_LANE_COLORS;

/* ── exported types ────────────────────────────────────── */

export interface TrendBar {
  /** CSS height, e.g. `13px` */
  h: string;
  color: string;
}

export interface DashboardClient {
  clientId: string;
  name: string;
  color: string;
  /** null when the summary carries no quality metrics for this client */
  score: number | null;
  scoreDisplay: string;
  scoreColor: string;
  rttDisplay: string;
  lossDisplay: string;
  trendBars: TrendBar[];
  /** Quality samples in order, for the row's trend sparkline. */
  series: number[];
  /** The same samples placed in time, for the per-client chart. */
  scorePoints: ScorePoint[];
  /** True when `scorePoints` were spread over the window rather than measured. */
  approximateTiming: boolean;
  /** When this client was in the call, epoch ms; null when unknown. */
  joined: number | null;
  left: number | null;
  turnConnected: boolean;
  rejoins: number;
  /**
   * How this row's numbers were obtained — `summary` when the call summary
   * supplied them, `loaded` when the client's own stats were fetched from
   * this page, `none` when neither. The row shows the Load button only while
   * there is something loading would add.
   */
  source: 'summary' | 'loaded' | 'none';
  /** Load state of this client's stats file, for the row's button. */
  loadStatus: 'idle' | 'loading' | 'loaded' | 'error' | 'empty';
  loadError?: string;
  /** Client-reported issues, once the client has been loaded. */
  issueCount: number | null;
}

export interface StatCard {
  key: string;
  label: string;
  value: string;
  unit: string;
  color: string;
  /** Hover explanation, shown on the little `i` marker. */
  info: string;
  /**
   * Help topic id for the card's info icon.
   *
   * Separate from `info` because they answer different questions: `info` is the
   * card-specific detail this build computed (which fallback produced the
   * number, whether a peak is a lower bound), the topic is the standing
   * explanation of what the measure is and how to read it.
   */
  help?: string;
}

/** One quality reading, placed in time. */
export interface ScorePoint {
  /** Epoch ms. */
  t: number;
  /** Score on the 0-5 scale. */
  v: number;
}

export interface QualitySeries {
  clientId: string;
  label: string;
  color: string;
  points: ScorePoint[];
  /**
   * True when the timestamps were spread evenly across the client's session
   * rather than measured.
   *
   * A call summary carries `scoreSeries` as a bare ordered array with no
   * timestamps, so the only honest thing to do with it is distribute it across
   * the window the client was actually in the call. The shape of the line is
   * real; where its wiggles sit on the x axis is not, and the legend says so
   * rather than letting someone line a dip up against an event on another
   * client's line. A loaded client has real timestamps and this is false.
   */
  approximateTiming: boolean;
}

/**
 * The quality chart as data, with no pixels in it.
 *
 * Layout used to happen here, against a fixed 640x150 box, which is why the
 * chart sat letterboxed in the middle of a full-width card. The component
 * measures its own container now and scales the plot to it, so this carries
 * only the domain and the series.
 */
export interface QualityChartData {
  series: QualitySeries[];
  /** Time domain of the x axis, epoch ms. */
  xStart: number;
  xEnd: number;
  /** true when no client had a usable quality series */
  empty: boolean;
}

export interface RouterBox {
  routerId: string;
  sfuId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  transportsTotal: number;
  producersTotal: number;
  consumersTotal: number;
}

export interface SfuLabel {
  sfuId: string;
  region: string;
  x: number;
  y: number;
}

export interface PipeLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  /** Where the little entry dot sits along the line. */
  entryX: number;
  entryY: number;
  countLabel: string;
  tooltip: string;
}

export interface SfuTopology {
  width: number;
  height: number;
  boxes: RouterBox[];
  labels: SfuLabel[];
  pipes: PipeLine[];
}

export interface RouterRow {
  routerId: string;
  sfuId: string;
  transportsTotal: number;
  producersTotal: number;
  consumersTotal: number;
}

/** One labelled fact about the call, for the details card. */
export interface CallFact {
  key: string;
  label: string;
  value: string;
  /** Longer explanation, shown on hover. */
  info?: string;
  /** Set when the value is a warning rather than a plain reading. */
  tone?: 'warn';
}

export interface CallFactGroup {
  key: string;
  title: string;
  facts: CallFact[];
}

export interface DashboardModel {
  callStart: number;
  callEnd: number;
  durationLabel: string;
  startLabel: string;
  endLabel: string;
  clientCount: number;
  hasQualityMetrics: boolean;
  statCards: StatCard[];
  /** Everything the call summary states that the headline cards do not. */
  factGroups: CallFactGroup[];
  clients: DashboardClient[];
  qualityChart: QualityChartData;
  topology: SfuTopology;
  routerRows: RouterRow[];
}

/* ── helpers ───────────────────────────────────────────── */

const DASH = '—';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** `hh:mm` in the viewer's locale — the chart axis only needs the time of day. */
function clockLabel(ts: number): string {
  if (!Number.isFinite(ts)) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function compactDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return DASH;
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

/**
 * The SFU a router belongs to, read from the router's own attachments.
 *
 * `sfuId` is what the observer writes now that a call can span SFUs; `sfu` is
 * accepted alongside it, matching `routerServerData.buildRouterIndex`, so the
 * topology view and the router↔client mapping never disagree about which SFU a
 * router is on. Region, then a stem of the router id, are the fallbacks — the
 * last one groups nothing, but it labels the box honestly rather than pooling
 * unrelated routers under one invented SFU.
 */
function routerSfuId(sample: MediasoupRouterSample | undefined, routerId: string): string {
  const att = sample?.attachments as Record<string, unknown> | undefined;
  if (att && typeof att.sfuId === 'string' && att.sfuId) return att.sfuId;
  if (att && typeof att.sfu === 'string' && att.sfu) return att.sfu;
  if (att && typeof att.region === 'string' && att.region) return att.region;
  return `sfu-${routerId.slice(0, 6)}`;
}

function routerRegion(sample: MediasoupRouterSample | undefined): string {
  const att = sample?.attachments as Record<string, unknown> | undefined;
  if (att && typeof att.region === 'string' && att.region) return att.region;
  return '';
}

function tupleKey(t: { localAddress?: string; localPort?: number } | undefined): string | null {
  if (!t || !t.localAddress || t.localPort == null) return null;
  return `${t.localAddress}:${t.localPort}`;
}

function remoteKey(t: { remoteIp?: string; remotePort?: number } | undefined): string | null {
  if (!t || !t.remoteIp || t.remotePort == null) return null;
  return `${t.remoteIp}:${t.remotePort}`;
}

/**
 * Pair up pipe transports across routers when the summary does not list the
 * links explicitly: two pipe transports form a link when each one's remote
 * tuple is the other's local tuple.
 */
export function derivePipeLinks(
  routerSamples: Map<string, MediasoupRouterSample>,
): CallSummaryPipeLink[] {
  type PipeEnd = { routerId: string; local: string; remote: string };
  const ends: PipeEnd[] = [];

  for (const [routerId, sample] of routerSamples) {
    for (const t of (sample.transports ?? []) as MediasoupTransportSample[]) {
      if (t.type !== 'pipe') continue;
      const local = tupleKey(t.tuple);
      const remote = remoteKey(t.tuple);
      if (local && remote) ends.push({ routerId, local, remote });
    }
  }

  const byLocal = new Map<string, PipeEnd>();
  for (const e of ends) byLocal.set(e.local, e);

  const links = new Map<string, CallSummaryPipeLink>();
  for (const e of ends) {
    const peer = byLocal.get(e.remote);
    if (!peer || peer.routerId === e.routerId) continue;
    // Canonical key so A→B and B→A collapse into one link.
    const [a, b] = [e.routerId, peer.routerId].sort();
    const key = `${a}|${b}`;
    const existing = links.get(key);
    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
    } else {
      links.set(key, {
        fromRouterId: a,
        toRouterId: b,
        count: 1,
        localAddress: e.local,
        remoteAddress: e.remote,
      });
    }
  }

  // Each pair was counted from both ends; halve back to transport pairs.
  for (const link of links.values()) {
    link.count = Math.max(1, Math.round((link.count ?? 2) / 2));
  }

  return Array.from(links.values());
}

/* ── topology layout ───────────────────────────────────── */

const BOX_W = 190;
const BOX_H = 96;
const GAP_X = 56;
const GAP_Y = 46;
const LABEL_H = 26;
const PAD = 16;

function buildTopology(
  routerSamples: Map<string, MediasoupRouterSample>,
  summary: CallSummary | null,
): { topology: SfuTopology; routerRows: RouterRow[] } {
  // Group routers by SFU: prefer the summary's explicit topology, else read
  // each router's attachments.
  const groups = new Map<string, { region: string; routerIds: string[] }>();

  if (summary?.sfus?.length) {
    for (const sfu of summary.sfus) {
      groups.set(sfu.sfuId, {
        region: sfu.region ?? '',
        routerIds: sfu.routerIds.filter((rid) => routerSamples.has(rid)),
      });
    }
  }

  for (const [routerId, sample] of routerSamples) {
    const alreadyPlaced = Array.from(groups.values()).some((g) => g.routerIds.includes(routerId));
    if (alreadyPlaced) continue;
    const sfuId = routerSfuId(sample, routerId);
    const group = groups.get(sfuId);
    if (group) group.routerIds.push(routerId);
    else groups.set(sfuId, { region: routerRegion(sample), routerIds: [routerId] });
  }

  const boxes: RouterBox[] = [];
  const labels: SfuLabel[] = [];
  const routerRows: RouterRow[] = [];
  const boxById = new Map<string, RouterBox>();
  let maxCols = 0;
  let rowIndex = 0;

  for (const [sfuId, group] of groups) {
    if (group.routerIds.length === 0) continue;
    const rowY = PAD + rowIndex * (BOX_H + GAP_Y + LABEL_H);
    labels.push({ sfuId, region: group.region, x: PAD, y: rowY });

    group.routerIds.forEach((routerId, col) => {
      const sample = routerSamples.get(routerId);
      const x = PAD + col * (BOX_W + GAP_X);
      const y = rowY + LABEL_H;
      const box: RouterBox = {
        routerId,
        sfuId,
        x,
        y,
        w: BOX_W,
        h: BOX_H,
        cx: x + BOX_W / 2,
        cy: y + BOX_H / 2,
        transportsTotal: sample?.transports?.length ?? 0,
        producersTotal: sample?.producers?.length ?? 0,
        consumersTotal: sample?.consumers?.length ?? 0,
      };
      boxes.push(box);
      boxById.set(routerId, box);
      routerRows.push({
        routerId,
        sfuId,
        transportsTotal: box.transportsTotal,
        producersTotal: box.producersTotal,
        consumersTotal: box.consumersTotal,
      });
      maxCols = Math.max(maxCols, col + 1);
    });

    rowIndex += 1;
  }

  const links = summary?.pipeLinks?.length ? summary.pipeLinks : derivePipeLinks(routerSamples);
  const pipes: PipeLine[] = [];

  for (const link of links) {
    const a = boxById.get(link.fromRouterId);
    const b = boxById.get(link.toRouterId);
    if (!a || !b) continue;
    const t = 0.82; // the entry dot sits near the receiving end
    const count = link.count ?? 1;
    const tooltipLines = ['Pipe transport'];
    if (link.localAddress) tooltipLines.push(`Local: ${link.localAddress}`);
    if (link.remoteAddress) tooltipLines.push(`Remote: ${link.remoteAddress}`);
    pipes.push({
      x1: a.cx,
      y1: a.cy,
      x2: b.cx,
      y2: b.cy,
      midX: (a.cx + b.cx) / 2,
      midY: (a.cy + b.cy) / 2,
      entryX: a.cx + (b.cx - a.cx) * t,
      entryY: a.cy + (b.cy - a.cy) * t,
      countLabel: `${count} pipe${count === 1 ? '' : 's'}`,
      tooltip: tooltipLines.join('\n'),
    });
  }

  const width = rowIndex === 0 ? 0 : PAD * 2 + maxCols * (BOX_W + GAP_X) - GAP_X;
  const height = rowIndex === 0 ? 0 : PAD * 2 + rowIndex * (BOX_H + GAP_Y + LABEL_H) - GAP_Y;

  return { topology: { width, height, boxes, labels, pipes }, routerRows };
}

/* ── quality chart ─────────────────────────────────────── */

/**
 * Spread an untimed score series across a window.
 *
 * The summary's `scoreSeries` is an ordered array and nothing more. Plotting it
 * by index — which is what the chart did — put every client's first sample on
 * the left edge and their last on the right, so a client who joined at minute
 * nine drew across the whole call and lined up against people who were never
 * on at the same time. Spreading across the client's own window is still an
 * approximation, but it is one that puts the line where the client was.
 */
export function spreadOverWindow(values: number[], from: number, to: number): ScorePoint[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ t: from, v: values[0] }];
  const span = Math.max(0, to - from);
  return values.map((v, i) => ({ t: from + (i / (values.length - 1)) * span, v }));
}

function buildQualityChart(
  clients: DashboardClient[],
  callStart: number,
  callEnd: number,
): QualityChartData {
  const series: QualitySeries[] = clients
    .filter((c) => c.scorePoints.length > 1)
    .map((c) => ({
      clientId: c.clientId,
      label: c.name,
      color: c.color,
      points: c.scorePoints,
      approximateTiming: c.approximateTiming,
    }));

  // The domain is the call, not the union of the lines: a client who was only
  // there for the last two minutes should draw in the last two minutes of the
  // axis, which only happens if the axis is the call's. Points outside it
  // widen it rather than being clipped away.
  let xStart = callStart;
  let xEnd = callEnd;
  for (const line of series) {
    for (const point of line.points) {
      if (point.t < xStart) xStart = point.t;
      if (point.t > xEnd) xEnd = point.t;
    }
  }
  if (!(xEnd > xStart)) xEnd = xStart + 1;

  return { series, xStart, xEnd, empty: series.length === 0 };
}

/* ── clients ──────────────────────────────────────── */

/** Last six samples of a series, as the little bar sparkline in the table. */
function trendBars(series: number[]): TrendBar[] {
  return series.slice(-6).map((v) => ({
    h: `${clamp(v, 0, 5) * 3 + 4}px`,
    color: qualityColor(v),
  }));
}

/**
 * Per-client rows, from the summary and from whatever has been loaded.
 *
 * Two sources can supply the same numbers and they are not equal. The summary
 * is the observer's own account, written once at the end of the call; a loaded
 * client is that client's stats file, processed here by exactly the
 * code the report page runs. Where both have a value the loaded one wins,
 * because it is what the viewer will see when they click through, and a
 * dashboard that disagrees with the page it links to is worse than one that
 * says nothing.
 *
 * Field by field, though — not row by row. A summary that carries a score and
 * no RTT, met with a load that measured RTT and never scored, yields a row
 * with both, rather than one that discards a real number to keep a single
 * source.
 */
function buildClients(
  callSession: CallSession,
  summary: CallSummary | null,
  loaded: Map<string, ClientLoadEntry>,
  callStart: number,
  callEnd: number,
): DashboardClient[] {
  const labels = callSession._clientLabelMap;
  const usedTurn = new Set(summary?.clientsUsedTurn ?? []);

  return Array.from(callSession.clientSessions.entries())
    .sort((a, b) => (a[1].joined ?? 0) - (b[1].joined ?? 0))
    .map(([clientId, session], idx) => {
      const metrics = summary?.clients?.[clientId];
      const entry = loaded.get(clientId);
      const live = entry?.status === 'loaded' ? entry.metrics : undefined;

      const summarySeries = metrics?.scoreSeries ?? [];
      // A loaded client brings its own timestamps; a summary series has none,
      // so it is spread across the window the client was actually in the call.
      const measured = live?.scoreSamples ?? [];
      const joined = session.joined ?? null;
      const left = session.left ?? null;
      const scorePoints = measured.length
        ? measured
        : spreadOverWindow(summarySeries, joined ?? callStart, left ?? callEnd);
      const series = scorePoints.map((point) => point.v);
      const score =
        live?.score ?? metrics?.score ?? (series.length ? series[series.length - 1] : null);
      const rtt = live?.rttMedianMs ?? metrics?.rttMedianMs ?? null;
      const loss = live?.lossP95 ?? metrics?.lossP95 ?? null;

      const hasSummaryNumbers =
        metrics?.score != null ||
        summarySeries.length > 0 ||
        metrics?.rttMedianMs != null ||
        metrics?.lossP95 != null;

      return {
        clientId,
        name: labels?.get(clientId) ?? session.displayName ?? clientId,
        color: CLIENT_COLORS[idx % CLIENT_COLORS.length],
        score,
        scoreDisplay: score == null ? DASH : `${score.toFixed(1)}/5`,
        scoreColor: score == null ? 'var(--text-muted)' : qualityColor(score),
        rttDisplay: rtt == null ? DASH : `${Math.round(rtt)} ms`,
        lossDisplay: loss == null ? DASH : `${loss.toFixed(1)}%`,
        trendBars: trendBars(series),
        series,
        scorePoints,
        approximateTiming: measured.length === 0 && summarySeries.length > 0,
        joined,
        left,
        // The summary's TURN list is call-level and names clients directly, so
        // it counts even for a client whose own metrics are absent.
        turnConnected: live?.turnConnected ?? metrics?.turnConnected ?? usedTurn.has(clientId),
        rejoins: metrics?.rejoins ?? 0,
        source: live ? 'loaded' : hasSummaryNumbers ? 'summary' : 'none',
        loadStatus: entry?.status ?? 'idle',
        loadError: entry?.error,
        issueCount: live?.issueCount ?? null,
      };
    });
}

/* ── stat cards ────────────────────────────────────────── */

/**
 * Stat cards, preferring what the summary states outright over what can be
 * derived from per-client metrics.
 *
 * The call summary carries call-level aggregates — a median quality score, an
 * issue count, the list of clients that used TURN — while per-client score
 * series are optional and often absent. Reading the aggregates first is what
 * turns a row of em dashes into real numbers.
 *
 * A call spread across SFUs has one summary per SFU, merged into one before it
 * reaches here (`schema/CallSummary.ts`). Two aggregates do not survive that
 * merge intact and are handled below: the median is gone, so the weighted mean
 * stands in for it, and the peak is a lower bound, so the card says "at least".
 */
function buildStatCards(
  clients: DashboardClient[],
  hasQualityMetrics: boolean,
  summary: CallSummary | null,
  durationMs: number,
  durationIsReported: boolean,
): StatCard[] {
  const scored = clients.filter((p) => p.score != null);
  const perClientAvg = scored.length
    ? scored.reduce((a, p) => a + (p.score as number), 0) / scored.length
    : null;
  // Fall back to the call-wide median when no client carries a score.
  // A merged summary drops `median` — a median of medians is not a median — but
  // keeps a samples-weighted `mean`, which is the honest call-wide figure when
  // no client carries a score of its own.
  const summaryMedian = typeof summary?.scores?.median === 'number' ? summary.scores.median : null;
  const summaryMean = typeof summary?.scores?.mean === 'number' ? summary.scores.mean : null;
  const avgScore = perClientAvg ?? summaryMedian ?? summaryMean;
  const avgIsMedian = perClientAvg == null && summaryMedian != null;

  const derivedIssues = clients.reduce(
    (a, p) => a + p.series.filter((v) => v < POOR_SCORE_THRESHOLD).length,
    0,
  );
  const summaryIssues =
    typeof summary?.numberOfClientIssues === 'number' ? summary.numberOfClientIssues : null;
  const issues = summaryIssues ?? (hasQualityMetrics ? derivedIssues : null);

  const summaryTurn = summary?.clientsUsedTurn?.length;
  const turnConnected =
    summaryTurn != null ? summaryTurn : hasQualityMetrics ? clients.filter((p) => p.turnConnected).length : null;

  const rejoins = clients.reduce((a, p) => a + p.rejoins, 0);

  // A merged summary reports the largest single-SFU peak, which is a lower
  // bound on the call's peak rather than the peak itself — two SFUs peaking at
  // different moments do not add up. `unmergeable` names it when that happened,
  // and the card says "at least" instead of stating a number it cannot know.
  const peak = summary?.clientCounts?.peak;
  const peakIsLowerBound = summary?.unmergeable?.includes('clientCounts.peak') ?? false;

  // The client map is a true union across SFUs; `joined` counts events, and a
  // client that used two SFUs is counted on each. So the map wins.
  const summaryClientCount = Object.keys(summary?.clients ?? {}).length;
  const clientValue =
    clients.length || summaryClientCount || summary?.clientCounts?.joined || 0;

  const scoreRange =
    summary?.scores && summary.scores.min != null && summary.scores.max != null
      ? ` Range over the call: ${summary.scores.min.toFixed(1)}–${summary.scores.max.toFixed(1)}${
          summary.scores.samples != null ? ` across ${summary.scores.samples} samples` : ''
        }.`
      : '';

  return [
    {
      key: 'duration',
      help: 'call/duration',
      label: 'Duration',
      value: compactDuration(durationMs),
      unit: '',
      color: 'var(--color-text)',
      info: durationIsReported
        ? 'Call duration as the observer recorded it, which can differ from the span of the samples if the record was closed later.'
        : 'Span between the first and last activity seen for this call. The summary did not state a duration, so this is derived.',
    },
    {
      key: 'clients',
      help: 'call/clients',
      label: 'Clients',
      value: String(clientValue),
      unit:
        peak != null && peak !== clientValue
          ? `(peak ${peakIsLowerBound ? '≥' : ''}${peak})`
          : '',
      color: 'var(--color-text)',
      info:
        peak == null
          ? 'Number of clients that joined this call.'
          : peakIsLowerBound
            ? `Clients that joined this call. At least ${peak} were present at the same time — this call spanned several SFUs, and their peaks cannot be added together.`
            : `Clients that joined this call. At most ${peak} were present at the same time.`,
    },
    {
      key: 'avg-quality',
      help: 'call/avg-quality',
      label: avgIsMedian ? 'Median quality' : 'Avg quality',
      value: avgScore == null ? DASH : avgScore.toFixed(1),
      unit: avgScore == null ? '' : '/5',
      color: avgScore == null ? 'var(--text-muted)' : qualityColor(avgScore),
      info:
        (avgIsMedian
          ? 'Median quality score across the whole call (1–5), where 5 is excellent and 1 is poor.'
          : "Mean of each client's most recent quality score (1–5), where 5 is excellent and 1 is poor.") +
        scoreRange,
    },
    {
      key: 'turn',
      help: 'call/turn-users',
      label: 'TURN-connected users',
      value: turnConnected == null ? DASH : String(turnConnected),
      unit: '',
      color: turnConnected == null ? 'var(--text-muted)' : 'var(--color-text)',
      info: 'Clients whose media connection is relayed through a TURN server, typically because a direct peer connection could not be established.',
    },
    {
      key: 'issues',
      help: 'call/issues',
      label: 'Number of issues',
      value: issues == null ? DASH : String(issues),
      unit: '',
      color:
        issues == null
          ? 'var(--text-muted)'
          : issues > 0
            ? 'var(--quality-fair)'
            : 'var(--quality-good)',
      info:
        summaryIssues != null
          ? 'Client-reported issues recorded across all clients during this call.'
          : 'Count of quality samples across all clients that fell into the poor range (below 2.5/5) during this call.',
    },
    {
      key: 'rejoins',
      help: 'call/rejoins',
      label: 'Client rejoins',
      value: hasQualityMetrics ? String(rejoins) : DASH,
      unit: '',
      color: hasQualityMetrics ? 'var(--color-text)' : 'var(--text-muted)',
      info: 'Number of times a client left and reconnected to this call.',
    },
  ];
}

/* ── call facts ────────────────────────────────────────── */

/** `hh:mm:ss` on the given day, for a precise timestamp. */
function stampLabel(ts: number | undefined): string | null {
  if (ts == null || !Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts).toLocaleString();
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Everything the call summary states that the five headline cards do not.
 *
 * The summary carries a good deal more than the dashboard used to show — when
 * the call started and ended and how long the observer says it ran, the score
 * range and how many samples produced it, how many clients joined and how many
 * left, which of them used TURN, how many issues were recorded, and, for a
 * call that spanned SFUs, which summaries were merged to produce this one and
 * what was lost in the merge. None of that belongs in a headline number, and
 * all of it is what someone opening an unfamiliar call wants first.
 *
 * Facts are only emitted when the summary actually says them. A group with
 * nothing in it is dropped rather than rendered as a row of em dashes: an
 * absent field is the summary not carrying it, and inventing a placeholder for
 * every optional field would bury the ones that are real.
 */
function buildCallFacts(
  summary: CallSummary | null,
  callStart: number,
  callEnd: number,
  durationMs: number,
  durationIsReported: boolean,
  routerCount: number,
  clients: DashboardClient[],
): CallFactGroup[] {
  const groups: CallFactGroup[] = [];

  /* when */
  const when: CallFact[] = [];
  const startLabel = stampLabel(summary?.startedAt ?? callStart);
  const endLabel = stampLabel(summary?.endedAt ?? callEnd);
  if (startLabel) {
    when.push({
      key: 'started',
      label: 'Started',
      value: startLabel,
      info: summary?.startedAt != null ? 'From the call summary.' : 'Earliest activity seen for this call.',
    });
  }
  if (endLabel) {
    when.push({
      key: 'ended',
      label: 'Ended',
      value: endLabel,
      info: summary?.endedAt != null ? 'From the call summary.' : 'Latest activity seen for this call.',
    });
  }
  if (durationMs > 0) {
    when.push({
      key: 'duration',
      label: 'Duration',
      value: compactDuration(durationMs),
      info: durationIsReported
        ? 'Reported by the observer.'
        : 'Derived from the call span; the summary did not state a duration.',
    });
  }
  // The record usually closes after the last client leaves. A large gap
  // is worth seeing: it means the call was held open with nobody in it.
  if (summary?.closedAt != null && summary.endedAt != null && summary.closedAt > summary.endedAt) {
    when.push({
      key: 'closed',
      label: 'Record closed',
      value: `${compactDuration(summary.closedAt - summary.endedAt)} after the call ended`,
      info: `The call record was closed at ${stampLabel(summary.closedAt) ?? 'an unknown time'}, after the last activity.`,
    });
  }
  if (when.length) groups.push({ key: 'when', title: 'When', facts: when });

  /* who */
  const who: CallFact[] = [];
  const counts = summary?.clientCounts;
  if (counts?.joined != null) {
    who.push({ key: 'joined', label: 'Joined', value: String(counts.joined), info: 'Join events recorded during the call.' });
  }
  if (counts?.left != null) {
    who.push({
      key: 'left',
      label: 'Left',
      value: String(counts.left),
      info:
        counts.joined != null && counts.left < counts.joined
          ? 'Fewer than joined — some clients were still connected when the record closed.'
          : 'Leave events recorded during the call.',
    });
  }
  if (counts?.peak != null) {
    const lowerBound = summary?.unmergeable?.includes('clientCounts.peak') ?? false;
    who.push({
      key: 'peak',
      label: 'Peak concurrent',
      value: `${lowerBound ? '≥' : ''}${counts.peak}`,
      info: lowerBound
        ? 'The largest peak any single SFU reported. This call spanned several SFUs and their peaks cannot be added, so the true peak is at least this.'
        : 'Most clients present at the same moment.',
    });
  }
  const turnList = summary?.clientsUsedTurn ?? [];
  if (turnList.length) {
    const names = turnList.map((id) => clients.find((p) => p.clientId === id)?.name ?? id);
    who.push({
      key: 'turn',
      label: 'Used TURN',
      value: names.join(', '),
      info: 'Clients whose media was relayed through a TURN server rather than sent directly.',
    });
  }
  if (who.length) groups.push({ key: 'who', title: 'Clients', facts: who });

  /* quality */
  const quality: CallFact[] = [];
  const scores = summary?.scores;
  if (scores?.min != null && scores.max != null) {
    quality.push({
      key: 'range',
      label: 'Score range',
      value: `${scores.min.toFixed(1)} – ${scores.max.toFixed(1)}`,
      info: 'Lowest and highest quality score recorded anywhere in the call, on the 1–5 scale.',
    });
  }
  if (scores?.median != null) {
    quality.push({ key: 'median', label: 'Median score', value: scores.median.toFixed(2), info: 'Median across every score sample in the call.' });
  } else if (scores?.mean != null) {
    quality.push({
      key: 'mean',
      label: 'Mean score',
      value: scores.mean.toFixed(2),
      info: 'Sample-weighted mean across the SFUs this call spanned. A median cannot be recovered from separate summaries, so the mean stands in for it.',
    });
  }
  if (scores?.samples != null) {
    quality.push({ key: 'samples', label: 'Score samples', value: scores.samples.toLocaleString(), info: 'How many score samples the aggregates above were computed from.' });
  }
  if (summary?.numberOfClientIssues != null) {
    quality.push({
      key: 'client-issues',
      label: 'Client issues',
      value: String(summary.numberOfClientIssues),
      info: 'Issues the clients’ own detectors raised during the call. Open a client to see which.',
    });
  }
  const callIssues = summary?.issues?.length ?? 0;
  if (callIssues > 0) {
    quality.push({
      key: 'call-issues',
      label: 'Call-level issues',
      value: String(callIssues),
      info: 'Issues the observer recorded against the call itself, rather than against one client.',
    });
  }
  if (quality.length) groups.push({ key: 'quality', title: 'Quality', facts: quality });

  /* infrastructure and provenance */
  const infra: CallFact[] = [];
  const sfuIds = summary?.sfuIds ?? [];
  if (sfuIds.length) {
    infra.push({
      key: 'sfus',
      label: sfuIds.length === 1 ? 'SFU' : 'SFUs',
      value: sfuIds.join(', '),
      info: sfuIds.length > 1 ? 'This call was spread across several SFUs; each one wrote its own summary.' : 'The SFU that carried this call.',
    });
  }
  if (routerCount > 0) {
    infra.push({ key: 'routers', label: 'Routers', value: String(routerCount), info: 'mediasoup routers whose samples were found for this call.' });
  }
  if (summary?.roomId) {
    infra.push({ key: 'room', label: 'Room', value: summary.roomId, info: 'Room id as the summary records it.' });
  }
  const sources = summary?.sources ?? [];
  if (sources.length > 1) {
    infra.push({
      key: 'sources',
      label: 'Merged from',
      value: plural(sources.length, 'summary', 'summaries'),
      info: sources.map((src) => src.key ?? src.sfuId ?? 'unnamed summary').join('\n'),
    });
  }
  if (summary?.missingSources) {
    infra.push({
      key: 'missing',
      label: 'Summaries unreadable',
      value: String(summary.missingSources),
      tone: 'warn',
      info: 'Per-SFU summaries were present in the folder but could not be parsed. Everything above is real but short of what those SFUs contributed.',
    });
  }
  if (summary?.unmergeable?.length) {
    infra.push({
      key: 'unmergeable',
      label: 'Not available across SFUs',
      value: summary.unmergeable.join(', '),
      tone: 'warn',
      info: 'These fields cannot be combined across separate summaries without inventing a number, so they were dropped rather than approximated.',
    });
  }
  if (infra.length) groups.push({ key: 'infra', title: 'Infrastructure', facts: infra });

  return groups;
}

/* ── entry point ───────────────────────────────────────── */

const NO_LOADED_CLIENTS: Map<string, ClientLoadEntry> = new Map();

export function buildDashboardModel(
  callSession: CallSession,
  callSummary: CallSummary | null,
  routerSamples: Map<string, MediasoupRouterSample>,
  loadedClients: Map<string, ClientLoadEntry> = NO_LOADED_CLIENTS,
): DashboardModel {
  const callStart = callSummary?.startedAt ?? callSession.callStart;
  const callEnd = callSummary?.endedAt ?? callSession.callEnd;

  const clients = buildClients(callSession, callSummary, loadedClients, callStart, callEnd);
  const hasQualityMetrics = clients.some((c) => c.score != null || c.series.length > 0);
  const { topology, routerRows } = buildTopology(routerSamples, callSummary);

  // The observer's own duration wins over the span. They usually agree, and
  // where they do not the summary knows something the timestamps do not — a
  // call that was closed late, or one whose first sample arrived after it
  // started. A reported duration of zero is not trusted: an unfinished summary
  // writes one, and the span is the better answer there.
  const reported = callSummary?.durationInMs;
  const durationIsReported = typeof reported === 'number' && reported > 0;
  const durationMs = durationIsReported ? reported : Math.max(0, callEnd - callStart);

  return {
    callStart,
    callEnd,
    durationLabel: compactDuration(durationMs),
    startLabel: clockLabel(callStart),
    endLabel: clockLabel(callEnd),
    clientCount: clients.length,
    hasQualityMetrics,
    statCards: buildStatCards(
      clients,
      hasQualityMetrics,
      callSummary,
      durationMs,
      durationIsReported,
    ),
    factGroups: buildCallFacts(
      callSummary,
      callStart,
      callEnd,
      durationMs,
      durationIsReported,
      routerRows.length,
      clients,
    ),
    clients,
    qualityChart: buildQualityChart(clients, callStart, callEnd),
    topology,
    routerRows,
  };
}
