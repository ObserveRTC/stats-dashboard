import type { QualityState } from '../api/types.ts';
import type {
  ServerProducer as Producer,
  ServerConsumer as Consumer,
  ClientServerData as ServerData,
} from './routerServerData.ts';
import type { ClientSample } from '../schema/ClientSample.ts';
import { buildPerStreamQuality } from './qualityClassifier.ts';

export interface QualitySegment {
  start: number;
  end: number;
  state: QualityState;
}

export interface MediaOverviewStream {
  id: string;
  kind: string;
  label: string;
  createdAt: number;
  closedAt?: number;
  direction: 'send' | 'recv';
  history: Array<{ timestamp: number; event: string }>;
  qualitySegments: QualitySegment[];
}

export interface MediaOverviewRow {
  kind: string;
  label: string;
  direction: 'send' | 'recv';
  segments: MediaOverviewStream[];
}

export interface MediaOverviewGroup {
  clientId: string | null;
  label: string;
  rows: MediaOverviewRow[];
}

export interface MediaOverviewData {
  groups: MediaOverviewGroup[];
  globalStart: number;
  globalEnd: number;
}

export function buildMediaOverviewData(
  serverData: ServerData | null | undefined,
  clientStats: ClientSample[] | null | undefined
): MediaOverviewData | null {
  if (!serverData) return null;

  const globalStart = serverData.createdAt;
  const globalEnd = serverData.closedAt ?? Date.now();

  const psq = buildPerStreamQuality(clientStats, serverData.producers, serverData.consumers);

  const getQualitySamples = (
    itemId: string,
    direction: 'send' | 'recv'
  ): Array<{ timestamp: number; state: QualityState }> => {
    const byId = direction === 'send' ? psq.byProducerId : psq.byConsumerId;
    const samples = byId.get(itemId);
    if (samples && samples.length > 0) return samples;
    return direction === 'send' ? psq.aggregatedSend : psq.aggregatedRecv;
  };

  const buildQualityLookup = (
    samples: Array<{ timestamp: number; state: QualityState }>
  ): (ts: number) => QualityState => {
    if (!samples || samples.length < 2) return () => 'good';
    const sorted = samples.slice().sort((a, b) => a.timestamp - b.timestamp);
    return (ts: number) => {
      let state: QualityState = sorted[0].state ?? 'good';
      for (const s of sorted) {
        if (s.timestamp > ts) break;
        state = (s.state ?? 'good') as QualityState;
      }
      return state;
    };
  };

  const buildStreamQualitySegments = (
    stream: MediaOverviewStream & { _qualitySamples?: Array<{ timestamp: number; state: QualityState }> }
  ): QualitySegment[] => {
    const start = stream.createdAt;
    const end = stream.closedAt ?? globalEnd;
    const samples = stream._qualitySamples;
    if (!samples || samples.length === 0) {
      return [{ start, end, state: 'good' }];
    }

    const qualityLookup = buildQualityLookup(samples);
    const relevantSamples = samples.filter((s) => s.timestamp >= start && s.timestamp <= end);

    if (relevantSamples.length === 0) {
      return [{ start, end, state: qualityLookup(start) }];
    }

    const segments: QualitySegment[] = [];
    let segStart = start;
    let currentState: QualityState = qualityLookup(start);

    for (const sample of relevantSamples) {
      const sampleState = (sample.state ?? 'good') as QualityState;
      if (sampleState !== currentState) {
        if (sample.timestamp > segStart) {
          segments.push({ start: segStart, end: sample.timestamp, state: currentState });
        }
        currentState = sampleState;
        segStart = sample.timestamp;
      }
    }
    if (segStart < end) {
      segments.push({ start: segStart, end, state: currentState });
    }
    return segments;
  };

  const groupStreamsIntoRows = (streams: MediaOverviewStream[]): MediaOverviewRow[] => {
    const byKindLabel = new Map<
      string,
      { kind: string; label: string; direction: 'send' | 'recv'; segments: MediaOverviewStream[] }
    >();
    for (const stream of streams) {
      const key = `${stream.kind}:${stream.label}`;
      if (!byKindLabel.has(key)) {
        byKindLabel.set(key, {
          kind: stream.kind,
          label: stream.label,
          direction: stream.direction,
          segments: [],
        });
      }
      byKindLabel.get(key)!.segments.push(stream);
    }
    const rows = Array.from(byKindLabel.values());
    for (const row of rows) {
      row.segments.sort((a, b) => a.createdAt - b.createdAt);
    }
    rows.sort((a, b) => a.segments[0].createdAt - b.segments[0].createdAt);
    return rows;
  };

  const buildStream = (
    item: Producer | Consumer,
    direction: 'send' | 'recv'
  ): MediaOverviewStream => {
    const samples = getQualitySamples(item.id, direction);
    const stream: MediaOverviewStream & {
      _qualitySamples?: Array<{ timestamp: number; state: QualityState }>;
    } = {
      id: item.id,
      kind: item.kind,
      label: item.label ?? item.kind,
      createdAt: item.createdAt,
      closedAt: item.closedAt,
      direction,
      history: item.history ?? [],
      _qualitySamples: samples,
      qualitySegments: [],
    };
    stream.qualitySegments = buildStreamQualitySegments(stream);
    const { _qualitySamples: _unused, ...result } = stream;
    return result;
  };

  const groups: MediaOverviewGroup[] = [];

  if (serverData.producers && serverData.producers.length > 0) {
    const streams = serverData.producers.map((p) => buildStream(p, 'send'));
    groups.push({
      clientId: null,
      label: 'Local (Sending)',
      rows: groupStreamsIntoRows(streams),
    });
  }

  if (serverData.consumers && serverData.consumers.length > 0) {
    const byClient = new Map<string, Consumer[]>();
    for (const c of serverData.consumers) {
      const remoteId = c.producingClientId ?? c.mediaPlayerId ?? 'unknown';
      if (!byClient.has(remoteId)) {
        byClient.set(remoteId, []);
      }
      byClient.get(remoteId)!.push(c);
    }

    for (const [remoteId, consumers] of byClient) {
      const streams = consumers.map((c) => buildStream(c, 'recv'));
      const isMediaPlayer = consumers.some((c) => c.mediaPlayerId);
      const shortId = remoteId.length > 12 ? remoteId.slice(0, 8) + '…' : remoteId;
      groups.push({
        clientId: remoteId,
        label: isMediaPlayer ? `Media Player ${shortId}` : `From: ${shortId}`,
        rows: groupStreamsIntoRows(streams),
      });
    }
  }

  return { groups, globalStart, globalEnd };
}
