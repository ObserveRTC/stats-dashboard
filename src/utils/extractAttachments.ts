import type { ClientSample } from '../schema/ClientSample.ts';

export interface AttachmentGroup {
  source: string;       // human label, e.g. "Client", "PC abc12345", "Outbound Track"
  sourceId?: string;    // raw id for copy/tooltip
  entries: { key: string; value: unknown }[];
}

type AnyRecord = Record<string, unknown>;

/** Merge key/value pairs from a Record into a target map, keeping the first non-null value per key. */
function mergeInto(target: Map<string, unknown>, src: AnyRecord | null | undefined) {
  if (!src) return;
  for (const [k, v] of Object.entries(src)) {
    if (v == null) continue;
    if (!target.has(k)) target.set(k, v);
  }
}

/** Convert a deduplicated Map into a sorted entry array, filtering nullish values. */
function toEntries(map: Map<string, unknown>): { key: string; value: unknown }[] {
  return Array.from(map.entries())
    .filter(([, v]) => v != null && v !== '')
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ key, value }));
}

/**
 * Walk the entire ClientSample array and collect all attachment key/value pairs,
 * grouped by their source type. Values are deduplicated per key per group —
 * since the same attachment typically repeats across samples, only the first
 * non-null occurrence is kept.
 */
export function extractAllAttachments(samples: ClientSample[] | null | undefined): AttachmentGroup[] {
  if (!samples?.length) return [];

  // Root client attachments — single group
  const clientMap = new Map<string, unknown>();
  // Per-PC attachments — keyed by peerConnectionId
  const pcMaps = new Map<string, Map<string, unknown>>();
  // Outbound / inbound track attachments — merged into one group each
  const outTrackMap = new Map<string, unknown>();
  const inTrackMap = new Map<string, unknown>();
  // Outbound / inbound RTP attachments — merged into one group each
  const outRtpMap = new Map<string, unknown>();
  const inRtpMap = new Map<string, unknown>();
  // Other stat attachments — keyed by stat type name
  const otherMaps = new Map<string, Map<string, unknown>>();

  function otherMap(name: string): Map<string, unknown> {
    if (!otherMaps.has(name)) otherMaps.set(name, new Map());
    return otherMaps.get(name)!;
  }

  for (const sample of samples) {
    // Root
    mergeInto(clientMap, sample.attachments as AnyRecord);

    for (const pc of sample.peerConnections ?? []) {
      const pcId = pc.peerConnectionId ?? 'unknown';
      if (!pcMaps.has(pcId)) pcMaps.set(pcId, new Map());
      mergeInto(pcMaps.get(pcId)!, pc.attachments as AnyRecord);

      for (const t of pc.outboundTracks ?? [])
        mergeInto(outTrackMap, t.attachments as AnyRecord);
      for (const t of pc.inboundTracks ?? [])
        mergeInto(inTrackMap, t.attachments as AnyRecord);

      for (const r of pc.outboundRtps ?? [])
        mergeInto(outRtpMap, r.attachments as AnyRecord);
      for (const r of pc.inboundRtps ?? [])
        mergeInto(inRtpMap, r.attachments as AnyRecord);
      for (const r of pc.remoteInboundRtps ?? [])
        mergeInto(otherMap('Remote Inbound RTP'), r.attachments as AnyRecord);
      for (const r of pc.remoteOutboundRtps ?? [])
        mergeInto(otherMap('Remote Outbound RTP'), r.attachments as AnyRecord);

      for (const c of pc.iceCandidates ?? [])
        mergeInto(otherMap('ICE Candidates'), c.attachments as AnyRecord);
      for (const p of pc.iceCandidatePairs ?? [])
        mergeInto(otherMap('ICE Candidate Pairs'), p.attachments as AnyRecord);
      for (const t of (pc as unknown as { iceTransports?: { attachments?: AnyRecord }[] }).iceTransports ?? [])
        mergeInto(otherMap('ICE Transport'), t.attachments);
      for (const d of pc.dataChannels ?? [])
        mergeInto(otherMap('Data Channels'), d.attachments as AnyRecord);
      for (const m of pc.mediaSources ?? [])
        mergeInto(otherMap('Media Sources'), m.attachments as AnyRecord);
      for (const p of (pc as unknown as { mediaPlayouts?: { attachments?: AnyRecord }[] }).mediaPlayouts ?? [])
        mergeInto(otherMap('Media Playouts'), p.attachments);
      for (const c of pc.codecs ?? [])
        mergeInto(otherMap('Codecs'), c.attachments as AnyRecord);
      for (const c of pc.certificates ?? [])
        mergeInto(otherMap('Certificates'), c.attachments as AnyRecord);
    }
  }

  const groups: AttachmentGroup[] = [];

  const clientEntries = toEntries(clientMap);
  if (clientEntries.length) {
    groups.push({ source: 'Client', entries: clientEntries });
  }

  for (const [pcId, map] of pcMaps) {
    const entries = toEntries(map);
    if (entries.length) {
      groups.push({
        source: `Peer Connection`,
        sourceId: pcId,
        entries,
      });
    }
  }

  const outTrackEntries = toEntries(outTrackMap);
  if (outTrackEntries.length) {
    groups.push({ source: 'Outbound Tracks', entries: outTrackEntries });
  }

  const inTrackEntries = toEntries(inTrackMap);
  if (inTrackEntries.length) {
    groups.push({ source: 'Inbound Tracks', entries: inTrackEntries });
  }

  const outRtpEntries = toEntries(outRtpMap);
  if (outRtpEntries.length) {
    groups.push({ source: 'Outbound RTP', entries: outRtpEntries });
  }

  const inRtpEntries = toEntries(inRtpMap);
  if (inRtpEntries.length) {
    groups.push({ source: 'Inbound RTP', entries: inRtpEntries });
  }

  for (const [name, map] of otherMaps) {
    const entries = toEntries(map);
    if (entries.length) {
      groups.push({ source: name, entries });
    }
  }

  return groups;
}
