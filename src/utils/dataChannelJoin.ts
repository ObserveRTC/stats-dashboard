/**
 * Join the two views of a data channel.
 *
 * A single SCTP stream shows up twice in a call's data: once on the SFU, as a
 * `dataProducer` (the client sending) or a `dataConsumer` (the client
 * receiving), and once in the browser's own stats as a `DataChannelStats` with
 * bytes and message counts. Reading them apart means knowing a channel was open
 * without knowing whether anything crossed it — or the reverse.
 *
 * Correlation, in order:
 *
 *   1. `attachments.dataProducerId` / `attachments.dataConsumerId` on the client
 *      channel names the SFU object outright.
 *   2. Otherwise the `label` is matched, which is how mediasoup names the
 *      stream on both ends. Ambiguous only if one client opens several channels
 *      under the same label, so a label is used only when it is unique on the
 *      side being matched.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import type { ServerDataProducer, ServerDataConsumer } from './routerServerData.ts';

export type DataChannelDirection = 'producer' | 'consumer' | 'unknown';

/** How a client channel was tied to an SFU object. */
export type DataChannelMatch = 'attachment' | 'label' | 'none';

/** The browser's view of one data channel, accumulated over the session. */
export interface ClientDataChannelView {
  key: string;
  peerConnectionId: string;
  channelId: string;
  label?: string;
  protocol?: string;
  dataChannelIdentifier?: number;
  /** Most recent `readyState` seen. */
  state?: string;
  attachments?: Record<string, unknown>;
  /** dataProducerId named in the channel's attachments, when present. */
  dataProducerId?: string;
  /** dataConsumerId named in the channel's attachments, when present. */
  dataConsumerId?: string;
  latest: {
    bytesSent?: number;
    bytesReceived?: number;
    messagesSent?: number;
    messagesReceived?: number;
  };
  series: {
    bytesSent: Array<{ timestamp: Date; value: number }>;
    bytesReceived: Array<{ timestamp: Date; value: number }>;
    messagesSent: Array<{ timestamp: Date; value: number }>;
    messagesReceived: Array<{ timestamp: Date; value: number }>;
  };
}

/** One channel, from both sides where both are known. */
export interface DataChannelPair {
  key: string;
  direction: DataChannelDirection;
  /** Best available human label. */
  label: string;
  matchedBy: DataChannelMatch;
  sfuProducer?: ServerDataProducer;
  sfuConsumer?: ServerDataConsumer;
  client?: ClientDataChannelView;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Collect the browser-side data channels across every sample. */
export function collectClientDataChannels(
  samples: ClientSample[] | null | undefined,
): ClientDataChannelView[] {
  const byKey = new Map<string, ClientDataChannelView>();
  if (!samples?.length) return [];

  for (const sample of samples) {
    const ts = new Date(typeof sample.timestamp === 'number' ? sample.timestamp : Date.now());
    for (const pc of sample.peerConnections ?? []) {
      const peerConnectionId = pc.peerConnectionId ?? '';
      for (const dc of pc.dataChannels ?? []) {
        if (!dc?.id) continue;
        const key = `${peerConnectionId}:${dc.id}`;
        let view = byKey.get(key);
        if (!view) {
          view = {
            key,
            peerConnectionId,
            channelId: dc.id,
            label: dc.label,
            protocol: dc.protocol,
            dataChannelIdentifier: dc.dataChannelIdentifier,
            latest: {},
            series: { bytesSent: [], bytesReceived: [], messagesSent: [], messagesReceived: [] },
          };
          byKey.set(key, view);
        }

        if (dc.label && !view.label) view.label = dc.label;
        if (dc.protocol && !view.protocol) view.protocol = dc.protocol;
        if (dc.state) view.state = dc.state;
        if (dc.attachments && Object.keys(dc.attachments).length > 0) {
          view.attachments = { ...(view.attachments ?? {}), ...dc.attachments };
          view.dataProducerId ??= str(dc.attachments.dataProducerId);
          view.dataConsumerId ??= str(dc.attachments.dataConsumerId);
        }

        for (const field of ['bytesSent', 'bytesReceived', 'messagesSent', 'messagesReceived'] as const) {
          const value = num((dc as Record<string, unknown>)[field]);
          if (value == null) continue;
          view.series[field].push({ timestamp: ts, value });
          view.latest[field] = value;
        }
      }
    }
  }

  return Array.from(byKey.values());
}

/** Index values that appear exactly once, so a label match is unambiguous. */
function uniqueByLabel<T extends { label?: string }>(items: T[]): Map<string, T> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.label;
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const out = new Map<string, T>();
  for (const item of items) {
    const label = item.label;
    if (!label || counts.get(label) !== 1) continue;
    out.set(label, item);
  }
  return out;
}

