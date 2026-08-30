/**
 * Whole-client rollups across every RTP stream.
 *
 * Each producer and consumer charts its own bitrate, which is the right level
 * for "why is this track bad". These are the other question — "what was this
 * client doing in total" — where a send bitrate that drops while the stream
 * count holds steady says something no per-stream chart shows.
 */

import type { ProcessWebRTCStatsResult } from './statsTypes.ts';

export interface RollupPoint {
  timestamp: Date;
  value: number;
}

export interface ClientRollups {
  /** Sum of every outbound stream's bitrate, in kbps. */
  totalSend: RollupPoint[];
  /** Sum of every inbound stream's bitrate, in kbps. */
  totalRecv: RollupPoint[];
  /** How many RTP streams reported at each moment, both directions. */
  activeStreams: RollupPoint[];
}

const EMPTY: ClientRollups = { totalSend: [], totalRecv: [], activeStreams: [] };

function tsOf(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

function toSortedPoints(map: Map<number, number>): RollupPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, value]) => ({ timestamp: new Date(ts), value }))
    .filter((d) => Number.isFinite(d.value));
}

/** Sum bitrates and stream counts per timestamp across all RTP series. */
export function buildClientRollups(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
): ClientRollups {
  if (!processedStats) return EMPTY;

  const outbound = Object.values(processedStats.timeSeries.outboundRtp ?? {});
  const inbound = Object.values(processedStats.timeSeries.inboundRtp ?? {});

  const sendMap = new Map<number, number>();
  const recvMap = new Map<number, number>();
  const streamMap = new Map<number, number>();

  for (const entry of outbound) {
    for (const v of entry.values ?? []) {
      const ts = tsOf(v.timestamp);
      streamMap.set(ts, (streamMap.get(ts) ?? 0) + 1);
      if (v._actualBitrateKbps == null) continue;
      sendMap.set(ts, (sendMap.get(ts) ?? 0) + v._actualBitrateKbps);
    }
  }

  for (const entry of inbound) {
    for (const v of entry.values ?? []) {
      const ts = tsOf(v.timestamp);
      streamMap.set(ts, (streamMap.get(ts) ?? 0) + 1);
      if (v._actualBitrateKbps == null) continue;
      recvMap.set(ts, (recvMap.get(ts) ?? 0) + v._actualBitrateKbps);
    }
  }

  return {
    totalSend: toSortedPoints(sendMap),
    totalRecv: toSortedPoints(recvMap),
    activeStreams: toSortedPoints(streamMap),
  };
}

/** kbps below 1000, Mbps above — the label used on every bitrate rollup. */
export function formatBitrateKbps(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}Mbps` : `${v.toFixed(0)}kbps`;
}
