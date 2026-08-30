import type { ClientSample } from '../schema/ClientSample.ts';
import { collectExtensionStats, parseJsonPayload } from '../schema/clientSampleParse.ts';

/**
 * Build continuous videoProcessing on/off intervals from client WebRTC stats samples.
 * Reads MEDIA_STREAM_TRACK_GLITCH_METRICS extension payloads only.
 *
 * Extension stats appear on a subset of stats samples (~every 2nd tick). Between
 * defined readings we hold the last known state so the timeline stays contiguous.
 */

export const GLITCH_METRICS_TYPE = 'MEDIA_STREAM_TRACK_GLITCH_METRICS';

export interface VideoProcessingSample {
  timestamp: number;
  participantKey: string;
  videoProcessing: boolean;
}

export interface VideoProcessingInterval {
  participantKey: string;
  state: boolean;
  startMs: number;
  endMs: number;
  /** Number of stats samples in this interval that had a defined reading. */
  sampleCount: number;
  /** True when any portion uses held (forward-filled) state between sparse samples. */
  hasInferredSpan: boolean;
}

export interface VideoProcessingParseResult {
  samples: VideoProcessingSample[];
  skippedLines: number;
  parsedLines: number;
}

export interface VideoProcessingTimelineResult {
  intervalsByKey: Map<string, VideoProcessingInterval[]>;
  sessionStartMs: number;
  sessionEndMs: number;
  skippedLines: number;
  parsedLines: number;
}

/** Parse one stats record (already JSON-parsed line). */
export function extractVideoProcessingFromRecord(
  record: ClientSample | unknown,
): VideoProcessingSample[] {
  const out: VideoProcessingSample[] = [];
  if (record == null || typeof record !== 'object' || typeof (record as ClientSample).timestamp !== 'number') {
    return out;
  }

  for (const ext of collectExtensionStats(record as ClientSample)) {
    if (ext.type !== GLITCH_METRICS_TYPE || ext.payload == null) continue;
    const parsed = parseJsonPayload(ext.payload);
    if (!parsed) continue;

    const ctx = parsed.context;
    if (ctx == null || typeof ctx !== 'object' || Array.isArray(ctx)) continue;
    const videoProcessing = (ctx as Record<string, unknown>).videoProcessing;
    if (typeof videoProcessing !== 'boolean') continue;

    const participantKey =
      typeof parsed.participantKey === 'string' && parsed.participantKey.trim() !== ''
        ? parsed.participantKey
        : 'unknown';

    const ts = parsed.timestamp;
    const timestamp =
      typeof ts === 'number' && Number.isFinite(ts)
        ? ts
        : typeof ts === 'string'
          ? Number(ts)
          : NaN;
    if (!Number.isFinite(timestamp)) continue;

    out.push({ timestamp, participantKey, videoProcessing });
  }

  return out;
}

/**
 * Attach samples to a stats sample wall time (monotonic). Skips undefined readings.
 */
export function anchorVideoProcessingSamples(
  extracted: VideoProcessingSample[],
  sampleTimestampMs: number,
): VideoProcessingSample[] {
  const out: VideoProcessingSample[] = [];
  for (const s of extracted) {
    const ts = Number.isFinite(sampleTimestampMs) ? sampleTimestampMs : s.timestamp;
    if (!Number.isFinite(ts)) continue;
    out.push({ ...s, timestamp: ts });
  }
  return out;
}

/** Parse JSONL text (one JSON object per line). */
export function parseVideoProcessingJsonl(text: string): VideoProcessingParseResult {
  const lines = text.split(/\r?\n/);
  const samples: VideoProcessingSample[] = [];
  let skippedLines = 0;
  let parsedLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const record = JSON.parse(trimmed) as unknown;
      parsedLines += 1;
      const extracted = extractVideoProcessingFromRecord(record);
      if (extracted.length === 0) {
        skippedLines += 1;
        continue;
      }
      const rec = record as Record<string, unknown>;
      const tsRaw = rec.timestamp;
      const sampleMs =
        typeof tsRaw === 'number' && Number.isFinite(tsRaw)
          ? tsRaw
          : typeof tsRaw === 'string'
            ? new Date(tsRaw).getTime()
            : NaN;
      samples.push(...anchorVideoProcessingSamples(extracted, sampleMs));
    } catch {
      skippedLines += 1;
    }
  }

  samples.sort((a, b) => a.timestamp - b.timestamp || a.participantKey.localeCompare(b.participantKey));
  return { samples, skippedLines, parsedLines };
}

/** Parse array of stats records (dashboard clientStats). */
export function extractVideoProcessingFromStats(
  stats: ClientSample[] | unknown[] | null | undefined,
): VideoProcessingParseResult {
  if (!stats?.length) {
    return { samples: [], skippedLines: 0, parsedLines: 0 };
  }

  const samples: VideoProcessingSample[] = [];
  let skippedLines = 0;

  for (const record of stats) {
    const extracted = extractVideoProcessingFromRecord(record);
    if (extracted.length === 0) {
      skippedLines += 1;
      continue;
    }
    const sampleMs =
      typeof (record as ClientSample).timestamp === 'number'
        ? (record as ClientSample).timestamp
        : NaN;
    samples.push(...anchorVideoProcessingSamples(extracted, sampleMs));
  }

  samples.sort((a, b) => a.timestamp - b.timestamp || a.participantKey.localeCompare(b.participantKey));
  return { samples, skippedLines, parsedLines: stats.length };
}

