import type {
  CandidatePairTimeSeriesEntry,
  CandidatePairTimeSeriesValue,
  InboundRtpTimeSeriesEntry,
  OutboundRtpTimeSeriesEntry,
  ProcessWebRTCStatsResult,
} from './statsTypes.ts';

/** Alias for processed client stats (single source of truth in statsTypes). */
export type ProcessedClientStats = ProcessWebRTCStatsResult;

export interface CpuTimelinePoint {
  timestamp: Date;
  encode: number;
  decode: number;
  total: number;
}

export interface BandwidthTimelineEntry extends Record<string, number | Date> {
  timestamp: Date;
  total: number;
}

export interface BandwidthTimelines {
  send: BandwidthTimelineEntry[] | null;
  recv: BandwidthTimelineEntry[] | null;
  sendTransportIds: string[];
  recvTransportIds: string[];
  transportLabels: Record<string, string>;
}

export interface RttTimelinePoint {
  timestamp: Date;
  value: number;
}

export interface RttTimeline {
  pcId: string;
  label: string;
  data: RttTimelinePoint[];
}

export function buildAggregatedCpuTimeline(
  processedClientStats: ProcessedClientStats | null | undefined
): CpuTimelinePoint[] | null {
  if (!processedClientStats) return null;
  const ts = processedClientStats.timeSeries;
  const buckets = new Map<number, { timestamp: Date; encode: number; decode: number }>();

  const addToBucket = (
    timestamp: string | Date | number,
    field: 'encode' | 'decode',
    value: number
  ) => {
    const key = new Date(timestamp).getTime();
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        timestamp: new Date(timestamp),
        encode: 0,
        decode: 0,
      });
    }
    const bucket = buckets.get(key)!;
    bucket[field] += value;
  };

  for (const series of Object.values(ts.outboundRtp ?? {})) {
    if (series.kind !== 'video') continue;
    for (const v of series.values ?? []) {
      if (v.encodeCpuPercent != null) addToBucket(v.timestamp, 'encode', v.encodeCpuPercent);
    }
  }

  for (const series of Object.values(ts.inboundRtp ?? {})) {
    if (series.kind !== 'video') continue;
    for (const v of series.values ?? []) {
      if (v.decodeCpuPercent != null) addToBucket(v.timestamp, 'decode', v.decodeCpuPercent);
    }
  }

  if (buckets.size < 2) return null;

  return Array.from(buckets.values())
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((d) => ({ ...d, total: d.encode + d.decode }));
}

type CandidatePairSample = CandidatePairTimeSeriesEntry['values'][number];

export function buildSelectedPairCombinedValues(
  processedClientStats: ProcessedClientStats,
  pcId: string,
): CandidatePairSample[] {
  const ts = processedClientStats.timeSeries;
  const candidatePairs = Object.values(ts.candidatePairs ?? {}).filter(
    (p) => p.peerConnectionId === pcId,
  );
  if (candidatePairs.length === 0) return [];

  const iceSelected = ts.iceSelectedPair?.[pcId];
  const iceValues = iceSelected?.values ?? [];

  const getSelectedPairIdAt = (tsMs: number): string | null => {
    let selectedId: string | null = null;
    for (const v of iceValues) {
      if (new Date(v.timestamp).getTime() > tsMs) break;
      if (v.selectedCandidatePairId) selectedId = v.selectedCandidatePairId;
    }
    return selectedId;
  };

  if (iceValues.length > 0) {
    const allTimestamps = new Map<number, CandidatePairSample[]>();
    for (const p of candidatePairs) {
      for (const v of p.values ?? []) {
        const key = new Date(v.timestamp).getTime();
        if (!allTimestamps.has(key)) allTimestamps.set(key, []);
        allTimestamps.get(key)!.push(v);
      }
    }
    const combined: CandidatePairSample[] = [];
    for (const [tsMs, values] of [...allTimestamps.entries()].sort((a, b) => a[0] - b[0])) {
      const selectedId = getSelectedPairIdAt(tsMs);
      const match = selectedId
        ? values.find((v) => v.id === selectedId)
        : values.find((v) => v.state === 'succeeded') ?? values[0];
      if (match) combined.push(match);
    }
    return combined;
  }

  let fallback: CandidatePairTimeSeriesEntry | null = null;
  let lastT = 0;
  for (const p of candidatePairs) {
    const last = [...(p.values ?? [])]
      .reverse()
      .find((v) => v.state === 'succeeded');
    if (last) {
      const t = new Date(last.timestamp).getTime();
      if (t >= lastT) {
        lastT = t;
        fallback = p;
      }
    }
  }
  return fallback?.values ?? [];
}

