import type { ServerProducer as Producer, ServerConsumer as Consumer } from './routerServerData.ts';
import type {
  InboundRtpTimeSeriesEntry,
  InboundTimeSeriesValue,
  OutboundRtpTimeSeriesEntry,
  OutboundTimeSeriesValue,
  ProcessWebRTCStatsResult,
} from './statsTypes.ts';

export interface UnmatchedRtpEntry {
  key: string;
  direction: 'outbound' | 'inbound';
  kind?: string;
  ssrc?: number;
  producerId?: string;
  consumerId?: string;
  peerConnectionId?: string;
  values: OutboundTimeSeriesValue[] | InboundTimeSeriesValue[];
}

function claimOutbound(
  series: Record<string, OutboundRtpTimeSeriesEntry>,
  producers: Producer[],
): Set<string> {
  const claimed = new Set<string>();
  for (const [key, entry] of Object.entries(series)) {
    const matchesProducer = producers.some(
      (p) =>
        entry.producerId === p.id ||
        (entry.peerConnectionId === p.transportId &&
          ((entry.rid != null && p.rids?.includes(entry.rid)) ||
            (entry.ssrc != null && p.ssrcs?.includes(entry.ssrc)))),
    );
    if (matchesProducer) claimed.add(key);
  }
  return claimed;
}

function claimInbound(
  series: Record<string, InboundRtpTimeSeriesEntry>,
  consumers: Consumer[],
): Set<string> {
  const claimed = new Set<string>();
  for (const [key, entry] of Object.entries(series)) {
    const matchesConsumer = consumers.some(
      (c) => entry.consumerId === c.id || (c.producerId != null && entry.producerId === c.producerId),
    );
    if (matchesConsumer) claimed.add(key);
  }
  return claimed;
}

function collectUnmatched<T extends OutboundRtpTimeSeriesEntry | InboundRtpTimeSeriesEntry>(
  series: Record<string, T> | undefined,
  claimed: Set<string>,
  direction: 'outbound' | 'inbound',
): UnmatchedRtpEntry[] {
  if (!series) return [];
  return Object.entries(series)
    .filter(([key, entry]) => !claimed.has(key) && entry.values?.length)
    .map(([key, entry]) => ({
      key,
      direction,
      kind: entry.kind,
      ssrc: entry.ssrc,
      producerId: 'producerId' in entry ? entry.producerId : undefined,
      consumerId: 'consumerId' in entry ? entry.consumerId : undefined,
      peerConnectionId: entry.peerConnectionId,
      values: entry.values,
    }));
}

export function findUnmatchedRtp(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  producers: Producer[],
  consumers: Consumer[],
): UnmatchedRtpEntry[] {
  const outbound = processedStats?.timeSeries?.outboundRtp;
  const inbound = processedStats?.timeSeries?.inboundRtp;
  return [
    ...collectUnmatched(
      outbound,
      outbound ? claimOutbound(outbound, producers) : new Set(),
      'outbound',
    ),
    ...collectUnmatched(
      inbound,
      inbound ? claimInbound(inbound, consumers) : new Set(),
      'inbound',
    ),
  ];
}
