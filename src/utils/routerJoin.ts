/**
 * Utility functions for joining router/server-side samples with client-side
 * WebRTC stats (outbound/inbound RTP time series).
 */

import type { MediasoupRouterSample, MediasoupProducerSample, MediasoupConsumerSample } from '../schema/MediasoupRouter.ts';
import type {
  ProcessWebRTCStatsResult,
  OutboundRtpTimeSeriesEntry,
  InboundRtpTimeSeriesEntry,
} from './statsTypes.ts';

/** Get all producers from all router samples as a flat array. */
export function getAllProducers(
  routerSamples: Map<string, MediasoupRouterSample>,
): MediasoupProducerSample[] {
  const result: MediasoupProducerSample[] = [];
  for (const sample of routerSamples.values()) {
    if (sample.producers) result.push(...sample.producers);
  }
  return result;
}

/** Get all consumers from all router samples as a flat array. */
export function getAllConsumers(
  routerSamples: Map<string, MediasoupRouterSample>,
): MediasoupConsumerSample[] {
  const result: MediasoupConsumerSample[] = [];
  for (const sample of routerSamples.values()) {
    if (sample.consumers) result.push(...sample.consumers);
  }
  return result;
}

/** Find outbound RTP time-series entries linked to a producerId. */
export function findOutboundRtpForProducer(
  processedStats: ProcessWebRTCStatsResult,
  producerId: string,
): Array<{ streamId: string; entry: OutboundRtpTimeSeriesEntry }> {
  const result: Array<{ streamId: string; entry: OutboundRtpTimeSeriesEntry }> = [];
  for (const [streamId, entry] of Object.entries(processedStats.timeSeries.outboundRtp)) {
    if (entry.producerId === producerId) {
      result.push({ streamId, entry });
    }
  }
  // Also check allObjects for producerId stored there
  if (result.length === 0) {
    for (const [streamId, entry] of Object.entries(processedStats.timeSeries.outboundRtp)) {
      const meta = processedStats.allObjects.outboundRtps.get(streamId);
      if (meta?.producerId === producerId) {
        result.push({ streamId, entry });
      }
    }
  }
  return result;
}

/** Find inbound RTP time-series entries linked to a consumerId. */
export function findInboundRtpForConsumer(
  processedStats: ProcessWebRTCStatsResult,
  consumerId: string,
): Array<{ streamId: string; entry: InboundRtpTimeSeriesEntry }> {
  const result: Array<{ streamId: string; entry: InboundRtpTimeSeriesEntry }> = [];
  for (const [streamId, entry] of Object.entries(processedStats.timeSeries.inboundRtp)) {
    if (entry.consumerId === consumerId) {
      result.push({ streamId, entry });
    }
  }
  // Also check allObjects
  if (result.length === 0) {
    for (const [streamId, entry] of Object.entries(processedStats.timeSeries.inboundRtp)) {
      const meta = processedStats.allObjects.inboundRtps.get(streamId);
      if (meta?.consumerId === consumerId) {
        result.push({ streamId, entry });
      }
    }
  }
  return result;
}

/** Find outbound track attachments for a producerId (scan peerConnections). */
export function findOutboundTrackAttachments(
  processedStats: ProcessWebRTCStatsResult,
  producerId: string,
): Array<{ pcId: string; trackId: string; attachments: Record<string, unknown> }> {
  const result: Array<{ pcId: string; trackId: string; attachments: Record<string, unknown> }> = [];
  for (const pc of processedStats.peerConnections) {
    const pcId = pc.peerConnectionId ?? String(pc.index);
    for (const rtp of pc.outboundRtps) {
      if (rtp.trackAttachments?.producerId === producerId || rtp.producerId === producerId) {
        const trackId = rtp.trackIdentifier ?? rtp.id ?? '';
        result.push({ pcId, trackId, attachments: rtp.trackAttachments ?? {} });
      }
    }
  }
  return result;
}

/** Find inbound track attachments for a consumerId (scan peerConnections). */
export function findInboundTrackAttachments(
  processedStats: ProcessWebRTCStatsResult,
  consumerId: string,
): Array<{ pcId: string; trackId: string; attachments: Record<string, unknown> }> {
  const result: Array<{ pcId: string; trackId: string; attachments: Record<string, unknown> }> = [];
  for (const pc of processedStats.peerConnections) {
    const pcId = pc.peerConnectionId ?? String(pc.index);
    for (const rtp of pc.inboundRtps) {
      if (rtp.trackAttachments?.consumerId === consumerId || rtp.consumerId === consumerId) {
        const trackId = rtp.trackIdentifier ?? rtp.id ?? '';
        result.push({ pcId, trackId, attachments: rtp.trackAttachments ?? {} });
      }
    }
  }
  return result;
}

/** Filter time series values to a time window [startMs, endMs]. */
export function filterToLifetime<T extends { timestamp: Date | number }>(
  values: T[],
  startMs: number,
  endMs?: number,
): T[] {
  return values.filter((v) => {
    const ts = v.timestamp instanceof Date ? v.timestamp.getTime() : (v.timestamp as number);
    if (ts < startMs) return false;
    if (endMs != null && ts > endMs) return false;
    return true;
  });
}
