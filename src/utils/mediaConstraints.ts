import { ClientMetaTypes } from '../schema/ClientMetaTypes.ts';
import type { ClientSample } from '../schema/ClientSample.ts';
import { asClientSamples, parseJsonPayload } from '../schema/clientSampleParse.ts';
import { extractMediaTrackEvents, type MediaTrackRecord } from './mediaTrackEvents.ts';

const ID_KEYS = new Set(['deviceId', 'groupId']);

export type ConstraintMatch = 'match' | 'mismatch' | 'off-ideal' | 'unknown';

export interface ConstraintRow {
  key: string;
  requested: string;
  applied: string;
  match: ConstraintMatch;
  isId: boolean;
  appliedRaw?: string;
}

export interface TrackConstraintView {
  track: MediaTrackRecord;
  rows: ConstraintRow[];
  hasRequest: boolean;
  hasApplied: boolean;
  mismatchCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function formatPrimitive(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toFixed(4)));
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatPrimitive).join(', ');
  return JSON.stringify(value);
}

/** Format a MediaTrackConstraints value (plain or { exact, ideal, min, max }). */
export function formatConstraintValue(value: unknown): string {
  if (value == null) return '—';
  if (!isRecord(value) || Array.isArray(value)) return formatPrimitive(value);

  const parts: string[] = [];
  if ('exact' in value && value.exact != null) parts.push(`exact ${formatPrimitive(value.exact)}`);
  if ('ideal' in value && value.ideal != null) parts.push(`ideal ${formatPrimitive(value.ideal)}`);
  if ('min' in value && value.min != null) parts.push(`min ${formatPrimitive(value.min)}`);
  if ('max' in value && value.max != null) parts.push(`max ${formatPrimitive(value.max)}`);
  return parts.length > 0 ? parts.join(', ') : formatPrimitive(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6;
  }
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;
  return String(a) === String(b);
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function compareConstraintToSetting(constraint: unknown, setting: unknown): ConstraintMatch {
  if (constraint == null || setting == null) return 'unknown';

  if (!isRecord(constraint) || !('exact' in constraint || 'ideal' in constraint || 'min' in constraint || 'max' in constraint)) {
    return valuesEqual(constraint, setting) ? 'match' : 'mismatch';
  }

  if (constraint.exact != null) {
    return valuesEqual(constraint.exact, setting) ? 'match' : 'mismatch';
  }

  const settingNum = numeric(setting);
  if (settingNum != null) {
    const min = numeric(constraint.min);
    const max = numeric(constraint.max);
    if (min != null && settingNum < min) return 'mismatch';
    if (max != null && settingNum > max) return 'mismatch';
    if (constraint.ideal != null) {
      const ideal = numeric(constraint.ideal);
      if (ideal != null && Math.abs(settingNum - ideal) > 1e-6) return 'off-ideal';
      if (ideal == null && !valuesEqual(constraint.ideal, setting)) return 'off-ideal';
    }
    return 'match';
  }

  if (constraint.ideal != null) {
    return valuesEqual(constraint.ideal, setting) ? 'match' : 'off-ideal';
  }
  return 'match';
}

const SKIP_KEYS = new Set(['advanced']);

function collectKeys(...maps: Array<Record<string, unknown> | null>): string[] {
  const keys = new Set<string>();
  for (const map of maps) {
    if (!map) continue;
    for (const key of Object.keys(map)) {
      if (!SKIP_KEYS.has(key)) keys.add(key);
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function buildConstraintRows(
  constraints: unknown,
  settings: unknown,
): ConstraintRow[] {
  const requested = asRecord(constraints);
  const applied = asRecord(settings);
  if (!requested && !applied) return [];

  return collectKeys(requested, applied).map((key) => {
    const req = requested?.[key];
    const got = applied?.[key];
    const match =
      req == null || got == null ? 'unknown' : compareConstraintToSetting(req, got);
    const appliedRaw = typeof got === 'string' ? got : undefined;
    return {
      key,
      requested: req == null ? '—' : formatConstraintValue(req),
      applied: got == null ? '—' : formatPrimitive(got),
      match,
      isId: ID_KEYS.has(key),
      appliedRaw,
    };
  });
}

export function buildTrackConstraintViews(
  samples: ClientSample[] | null | undefined,
): TrackConstraintView[] {
  const tracks = extractMediaTrackEvents(samples);
  return tracks
    .map((track) => {
      const payload = track.addedPayload;
      const constraints = payload?.constraints;
      const settings = payload?.settings;
      const rows = buildConstraintRows(constraints, settings);
      const hasRequest = asRecord(constraints) != null && Object.keys(asRecord(constraints)!).length > 0;
      const hasApplied = asRecord(settings) != null && Object.keys(asRecord(settings)!).length > 0;
      return {
        track,
        rows,
        hasRequest,
        hasApplied,
        mismatchCount: rows.filter((r) => r.match === 'mismatch').length,
      };
    })
    .filter((view) => view.hasRequest || view.hasApplied);
}

export interface StreamConstraintRequest {
  audio?: unknown;
  video?: unknown;
  raw: Record<string, unknown>;
}

export function extractRequestedMediaConstraints(
  samples: ClientSample[] | null | undefined,
): StreamConstraintRequest[] {
  const out: StreamConstraintRequest[] = [];
  for (const sample of asClientSamples(samples ?? [])) {
    for (const item of sample.clientMetaItems ?? []) {
      if (item.type !== ClientMetaTypes.MEDIA_CONSTRAINT) continue;
      const parsed = parseJsonPayload(item.payload);
      if (!parsed) continue;
      out.push({
        audio: parsed.audio,
        video: parsed.video,
        raw: parsed,
      });
    }
  }
  return out;
}

export function extractUserMediaErrors(
  samples: ClientSample[] | null | undefined,
): string[] {
  const out: string[] = [];
  for (const sample of asClientSamples(samples ?? [])) {
    for (const item of sample.clientMetaItems ?? []) {
      if (item.type !== ClientMetaTypes.USER_MEDIA_ERROR) continue;
      const parsed = parseJsonPayload(item.payload);
      const error =
        typeof parsed?.error === 'string'
          ? parsed.error
          : parsed
            ? JSON.stringify(parsed)
            : typeof item.payload === 'string'
              ? item.payload
              : 'Unknown getUserMedia error';
      if (error && !out.includes(error)) out.push(error);
    }
  }
  return out;
}

export function constraintRowsFromValue(value: unknown): ConstraintRow[] {
  if (value === true) {
    return [{ key: '(required)', requested: 'true', applied: '—', match: 'unknown', isId: false }];
  }
  if (value === false) {
    return [{ key: '(disabled)', requested: 'false', applied: '—', match: 'unknown', isId: false }];
  }
  return buildConstraintRows(value, null);
}

export function formatConstraintLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase());
}

export function matchLabel(match: ConstraintMatch): string {
  switch (match) {
    case 'match':
      return 'Match';
    case 'mismatch':
      return 'Mismatch';
    case 'off-ideal':
      return 'Off ideal';
    default:
      return '';
  }
}
