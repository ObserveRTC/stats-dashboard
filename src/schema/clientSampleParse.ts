import type { ClientEvent, ClientSample, ExtensionStat, PeerConnectionSample } from './ClientSample.ts';

/** Parsed JSON object from extension stat or client event payloads. */
export type ParsedPayload = Record<string, unknown>;

export function isClientSample(value: unknown): value is ClientSample {
  return value != null && typeof value === 'object' && typeof (value as ClientSample).timestamp === 'number';
}

export function asClientSamples(clientStats: unknown): ClientSample[] {
  if (!Array.isArray(clientStats)) return [];
  return clientStats.filter(isClientSample);
}

export function parseJsonPayload(
  payload: string | ParsedPayload | undefined,
): ParsedPayload | null {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    try {
      const parsed: unknown = JSON.parse(payload);
      return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as ParsedPayload)
        : null;
    } catch {
      return null;
    }
  }
  return payload;
}

/** Top-level extensionStats, or per-PC when sample-level list is empty. */
export function collectExtensionStats(sample: ClientSample): ExtensionStat[] {
  const top = sample.extensionStats ?? [];
  if (top.length > 0) return top;
  return (sample.peerConnections ?? []).flatMap((pc) => pc.extensionStats ?? []);
}

export function findExtensionPayload(
  stats: ExtensionStat[],
  type: string,
): ParsedPayload | null {
  for (const ext of stats) {
    if (ext.type !== type || ext.payload == null) continue;
    const parsed = parseJsonPayload(ext.payload);
    if (parsed) return parsed;
  }
  return null;
}

export function parseClientEventPayload(ev: ClientEvent): ParsedPayload {
  return parseJsonPayload(ev.payload) ?? {};
}

export function getPcDirection(pc: PeerConnectionSample): string | undefined {
  const dir = pc.attachments?.direction;
  return typeof dir === 'string' ? dir : undefined;
}

export interface TrackAttachments {
  producerId?: string;
  consumerId?: string;
  label?: string;
}

export function getTrackAttachments(
  attachments: Record<string, unknown> | undefined,
): TrackAttachments {
  if (!attachments) return {};
  return {
    producerId:
      typeof attachments.producerId === 'string' ? attachments.producerId : undefined,
    consumerId:
      typeof attachments.consumerId === 'string' ? attachments.consumerId : undefined,
    label: typeof attachments.label === 'string' ? attachments.label : undefined,
  };
}

/**
 * Normalize a `scoreReasons` value into a list of reason keys.
 *
 * The field has had three wire shapes and storage holds all of them:
 *
 *   ≤3.2   a single string
 *   3.3–.5 a `string[]` of reason keys
 *   ≥3.6   a `Record<reasonKey, pointsSubtracted>`
 *
 * A producer can also emit a JSON-encoded array, so that is accepted too, and
 * anything unreadable yields an empty list rather than throwing. Record keys
 * come back ordered by points descending, so the biggest contributor to the
 * score reads first; use `toReasonMap` when the magnitudes themselves matter.
 */
export function toReasonList(value: unknown): string[] {
  if (value == null) return [];

  const map = toReasonMap(value);
  if (map) {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key]) => key);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
      .filter((entry) => entry !== '');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return [];
    // A producer that JSON-encodes the array still resolves to a real list.
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return toReasonList(parsed);
      } catch {
        // Not JSON after all — fall through and treat it as one reason.
      }
    }
    return [trimmed];
  }

  // An object shape has not been seen in the wild; render it rather than drop it.
  if (typeof value === 'object') {
    try {
      return [JSON.stringify(value)];
    } catch {
      return [];
    }
  }

  return [String(value)];
}

/**
 * Read the *magnitudes* out of a `scoreReasons` value.
 *
 * Schema 3.6.0 carries `scoreReasons` as `Record<reasonKey, pointsSubtracted>`,
 * which is the first wire generation to say how much each reason actually cost
 * the score rather than merely that it applied. Earlier vintages carried keys
 * only, and there is no honest number to invent for them — so this returns
 * `undefined` for anything that is not a record of finite numbers, and callers
 * fall back to counting occurrences. Non-numeric entries are dropped; an empty
 * result collapses to `undefined`, matching "omitted when there is nothing to
 * explain".
 */
export function toReasonMap(value: unknown): Record<string, number> | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) return undefined;

  const result: Record<string, number> = {};
  for (const [key, points] of Object.entries(value as Record<string, unknown>)) {
    if (key === '' || typeof points !== 'number' || !Number.isFinite(points)) continue;
    result[key] = points;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/** Join reasons for a single-line context such as a `title` attribute. */
export function reasonsToText(value: unknown): string | undefined {
  const list = toReasonList(value);
  return list.length > 0 ? list.join(' · ') : undefined;
}