/**
 * Pair the SFU's dataProducers and dataConsumers with the browser's channels.
 *
 * Every object from either side appears exactly once in the result, paired
 * where a correlation was found and alone where it was not — an unpaired entry
 * is itself informative (a channel the SFU never saw, or one the browser never
 * reported traffic on).
 */
export function joinDataChannels(
  dataProducers: ServerDataProducer[],
  dataConsumers: ServerDataConsumer[],
  clientChannels: ClientDataChannelView[],
): DataChannelPair[] {
  const producerById = new Map(dataProducers.map((d) => [d.id, d]));
  const consumerById = new Map(dataConsumers.map((d) => [d.id, d]));
  const producerByLabel = uniqueByLabel(dataProducers);
  const consumerByLabel = uniqueByLabel(dataConsumers);

  const usedProducers = new Set<string>();
  const usedConsumers = new Set<string>();
  const pairs: DataChannelPair[] = [];

  // Client channels first: they are the side that can name the SFU object.
  for (const client of clientChannels) {
    let sfuProducer = client.dataProducerId ? producerById.get(client.dataProducerId) : undefined;
    let sfuConsumer = client.dataConsumerId ? consumerById.get(client.dataConsumerId) : undefined;
    let matchedBy: DataChannelMatch = sfuProducer || sfuConsumer ? 'attachment' : 'none';

    if (!sfuProducer && !sfuConsumer && client.label) {
      // A channel the client sends on pairs with a dataProducer; one it only
      // receives on pairs with a dataConsumer. Where the label is unique on
      // both sides, take both — it is the same SCTP stream.
      const byLabelProducer = producerByLabel.get(client.label);
      const byLabelConsumer = consumerByLabel.get(client.label);
      if (byLabelProducer && !usedProducers.has(byLabelProducer.id)) sfuProducer = byLabelProducer;
      if (byLabelConsumer && !usedConsumers.has(byLabelConsumer.id)) sfuConsumer = byLabelConsumer;
      if (sfuProducer || sfuConsumer) matchedBy = 'label';
    }

    if (sfuProducer) usedProducers.add(sfuProducer.id);
    if (sfuConsumer) usedConsumers.add(sfuConsumer.id);

    pairs.push({
      key: `client:${client.key}`,
      direction: sfuProducer ? 'producer' : sfuConsumer ? 'consumer' : 'unknown',
      label: client.label || sfuProducer?.label || sfuConsumer?.label || client.channelId,
      matchedBy,
      sfuProducer,
      sfuConsumer,
      client,
    });
  }

  for (const dp of dataProducers) {
    if (usedProducers.has(dp.id)) continue;
    pairs.push({
      key: `dp:${dp.id}`,
      direction: 'producer',
      label: dp.label || dp.id,
      matchedBy: 'none',
      sfuProducer: dp,
    });
  }
  for (const dc of dataConsumers) {
    if (usedConsumers.has(dc.id)) continue;
    pairs.push({
      key: `dc:${dc.id}`,
      direction: 'consumer',
      label: dc.label || dc.id,
      matchedBy: 'none',
      sfuConsumer: dc,
    });
  }

  return pairs;
}
