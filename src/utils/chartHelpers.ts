import { tsMs, scoreColor } from './formatting.ts';
import type { OutboundTimeSeriesValue, ProcessWebRTCStatsResult, TimeSeriesValueBase } from './statsTypes.ts';

function seriesNum(v: Record<string, unknown>, field: string): number | undefined {
  const x = v[field];
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}

export interface ChartDef<T extends TimeSeriesValueBase = OutboundTimeSeriesValue> {
  title: string;
  tip?: string;
  extract: (v: T) => number | undefined;
  formatter?: (v: number) => string;
  needNonZero?: boolean;
  condition?: boolean;
}

export interface ChartDataResult {
  title: string;
  tip?: string;
  data: Array<{ timestamp: Date; value: number }>;
  formatter?: (v: number) => string;
}

/** Build chart-ready data arrays from time series values and chart definitions. */
export function buildChartData<T extends TimeSeriesValueBase>(
  values: T[],
  defs: ChartDef<T>[],
): ChartDataResult[] {
  return defs.reduce<ChartDataResult[]>((charts, def) => {
    if (def.condition === false) return charts;
    const data: Array<{ timestamp: Date; value: number }> = [];
    for (const v of values) {
      const val = def.extract(v);
      if (val !== undefined) data.push({ timestamp: new Date(tsMs(v.timestamp)), value: val });
    }
    if (data.length < 2) return charts;
    if (def.needNonZero && !data.some((d) => d.value > 0)) return charts;
    charts.push({ title: def.title, tip: def.tip, data, formatter: def.formatter });
    return charts;
  }, []);
}

/** Extract time series values for a field, filtered to a time range. */
export function extractTimeSeries(
  seriesValues: TimeSeriesValueBase[] | undefined,
  field: string,
  startTime: number,
  endTime: number,
): Array<{ timestamp: Date; value: number }> {
  if (!seriesValues) return [];
  const result: Array<{ timestamp: Date; value: number }> = [];
  for (const v of seriesValues) {
    const ms = tsMs(v.timestamp);
    const val = seriesNum(v as unknown as Record<string, unknown>, field);
    if (ms >= startTime && ms <= endTime && val != null) {
      result.push({ timestamp: new Date(ms), value: val });
    }
  }
  return result;
}

const PAUSE_EVENTS = new Set(['pause', 'producerPaused', 'stopped']);
const RESUME_EVENTS = new Set(['resume', 'producerResumed', 'started']);

function isPausedAt(history: Array<{ timestamp: number; event: string }> | undefined, ts: number): boolean {
  if (!history?.length) return false;
  let paused = false;
  for (const h of history) {
    if (h.timestamp > ts) break;
    if (PAUSE_EVENTS.has(h.event)) paused = true;
    else if (RESUME_EVENTS.has(h.event)) paused = false;
  }
  return paused;
}

/** Compute average track quality score badge, filtering out paused intervals. */
export function getTrackScoreBadge(
  processedClientStats: ProcessWebRTCStatsResult | null | undefined,
  id: string,
  kind: 'outbound' | 'inbound',
  matchField: 'producerId' | 'consumerId',
  history?: Array<{ timestamp: number; event: string }>,
): { avg: number; color: string } | null {
  const perTrack = processedClientStats?.scores?.perTrack;
  if (!perTrack) return null;
  const entry = Object.values(perTrack).find(
    (t) => t.kind === kind && t[matchField] === id,
  );
  if (!entry?.values?.length) return null;
  const activeValues = entry.values.filter((v) => !isPausedAt(history, tsMs(v.timestamp)));
  if (!activeValues.length) return null;
  const avg = activeValues.reduce((sum, v) => sum + v.score, 0) / activeValues.length;
  return { avg, color: scoreColor(avg) };
}

/** Detect string-field changes across time series values (e.g. encoder implementation). */
export function detectChanges(values: TimeSeriesValueBase[], field: string, label?: string): string[] {
  const changes: string[] = [];
  let last = '';
  for (const v of values) {
    const val = (v as unknown as Record<string, unknown>)[field];
    if (typeof val === 'string' && val && val !== last) {
      if (last) changes.push(label ? `${label}: ${last} → ${val}` : `${last} → ${val}`);
      last = val;
    }
  }
  return changes;
}

export function buildSegments(
  samples: { timestamp: number; state: string }[],
  startTime: number,
  endTime: number
): { start: number; end: number; state: string }[] {
  if (samples.length === 0) return [];
  const raw: { start: number; end: number; state: string }[] = [];

  for (let i = 0; i < samples.length; i++) {
    const segStart = i === 0 ? startTime : samples[i].timestamp;
    const segEnd = i + 1 < samples.length ? samples[i + 1].timestamp : endTime;
    const segStartClipped = Math.max(segStart, startTime);
    const segEndClipped = Math.min(segEnd, endTime);
    if (segStartClipped < segEndClipped) {
      raw.push({ start: segStartClipped, end: segEndClipped, state: samples[i].state });
    }
  }

  if (raw.length === 0) return [];
  const merged: { start: number; end: number; state: string }[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const prev = merged[merged.length - 1];
    if (raw[i].state === prev.state) {
      prev.end = raw[i].end;
    } else {
      merged.push(raw[i]);
    }
  }
  return merged;
}
