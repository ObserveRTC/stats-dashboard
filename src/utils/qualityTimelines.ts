import type { ClientSample } from '../schema/ClientSample.ts';
import type { InboundRtpStats, OutboundRtpStats, RemoteInboundRtpStats } from '../schema/ClientSample.ts';
import { getTrackAttachments } from '../schema/clientSampleParse.ts';
import {
  classifyRtpQuality,
  snapshotRtpForQuality,
  QUALITY_STATE_PRIORITY,
  buildPauseLookup,
  isScreenShareLabel,
  type StreamWithHistory,
} from './qualityClassifier.ts';
import { buildMonotonicTimestamps } from './statsProcessor.ts';
import { buildTransportLabel, type TransportInfo } from './healthMetrics.ts';

export interface QualitySample {
  timestamp: number;
  state: string;
}

export interface PerTransportQuality {
  pcId: string;
  label: string;
  samples: QualitySample[];
}

export interface QualityLimitationData {
  upload: PerTransportQuality[];
  download: PerTransportQuality[];
}

function rtpAsRecord(rtp: OutboundRtpStats | InboundRtpStats): Record<string, unknown> {
  return rtp as Record<string, unknown>;
}

export function buildQualityLimitationTimelines(
  clientStats: ClientSample[] | null | undefined,
  producers?: StreamWithHistory[],
  consumers?: StreamWithHistory[],
  transports?: TransportInfo[],
): QualityLimitationData | null {
  if (!clientStats || clientStats.length === 0) return null;

  const monotonicTs = buildMonotonicTimestamps(clientStats);

  const sendPcIds = new Set<string>();
  const recvPcIds = new Set<string>();
  for (const sample of clientStats) {
    for (const pc of sample.peerConnections ?? []) {
      const id = pc.peerConnectionId;
      if (!id) continue;
      if (pc.attachments?.direction === 'send') sendPcIds.add(id);
      if (pc.attachments?.direction === 'recv') recvPcIds.add(id);
    }
  }

  const sendPcList = [...sendPcIds];
  const recvPcList = [...recvPcIds];

  const isProducerPaused = buildPauseLookup(producers ?? []);
  const isConsumerPaused = buildPauseLookup(consumers ?? []);

  const screenShareProducers = new Set<string>();
  for (const p of producers ?? []) {
    if (isScreenShareLabel(p.label)) screenShareProducers.add(p.id);
  }
  const screenShareConsumers = new Set<string>();
  for (const c of consumers ?? []) {
    if (isScreenShareLabel((c as StreamWithHistory & { label?: string }).label)) {
      screenShareConsumers.add(c.id);
    }
  }

  const ssrcToProducerId = new Map<string, string>();
  const ssrcToConsumerId = new Map<string, string>();

  const prevOutbound = new Map<string, Record<string, unknown>>();
  const prevInbound = new Map<string, Record<string, unknown>>();

  const sendTimelines = new Map<string, QualitySample[]>();
  for (const id of sendPcList) sendTimelines.set(id, []);
  const recvTimelines = new Map<string, QualitySample[]>();
  for (const id of recvPcList) recvTimelines.set(id, []);

  for (let sIdx = 0; sIdx < clientStats.length; sIdx++) {
    const sample = clientStats[sIdx];
    const ts: number = monotonicTs[sIdx].getTime();
    if (!Number.isFinite(ts)) continue;
    if (!sample.peerConnections?.length) continue;

    for (const pc of sample.peerConnections) {
      const pcId = pc.peerConnectionId;
      if (!pcId) continue;

      const msToTrackId = new Map<string, string>();
      for (const ms of pc.mediaSources ?? []) {
        if (ms.id != null && ms.trackIdentifier != null) {
          msToTrackId.set(ms.id, ms.trackIdentifier);
        }
      }
      const midToMsId = new Map<string, string>();
      for (const rtp of pc.outboundRtps ?? []) {
        if (rtp.mid != null && rtp.mediaSourceId != null) {
          midToMsId.set(String(rtp.mid), rtp.mediaSourceId);
        }
      }

      const trackToProducer = new Map<string, string>();
      for (const track of pc.outboundTracks ?? []) {
        const { producerId } = getTrackAttachments(track.attachments);
        if (producerId && track.id) trackToProducer.set(track.id, producerId);
      }
      const trackToConsumer = new Map<string, string>();
      for (const track of pc.inboundTracks ?? []) {
        const { consumerId } = getTrackAttachments(track.attachments);
        if (consumerId && track.id) trackToConsumer.set(track.id, consumerId);
      }

      for (const rtp of pc.outboundRtps ?? []) {
        const ssrcKey = `${pcId}:${rtp.ssrc ?? rtp.id}`;
        const mediaSourceId =
          rtp.mediaSourceId ?? (rtp.mid != null ? midToMsId.get(String(rtp.mid)) : undefined);
        const trackId =
          rtp.trackIdentifier ?? (mediaSourceId ? msToTrackId.get(mediaSourceId) : undefined);
        const pid = trackId ? trackToProducer.get(trackId) : undefined;
        if (pid) ssrcToProducerId.set(ssrcKey, pid);
      }
      for (const rtp of pc.inboundRtps ?? []) {
        const ssrcKey = `${pcId}:${rtp.ssrc ?? rtp.id}`;
        const trackId = rtp.trackIdentifier;
        const cid = trackId ? trackToConsumer.get(trackId) : undefined;
        if (cid) ssrcToConsumerId.set(ssrcKey, cid);
      }

      if (pc.attachments?.direction === 'send' && sendTimelines.has(pcId)) {
        let worst = 'good';
        const riMap = new Map<string, RemoteInboundRtpStats>();
        for (const ri of pc.remoteInboundRtps ?? []) {
          if (ri.id) riMap.set(ri.id, ri);
        }
        for (const rtp of pc.outboundRtps ?? []) {
          const key = `${pcId}:${rtp.ssrc ?? rtp.id}`;
          const prev = prevOutbound.get(key);
          const remoteRtp = rtp.remoteId ? riMap.get(rtp.remoteId) : null;
          const producerId = ssrcToProducerId.get(key);
          const isScreen = producerId != null && screenShareProducers.has(producerId);
          let state = classifyRtpQuality(
            'send',
            rtp.kind,
            rtpAsRecord(rtp),
            prev ?? null,
            remoteRtp ? rtpAsRecord(remoteRtp) : null,
            undefined,
            undefined,
            isScreen,
          );
          prevOutbound.set(key, snapshotRtpForQuality(rtpAsRecord(rtp)));

          if (producerId && isProducerPaused(producerId, ts)) state = 'good';

          if (
            (QUALITY_STATE_PRIORITY[state as keyof typeof QUALITY_STATE_PRIORITY] || 0) >
            (QUALITY_STATE_PRIORITY[worst as keyof typeof QUALITY_STATE_PRIORITY] || 0)
          ) {
            worst = state;
          }
        }
        sendTimelines.get(pcId)!.push({ timestamp: ts, state: worst });
      }

      if (pc.attachments?.direction === 'recv' && recvTimelines.has(pcId)) {
        let worst = 'good';
        for (const rtp of pc.inboundRtps ?? []) {
          const key = `${pcId}:${rtp.ssrc ?? rtp.id}`;
          const prev = prevInbound.get(key);
          const consumerId = ssrcToConsumerId.get(key);
          const isScreen = consumerId != null && screenShareConsumers.has(consumerId);
          let state = classifyRtpQuality(
            'recv',
            rtp.kind,
            rtpAsRecord(rtp),
            prev ?? null,
            null,
            undefined,
            undefined,
            isScreen,
          );
          prevInbound.set(key, snapshotRtpForQuality(rtpAsRecord(rtp)));

          if (consumerId && isConsumerPaused(consumerId, ts)) state = 'good';

          if (
            (QUALITY_STATE_PRIORITY[state as keyof typeof QUALITY_STATE_PRIORITY] || 0) >
            (QUALITY_STATE_PRIORITY[worst as keyof typeof QUALITY_STATE_PRIORITY] || 0)
          ) {
            worst = state;
          }
        }
        recvTimelines.get(pcId)!.push({ timestamp: ts, state: worst });
      }
    }
  }

  const upload: PerTransportQuality[] = [];
  for (const pcId of sendPcList) {
    const samples = sendTimelines.get(pcId)!;
    if (samples.length < 2) continue;
    samples.sort((a, b) => a.timestamp - b.timestamp);
    const label = buildTransportLabel('Send', pcId, transports);
    upload.push({ pcId, label, samples });
  }

  const download: PerTransportQuality[] = [];
  for (const pcId of recvPcList) {
    const samples = recvTimelines.get(pcId)!;
    if (samples.length < 2) continue;
    samples.sort((a, b) => a.timestamp - b.timestamp);
    const label = buildTransportLabel('Recv', pcId, transports);
    download.push({ pcId, label, samples });
  }

  if (upload.length === 0 && download.length === 0) return null;
  return { upload, download };
}
