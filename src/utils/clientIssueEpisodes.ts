import type { ClientSample } from '../schema/ClientSample.ts';
import {
  baseIssueType,
  getIssueTypeMeta,
  isResolvedIssueType,
  type IssueHighlightField,
  type IssueTypeMeta,
} from '../schema/ClientIssueTypes.ts';
import { parseJsonPayload } from '../schema/clientSampleParse.ts';
import { formatBytes, formatBps, formatDuration, formatHMS, shortId } from './formatting.ts';

/**
 * One issue, from the moment it was raised to the moment it cleared.
 *
 * client-monitor 4.6.0 put the whole lifecycle on the wire: a stateful issue
 * arrives as a raise entry and a companion `<type>-resolved` entry, both
 * carrying the same `key`, and the resolution's payload holds `raisedAt` (a
 * secondary join when no key was written), the `comment` explaining why it
 * cleared, and `durationInMs`. A resolution is therefore the *end* of an
 * episode, never an episode of its own — the client saying the problem went
 * away, which is the opposite of a new problem.
 *
 * Issues still active when the monitor closes are auto-resolved into the final
 * sample, so `stillOpen` in a 4.6.0 stream means the capture was cut short
 * rather than that the issue never ended.
 */
export type ClientIssueEpisode = {
  type: string;
  key?: string;
  raisedAt: number;
  resolvedAt?: number;
  durationMs?: number;
  /**
   * True when nothing closed this episode. A raise whose payload already
   * carried a duration is a point-in-time report, not an open issue.
   */
  stillOpen: boolean;
  /**
   * True when a `<type>-resolved` entry closed this episode — the client
   * stated the issue cleared, as opposed to a duration inferred from a
   * self-describing raise.
   */
  resolvedByClient: boolean;
  /** The `comment` the client attached to the resolution, when it wrote one. */
  resolveComment?: string;
  payload: Record<string, unknown> | null;
  resolvePayload: Record<string, unknown> | null;
  trackId?: string;
  peerConnectionId?: string;
  transportId?: string;
  consumerId?: string;
  producerId?: string;
  /** Raw payload as written: a JSON string on schema <=3.2, an object from 3.3. */
  rawRaisePayload?: string | Record<string, unknown>;
  summary: string;
};

type RawIssue = {
  type: string;
  baseType: string;
  isResolution: boolean;
  key?: string;
  timestamp: number;
  /** Raw payload as written: a JSON string on schema <=3.2, an object from 3.3. */
  payload?: string | Record<string, unknown>;
  parsed: Record<string, unknown> | null;
};

function strField(payload: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  if (!payload) return undefined;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function numField(payload: Record<string, unknown> | null, key: string): number | undefined {
  if (!payload) return undefined;
  const value = payload[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function formatIssueDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  return formatDuration(ms);
}

export function formatHighlightValue(field: IssueHighlightField, payload: Record<string, unknown> | null): string | null {
  if (!payload || !(field.key in payload) || payload[field.key] == null) return null;
  const raw = payload[field.key];
  switch (field.format) {
    case 'string':
      if (typeof raw === 'boolean') return raw ? 'yes' : 'no';
      return String(raw);
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return String(raw);
      if (Number.isInteger(n) || Math.abs(n) >= 100) return String(Math.round(n));
      return n.toFixed(Math.abs(n) >= 10 ? 1 : 2);
    }
    case 'ms': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return String(raw);
      return formatIssueDuration(n);
    }
    case 'fraction': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return String(raw);
      const pct = n <= 1 ? n * 100 : n;
      return `${pct.toFixed(pct >= 10 ? 0 : 1)}%`;
    }
    case 'per-sec': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return String(raw);
      return `${n.toFixed(n >= 10 ? 1 : 2)}/s`;
    }
    case 'bytes': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return String(raw);
      return formatBytes(n);
    }
    case 'bps': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return String(raw);
      return formatBps(n);
    }
    default:
      return String(raw);
  }
}