export interface TransportInfo {
  id: string;
  hybrid: boolean;
  role?: string;
}

export function buildTransportLabel(
  direction: 'Send' | 'Recv' | 'Send+Recv',
  pcId: string,
  transports?: TransportInfo[],
): string {
  const t = transports?.find((tr) => tr.id === pcId);
  if (t?.hybrid) return `${direction} Transport (Hybrid)`;
  if (t?.role === 'consuming' && direction === 'Send') return 'Recv Transport';
  if (t?.role === 'producing' && direction === 'Recv') return 'Send Transport';
  return `${direction} Transport`;
}

export function buildAggregatedBandwidthTimelines(
  processedClientStats: ProcessedClientStats | null | undefined,
  transports?: TransportInfo[],
): BandwidthTimelines | null {
  if (!processedClientStats) return null;

  const ts = processedClientStats.timeSeries;
  const pcTimelines: Array<{
    pcId: string;
    label: string;
    hasOutbound: boolean;
    hasInbound: boolean;
    values: CandidatePairTimeSeriesValue[];
  }> = [];

  for (const pc of processedClientStats.peerConnections ?? []) {
    const pcId = pc.peerConnectionId;
    if (!pcId) continue;
    const values = buildSelectedPairCombinedValues(processedClientStats, pcId);
    if (values.length <= 1) continue;

    const hasOutbound = Object.values(ts.outboundRtp ?? {}).some(
      (s: OutboundRtpTimeSeriesEntry) => s.peerConnectionId === pcId,
    );
    const hasInbound = Object.values(ts.inboundRtp ?? {}).some(
      (s: InboundRtpTimeSeriesEntry) => s.peerConnectionId === pcId,
    );
    let direction: 'Send' | 'Recv' | 'Send+Recv';
    if (hasOutbound && !hasInbound) direction = 'Send';
    else if (!hasOutbound && hasInbound) direction = 'Recv';
    else if (hasOutbound && hasInbound) direction = 'Send+Recv';
    else {
      // No RTP streams (e.g. data-channel-only transport) — infer from server role
      const role = transports?.find((tr) => tr.id === pcId)?.role;
      direction = role === 'consuming' ? 'Recv' : 'Send';
    }
    const label = buildTransportLabel(direction, pcId, transports);

    pcTimelines.push({
      pcId,
      label,
      hasOutbound,
      hasInbound,
      values,
    });
  }

  if (pcTimelines.length === 0) return null;

  const transportLabels: Record<string, string> = {};
  for (const t of pcTimelines) {
    transportLabels[t.pcId] = t.label;
  }

  const sendPcs = pcTimelines.filter((t) => t.hasOutbound);
  const recvPcs = pcTimelines.filter((t) => t.hasInbound);
  const sendTransportIds = sendPcs.map((t) => t.pcId);
  const recvTransportIds = recvPcs.map((t) => t.pcId);

  const sendBuckets = new Map<
    number,
    Record<string, number> & { timestamp: Date; total: number; bwe?: number }
  >();
  const recvBuckets = new Map<
    number,
    Record<string, number> & { timestamp: Date; total: number }
  >();

  const ensureBucket = <T extends Record<string, number> & { timestamp: Date; total: number }>(
    map: Map<number, T>,
    key: number,
    create: () => T,
  ) => {
    if (!map.has(key)) {
      const entry = create();
      map.set(key, entry);
    }
    return map.get(key)!;
  };

  for (const { pcId, values } of sendPcs) {
    for (const v of values) {
      const key = new Date(v.timestamp).getTime();
      if (v._sendBitrateKbps != null || v.availableOutgoingBitrate != null) {
        const b = ensureBucket(sendBuckets, key, () => {
            const entry = { timestamp: new Date(v.timestamp), total: 0, bwe: 0 } as Record<
              string,
              number
            > & { timestamp: Date; total: number; bwe: number };
            for (const id of sendTransportIds) entry[id] = 0;
            return entry;
          });
        if (v._sendBitrateKbps != null) {
          b[pcId] += v._sendBitrateKbps;
          b.total += v._sendBitrateKbps;
        }
        if (v.availableOutgoingBitrate != null) {
          if (b.bwe == null) b.bwe = 0;
          b.bwe += v.availableOutgoingBitrate / 1000;
        }
      }
    }
  }

  for (const { pcId, values } of recvPcs) {
    for (const v of values) {
      const key = new Date(v.timestamp).getTime();
      if (v._recvBitrateKbps != null) {
        const b = ensureBucket(recvBuckets, key, () => {
            const entry = { timestamp: new Date(v.timestamp), total: 0 } as Record<
              string,
              number
            > & { timestamp: Date; total: number };
            for (const id of recvTransportIds) entry[id] = 0;
            return entry;
          });
        b[pcId] += v._recvBitrateKbps;
        b.total += v._recvBitrateKbps;
      }
    }
  }

  const send = Array.from(sendBuckets.values()).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const recv = Array.from(recvBuckets.values()).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  return {
    send: send.length >= 2 ? send : null,
    recv: recv.length >= 2 ? recv : null,
    sendTransportIds,
    recvTransportIds,
    transportLabels,
  };
}