function dedupeSamplesPerKey(samples: VideoProcessingSample[]): VideoProcessingSample[] {
  const byKeyTs = new Map<string, VideoProcessingSample>();
  for (const s of samples) {
    if (!Number.isFinite(s.timestamp)) continue;
    const key = `${s.participantKey}\0${s.timestamp}`;
    byKeyTs.set(key, s);
  }
  return [...byKeyTs.values()].sort(
    (a, b) => a.timestamp - b.timestamp || a.participantKey.localeCompare(b.participantKey),
  );
}

function countSamplesInRange(sorted: VideoProcessingSample[], startMs: number, endMs: number): number {
  return sorted.filter((s) => s.timestamp >= startMs && s.timestamp < endMs).length;
}

function mergeAdjacentIntervals(intervals: VideoProcessingInterval[]): VideoProcessingInterval[] {
  if (intervals.length === 0) return [];
  const merged: VideoProcessingInterval[] = [{ ...intervals[0] }];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = intervals[i];
    if (cur.state === prev.state) {
      prev.endMs = cur.endMs;
      prev.sampleCount += cur.sampleCount;
      prev.hasInferredSpan = prev.hasInferredSpan || cur.hasInferredSpan;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/**
 * Build a contiguous timeline from sparse defined readings.
 * Each sample's state is held until the next sample (or session end).
 * Before the first sample, the first reading is held back to sessionStartMs.
 */
export function collapseVideoProcessingIntervals(
  samples: VideoProcessingSample[],
  sessionStartMs: number,
  sessionEndMs: number,
): Map<string, VideoProcessingInterval[]> {
  const byKey = new Map<string, VideoProcessingSample[]>();
  for (const s of dedupeSamplesPerKey(samples)) {
    const list = byKey.get(s.participantKey) ?? [];
    list.push(s);
    byKey.set(s.participantKey, list);
  }

  const result = new Map<string, VideoProcessingInterval[]>();
  const startBound = sessionStartMs;
  const endBound = sessionEndMs;

  for (const [participantKey, keySamples] of byKey) {
    const sorted = [...keySamples].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length === 0) continue;

    const raw: VideoProcessingInterval[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const readingTs = sorted[i].timestamp;
      const startMs = i === 0 ? startBound : readingTs;
      const endMs = i + 1 < sorted.length ? sorted[i + 1].timestamp : endBound;
      if (endMs <= startMs) continue;

      const measurements = countSamplesInRange(sorted, startMs, endMs);
      const hasInferredSpan = startMs < readingTs || endMs > readingTs;

      raw.push({
        participantKey,
        state: sorted[i].videoProcessing,
        startMs,
        endMs,
        sampleCount: Math.max(1, measurements),
        hasInferredSpan,
      });
    }

    result.set(participantKey, mergeAdjacentIntervals(raw));
  }

  return result;
}

/** Build timeline from pre-extracted samples (e.g. from processWebRTCStats). */
export function buildVideoProcessingTimelineFromSamples(
  samples: VideoProcessingSample[],
  sessionStartMs: number,
  sessionEndMs: number,
): VideoProcessingTimelineResult | null {
  const defined = dedupeSamplesPerKey(samples);
  if (defined.length === 0) return null;

  return {
    intervalsByKey: collapseVideoProcessingIntervals(defined, sessionStartMs, sessionEndMs),
    sessionStartMs,
    sessionEndMs,
    skippedLines: 0,
    parsedLines: defined.length,
  };
}

/** Build timeline from in-memory client stats array (same shape as pane statsData). */
export function buildVideoProcessingTimeline(
  clientStats: ClientSample[] | null | undefined,
  sessionStartMs: number,
  sessionEndMs: number,
): VideoProcessingTimelineResult | null {
  const { samples } = extractVideoProcessingFromStats(clientStats);
  return buildVideoProcessingTimelineFromSamples(samples, sessionStartMs, sessionEndMs);
}

export function summarizeVideoProcessingTimeline(
  timeline: VideoProcessingTimelineResult,
): {
  totalDurationMs: number;
  totalTrueMs: number;
  totalFalseMs: number;
  transitions: number;
} {
  let totalTrueMs = 0;
  let totalFalseMs = 0;
  let transitions = 0;

  for (const intervals of timeline.intervalsByKey.values()) {
    for (const interval of intervals) {
      const dur = Math.max(0, interval.endMs - interval.startMs);
      if (interval.state) totalTrueMs += dur;
      else totalFalseMs += dur;
    }
    transitions += Math.max(0, intervals.length - 1);
  }

  return {
    totalDurationMs: timeline.sessionEndMs - timeline.sessionStartMs,
    totalTrueMs,
    totalFalseMs,
    transitions,
  };
}
