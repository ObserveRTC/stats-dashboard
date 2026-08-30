import * as d3 from 'd3';
import { useTimezoneStore, type Tz } from '../stores/tzStore.ts';

/** Read the current timezone preference without subscribing. Used as the
 * default when a caller doesn't pass `tz` explicitly. Any caller inside a
 * React render that needs to re-run on toggle **must** pass the `tz` value
 * from `useTimezoneTick()` — otherwise React Compiler will memoise the call
 * based on the other arguments (which are typically stable), because the
 * store read here is invisible to it. */
function currentTz(): Tz {
  return useTimezoneStore.getState().tz;
}

const LOCALE_OPTS_HMS: Intl.DateTimeFormatOptions = {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

export function formatHMS(timestamp: number | null | undefined, tz: Tz = currentTz()): string {
  if (!timestamp) return '...';
  try {
    const opts = tz === 'utc'
      ? { ...LOCALE_OPTS_HMS, timeZone: 'UTC' }
      : LOCALE_OPTS_HMS;
    return new Date(timestamp).toLocaleTimeString(undefined, opts);
  } catch {
    /* Safe to ignore: invalid timestamp values fall back to placeholder display */
    return '...';
  }
}

/** HH:MM:SS.mmm — second-level precision with milliseconds appended. */
export function formatHMSms(timestamp: number | null | undefined, tz: Tz = currentTz()): string {
  if (!timestamp) return '...';
  try {
    const hms = formatHMS(timestamp, tz);
    const ms  = String(new Date(timestamp).getMilliseconds()).padStart(3, '0');
    return `${hms}.${ms}`;
  } catch {
    return '...';
  }
}

/** Time only (HH:MM:SS) — same as formatHMS but accepts Date or number and
 * never returns '...' fallback. Used where we already have a Date in hand. */
export function formatTimeOnly(value: Date | number, tz: Tz = currentTz()): string {
  const d = value instanceof Date ? value : new Date(value);
  const opts = tz === 'utc'
    ? { ...LOCALE_OPTS_HMS, timeZone: 'UTC' }
    : LOCALE_OPTS_HMS;
  return d.toLocaleTimeString(undefined, opts);
}

const FULL_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

/** Full date + time, honouring the supplied (or currently selected) tz.
 * Fields are explicit so that browsers don't drop the date or time when
 * `timeZone`/`timeZoneName` is supplied — `toLocaleString` defaults become
 * implementation-defined once any field hint is present. */
export function formatDateTime(value: Date | number, tz: Tz = currentTz()): string {
  const d = value instanceof Date ? value : new Date(value);
  const opts: Intl.DateTimeFormatOptions = tz === 'utc'
    ? { ...FULL_DATETIME_OPTS, timeZone: 'UTC', timeZoneName: 'short' }
    : FULL_DATETIME_OPTS;
  return d.toLocaleString(undefined, opts);
}

/** d3 time formatter that respects the supplied (or currently selected) tz
 * — returns a `d3.utcFormat` instance when UTC is selected, otherwise the
 * local-time `d3.timeFormat`. */
export function d3TimeFormat(spec: string, tz: Tz = currentTz()): (d: Date) => string {
  return tz === 'utc' ? d3.utcFormat(spec) : d3.timeFormat(spec);
}

/** d3 time scale that respects the supplied (or currently selected) tz.
 * Returns `d3.scaleUtc()` when UTC is selected so tick selection lands on
 * UTC hour/minute boundaries (matching the UTC labels rendered by
 * `d3TimeFormat`), otherwise returns `d3.scaleTime()`. Same interface either
 * way. */
export function d3TimeScale(tz: Tz = currentTz()): d3.ScaleTime<number, number> {
  return tz === 'utc' ? d3.scaleUtc() : d3.scaleTime();
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return '...';
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return 'N/A';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatBps(bps: number | null | undefined): string {
  if (bps == null) return 'N/A';
  if (bps > 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps > 1000) return `${(bps / 1000).toFixed(0)} kbps`;
  return `${bps.toFixed(0)} bps`;
}

export function shortId(id: string | null | undefined, len = 8): string {
  if (!id) return '???';
  return id.length > len ? id.slice(0, len) : id;
}

/**
 * Produce a human-readable label for a client:
 * - If displayName is present: "DisplayName · <shortId>"
 * - Otherwise: just the full clientId (or shortId when compact=true)
 */
export function clientLabel(
  clientId: string,
  displayName: string | null | undefined,
  compact = false,
): string {
  if (displayName) return `${displayName} · ${shortId(clientId)}`;
  return compact ? shortId(clientId) : clientId;
}

/** Convert any timestamp representation (Date, number, string) to epoch ms. */
export function tsMs(t: Date | number | string | null | undefined): number {
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return new Date(t).getTime();
  return 0;
}

/** Map a quality score (0–5) to a CSS color variable. */
export function scoreColor(score: number): string {
  return score >= 3.5 ? 'var(--success)' : score >= 2 ? 'var(--warning)' : 'var(--danger)';
}

/** Compute the lifecycle duration string for an entity with createdAt/closedAt. */
export function lifecycleDuration(createdAt?: number | null, closedAt?: number | null): string {
  if (createdAt == null) return '';
  return formatDuration((closedAt ?? Date.now()) - createdAt);
}

export function formatCodecDetails(
  codecInfo: { mimeType?: string; clockRate?: number; channels?: number; sdpFmtpLine?: string } | null | undefined,
  clientCodec?: { clockRate?: number; channels?: number; sdpFmtpLine?: string } | null,
): string {
  if (!codecInfo?.mimeType) return 'N/A';
  const mime = codecInfo.mimeType;
  const codecName = mime.split('/')[1] || mime;
  const parts = [codecName];
  const clockRate = clientCodec?.clockRate || codecInfo.clockRate;
  if (clockRate) parts.push(`${clockRate / 1000}kHz`);
  const channels = clientCodec?.channels || codecInfo.channels;
  if (channels) parts.push(channels === 2 ? 'stereo' : channels === 1 ? 'mono' : `${channels}ch`);
  let detail = parts.join(' @ ');
  const fmtp = clientCodec?.sdpFmtpLine || codecInfo.sdpFmtpLine;
  if (fmtp) {
    const features: string[] = [];
    if (fmtp.includes('useinbandfec=1')) features.push('FEC');
    if (fmtp.includes('usedtx=1')) features.push('DTX');
    if (fmtp.includes('stereo=1')) features.push('stereo');
    const startBitrate = fmtp.match(/x-google-start-bitrate=(\d+)/);
    if (startBitrate) features.push(`start ${startBitrate[1]}kbps`);
    if (features.length > 0) detail += ` (${features.join(', ')})`;
  }
  return detail;
}

/** Row label prefix: "(V) " or "(A) " before producer id. */
export function mediaKindLabelPrefix(kind: string): string {
  if (kind === 'video') return '(V) ';
  if (kind === 'audio') return '(A) ';
  return '';
}

/** Overview timeline row hover: id plus (label) for video/audio producers. */
export function producerOverviewHoverHtml(producer: {
  id: string;
  kind: string;
  label?: string | null;
}): string {
  const idHtml = `<span style="font-family:ui-monospace,monospace">${producer.id}</span>`;
  if (producer.kind !== 'video' && producer.kind !== 'audio') return idHtml;
  const label = producer.label?.trim();
  if (!label) return idHtml;
  return `${idHtml} <span style="color:var(--text-muted)">(${label})</span>`;
}