export function episodeHighlights(meta: IssueTypeMeta, episode: ClientIssueEpisode): { label: string; value: string }[] {
  const merged = { ...(episode.payload ?? {}), ...(episode.resolvePayload ?? {}) };
  const out: { label: string; value: string }[] = [];
  for (const field of meta.highlightFields) {
    if (field.key === 'trackId' || field.key === 'peerConnectionId' || field.key === 'transportId') continue;
    const value = formatHighlightValue(field, merged);
    if (value == null || value === '') continue;
    out.push({ label: field.label, value });
  }
  if (episode.trackId) out.push({ label: 'Track', value: shortId(episode.trackId, 10) });
  if (episode.transportId) out.push({ label: 'Transport', value: shortId(episode.transportId, 10) });
  if (episode.stillOpen) out.push({ label: 'State', value: 'still open' });
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function episodeTooltipHtml(
  meta: IssueTypeMeta,
  episode: ClientIssueEpisode,
  tz: string,
): string {
  const highlights = episodeHighlights(meta, episode);
  const time = formatHMS(episode.raisedAt, tz as never);
  const end = episode.resolvedAt && episode.resolvedAt > episode.raisedAt
    ? ` → ${formatHMS(episode.resolvedAt, tz as never)}`
    : '';
  const duration = episode.durationMs != null ? formatIssueDuration(episode.durationMs) : '';
  const fields = highlights
    .map((h) => `<span style="color:var(--text-muted)">${escapeHtml(h.label)}</span> ${escapeHtml(h.value)}`)
    .join('<br/>');
  // The resolution is the good half of the story, and the comment is the
  // client's own account of why it cleared — worth more than another number.
  const comment = episode.resolveComment
    ? `<br/><span style="color:var(--success)">resolved</span> ${escapeHtml(episode.resolveComment)}`
    : episode.resolvedByClient
      ? '<br/><span style="color:var(--success)">resolved</span>'
      : '';
  return (
    `<strong>${escapeHtml(meta.label)}</strong><br/>` +
    `${time}${end}` +
    (duration ? `<br/>${escapeHtml(duration)}` : '') +
    comment +
    (fields ? `<br/>${fields}` : '')
  );
}

function identityOf(issue: RawIssue): string {
  if (issue.key) return `k:${issue.key}`;
  const track = strField(issue.parsed, 'trackId', 'trackIdentifier');
  const transport = strField(issue.parsed, 'transportId', 'pathKey');
  const pc = strField(issue.parsed, 'peerConnectionId');
  return `t:${issue.baseType}|tr:${track ?? ''}|tf:${transport ?? ''}|pc:${pc ?? ''}`;
}

function collectRawIssues(samples: ClientSample[]): RawIssue[] {
  const out: RawIssue[] = [];
  for (const sample of samples) {
    for (const issue of sample.clientIssues ?? []) {
      const type = issue.type || 'unknown';
      const timestamp = issue.timestamp ?? sample.timestamp;
      if (!Number.isFinite(timestamp)) continue;
      const parsed = parseJsonPayload(issue.payload);
      out.push({
        type,
        baseType: baseIssueType(type),
        isResolution: isResolvedIssueType(type),
        key: issue.key,
        timestamp,
        payload: issue.payload,
        parsed,
      });
    }
  }
  out.sort((a, b) => a.timestamp - b.timestamp || Number(a.isResolution) - Number(b.isResolution));
  return out;
}

function durationFromPayloads(
  raise: Record<string, unknown> | null,
  resolve: Record<string, unknown> | null,
  raisedAt: number,
  resolvedAt?: number,
): number | undefined {
  const fromResolve = numField(resolve, 'durationInMs') ?? numField(resolve, 'duration');
  if (fromResolve != null && fromResolve >= 0) return fromResolve;
  const fromRaise = numField(raise, 'durationInMs') ?? numField(raise, 'duration');
  if (fromRaise != null && fromRaise >= 0 && resolvedAt == null) return fromRaise;
  if (resolvedAt != null && resolvedAt >= raisedAt) return resolvedAt - raisedAt;
  return undefined;
}

function summarize(meta: IssueTypeMeta, episode: Omit<ClientIssueEpisode, 'summary'>): string {
  const bits: string[] = [];
  if (episode.durationMs != null) bits.push(formatIssueDuration(episode.durationMs));
  if (episode.stillOpen) bits.push('still open');
  const merged = { ...(episode.payload ?? {}), ...(episode.resolvePayload ?? {}) };
  for (const field of meta.highlightFields.slice(0, 4)) {
    if (field.key === 'durationInMs' || field.key === 'duration' || field.key === 'trackId') continue;
    const value = formatHighlightValue(field, merged);
    if (value) bits.push(`${field.label} ${value}`);
  }
  return bits.length > 0 ? bits.join(' · ') : meta.label;
}

function toEpisode(raise: RawIssue, resolve?: RawIssue): ClientIssueEpisode {
  const meta = getIssueTypeMeta(raise.baseType);
  const raisedAt = raise.timestamp;
  const resolvedAt = resolve?.timestamp;
  const stillOpen = resolve == null && numField(raise.parsed, 'durationInMs') == null;
  const durationMs = durationFromPayloads(raise.parsed, resolve?.parsed ?? null, raisedAt, resolvedAt);
  const endGuess = resolvedAt ?? (durationMs != null ? raisedAt + durationMs : undefined);
  const episodeBase = {
    type: raise.baseType,
    key: raise.key ?? resolve?.key,
    raisedAt,
    resolvedAt: endGuess,
    durationMs,
    stillOpen: stillOpen && endGuess == null,
    resolvedByClient: resolve != null,
    resolveComment: strField(resolve?.parsed ?? null, 'comment', 'reason'),
    payload: raise.parsed,
    resolvePayload: resolve?.parsed ?? null,
    trackId: strField(raise.parsed, 'trackId', 'trackIdentifier') ?? strField(resolve?.parsed ?? null, 'trackId', 'trackIdentifier'),
    peerConnectionId: strField(raise.parsed, 'peerConnectionId') ?? strField(resolve?.parsed ?? null, 'peerConnectionId'),
    transportId: strField(raise.parsed, 'transportId') ?? strField(resolve?.parsed ?? null, 'transportId'),
    consumerId: strField(raise.parsed, 'consumerId') ?? strField(resolve?.parsed ?? null, 'consumerId'),
    producerId: strField(raise.parsed, 'producerId') ?? strField(resolve?.parsed ?? null, 'producerId'),
    rawRaisePayload: raise.payload,
  };
  return { ...episodeBase, summary: summarize(meta, episodeBase) };
}

export function buildClientIssueEpisodes(samples: ClientSample[]): ClientIssueEpisode[] {
  const raw = collectRawIssues(samples);
  const hasResolutions = raw.some((issue) => issue.isResolution);
  const openById = new Map<string, RawIssue[]>();
  const episodes: ClientIssueEpisode[] = [];
  const usedRaises = new Set<RawIssue>();

  const pushOpen = (issue: RawIssue) => {
    const id = identityOf(issue);
    const stack = openById.get(id) ?? [];
    stack.push(issue);
    openById.set(id, stack);
  };

  const popOpen = (issue: RawIssue): RawIssue | undefined => {
    const raisedAt = numField(issue.parsed, 'raisedAt');
    if (raisedAt != null) {
      for (const stack of openById.values()) {
        const idx = stack.findIndex((r) => r.baseType === issue.baseType && r.timestamp === raisedAt);
        if (idx >= 0) {
          const [matched] = stack.splice(idx, 1);
          return matched;
        }
      }
    }
    const id = identityOf(issue);
    const stack = openById.get(id);
    if (stack && stack.length > 0) return stack.shift();
    if (issue.key) {
      for (const [otherId, otherStack] of openById) {
        if (otherId === id) continue;
        const idx = otherStack.findIndex((r) => r.key === issue.key && r.baseType === issue.baseType);
        if (idx >= 0) {
          const [matched] = otherStack.splice(idx, 1);
          return matched;
        }
      }
    }
    return undefined;
  };

  for (const issue of raw) {
    if (!issue.isResolution) {
      pushOpen(issue);
      continue;
    }
    const raise = popOpen(issue);
    if (!raise) continue;
    usedRaises.add(raise);
    episodes.push(toEpisode(raise, issue));
  }

  for (const stack of openById.values()) {
    for (const raise of stack) {
      if (usedRaises.has(raise)) continue;
      const episode = toEpisode(raise);
      episodes.push(hasResolutions ? episode : { ...episode, stillOpen: false });
    }
  }

  episodes.sort((a, b) => a.raisedAt - b.raisedAt);
  return episodes;
}

export function groupEpisodesByType(episodes: ClientIssueEpisode[]): Map<string, ClientIssueEpisode[]> {
  const map = new Map<string, ClientIssueEpisode[]>();
  for (const episode of episodes) {
    const list = map.get(episode.type) ?? [];
    list.push(episode);
    map.set(episode.type, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.raisedAt - b.raisedAt);
  return map;
}

export function filterResolvedEpisodes(
  episodes: ClientIssueEpisode[],
  resolvedKeys?: Set<string>,
): ClientIssueEpisode[] {
  if (!resolvedKeys?.size) return episodes;
  return episodes.filter((e) => !resolvedKeys.has(`${e.type}:${e.raisedAt}`));
}

export function uniqueTrackIds(episodes: ClientIssueEpisode[]): string[] {
  const ids = new Set<string>();
  for (const e of episodes) if (e.trackId) ids.add(e.trackId);
  return [...ids];
}

export function uniqueTransportIds(episodes: ClientIssueEpisode[]): string[] {
  const ids = new Set<string>();
  for (const e of episodes) if (e.transportId) ids.add(e.transportId);
  return [...ids];
}

export function totalEpisodeDurationMs(episodes: ClientIssueEpisode[]): number {
  let total = 0;
  for (const e of episodes) if (e.durationMs != null) total += e.durationMs;
  return total;
}

const episodesCache = new WeakMap<ClientSample[], ClientIssueEpisode[]>();

/** Memoize episode pairing per samples array identity (shared across consumer/producer/transport sections). */
export function cachedClientIssueEpisodes(samples: ClientSample[]): ClientIssueEpisode[] {
  const existing = episodesCache.get(samples);
  if (existing) return existing;
  const built = buildClientIssueEpisodes(samples);
  episodesCache.set(samples, built);
  return built;
}

/** Cheap badge count: raised (non-resolution) client issues, excluding uploader issues. */
export function countRaisedClientIssues(samples: ClientSample[]): number {
  let n = 0;
  for (const sample of samples) {
    for (const issue of sample.clientIssues ?? []) {
      const type = issue.type || 'unknown';
      if (isResolvedIssueType(type)) continue;
      n++;
    }
  }
  return n;
}
