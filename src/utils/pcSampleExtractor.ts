import type { ClientSample, PeerConnectionSample, OutboundTrackSample, InboundTrackSample, MediaSourceStats, CodecStats, IceCandidateStats, DataChannelStats } from '../schema/ClientSample.ts';

export interface PcItem<T> {
  pcId: string;
  meta: T;            // first-seen full object (most fields)
  timestamps: Date[]; // one per sample where this item appeared
  seenCount: number;
}

/** Generic: scan all samples, collect unique items by key function */
function collectItems<T extends { id: string; timestamp: number }>(
  samples: ClientSample[],
  selector: (pc: PeerConnectionSample) => T[] | undefined,
  keyFn: (item: T) => string = (item) => item.id,
): Map<string, PcItem<T>> {
  const map = new Map<string, PcItem<T>>();
  for (const sample of samples) {
    for (const pc of sample.peerConnections ?? []) {
      const pcId = pc.peerConnectionId ?? '';
      for (const item of selector(pc) ?? []) {
        const key = `${pcId}:${keyFn(item)}`;
        if (!map.has(key)) {
          map.set(key, { pcId, meta: item, timestamps: [], seenCount: 0 });
        }
        const entry = map.get(key)!;
        entry.timestamps.push(new Date(sample.timestamp));
        entry.seenCount++;
      }
    }
  }
  return map;
}

export type OutboundTrackItem = PcItem<OutboundTrackSample>;
export type InboundTrackItem  = PcItem<InboundTrackSample>;
export type MediaSourceItem   = PcItem<MediaSourceStats>;
export type CodecItem         = PcItem<CodecStats>;
export type IceCandidateItem  = PcItem<IceCandidateStats>;
export type DataChannelItem   = PcItem<DataChannelStats & { _sent?: number[]; _recv?: number[] }>;

export function extractOutboundTracks(samples: ClientSample[]) {
  return collectItems(samples, pc => pc.outboundTracks);
}
export function extractInboundTracks(samples: ClientSample[]) {
  return collectItems(samples, pc => pc.inboundTracks);
}
export function extractMediaSources(samples: ClientSample[]) {
  return collectItems(samples, pc => pc.mediaSources);
}
export function extractCodecs(samples: ClientSample[]) {
  return collectItems(samples, pc => pc.codecs, item => `${item.mimeType}:${item.payloadType ?? ''}`);
}
export function extractIceCandidates(samples: ClientSample[]) {
  return collectItems(samples, pc => pc.iceCandidates);
}
export function extractDataChannels(samples: ClientSample[]) {
  return collectItems(samples, pc => pc.dataChannels);
}

/** Build a simple {timestamp, value} series from per-sample numeric fields */
export function buildFieldSeries(
  samples: ClientSample[],
  pcId: string,
  itemId: string,
  selector: (pc: PeerConnectionSample) => Array<{ id: string; timestamp: number } & Record<string, unknown>> | undefined,
  field: string,
): { timestamp: Date; value: number }[] {
  const result: { timestamp: Date; value: number }[] = [];
  for (const sample of samples) {
    for (const pc of sample.peerConnections ?? []) {
      if ((pc.peerConnectionId ?? '') !== pcId) continue;
      const items = selector(pc) ?? [];
      const item = items.find(i => i.id === itemId);
      if (!item) continue;
      const v = (item as Record<string, unknown>)[field];
      if (typeof v === 'number' && Number.isFinite(v)) {
        result.push({ timestamp: new Date(sample.timestamp), value: v });
      }
    }
  }
  return result;
}