export function buildAggregatedRttTimeline(
  processedClientStats: ProcessedClientStats | null | undefined,
  transports?: TransportInfo[],
): RttTimeline[] | null {
  if (!processedClientStats) return null;

  const ts = processedClientStats.timeSeries;
  const pcTimelines: RttTimeline[] = [];

  for (const pc of processedClientStats.peerConnections ?? []) {
    const pcId = pc.peerConnectionId;
    if (!pcId) continue;
    const values = buildSelectedPairCombinedValues(processedClientStats, pcId);
    if (values.length <= 1) continue;

    const rttPoints = values
      .filter((v) => v._rttMs != null && v._rttMs > 0)
      .map((v) => ({ timestamp: new Date(v.timestamp), value: v._rttMs! }));
    if (rttPoints.length < 2) continue;

    const hasOutbound = Object.values(ts.outboundRtp ?? {}).some(
      (s: OutboundRtpTimeSeriesEntry) => s.peerConnectionId === pcId,
    );
    const hasInbound = Object.values(ts.inboundRtp ?? {}).some(
      (s: InboundRtpTimeSeriesEntry) => s.peerConnectionId === pcId,
    );
    let direction: 'Send' | 'Recv' | 'Send+Recv';
    if (hasOutbound && !hasInbound) direction = 'Send';
    else if (!hasOutbound && hasInbound) direction = 'Recv';
    else if (hasOutbound && hasInbound) direction = 'Send+Recv';
    else {
      const role = transports?.find((tr) => tr.id === pcId)?.role;
      direction = role === 'consuming' ? 'Recv' : 'Send';
    }
    const label = buildTransportLabel(direction, pcId, transports);

    pcTimelines.push({
      pcId,
      label,
      data: rttPoints,
    });
  }

  if (pcTimelines.length === 0) return null;
  return pcTimelines;
}
