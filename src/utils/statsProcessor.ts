import type {
  ClientSample,
  IceCandidateStats,
  IceTransportStats,
  PeerConnectionSample,
  RemoteInboundRtpStats,
  RemoteOutboundRtpStats,
} from '../schema/ClientSample.ts';
import {
  asClientSamples,
  collectExtensionStats,
  findExtensionPayload,
  getTrackAttachments,
  parseClientEventPayload,
  parseJsonPayload,
  type ParsedPayload,
  type TrackAttachments,
  toReasonList,
  toReasonMap,
} from '../schema/clientSampleParse.ts';
import type {
  ClientRecordingEvent,
  GlitchMetricsSample,
  InboundRtpTimeSeriesEntry,
  InboundTimeSeriesValue,
  OutboundRtpTimeSeriesEntry,
  OutboundTimeSeriesValue,
  PlayoutMetricsSample,
  ProcessWebRTCStatsResult,
  RecorderServiceSample,
  TimeSeriesValueBase,
} from './statsTypes.ts';

function pickIceStatField(
  sources: Array<Record<string, unknown> | null | undefined>,
  ...fieldNames: string[]
): unknown {
  for (const source of sources) {
    if (!source) continue;
    for (const field of fieldNames) {
      if (source[field] != null) return source[field];
    }
  }
  return null;
}

export type { ProcessWebRTCStatsResult } from './statsTypes.ts';

/** Numeric field read for delta metric helpers. */
function metricNum(row: object, field: string): number | undefined {
  const v = (row as Record<string, unknown>)[field];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

type MetricRow = TimeSeriesValueBase & Record<string, number | string | Date | undefined>;

export interface ClientMeta {
  userAgent: string | null;
  constraints: unknown;
  devices: unknown[];
}

export function extractClientMeta(clientStats: ClientSample[] | unknown): ClientMeta {
  const meta: ClientMeta = { userAgent: null, constraints: null, devices: [] };
  for (const sample of asClientSamples(clientStats)) {
    for (const item of sample.clientMetaItems ?? []) {
      if (!item.type || item.payload == null) continue;
      const parsed = parseJsonPayload(item.payload);
      if (!parsed) continue;
      if (item.type === 'USER_AGENT_DATA' && !meta.userAgent) {
        meta.userAgent =
          typeof parsed.ua === 'string' ? parsed.ua : JSON.stringify(parsed);
      }
      if (
        item.type === 'MEDIA_DEVICES_SUPPORTED_CONSTRAINTS' &&
        !meta.constraints
      ) {
        meta.constraints = parsed;
      }
      if (item.type === 'MEDIA_DEVICE') {
        meta.devices.push(parsed);
      }
    }
  }
  return meta;
}

/**
 * Extract the display name from the first ClientSample that has one in its
 * root-level `attachments` record. Returns null if none found.
 */
export function extractDisplayName(clientStats: ClientSample[] | unknown): string | null {
  for (const sample of asClientSamples(clientStats)) {
    const name = sample.attachments?.['displayName'];
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return null;
}

/**
 * Parse a timestamp value to milliseconds.
 */
export function tsToMs(t: unknown): number {
  if (typeof t === 'number') return t;
  if (t instanceof Date) return t.getTime();
  return new Date(t as string).getTime();
}

/**
 * Build a monotonic timestamp array from raw stats.
 *
 * Client clock changes mid-session produce non-monotonic timestamps.
 * We detect jumps by comparing inter-sample gaps against the median cadence.
 * When a jump is detected, subsequent timestamps are rebased to maintain
 * the regular cadence. This preserves collection order and true spacing
 * while making timestamps suitable for time-axis display.
 */
/** Accepts full samples or any object with a numeric `timestamp` (e.g. quality classifier stubs). */
export function buildMonotonicTimestamps(stats: Array<{ timestamp: number }>): Date[] {
  if (stats.length === 0) return [];

  const rawMs = stats.map((s) => tsToMs(s.timestamp));

  if (rawMs.length < 3) return rawMs.map((ms) => new Date(ms));

  // Compute median cadence from consecutive deltas
  const deltas: number[] = [];
  for (let i = 1; i < rawMs.length; i++) {
    deltas.push(rawMs[i] - rawMs[i - 1]);
  }
  const sortedDeltas = deltas.slice().sort((a, b) => a - b);
  const medianCadence = sortedDeltas[Math.floor(sortedDeltas.length / 2)];

  // A jump is any gap that deviates from the median by more than 10x
  const jumpThreshold = Math.max(Math.abs(medianCadence) * 10, 30_000);

  const result: number[] = [rawMs[0]];
  let adjustment = 0;

  for (let i = 1; i < rawMs.length; i++) {
    const gap = rawMs[i] - rawMs[i - 1];
    if (Math.abs(gap - medianCadence) > jumpThreshold) {
      // Clock jump detected — absorb the discontinuity
      adjustment += gap - medianCadence;
    }
    result.push(rawMs[i] - adjustment);
  }

  return result.map((ms) => new Date(ms));
}

// let lastVpConsoleLogKey = '';

export function processWebRTCStats(clientStats: ClientSample[] | unknown): ProcessWebRTCStatsResult {
  const result: ProcessWebRTCStatsResult = {
    peerConnections: [],
    timeSeries: {
      outboundRtp: {},
      inboundRtp: {},
      candidatePairs: {},
      transport: {},
      iceSelectedPair: {},
      mediaSourceAudio: {},
      mediaSourceVideo: {},
      mediaPlayouts: {},
      peerConnectionTransport: {},
      iceTransport: {},
      audioMetrics: {
        glitchMetrics: [],
        playoutMetrics: [],
      },
    },
    scores: {
      session: [],
      perPc: {},
      perTrack: {},
    },
    codecs: new Map(),
    dataChannels: {},
    allObjects: {
      outboundRtps: new Map(),
      inboundRtps: new Map(),
      candidatePairs: new Map(),
      peerConnections: new Map(),
      iceCandidates: new Map(),
    },
    recorderServiceSamples: [],
    clientRecordingEvents: [],
    videoProcessingSamples: [],
  };

  const stats = asClientSamples(clientStats);
  if (!stats.length) return result;

  const monotonicTs = buildMonotonicTimestamps(stats);
  // Key by peerConnectionId:trackId so the same track on different PCs
  // (e.g. camera vs camera-hq) resolves to the correct producerId.
  const trackIdToAttachmentMap = new Map<string, TrackAttachments>();
  // Full raw attachment record for each track — preserved for display purposes.
  const trackIdToFullAttachments = new Map<string, Record<string, unknown>>();

  for (const sample of stats) {
    if (!sample.peerConnections?.length) continue;
    for (const pc of sample.peerConnections) {
      const pcId = pc.peerConnectionId || '';
      for (const track of pc.inboundTracks ?? []) {
        if (track.id && track.attachments) {
          trackIdToAttachmentMap.set(`${pcId}:${track.id}`, getTrackAttachments(track.attachments));
          if (!trackIdToFullAttachments.has(`${pcId}:${track.id}`))
            trackIdToFullAttachments.set(`${pcId}:${track.id}`, track.attachments as Record<string, unknown>);
        }
      }
      for (const track of pc.outboundTracks ?? []) {
        if (track.id && track.attachments) {
          trackIdToAttachmentMap.set(`${pcId}:${track.id}`, getTrackAttachments(track.attachments));
          if (!trackIdToFullAttachments.has(`${pcId}:${track.id}`))
            trackIdToFullAttachments.set(`${pcId}:${track.id}`, track.attachments as Record<string, unknown>);
        }
      }
    }
  }

  stats.forEach((sample, sampleIndex) => {
    if (!sample.peerConnections?.length) return;

    sample.peerConnections.forEach((pc, pcIndex) => {
      const pcKey = pc.peerConnectionId || `pc_${pcIndex}`;
      if (!result.allObjects.peerConnections.has(pcKey)) {
        result.allObjects.peerConnections.set(pcKey, {
          peerConnectionId: pc.peerConnectionId,
          transportId: pc.peerConnectionId,
          index: pcIndex,
          firstSeen: sampleIndex,
          lastSeen: sampleIndex,
        });
      } else {
        const pcInfo = result.allObjects.peerConnections.get(pcKey);
        if (pcInfo) pcInfo.lastSeen = sampleIndex;
      }

      // Build mediaSourceId → trackIdentifier map for this PC
      const msIdToTrackId = new Map<string, string>();
      for (const ms of pc.mediaSources ?? []) {
        if (ms.id != null && ms.trackIdentifier != null) {
          msIdToTrackId.set(ms.id, ms.trackIdentifier);
        }
      }

      // Build mid → mediaSourceId map so simulcast layers without mediaSourceId
      // (secondary encodings like r1, r2) can inherit from the primary encoding
      const midToMediaSourceId = new Map<string, string>();
      for (const rtp of pc.outboundRtps ?? []) {
        if (rtp.mid != null && rtp.mediaSourceId != null) {
          midToMediaSourceId.set(String(rtp.mid), rtp.mediaSourceId);
        }
      }

      const mergeRtpObject = <T extends { id: string; trackIdentifier?: string; ssrc?: number; bytesSent?: number; bytesReceived?: number }>(
        mapName: 'outboundRtps' | 'inboundRtps' | 'candidatePairs',
        items: T[] | undefined,
        prefix: string,
        extra: Record<string, unknown>,
      ) => {
        if (!items?.length) return;
        const map = result.allObjects[mapName];
        for (const item of items) {
          const key =
            item.trackIdentifier ||
            item.id ||
            `${pcKey}_${prefix}_ssrc_${item.ssrc ?? 'unknown'}`;
          if (!map.has(key)) {
            map.set(key, {
              ...item,
              ...extra,
              peerConnectionId: pc.peerConnectionId,
              pcIndex,
              firstSeen: sampleIndex,
              lastSeen: sampleIndex,
            });
          } else {
            const existing = map.get(key)!;
            existing.lastSeen = sampleIndex;
            if ('bytesSent' in item && item.bytesSent != null && 'bytesSent' in existing) {
              const ex = existing as { bytesSent?: number };
              if (ex.bytesSent == null || item.bytesSent > ex.bytesSent) {
                ex.bytesSent = item.bytesSent;
              }
            }
            if (
              'bytesReceived' in item &&
              item.bytesReceived != null &&
              'bytesReceived' in existing
            ) {
              const ex = existing as { bytesReceived?: number };
              if (ex.bytesReceived == null || item.bytesReceived > ex.bytesReceived) {
                ex.bytesReceived = item.bytesReceived;
              }
            }
          }
        }
      };

      for (const rtp of pc.outboundRtps ?? []) {
        const mediaSourceId =
          rtp.mediaSourceId ??
          (rtp.mid != null ? midToMediaSourceId.get(String(rtp.mid)) : undefined);
        const trackId =
          rtp.trackIdentifier ??
          (mediaSourceId != null ? msIdToTrackId.get(mediaSourceId) : undefined);
        const att = trackId != null ? trackIdToAttachmentMap.get(`${pcKey}:${trackId}`) ?? {} : {};
        const fullAtt = trackId != null ? trackIdToFullAttachments.get(`${pcKey}:${trackId}`) : undefined;
        mergeRtpObject('outboundRtps', [rtp], 'out', {
          producerId: att.producerId,
          label: att.label,
          ...(fullAtt ? { trackAttachments: fullAtt } : {}),
        });
      }
      for (const rtp of pc.inboundRtps ?? []) {
        const trackId = rtp.trackIdentifier;
        const att = (trackId ? trackIdToAttachmentMap.get(`${pcKey}:${trackId}`) : undefined) ?? {};
        const fullAtt = trackId ? trackIdToFullAttachments.get(`${pcKey}:${trackId}`) : undefined;
        mergeRtpObject('inboundRtps', [rtp], 'in', {
          producerId: att.producerId,
          consumerId: att.consumerId,
          ...(fullAtt ? { trackAttachments: fullAtt } : {}),
        });
      }
      mergeRtpObject('candidatePairs', pc.iceCandidatePairs, 'pair', {});
      for (const c of pc.iceCandidates ?? []) {
        const key = c.id;
        const iceMap = result.allObjects.iceCandidates;
        if (!iceMap.has(key)) {
          iceMap.set(key, {
            ...c,
            peerConnectionId: pc.peerConnectionId,
            pcIndex,
            firstSeen: sampleIndex,
            lastSeen: sampleIndex,
          });
        } else {
          iceMap.get(key)!.lastSeen = sampleIndex;
        }
      }
    });
  });

  result.peerConnections = Array.from(
    result.allObjects.peerConnections.values(),
  ).map((pcInfo) => ({
    ...pcInfo,
    outboundRtps: Array.from(result.allObjects.outboundRtps.values()).filter(
      (rtp) => rtp.peerConnectionId === pcInfo.peerConnectionId,
    ),
    inboundRtps: Array.from(result.allObjects.inboundRtps.values()).filter(
      (rtp) => rtp.peerConnectionId === pcInfo.peerConnectionId,
    ),
    candidatePairs: Array.from(result.allObjects.candidatePairs.values()).filter(
      (pair) => pair.peerConnectionId === pcInfo.peerConnectionId,
    ),
  }));

  stats.forEach((sample, sampleIndex) => {
    const timestamp = monotonicTs[sampleIndex];

    const sampleMs = timestamp.getTime();
    if (sample.peerConnections?.length) {
      sample.peerConnections.forEach((pc, pcIndex) => {
        const pcKey = pc.peerConnectionId || `pc_${pcIndex}`;

        const pushRtpTimeSeries = <
          T extends { id: string; trackIdentifier?: string; ssrc?: number },
        >(
          seriesKey: 'outboundRtp' | 'inboundRtp' | 'candidatePairs',
          objectsKey: 'outboundRtps' | 'inboundRtps' | 'candidatePairs',
          items: T[] | undefined,
          prefix: string,
        ) => {
          for (const item of items ?? []) {
            const key =
              item.trackIdentifier ||
              item.id ||
              `${pcKey}_${prefix}_ssrc_${item.ssrc ?? 'unknown'}`;
            result.timeSeries[seriesKey][key] ??= {
              ...(result.allObjects[objectsKey].get(key) || {}),
              values: [],
            };
            result.timeSeries[seriesKey][key].values.push({
              timestamp,
              sampleIndex,
              ...item,
            });
          }
        };
        pushRtpTimeSeries('outboundRtp', 'outboundRtps', pc.outboundRtps, 'out');
        pushRtpTimeSeries('inboundRtp', 'inboundRtps', pc.inboundRtps, 'in');
        pushRtpTimeSeries('candidatePairs', 'candidatePairs', pc.iceCandidatePairs, 'pair');

        // Merge remoteInboundRtp per-stream metrics into outbound entries
        // Build lookup by id and SSRC for flexible matching
        const riById = new Map<string, RemoteInboundRtpStats>();
        const riBySsrc = new Map<number, RemoteInboundRtpStats>();
        for (const ri of pc.remoteInboundRtps ?? []) {
          if (ri.id) riById.set(ri.id, ri);
          if (ri.ssrc != null) riBySsrc.set(ri.ssrc, ri);
        }
        for (const outRtp of pc.outboundRtps ?? []) {
          // Match via remoteId → ri.id, then localId, then SSRC fallback
          let ri = outRtp.remoteId ? riById.get(outRtp.remoteId) : undefined;
          if (!ri && outRtp.ssrc != null) ri = riBySsrc.get(outRtp.ssrc);
          if (!ri) return;
          const key =
            outRtp.trackIdentifier ||
            outRtp.id ||
            `${pcKey}_out_ssrc_${outRtp.ssrc ?? 'unknown'}`;
          const series = result.timeSeries.outboundRtp[key];
          if (!series?.values.length) return;
          const v = series.values[series.values.length - 1] as OutboundTimeSeriesValue;
          if (ri.roundTripTime != null) v._remoteRttMs = ri.roundTripTime * 1000;
          if (ri.fractionLost != null)
            v._remoteFractionLostPct = ri.fractionLost * 100;
          if (ri.jitter != null) v._remoteJitterMs = ri.jitter * 1000;
          if (ri.packetsLost != null) v._remotePacketsLost = ri.packetsLost;
          if (ri.roundTripTimeMeasurements != null) v._remoteRttMeasurements = ri.roundTripTimeMeasurements;
          if (ri.totalRoundTripTime != null) v._remoteTotalRtt = ri.totalRoundTripTime;
          v._hasRemoteInbound = true;
        }

        // Merge remoteOutboundRtp per-stream metrics into inbound entries
        // Build lookup by id and SSRC for flexible matching
        const roById = new Map<string, RemoteOutboundRtpStats>();
        const roBySsrc = new Map<number, RemoteOutboundRtpStats>();
        for (const ro of pc.remoteOutboundRtps ?? []) {
          if (ro.id) roById.set(ro.id, ro);
          if (ro.ssrc != null) roBySsrc.set(ro.ssrc, ro);
        }
        for (const inRtp of pc.inboundRtps ?? []) {
          // Match via remoteId → ro.id, then localId, then SSRC fallback
          let ro = inRtp.remoteId ? roById.get(inRtp.remoteId) : undefined;
          if (!ro && inRtp.ssrc != null) ro = roBySsrc.get(inRtp.ssrc);
          if (!ro) return;
          const key =
            inRtp.trackIdentifier ||
            inRtp.id ||
            `${pcKey}_in_ssrc_${inRtp.ssrc ?? 'unknown'}`;
          const series = result.timeSeries.inboundRtp[key];
          if (!series?.values.length) return;
          const v = series.values[series.values.length - 1] as InboundTimeSeriesValue;
          if (ro.roundTripTime != null) v._remoteRttMs = ro.roundTripTime * 1000;
          if (ro.totalRoundTripTime != null) v._remoteTotalRtt = ro.totalRoundTripTime;
          if (ro.roundTripTimeMeasurements != null) v._remoteRttMeasurements = ro.roundTripTimeMeasurements;
          if (ro.packetsSent != null) v._remotePacketsSent = ro.packetsSent;
          if (ro.bytesSent != null) v._remoteBytesSent = ro.bytesSent;
          if (ro.reportsSent != null) v._remoteReportsSent = ro.reportsSent;
          if (ro.remoteTimestamp != null) v._remoteTimestamp = ro.remoteTimestamp;
          v._hasRemoteOutbound = true;
        }

        {
          const pairs = pc.iceCandidatePairs ?? [];
          const candById = new Map<string, IceCandidateStats>();
          for (const c of pc.iceCandidates ?? []) {
            const key = c.id;
            if (key) candById.set(key, c);
          }
          if (pairs.length > 0) {
            const selected =
              pairs.find((p) => p.nominated === true) ||
              pairs.find((p) => (p as Record<string, unknown>).selected === true) ||
              pairs.find((p) => p.state === 'succeeded') ||
              null;
            if (selected) {
              const seriesKey = pc.peerConnectionId || pcKey;
              if (!result.timeSeries.iceSelectedPair[seriesKey]) {
                result.timeSeries.iceSelectedPair[seriesKey] = {
                  peerConnectionId: seriesKey,
                  values: [],
                };
              }
              const local = selected.localCandidateId
                ? candById.get(selected.localCandidateId)
                : null;
              const localRec = local as Record<string, unknown> | undefined;
              const selectedRec = selected as Record<string, unknown>;
              const candidateType = pickIceStatField(
                [localRec, selectedRec],
                'candidateType',
                'type',
                'localCandidateType',
              );
              const ip = pickIceStatField(
                [localRec, selectedRec],
                'address',
                'ip',
                'ipAddress',
                'localAddress',
                'localIp',
                'localAddr',
              );
              const relayProtocol = pickIceStatField(
                [localRec, selectedRec],
                'relayProtocol',
                'localRelayProtocol',
                'turnProtocol',
              );
              const turnUrl = pickIceStatField(
                [localRec, selectedRec],
                'url',
                'relayUrl',
                'turnUrl',
                'serverUrl',
              );
              const isRelay =
                String(candidateType || '').toLowerCase() === 'relay' ||
                !!relayProtocol ||
                (turnUrl && String(turnUrl).startsWith('turn:'));
              const iceTransport = (pc.iceTransports ?? []).find(
                (t: IceTransportStats) => t.selectedCandidatePairChanges != null,
              );
              result.timeSeries.iceSelectedPair[seriesKey].values.push({
                timestamp,
                selectedCandidatePairId: selected.id || null,
                state: isRelay ? 'relay' : 'direct',
                candidateType: candidateType as string | null,
                localCandidateType: candidateType as string | null,
                localNetworkType: pickIceStatField(
                  [localRec, selectedRec],
                  'networkType',
                  'localNetworkType',
                ) as string | null,
                localAddress: ip as string | null,
                localPort: pickIceStatField([localRec, selectedRec], 'port', 'localPort') as
                  | number
                  | null,
                localProtocol: pickIceStatField(
                  [localRec, selectedRec],
                  'protocol',
                  'localProtocol',
                ) as string | null,
                ip: ip as string | null,
                relayProtocol: relayProtocol as string | null,
                url: turnUrl as string | null,
                selectedCandidatePairChanges: iceTransport?.selectedCandidatePairChanges ?? null,
              });
            }
          }
        }

        // Extract audio mediaSource data
        if (
          pc.attachments?.direction === 'send' &&
          Array.isArray(pc.mediaSources)
        ) {
          const trackToProducer = new Map<string, TrackAttachments>();
          for (const track of pc.outboundTracks ?? []) {
            if (track.id && track.attachments?.producerId) {
              trackToProducer.set(track.id, getTrackAttachments(track.attachments));
            }
          }
          for (const ms of pc.mediaSources) {
            if (ms.kind !== 'audio' || !ms.trackIdentifier) continue;
            const att = trackToProducer.get(ms.trackIdentifier);
            if (!att?.producerId) continue;
            const pid = att.producerId;
            if (!result.timeSeries.mediaSourceAudio[pid]) {
              result.timeSeries.mediaSourceAudio[pid] = {
                producerId: pid,
                label: att.label || 'audio',
                values: [],
              };
            }
            result.timeSeries.mediaSourceAudio[pid].values.push({
              timestamp,
              audioLevel: ms.audioLevel,
              totalAudioEnergy: ms.totalAudioEnergy,
              totalSamplesDuration: ms.totalSamplesDuration,
              echoReturnLoss: ms.echoReturnLoss,
              echoReturnLossEnhancement: ms.echoReturnLossEnhancement,
            });
          }
          for (const ms of pc.mediaSources) {
            if (ms.kind !== 'video' || !ms.trackIdentifier) continue;
            const att = trackToProducer.get(ms.trackIdentifier);
            if (!att?.producerId) continue;
            const pid = att.producerId;
            if (!result.timeSeries.mediaSourceVideo[pid]) {
              result.timeSeries.mediaSourceVideo[pid] = {
                producerId: pid,
                label: att.label || 'video',
                values: [],
              };
            }
            result.timeSeries.mediaSourceVideo[pid].values.push({
              timestamp,
              width: ms.width,
              height: ms.height,
              frames: ms.frames,
              framesPerSecond: ms.framesPerSecond,
            });
          }
        }
      });
    }

    // Extract quality scores
    if (sample.score != null) {
      result.scores.session.push({
        timestamp,
        score: sample.score,
        reasons: toReasonList(sample.scoreReasons),
        penalties: toReasonMap(sample.scoreReasons),
      });
    }
    if (sample.peerConnections) {
      const seenPlayoutKeys = new Set<string>();
      for (let pcIndex = 0; pcIndex < sample.peerConnections.length; pcIndex++) {
        const pc: PeerConnectionSample = sample.peerConnections[pcIndex];
        const pcId = pc.peerConnectionId;
        const pcKey = pc.peerConnectionId || `pc_${pcIndex}`;
        const pcDirection =
          typeof pc.attachments?.direction === 'string' ? pc.attachments.direction : undefined;
        if (pc.score != null && pcId) {
          if (!result.scores.perPc[pcId]) result.scores.perPc[pcId] = { direction: pcDirection, values: [] };
          result.scores.perPc[pcId].values.push({
            timestamp,
            score: pc.score,
            reasons: toReasonList(pc.scoreReasons),
            penalties: toReasonMap(pc.scoreReasons),
          });
        }
        for (const track of pc.outboundTracks || []) {
          if (track.score != null && track.id) {
            // Key by pcId:trackId to avoid collision when same track is on multiple PCs
            const trackScoreKey = `${pcKey}:${track.id}`;
            if (!result.scores.perTrack[trackScoreKey])
              result.scores.perTrack[trackScoreKey] = {
                kind: 'outbound',
                trackId: track.id,
                peerConnectionId: pcId,
                producerId: getTrackAttachments(track.attachments).producerId,
                values: [],
              };
            result.scores.perTrack[trackScoreKey].values.push({
              timestamp,
              score: track.score,
              reasons: toReasonList(track.scoreReasons),
              penalties: toReasonMap(track.scoreReasons),
            });
          }
        }
        for (const track of pc.inboundTracks || []) {
          if (track.score != null && track.id) {
            const trackScoreKey = `${pcKey}:${track.id}`;
            if (!result.scores.perTrack[trackScoreKey])
              result.scores.perTrack[trackScoreKey] = {
                kind: 'inbound',
                trackId: track.id,
                peerConnectionId: pcId,
                consumerId: getTrackAttachments(track.attachments).consumerId,
                values: [],
              };
            result.scores.perTrack[trackScoreKey].values.push({
              timestamp,
              score: track.score,
              reasons: toReasonList(track.scoreReasons),
              penalties: toReasonMap(track.scoreReasons),
            });
          }
        }
        // Collect mediaPlayouts time series (deduplicated across PCs within same sample)
        for (const mp of pc.mediaPlayouts || []) {
          const mpKey = mp.id || mp.kind || 'default';
          if (seenPlayoutKeys.has(mpKey)) continue;
          seenPlayoutKeys.add(mpKey);
          if (!result.timeSeries.mediaPlayouts[mpKey]) {
            result.timeSeries.mediaPlayouts[mpKey] = {
              id: mpKey,
              kind: mp.kind || 'audio',
              values: [],
            };
          }
          result.timeSeries.mediaPlayouts[mpKey].values.push({
            ...mp,
            timestamp,
          });
        }
        // Collect codec details
        for (const codec of pc.codecs || []) {
          if (codec.mimeType && !result.codecs.has(codec.mimeType)) {
            result.codecs.set(codec.mimeType, {
              mimeType: codec.mimeType,
              clockRate: codec.clockRate,
              channels: codec.channels,
              sdpFmtpLine: codec.sdpFmtpLine,
              payloadType: codec.payloadType,
            });
          }
        }
        // Collect iceTransport bytes/packets so we can estimate non-RTP traffic
        // (SCTP data channels + RTCP + STUN) by subtracting the RTP totals below.
        for (const it of pc.iceTransports || []) {
          const pcTransportId = pc.peerConnectionId || pcKey;
          if (!result.timeSeries.iceTransport[pcTransportId]) {
            result.timeSeries.iceTransport[pcTransportId] = {
              peerConnectionId: pcTransportId,
              direction: pcDirection,
              values: [],
            };
          }
          result.timeSeries.iceTransport[pcTransportId].values.push({
            timestamp,
            sampleIndex,
            bytesSent: it.bytesSent,
            bytesReceived: it.bytesReceived,
            packetsSent: it.packetsSent,
            packetsReceived: it.packetsReceived,
            iceState: it.iceState,
            dtlsState: it.dtlsState,
          });
        }
        // Collect data channel status (snapshot + time series)
        for (const pct of pc.peerConnectionTransports || []) {
          if (
            pct.dataChannelsOpened != null ||
            pct.dataChannelsClosed != null
          ) {
            const pcTransportId = pc.peerConnectionId || pcKey;
            const opened = pct.dataChannelsOpened || 0;
            const closed = pct.dataChannelsClosed || 0;
            result.dataChannels[pcTransportId] = { opened, closed };
            if (!result.timeSeries.peerConnectionTransport[pcTransportId]) {
              result.timeSeries.peerConnectionTransport[pcTransportId] = {
                peerConnectionId: pcTransportId,
                direction: pcDirection,
                values: [],
              };
            }
            result.timeSeries.peerConnectionTransport[pcTransportId].values.push({
              timestamp,
              dataChannelsOpened: opened,
              dataChannelsClosed: closed,
              dataChannelsActive: Math.max(0, opened - closed),
            });
          }
        }
      }
    }

    const ext = collectExtensionStats(sample);
    if (ext.length > 0) {
      const pushAudioExtension = (
        extensionType: string,
        build: (data: ParsedPayload) => Omit<GlitchMetricsSample, 'timestamp' | 'audioProcessorEnabled'> | Omit<PlayoutMetricsSample, 'timestamp' | 'audioProcessorEnabled'>,
        target: 'glitchMetrics' | 'playoutMetrics',
      ) => {
        const parsed = findExtensionPayload(ext, extensionType);
        if (parsed?.timestamp == null) return;
        const ctx = parsed.context;
        const audioProcessorEnabled =
          ctx != null && typeof ctx === 'object' && !Array.isArray(ctx)
            ? (ctx as ParsedPayload).audioProcessorEnabled
            : undefined;
        const row = {
          timestamp: new Date(parsed.timestamp as number | string),
          ...build(parsed),
          audioProcessorEnabled: audioProcessorEnabled as boolean | undefined,
        };
        if (target === 'glitchMetrics') {
          result.timeSeries.audioMetrics.glitchMetrics.push(row as GlitchMetricsSample);
        } else {
          result.timeSeries.audioMetrics.playoutMetrics.push(row as PlayoutMetricsSample);
        }
      };
      pushAudioExtension(
        'MEDIA_STREAM_TRACK_GLITCH_METRICS',
        (data) => ({
          undeliveredFramesFraction: Number(data.undeliveredFramesFraction) || 0,
          undeliveredEventFrequency: Number(data.undeliveredEventFrequency) || 0,
        }),
        'glitchMetrics',
      );
      pushAudioExtension(
        'WEB_AUDIO_PLAYOUT_GLITCH_METRICS',
        (data) => ({
          fallbackFramesFraction: Number(data.fallbackFramesFraction) || 0,
          fallbackEventFrequency: Number(data.fallbackEventFrequency) || 0,
        }),
        'playoutMetrics',
      );

      const recorderParsed = findExtensionPayload(ext, 'recorderServiceStats');
      if (recorderParsed) {
        const session = recorderParsed.session;
        const sessionObj =
          session != null && typeof session === 'object' && !Array.isArray(session)
            ? (session as ParsedPayload)
            : null;
        const archives = sessionObj?.archives;
        result.recorderServiceSamples.push({
          timestamp,
          state: typeof recorderParsed.state === 'string' ? recorderParsed.state : 'unknown',
          sessionState:
            typeof sessionObj?.state === 'string' ? sessionObj.state : null,
          archives:
            archives != null && typeof archives === 'object' && !Array.isArray(archives)
              ? (archives as RecorderServiceSample['archives'])
              : {},
        });
      }
    }

    for (const ev of sample.clientEvents ?? []) {
      if (!ev.type) continue;
      const payload = parseClientEventPayload(ev);
      const recordingEv: ClientRecordingEvent = {
        timestamp: ev.timestamp != null ? new Date(ev.timestamp) : timestamp,
        type: ev.type,
        payload,
      };
      result.clientRecordingEvents.push(recordingEv);
    }
  });

  // Inner helper functions
  function deriveDeltaMetrics(values: TimeSeriesValueBase[]): void {
    if (values.length < 2) return;
    for (let i = 1; i < values.length; i++) {
      const curr = values[i] as MetricRow;
      const prev = values[i - 1] as MetricRow;
      const dWallSec =
        (new Date(curr.timestamp).getTime() -
          new Date(prev.timestamp).getTime()) /
        1000;
      if (dWallSec <= 0) continue;

      const delta = (field: string): number | undefined => {
        const c = metricNum(curr, field);
        const p = metricNum(prev, field);
        if (c == null || p == null) return undefined;
        return c >= p ? c - p : undefined;
      };

      const dBytes = delta('bytesSent') ?? delta('bytesReceived');
      if (dBytes !== undefined && dBytes > 0)
        curr._actualBitrateKbps = (dBytes * 8) / dWallSec / 1000;

      const dEncTime = delta('totalEncodeTime');
      const dEncFrames = delta('framesEncoded');
      if (dEncTime !== undefined && dEncFrames !== undefined) {
        curr.encodeTimePerFrame =
          dEncFrames > 0 ? (dEncTime / dEncFrames) * 1000 : undefined;
        curr.encodeCpuPercent = (dEncTime / dWallSec) * 100;
      }

      const dDecTime = delta('totalDecodeTime');
      const dDecFrames = delta('framesDecoded');
      if (dDecTime !== undefined && dDecFrames !== undefined) {
        curr.decodeTimePerFrame =
          dDecFrames > 0 ? (dDecTime / dDecFrames) * 1000 : undefined;
        curr.decodeCpuPercent = (dDecTime / dWallSec) * 100;
      }

      const dQp = delta('qpSum');
      const dQpFrames = dEncFrames ?? delta('framesDecoded');
      if (dQp !== undefined && dQpFrames !== undefined && dQpFrames > 0)
        curr._avgQp = dQp / dQpFrames;

      const dRetransPktSent = delta('retransmittedPacketsSent');
      const dPktSent = delta('packetsSent');
      if (
        dRetransPktSent !== undefined &&
        dPktSent !== undefined &&
        dPktSent > 0
      )
        curr._retransmitPct = (dRetransPktSent / dPktSent) * 100;

      const dRetransPktRecv = delta('retransmittedPacketsReceived');
      const dPktRecv = delta('packetsReceived');
      if (
        dRetransPktRecv !== undefined &&
        dPktRecv !== undefined &&
        dPktRecv > 0
      )
        curr._retransmitPct = (dRetransPktRecv / dPktRecv) * 100;

      const dSendDelay = delta('totalPacketSendDelay');
      if (
        dSendDelay !== undefined &&
        dPktSent !== undefined &&
        dPktSent > 0
      )
        curr._pktSendDelayMs = (dSendDelay / dPktSent) * 1000;

      const dJbDelay = delta('jitterBufferDelay');
      const dJbEmitted = delta('jitterBufferEmittedCount');
      if (
        dJbDelay !== undefined &&
        dJbEmitted !== undefined &&
        dJbEmitted > 0
      )
        curr._jbDelayMs = (dJbDelay / dJbEmitted) * 1000;

      const dConcealed = delta('concealedSamples');
      const dSamplesRecv = delta('totalSamplesReceived');
      if (
        dConcealed !== undefined &&
        dSamplesRecv !== undefined &&
        dSamplesRecv > 0
      )
        curr._concealmentPct = (dConcealed / dSamplesRecv) * 100;

      const dIfd = delta('totalInterFrameDelay');
      const dSqIfd = delta('totalSquaredInterFrameDelay');
      const dIfdFrames = delta('framesDecoded');
      if (
        dIfd !== undefined &&
        dSqIfd !== undefined &&
        dIfdFrames !== undefined &&
        dIfdFrames > 1
      ) {
        const mean = dIfd / dIfdFrames;
        const variance = dSqIfd / dIfdFrames - mean * mean;
        curr._ifdJitterMs =
          variance > 0 ? Math.sqrt(variance) * 1000 : 0;
      }

      const dKeyEnc = delta('keyFramesEncoded');
      if (dKeyEnc !== undefined) curr._keyFrames = dKeyEnc;
      const dKeyDec = delta('keyFramesDecoded');
      if (dKeyDec !== undefined) curr._keyFrames = dKeyDec;

      const dFreeze = delta('totalFreezesDuration');
      if (dFreeze !== undefined)
        curr._freezeFractionPct = (dFreeze / dWallSec) * 100;

      const dPktLost = delta('packetsLost');
      if (
        dPktLost !== undefined &&
        dPktRecv !== undefined &&
        dPktLost + dPktRecv > 0
      ) {
        curr._packetLossRatePct =
          (dPktLost / (dPktLost + dPktRecv)) * 100;
      }

      const targetBitrate = metricNum(curr, 'targetBitrate');
      const actualBr = curr._actualBitrateKbps;
      if (typeof actualBr === 'number' && targetBitrate != null && targetBitrate > 0) {
        curr._bwUtilPct = (actualBr / (targetBitrate / 1000)) * 100;
      }

      const dJbTarget = delta('jitterBufferTargetDelay');
      if (
        dJbTarget !== undefined &&
        dJbEmitted !== undefined &&
        dJbEmitted > 0
      )
        curr._jbTargetDelayMs = (dJbTarget / dJbEmitted) * 1000;

      const dJbMin = delta('jitterBufferMinimumDelay');
      if (
        dJbMin !== undefined &&
        dJbEmitted !== undefined &&
        dJbEmitted > 0
      )
        curr._jbMinDelayMs = (dJbMin / dJbEmitted) * 1000;

      const dPause = delta('totalPausesDuration');
      if (dPause !== undefined)
        curr._pauseFractionPct = (dPause / dWallSec) * 100;

      const dSilentConcealed = delta('silentConcealedSamples');
      if (
        dSilentConcealed !== undefined &&
        dConcealed !== undefined &&
        dConcealed > 0
      ) {
        curr._silentConcealRatio =
          (dSilentConcealed / dConcealed) * 100;
      }

      const dAssembly = delta('totalAssemblyTime');
      if (
        dAssembly !== undefined &&
        dDecFrames !== undefined &&
        dDecFrames > 0
      ) {
        curr._assemblyTimePerFrameMs =
          (dAssembly / dDecFrames) * 1000;
      }

      const dProcessing = delta('totalProcessingDelay');
      if (
        dProcessing !== undefined &&
        dDecFrames !== undefined &&
        dDecFrames > 0
      ) {
        curr._processingDelayPerFrameMs =
          (dProcessing / dDecFrames) * 1000;
      }

      const dFecRecv = delta('fecPacketsReceived');
      const dFecDiscard = delta('fecPacketsDiscarded');
      if (
        dFecRecv !== undefined &&
        dFecDiscard !== undefined &&
        dFecRecv + dFecDiscard > 0
      ) {
        curr._fecDiscardRatePct =
          (dFecDiscard / (dFecRecv + dFecDiscard)) * 100;
      }

      const dInserted = delta('insertedSamplesForDeceleration');
      const dRemoved = delta('removedSamplesForAcceleration');
      if (
        dInserted !== undefined &&
        dRemoved !== undefined &&
        dSamplesRecv !== undefined &&
        dSamplesRecv > 0
      ) {
        curr._jbManipRatePct =
          ((dInserted + dRemoved) / dSamplesRecv) * 100;
      }

      const dQlResChanges = delta('qualityLimitationResolutionChanges');
      if (dQlResChanges !== undefined)
        curr._qlResChanges = dQlResChanges;

      const dHugeFrames = delta('hugeFramesSent');
      if (dHugeFrames !== undefined) curr._hugeFramesDelta = dHugeFrames;

      const dAssembledMulti = delta('framesAssembledFromMultiplePackets');
      const dFramesRecv = delta('framesReceived');
      if (
        dAssembledMulti !== undefined &&
        dFramesRecv !== undefined &&
        dFramesRecv > 0
      ) {
        curr._multiPacketFramePct = (dAssembledMulti / dFramesRecv) * 100;
      }

      const frameWidth = metricNum(curr, 'frameWidth');
      const frameHeight = metricNum(curr, 'frameHeight');
      if (frameWidth != null && frameHeight != null) {
        curr._resolution = frameWidth * frameHeight;
      }

      // Quality limitation duration breakdown (outbound video)
      const cql = curr.qualityLimitationDurations as Record<string, number> | undefined;
      const pql = prev.qualityLimitationDurations as Record<string, number> | undefined;
      if (cql && pql) {
        const dBw = Math.max(0, (cql.bandwidth ?? 0) - (pql.bandwidth ?? 0));
        const dCpuQl = Math.max(0, (cql.cpu ?? 0) - (pql.cpu ?? 0));
        const dOther = Math.max(0, (cql.other ?? 0) - (pql.other ?? 0));
        const dTotal = dBw + dCpuQl + dOther + Math.max(0, (cql.none ?? 0) - (pql.none ?? 0));
        if (dTotal > 0) {
          curr._qlBandwidthPct = (dBw / dTotal) * 100;
          curr._qlCpuPct = (dCpuQl / dTotal) * 100;
          curr._qlOtherPct = (dOther / dTotal) * 100;
        }
      }

      const framesReceived = metricNum(curr, 'framesReceived');
      const framesDecoded = metricNum(curr, 'framesDecoded');
      if (framesReceived != null && framesDecoded != null) {
        curr._pendingDecodeFrames = framesReceived - framesDecoded;
      }

      const estPlayout = metricNum(curr, 'estimatedPlayoutTimestamp');
      const prevEstPlayout = metricNum(prev, 'estimatedPlayoutTimestamp');
      if (estPlayout != null && prevEstPlayout != null) {
        const dWallMs =
          new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        const dPlayoutMs = estPlayout - prevEstPlayout;
        if (dWallMs > 0) {
          curr._playoutDriftMs = dWallMs - dPlayoutMs;
        }
      }

      const jbDelay = metricNum(curr, '_jbDelayMs');
      if (jbDelay != null) {
        curr._e2eReceiveLatencyMs = jbDelay + (metricNum(curr, 'decodeTimePerFrame') ?? 0);
      }

      // Remote outbound bitrate (for inbound streams with remoteOutboundRtp data)
      const dRemoteBytes = delta('_remoteBytesSent');
      if (dRemoteBytes !== undefined && dRemoteBytes > 0)
        curr._remoteActualBitrateKbps = (dRemoteBytes * 8) / dWallSec / 1000;

      // Remote average RTT from totalRoundTripTime / measurements
      const dRemoteTotalRtt = delta('_remoteTotalRtt');
      const dRemoteRttMeasurements = delta('_remoteRttMeasurements');
      if (dRemoteTotalRtt !== undefined && dRemoteRttMeasurements !== undefined && dRemoteRttMeasurements > 0)
        curr._remoteAvgRttMs = (dRemoteTotalRtt / dRemoteRttMeasurements) * 1000;

      // Remote packets sent rate
      const dRemotePktSent = delta('_remotePacketsSent');
      if (dRemotePktSent !== undefined && dRemotePktSent > 0)
        curr._remotePacketSentRate = dRemotePktSent / dWallSec;

      // Remote reports sent rate
      const dRemoteReports = delta('_remoteReportsSent');
      if (dRemoteReports !== undefined)
        curr._remoteReportsSentDelta = dRemoteReports;

      // Remote packets lost delta (from remoteInboundRtp)
      const dRemotePktLost = delta('_remotePacketsLost');
      if (dRemotePktLost !== undefined)
        curr._remotePacketsLostDelta = dRemotePktLost;

      // Track encoder/decoder implementation changes
      if (curr.encoderImplementation) curr._encoderImpl = curr.encoderImplementation;
      if (curr.decoderImplementation) curr._decoderImpl = curr.decoderImplementation;
      if (curr.scalabilityMode) curr._scalabilityMode = curr.scalabilityMode;
    }
  }

  function deriveCandidatePairMetrics(values: TimeSeriesValueBase[]): void {
    if (values.length < 2) return;
    for (let i = 1; i < values.length; i++) {
      const curr = values[i] as MetricRow;
      const prev = values[i - 1] as MetricRow;
      const dWallSec =
        (new Date(curr.timestamp).getTime() -
          new Date(prev.timestamp).getTime()) /
        1000;
      if (dWallSec <= 0) continue;

      const delta = (field: string): number | undefined => {
        const c = metricNum(curr, field);
        const p = metricNum(prev, field);
        if (c == null || p == null) return undefined;
        return c >= p ? c - p : undefined;
      };

      const dBytesSent = delta('bytesSent');
      if (dBytesSent !== undefined)
        curr._sendBitrateKbps = (dBytesSent * 8) / dWallSec / 1000;

      const dBytesRecv = delta('bytesReceived');
      if (dBytesRecv !== undefined)
        curr._recvBitrateKbps = (dBytesRecv * 8) / dWallSec / 1000;

      const dPktSent = delta('packetsSent');
      if (dPktSent !== undefined)
        curr._sendPacketRate = dPktSent / dWallSec;

      const dPktRecv = delta('packetsReceived');
      if (dPktRecv !== undefined)
        curr._recvPacketRate = dPktRecv / dWallSec;

      const dTotalRtt = delta('totalRoundTripTime');
      const dResponses = delta('responsesReceived');
      if (
        dTotalRtt !== undefined &&
        dResponses !== undefined &&
        dResponses > 0
      ) {
        curr._avgConsentRttMs = (dTotalRtt / dResponses) * 1000;
      }

      const dDiscardPkt = delta('packetsDiscardedOnSend');
      if (dDiscardPkt !== undefined) curr._discardedPackets = dDiscardPkt;

      const dDiscardBytes = delta('bytesDiscardedOnSend');
      if (dDiscardBytes !== undefined)
        curr._discardedBytesKb = dDiscardBytes / 1024;

      const dReqSent = delta('requestsSent');
      if (
        dReqSent !== undefined &&
        dResponses !== undefined &&
        dReqSent > 0
      ) {
        curr._consentSuccessRate = (dResponses / dReqSent) * 100;
      }

      const crt = metricNum(curr, 'currentRoundTripTime');
      if (crt != null) {
        curr._rttMs = crt * 1000;
      }
    }
  }

  function derivePlayoutMetrics(values: TimeSeriesValueBase[]): void {
    if (values.length < 2) return;
    for (let i = 1; i < values.length; i++) {
      const curr = values[i] as MetricRow;
      const prev = values[i - 1] as MetricRow;
      const dSamples =
        (metricNum(curr, 'totalSamplesCount') ?? 0) - (metricNum(prev, 'totalSamplesCount') ?? 0);
      const dDelay =
        (metricNum(curr, 'totalPlayoutDelay') ?? 0) - (metricNum(prev, 'totalPlayoutDelay') ?? 0);
      if (dSamples > 0 && dDelay >= 0) {
        curr._avgPlayoutDelayMs = (dDelay / dSamples) * 1000;
      }
      const dSynthDuration =
        (metricNum(curr, 'synthesizedSamplesDuration') ?? 0) -
        (metricNum(prev, 'synthesizedSamplesDuration') ?? 0);
      const dTotalDuration =
        (metricNum(curr, 'totalSamplesDuration') ?? 0) - (metricNum(prev, 'totalSamplesDuration') ?? 0);
      if (dTotalDuration > 0) {
        curr._synthesizedFractionPct = (dSynthDuration / dTotalDuration) * 100;
      }
    }
  }

  for (const series of Object.values(result.timeSeries.outboundRtp)) {
    deriveDeltaMetrics(series.values);
  }
  for (const series of Object.values(result.timeSeries.inboundRtp)) {
    deriveDeltaMetrics(series.values);
  }
  for (const series of Object.values(result.timeSeries.candidatePairs)) {
    deriveCandidatePairMetrics(series.values);
  }
  for (const series of Object.values(result.timeSeries.mediaPlayouts)) {
    derivePlayoutMetrics(series.values);
  }

  // Estimate non-RTP ("data channel") traffic per iceTransport. This is the
  // total bytes/packets on the ICE transport minus RTP payload + RTP headers +
  // retransmitted RTP bytes for all streams on that PC. The remainder is
  // SCTP (data channels) + RTCP + STUN consent + protocol overhead — a rough
  // upper bound on data channel throughput, not an exact measurement.
  for (const iceSeries of Object.values(result.timeSeries.iceTransport)) {
    const pcId = iceSeries.peerConnectionId;

    // Per-sampleIndex totals of RTP bytes on this PC
    const rtpSentBySample: Record<number, number> = {};
    const rtpRecvBySample: Record<number, number> = {};

    for (const series of Object.values(result.timeSeries.outboundRtp)) {
      const outbound = series as OutboundRtpTimeSeriesEntry;
      if (outbound.peerConnectionId !== pcId) continue;
      for (const v of outbound.values) {
        const idx = v.sampleIndex;
        if (idx == null) continue;
        rtpSentBySample[idx] = (rtpSentBySample[idx] ?? 0)
          + (metricNum(v, 'bytesSent') ?? 0)
          + (metricNum(v, 'headerBytesSent') ?? 0)
          + (metricNum(v, 'retransmittedBytesSent') ?? 0);
      }
    }
    for (const series of Object.values(result.timeSeries.inboundRtp)) {
      const inbound = series as InboundRtpTimeSeriesEntry;
      if (inbound.peerConnectionId !== pcId) continue;
      for (const v of inbound.values) {
        const idx = v.sampleIndex;
        if (idx == null) continue;
        rtpRecvBySample[idx] = (rtpRecvBySample[idx] ?? 0)
          + (metricNum(v, 'bytesReceived') ?? 0)
          + (metricNum(v, 'headerBytesReceived') ?? 0)
          + (metricNum(v, 'fecBytesReceived') ?? 0);
      }
    }

    // Cumulative non-RTP bytes per sample
    for (const v of iceSeries.values) {
      const rtpSent = rtpSentBySample[v.sampleIndex] ?? 0;
      const rtpRecv = rtpRecvBySample[v.sampleIndex] ?? 0;
      if (v.bytesSent != null) v._estDcBytesSent = Math.max(0, v.bytesSent - rtpSent);
      if (v.bytesReceived != null) v._estDcBytesReceived = Math.max(0, v.bytesReceived - rtpRecv);
    }

    // Derive per-interval bitrate deltas from the cumulative estimates
    for (let i = 1; i < iceSeries.values.length; i++) {
      const curr = iceSeries.values[i];
      const prev = iceSeries.values[i - 1];
      const dSec = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      if (dSec <= 0) continue;
      if (curr._estDcBytesSent != null && prev._estDcBytesSent != null) {
        const d = curr._estDcBytesSent - prev._estDcBytesSent;
        curr._estDcSendBitrateKbps = d >= 0 ? (d * 8) / dSec / 1000 : 0;
      }
      if (curr._estDcBytesReceived != null && prev._estDcBytesReceived != null) {
        const d = curr._estDcBytesReceived - prev._estDcBytesReceived;
        curr._estDcRecvBitrateKbps = d >= 0 ? (d * 8) / dSec / 1000 : 0;
      }
    }
  }

  result.videoProcessingSamples.sort(
    (a, b) => a.timestamp - b.timestamp || a.participantKey.localeCompare(b.participantKey),
  );

  // const vpLogKey = `${stats.length}|${vpSamplesWithReadings}|${result.videoProcessingSamples
  //   .map((s) => `${s.timestamp}:${s.participantKey}:${s.videoProcessing}`)
  //   .join(';')}`;
  // if (vpLogKey !== lastVpConsoleLogKey) {
  //   lastVpConsoleLogKey = vpLogKey;
  //   if (result.videoProcessingSamples.length > 0) {
  //     console.group(
  //       `[observertc-stats] videoProcessing — ${result.videoProcessingSamples.length} reading(s) from ${vpSamplesWithReadings}/${stats.length} client samples (MEDIA_STREAM_TRACK_GLITCH_METRICS)`,
  //     );
  //     console.table(
  //       result.videoProcessingSamples.map((s) => ({
  //         participantKey: s.participantKey,
  //         videoProcessing: s.videoProcessing,
  //         timestamp: s.timestamp,
  //         time: new Date(s.timestamp).toISOString(),
  //       })),
  //     );
  //     console.groupEnd();
  //   } else if (stats.length > 0) {
  //     console.info(
  //       `[observertc-stats] videoProcessing — no readings extracted from ${stats.length} client samples (no MEDIA_STREAM_TRACK_GLITCH_METRICS with boolean context.videoProcessing)`,
  //     );
  //   }
  // }

  return result;
}
