/**
 * Router → client mapping.
 *
 * observertc-stats stores two independent things per call:
 *
 *   - `<roomId>/<callId>/<clientId>.jsonl`            — ClientSample stream (browser side)
 *   - `<roomId>/<callId>/mediasoup-router-<id>.json`  — MediasoupRouterSample (SFU side)
 *
 * The router sample is *call-wide*: it lists every transport, producer, consumer,
 * dataProducer and dataConsumer the router ever created, with no notion of which
 * browser they belong to. The client report, on the other hand, is per-client.
 *
 * This module bridges the two. Given the router samples of a call and one
 * client's processed WebRTC stats, it works out which router objects belong to
 * that client and reshapes them into the flat "server data" shape the
 * Transport / Producer / Consumer sections already speak.
 *
 * ── Attribution ───────────────────────────────────────────────────────────
 *
 * Three signals, in descending order of confidence:
 *
 *   1. `attachment` — the router object carries an explicit client id in its
 *      `attachments` (`clientId` / `participantId` / …). Authoritative.
 *   2. `rtp`        — the client's own outbound RTP names the `producerId`, or
 *      its inbound RTP names the `consumerId`. Authoritative in the other
 *      direction: the browser is telling us what it is sending/receiving.
 *   3. `transport`  — the object sits on a transport already attributed to this
 *      client by (1) or (2). This is what surfaces objects that never carried a
 *      single RTP packet, which is usually the interesting failure case.
 *
 * Every returned object records which signal claimed it (`matchedBy`), so the
 * UI can be honest about what it inferred versus what it was told.
 */

import type {
  MediasoupRouterSample,
  MediasoupProducerSample,
  MediasoupConsumerSample,
  MediasoupTransportSample,
  MediasoupDataProducerSample,
  MediasoupDataConsumerSample,
  RtpCodecParameters,
  TransportTuple,
} from '../schema/MediasoupRouter.ts';
import type { ProcessWebRTCStatsResult } from './statsTypes.ts';

/* ── output shapes ─────────────────────────────────────── */

/**
 * How a router object was attributed to a client, strongest first:
 *
 *   attachment — the SFU tagged the object with this client id
 *   rtp        — the client's own stats name the object, its SSRC, or the
 *                producer it consumes
 *   transport  — the object rides a transport already attributed to the client
 *   inferred   — deduced from the call topology when nothing else identified it
 */
export type MatchSource = 'attachment' | 'rtp' | 'transport' | 'inferred';

export interface HistoryEvent {
  timestamp: number;
  event: string;
  /**
   * Anything the event carried beyond its type and timestamp. mediasoup's
   * `iceselectedtuple-changed`, for instance, inlines the new tuple here.
   */
  payload?: Record<string, unknown>;
}

/** Transport tuple in the flat shape the transport section renders. */
export interface ServerTransportTuple {
  localIp: string;
  localPort: number;
  remoteIp: string;
  remotePort: number;
  protocol: string;
}

export interface CodecInfo {
  mimeType?: string;
  clockRate?: number;
  channels?: number;
  sdpFmtpLine?: string;
  payloadType?: number;
}

export interface ServerTransport {
  id: string;
  /** `send` / `recv` / `sendrecv` / `pipe` / `plain` / `direct`, derived from what rides on it. */
  role: string;
  hybrid: boolean;
  /** mediasoup transport flavour. */
  transportType: MediasoupTransportSample['type'];
  routerId?: string;
  sfuId?: string;
  createdAt: number;
  connectedAt?: number;
  closedAt?: number;
  tuple?: ServerTransportTuple;
  rtcpTuple?: ServerTransportTuple;
  history?: HistoryEvent[];
  matchedBy: MatchSource;
  attachments?: Record<string, unknown>;
}

export interface ServerProducer {
  id: string;
  kind: string;
  label: string;
  transportId: string;
  routerId?: string;
  streamRecordingId: string;
  codecInfo?: CodecInfo;
  ssrcs?: number[];
  rids?: string[];
  createdAt: number;
  closedAt?: number;
  history?: HistoryEvent[];
  matchedBy: MatchSource;
  attachments?: Record<string, unknown>;
}

export interface ServerConsumer {
  id: string;
  kind: string;
  label: string;
  transportId: string;
  routerId?: string;
  streamRecordingId: string;
  producerId: string;
  /** Client that produced `producerId`, when it could be resolved. */
  producingClientId?: string;
  /**
   * Negotiated codec. mediasoup does not put one on the consumer sample, so
   * this is the codec of the producer being consumed — which is what the
   * consumer is actually decoding.
   */
  codecInfo?: CodecInfo;
  mediaPlayerId?: string;
  createdAt: number;
  closedAt?: number;
  history?: HistoryEvent[];
  matchedBy: MatchSource;
  attachments?: Record<string, unknown>;
}

export interface ServerDataProducer {
  id: string;
  transportId: string;
  routerId?: string;
  label: string;
  protocol: string;
  createdAt: number;
  closedAt?: number;
  matchedBy: MatchSource;
}

export interface ServerDataConsumer {
  id: string;
  dataProducerId: string;
  transportId: string;
  routerId?: string;
  label: string;
  protocol: string;
  createdAt: number;
  closedAt?: number;
  matchedBy: MatchSource;
}

/** Per-client view of the SFU side of a call. */
export interface ClientServerData {
  /** The client this view was built for. */
  id: string;
  clientId: string;
  /** Routers that hosted any of this client's objects. */
  routerIds: string[];
  /** SFUs behind those routers (from router attachments), when known. */
  sfuIds: string[];
  /** Earliest createdAt across the client's objects. */
  createdAt: number;
  /** Latest closedAt, or undefined while anything is still open. */
  closedAt?: number;
  transports: ServerTransport[];
  producers: ServerProducer[];
  consumers: ServerConsumer[];
  dataProducers: ServerDataProducer[];
  dataConsumers: ServerDataConsumer[];
  /** Nothing at all could be attributed to this client. */
  empty: boolean;
}

/**
 * Everything in a client's own stats that can point at a router object.
 *
 * The ids are the direct route, but they only exist when the application tagged
 * its tracks. The SSRCs and the inbound producer ids are the fallback, and they
 * are always there: they come out of the RTP stats themselves.
 */
export interface ClientRtpIds {
  /** producerIds named by the client's outbound tracks. */
  producerIds: Set<string>;
  /** consumerIds named by the client's inbound tracks. */
  consumerIds: Set<string>;
  /** SSRCs the client reports sending — joins straight onto `producer.ssrcs`. */
  outboundSsrcs: Set<number>;
  /** RIDs the client reports sending, for simulcast producers with no SSRC list. */
  outboundRids: Set<string>;
  /** producerIds named by the client's *inbound* tracks — the far end of a consumer. */
  inboundProducerIds: Set<string>;
}

/* ── attachment helpers ────────────────────────────────── */

/** Attachment keys that, when present, name the owning client. */
const CLIENT_ID_KEYS = [
  'clientId',
  'participantId',
  'peerId',
  'userId',
  'clientid',
  'client_id',
] as const;

/**
 * The mediasoup sample types are all `Record<string, unknown> & {...}`, which
 * makes a narrow `{ attachments?: unknown }` parameter unassignable. Take
 * `unknown` and read the field defensively instead.
 */
function att(obj: unknown): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const a = (obj as { attachments?: unknown }).attachments;
  return a && typeof a === 'object' ? (a as Record<string, unknown>) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** Read an explicit owning-client id out of an object's attachments. */
export function attachedClientId(obj: unknown): string | undefined {
  const a = att(obj);
  if (!a) return undefined;
  for (const key of CLIENT_ID_KEYS) {
    const v = str(a[key]);
    if (v) return v;
  }
  return undefined;
}

function attachedString(obj: unknown, ...keys: string[]): string | undefined {
  const a = att(obj);
  if (!a) return undefined;
  for (const key of keys) {
    const v = str(a[key]);
    if (v) return v;
  }
  return undefined;
}

/* ── conversion helpers ────────────────────────────────── */

function toHistory(
  history: Array<{ type?: string; timestamp?: number }> | undefined,
): HistoryEvent[] | undefined {
  if (!history?.length) return undefined;
  return history
    .filter((h) => typeof h?.timestamp === 'number')
    .map((h) => {
      const { type, timestamp, ...rest } = h as Record<string, unknown> & {
        type?: string;
        timestamp?: number;
      };
      const event: HistoryEvent = { timestamp: timestamp as number, event: type ?? 'unknown' };
      // Only set `payload` when the event actually carried one, so a plain
      // event deep-equals `{timestamp, event}` for consumers that compare them.
      if (Object.keys(rest).length > 0) event.payload = rest as Record<string, unknown>;
      return event;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function toTuple(t: TransportTuple | undefined): ServerTransportTuple | undefined {
  if (!t) return undefined;
  // mediasoup names the field `localAddress`; the observer's samples carry a
  // `localIp` alongside it. Accept either so both vintages render.
  const localIp = t.localAddress ?? (t as { localIp?: string }).localIp ?? '';
  return {
    localIp,
    localPort: t.localPort,
    remoteIp: t.remoteIp ?? '',
    remotePort: t.remotePort ?? 0,
    protocol: t.protocol,
  };
}

/** `a=fmtp` style line rebuilt from mediasoup's parsed codec parameters. */
function toSdpFmtpLine(parameters: Record<string, unknown> | undefined): string | undefined {
  if (!parameters) return undefined;
  const parts = Object.entries(parameters)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${String(v)}`);
  return parts.length ? parts.join(';') : undefined;
}

function toCodecInfo(codec: RtpCodecParameters | undefined): CodecInfo | undefined {
  if (!codec) return undefined;
  return {
    mimeType: codec.mimeType,
    clockRate: codec.clockRate,
    channels: codec.channels,
    payloadType: codec.payloadType,
    sdpFmtpLine: toSdpFmtpLine(codec.parameters as Record<string, unknown> | undefined),
  };
}

/**
 * mediasoup has no single "connected" event, so `MediasoupTransportSample`
 * carries a derived `connectedAt`. Fall back to reading the history when an
 * older sample predates that field.
 */
function deriveConnectedAt(t: MediasoupTransportSample): number | undefined {
  if (typeof t.connectedAt === 'number') return t.connectedAt;
  const history = (t.history ?? []) as Array<{ type?: string; timestamp?: number }>;
  const connectEvents =
    t.type === 'webrtc'
      ? ['dtlsstate-changed-to-connected']
      : ['sctpstate-changed-to-connected', 'tuple-changed'];
  for (const h of history) {
    if (h.type && connectEvents.includes(h.type) && typeof h.timestamp === 'number') {
      return h.timestamp;
    }
  }
  return t.type === 'direct' ? t.createdAt : undefined;
}

/* ── router index ──────────────────────────────────────── */

interface RouterObjectIndex {
  routerIdOf: Map<string, string>;
  sfuIdOfRouter: Map<string, string>;
  transports: Map<string, MediasoupTransportSample>;
  producers: Map<string, MediasoupProducerSample>;
  consumers: Map<string, MediasoupConsumerSample>;
  dataProducers: Map<string, MediasoupDataProducerSample>;
  dataConsumers: Map<string, MediasoupDataConsumerSample>;
  producersByTransport: Map<string, MediasoupProducerSample[]>;
  consumersByTransport: Map<string, MediasoupConsumerSample[]>;
  dataProducersByTransport: Map<string, MediasoupDataProducerSample[]>;
  dataConsumersByTransport: Map<string, MediasoupDataConsumerSample[]>;
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** Flatten every router sample of a call into id-keyed lookup tables. */
export function buildRouterIndex(
  routerSamples: Map<string, MediasoupRouterSample>,
): RouterObjectIndex {
  const index: RouterObjectIndex = {
    routerIdOf: new Map(),
    sfuIdOfRouter: new Map(),
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
    dataProducers: new Map(),
    dataConsumers: new Map(),
    producersByTransport: new Map(),
    consumersByTransport: new Map(),
    dataProducersByTransport: new Map(),
    dataConsumersByTransport: new Map(),
  };

  for (const [routerId, sample] of routerSamples) {
    const sfuId = attachedString(sample, 'sfuId', 'sfu');
    if (sfuId) index.sfuIdOfRouter.set(routerId, sfuId);

    for (const t of sample.transports ?? []) {
      index.transports.set(t.id, t);
      index.routerIdOf.set(t.id, routerId);
    }
    for (const p of sample.producers ?? []) {
      index.producers.set(p.id, p);
      index.routerIdOf.set(p.id, routerId);
      push(index.producersByTransport, p.transportId, p);
    }
    for (const c of sample.consumers ?? []) {
      index.consumers.set(c.id, c);
      index.routerIdOf.set(c.id, routerId);
      push(index.consumersByTransport, c.transportId, c);
    }
    for (const dp of sample.dataProducers ?? []) {
      index.dataProducers.set(dp.id, dp);
      index.routerIdOf.set(dp.id, routerId);
      push(index.dataProducersByTransport, dp.transportId, dp);
    }
    for (const dc of sample.dataConsumers ?? []) {
      index.dataConsumers.set(dc.id, dc);
      index.routerIdOf.set(dc.id, routerId);
      push(index.dataConsumersByTransport, dc.transportId, dc);
    }
  }

  return index;
}

/* ── client-side id extraction ─────────────────────────── */

/**
 * Collect the producer / consumer ids the client's own stats refer to.
 *
 * The id can sit in three places depending on how the app tagged its tracks,
 * so all three are checked: the time-series entry, the accumulated per-stream
 * metadata, and the track attachments copied off the track sample.
 */
export function collectClientRtpIds(
  processedStats: ProcessWebRTCStatsResult | null | undefined,
): ClientRtpIds {
  const producerIds = new Set<string>();
  const consumerIds = new Set<string>();
  const outboundSsrcs = new Set<number>();
  const outboundRids = new Set<string>();
  const inboundProducerIds = new Set<string>();
  const empty = { producerIds, consumerIds, outboundSsrcs, outboundRids, inboundProducerIds };
  if (!processedStats) return empty;

  const addSsrc = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) outboundSsrcs.add(v);
  };

  const addFromAttachments = (
    attachments: Record<string, unknown> | undefined,
    target: Set<string>,
    key: string,
  ) => {
    const v = attachments ? str(attachments[key]) : undefined;
    if (v) target.add(v);
  };

  for (const entry of Object.values(processedStats.timeSeries.outboundRtp ?? {})) {
    if (entry.producerId) producerIds.add(entry.producerId);
    addSsrc(entry.ssrc);
    if (entry.rid) outboundRids.add(entry.rid);
    // The entry-level ssrc/rid can be absent on older pipelines; the per-sample
    // values always carry them.
    for (const v of entry.values ?? []) {
      addSsrc(v.ssrc);
      if (v.rid) outboundRids.add(v.rid);
    }
  }
  for (const entry of Object.values(processedStats.timeSeries.inboundRtp ?? {})) {
    if (entry.consumerId) consumerIds.add(entry.consumerId);
    if (entry.producerId) inboundProducerIds.add(entry.producerId);
  }

  for (const entry of processedStats.allObjects?.outboundRtps?.values() ?? []) {
    if (entry.producerId) producerIds.add(entry.producerId);
    addSsrc(entry.ssrc);
    addFromAttachments(entry.trackAttachments, producerIds, 'producerId');
  }
  for (const entry of processedStats.allObjects?.inboundRtps?.values() ?? []) {
    if (entry.consumerId) consumerIds.add(entry.consumerId);
    if (entry.producerId) inboundProducerIds.add(entry.producerId);
    addFromAttachments(entry.trackAttachments, consumerIds, 'consumerId');
    addFromAttachments(entry.trackAttachments, inboundProducerIds, 'producerId');
  }

  for (const pc of processedStats.peerConnections ?? []) {
    for (const rtp of pc.outboundRtps ?? []) {
      if (rtp.producerId) producerIds.add(rtp.producerId);
      addFromAttachments(rtp.trackAttachments, producerIds, 'producerId');
    }
    for (const rtp of pc.inboundRtps ?? []) {
      if (rtp.consumerId) consumerIds.add(rtp.consumerId);
      if (rtp.producerId) inboundProducerIds.add(rtp.producerId);
      addFromAttachments(rtp.trackAttachments, consumerIds, 'consumerId');
      addFromAttachments(rtp.trackAttachments, inboundProducerIds, 'producerId');
    }
    for (const rtp of pc.outboundRtps ?? []) {
      addSsrc(rtp.ssrc);
    }
  }

  // Per-track quality scores also carry the ids on some pipelines.
  for (const track of Object.values(processedStats.scores?.perTrack ?? {})) {
    if (track.producerId) producerIds.add(track.producerId);
    if (track.consumerId) consumerIds.add(track.consumerId);
  }

  return empty;
}

/* ── producer ownership ────────────────────────────────── */

/**
 * Map every producer in the call to the client that owns it, so a consumer can
 * name the client on the far end.
 *
 * Producers are matched by attachment first, then by their transport's
 * attachment. `extraOwners` lets the caller feed in ownership learned from
 * other clients' stats (i.e. "client X's outbound RTP claims producer P"),
 * which is the only signal available when the SFU tags nothing.
 */
export function buildProducerOwnership(
  index: RouterObjectIndex,
  extraOwners?: Map<string, string>,
): Map<string, string> {
  const owners = new Map<string, string>();

  for (const [producerId, producer] of index.producers) {
    const direct = attachedClientId(producer);
    if (direct) {
      owners.set(producerId, direct);
      continue;
    }
    const transport = index.transports.get(producer.transportId);
    const viaTransport = attachedClientId(transport);
    if (viaTransport) owners.set(producerId, viaTransport);
  }

  if (extraOwners) {
    for (const [producerId, clientId] of extraOwners) {
      if (!owners.has(producerId)) owners.set(producerId, clientId);
    }
  }

  return owners;
}

/* ── main mapper ───────────────────────────────────────── */

export interface BuildClientServerDataOptions {
  /** Producer → owning client, from `buildProducerOwnership`. */
  producerOwnership?: Map<string, string>;
  /**
   * Pull in every object sitting on a transport this client owns, even when
   * the object itself never showed up in the client's RTP. Default `true` —
   * this is what makes a producer that produced nothing visible.
   */
  expandByTransport?: boolean;
}

/**
 * Build the per-client SFU view.
 *
 * Returns an empty (but well-formed) `ClientServerData` when there are no
 * router samples or nothing matches, so callers can render unconditionally.
 */
export function buildClientServerData(
  clientId: string,
  routerSamples: Map<string, MediasoupRouterSample>,
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  options: BuildClientServerDataOptions = {},
): ClientServerData {
  const { expandByTransport = true } = options;
  const index = buildRouterIndex(routerSamples);
  const rtpIds = collectClientRtpIds(processedStats);
  const { producerIds, consumerIds } = rtpIds;

  const producerMatch = new Map<string, MatchSource>();
  const consumerMatch = new Map<string, MatchSource>();
  const transportMatch = new Map<string, MatchSource>();
  const dataProducerMatch = new Map<string, MatchSource>();
  const dataConsumerMatch = new Map<string, MatchSource>();

  /** Record a match, but never let a weaker signal overwrite a stronger one. */
  const rank: Record<MatchSource, number> = { attachment: 4, rtp: 3, transport: 2, inferred: 1 };
  const claim = (map: Map<string, MatchSource>, id: string, source: MatchSource) => {
    const existing = map.get(id);
    if (!existing || rank[source] > rank[existing]) map.set(id, source);
  };

  // 1. explicit attachments win
  for (const [id, t] of index.transports) {
    if (attachedClientId(t) === clientId) claim(transportMatch, id, 'attachment');
  }
  for (const [id, p] of index.producers) {
    if (attachedClientId(p) === clientId) claim(producerMatch, id, 'attachment');
  }
  for (const [id, c] of index.consumers) {
    if (attachedClientId(c) === clientId) claim(consumerMatch, id, 'attachment');
  }
  for (const [id, dp] of index.dataProducers) {
    if (attachedClientId(dp) === clientId) claim(dataProducerMatch, id, 'attachment');
  }
  for (const [id, dc] of index.dataConsumers) {
    if (attachedClientId(dc) === clientId) claim(dataConsumerMatch, id, 'attachment');
  }

  // 2. the client's own RTP names ids directly
  for (const id of producerIds) {
    if (index.producers.has(id)) claim(producerMatch, id, 'rtp');
  }
  for (const id of consumerIds) {
    if (index.consumers.has(id)) claim(consumerMatch, id, 'rtp');
  }

  // 2b. SSRC join. An SSRC is unique within a call and appears on both sides —
  // `producer.ssrcs` on the router, the RTP stats on the client — so this works
  // even when the application never tagged a track with a producer id.
  if (rtpIds.outboundSsrcs.size > 0) {
    for (const [id, p] of index.producers) {
      if (p.ssrcs?.some((ssrc) => rtpIds.outboundSsrcs.has(ssrc))) {
        claim(producerMatch, id, 'rtp');
      }
    }
  }

  // 2c. Consumers, via the producer they are consuming. Only safe for consumers
  // on a transport this client already owns, or where the producer has exactly
  // one consumer in the whole call — otherwise every other client
  // consuming the same producer would match too.
  if (rtpIds.inboundProducerIds.size > 0) {
    const consumerCountByProducer = new Map<string, number>();
    for (const c of index.consumers.values()) {
      consumerCountByProducer.set(c.producerId, (consumerCountByProducer.get(c.producerId) ?? 0) + 1);
    }
    for (const [id, c] of index.consumers) {
      if (!rtpIds.inboundProducerIds.has(c.producerId)) continue;
      if (consumerCountByProducer.get(c.producerId) === 1) claim(consumerMatch, id, 'rtp');
    }
  }

  // 3. transports inherited from matched producers/consumers
  for (const id of producerMatch.keys()) {
    const transportId = index.producers.get(id)?.transportId;
    if (transportId) claim(transportMatch, transportId, 'transport');
  }
  for (const id of consumerMatch.keys()) {
    const transportId = index.consumers.get(id)?.transportId;
    if (transportId) claim(transportMatch, transportId, 'transport');
  }
  for (const id of dataProducerMatch.keys()) {
    const transportId = index.dataProducers.get(id)?.transportId;
    if (transportId) claim(transportMatch, transportId, 'transport');
  }
  for (const id of dataConsumerMatch.keys()) {
    const transportId = index.dataConsumers.get(id)?.transportId;
    if (transportId) claim(transportMatch, transportId, 'transport');
  }

  // 3b. Last resort: work out the receive transport from the call's topology.
  //
  // A client never consumes its own producers, so a transport whose consumers
  // all pull from producers this client *is* receiving — and none that it
  // produces — can only be this client's receive transport. Applied only when
  // exactly one transport qualifies; an ambiguous call is left unmapped rather
  // than guessed at, and the SFU mapping card reports the gap.
  if (consumerMatch.size === 0 && rtpIds.inboundProducerIds.size > 0) {
    const ownProducerIds = new Set(producerMatch.keys());
    const candidates: string[] = [];

    for (const [transportId, consumers] of index.consumersByTransport) {
      if (transportMatch.has(transportId)) continue;
      if (consumers.length === 0) continue;
      const allReceived = consumers.every((c) => rtpIds.inboundProducerIds.has(c.producerId));
      const consumesOwn = consumers.some((c) => ownProducerIds.has(c.producerId));
      if (allReceived && !consumesOwn) candidates.push(transportId);
    }

    if (candidates.length === 1) {
      claim(transportMatch, candidates[0], 'inferred');
      for (const c of index.consumersByTransport.get(candidates[0]) ?? []) {
        claim(consumerMatch, c.id, 'inferred');
      }
    }
  }

  // 4. everything else riding on those transports
  if (expandByTransport) {
    for (const transportId of Array.from(transportMatch.keys())) {
      for (const p of index.producersByTransport.get(transportId) ?? []) {
        claim(producerMatch, p.id, 'transport');
      }
      for (const c of index.consumersByTransport.get(transportId) ?? []) {
        claim(consumerMatch, c.id, 'transport');
      }
      for (const dp of index.dataProducersByTransport.get(transportId) ?? []) {
        claim(dataProducerMatch, dp.id, 'transport');
      }
      for (const dc of index.dataConsumersByTransport.get(transportId) ?? []) {
        claim(dataConsumerMatch, dc.id, 'transport');
      }
    }
  }

  const ownership = options.producerOwnership ?? buildProducerOwnership(index);

  /* ── reshape ── */

  const byCreatedAt = <T extends { createdAt: number }>(a: T, b: T) => a.createdAt - b.createdAt;

  const producers: ServerProducer[] = Array.from(producerMatch.entries())
    .map(([id, matchedBy]) => {
      const p = index.producers.get(id)!;
      return {
        id: p.id,
        kind: p.kind,
        label: attachedString(p, 'label', 'trackLabel', 'name') ?? p.kind,
        transportId: p.transportId,
        routerId: index.routerIdOf.get(p.id),
        streamRecordingId: attachedString(p, 'streamRecordingId', 'recordingId') ?? '',
        codecInfo: toCodecInfo(p.codecInfo),
        ssrcs: p.ssrcs,
        rids: p.rids,
        createdAt: p.createdAt,
        closedAt: p.closedAt,
        history: toHistory(p.history),
        matchedBy,
        attachments: att(p),
      } satisfies ServerProducer;
    })
    .sort(byCreatedAt);

  const consumers: ServerConsumer[] = Array.from(consumerMatch.entries())
    .map(([id, matchedBy]) => {
      const c = index.consumers.get(id)!;
      return {
        id: c.id,
        kind: c.kind,
        label: attachedString(c, 'label', 'trackLabel', 'name') ?? c.kind,
        transportId: c.transportId,
        routerId: index.routerIdOf.get(c.id),
        streamRecordingId: attachedString(c, 'streamRecordingId', 'recordingId') ?? '',
        producerId: c.producerId,
        producingClientId: ownership.get(c.producerId),
        codecInfo: toCodecInfo(index.producers.get(c.producerId)?.codecInfo),
        mediaPlayerId: attachedString(c, 'mediaPlayerId'),
        createdAt: c.createdAt,
        closedAt: c.closedAt,
        history: toHistory(c.history),
        matchedBy,
        attachments: att(c),
      } satisfies ServerConsumer;
    })
    .sort(byCreatedAt);

  const dataProducers: ServerDataProducer[] = Array.from(dataProducerMatch.entries())
    .map(([id, matchedBy]) => {
      const dp = index.dataProducers.get(id)!;
      return {
        id: dp.id,
        transportId: dp.transportId,
        routerId: index.routerIdOf.get(dp.id),
        label: dp.label,
        protocol: dp.protocol,
        createdAt: dp.createdAt,
        closedAt: dp.closedAt,
        matchedBy,
      } satisfies ServerDataProducer;
    })
    .sort(byCreatedAt);

  const dataConsumers: ServerDataConsumer[] = Array.from(dataConsumerMatch.entries())
    .map(([id, matchedBy]) => {
      const dc = index.dataConsumers.get(id)!;
      return {
        id: dc.id,
        dataProducerId: dc.dataProducerId,
        transportId: dc.transportId,
        routerId: index.routerIdOf.get(dc.id),
        label: dc.label,
        protocol: dc.protocol,
        createdAt: dc.createdAt,
        closedAt: dc.closedAt,
        matchedBy,
      } satisfies ServerDataConsumer;
    })
    .sort(byCreatedAt);

  const transports: ServerTransport[] = Array.from(transportMatch.entries())
    .map(([id, matchedBy]) => {
      const t = index.transports.get(id)!;
      const routerId = index.routerIdOf.get(t.id);
      const sends = (index.producersByTransport.get(t.id)?.length ?? 0) > 0;
      const receives = (index.consumersByTransport.get(t.id)?.length ?? 0) > 0;
      const role =
        t.type !== 'webrtc'
          ? t.type
          : sends && receives
            ? 'sendrecv'
            : sends
              ? 'send'
              : receives
                ? 'recv'
                : 'idle';
      const plainRtcp = t.type === 'plain' ? t.rtcpTuple : undefined;
      return {
        id: t.id,
        role,
        hybrid: att(t)?.hybrid === true,
        transportType: t.type,
        routerId,
        sfuId: routerId ? index.sfuIdOfRouter.get(routerId) : undefined,
        createdAt: t.createdAt,
        connectedAt: deriveConnectedAt(t),
        closedAt: t.closedAt,
        tuple: toTuple(t.tuple),
        rtcpTuple: toTuple(plainRtcp),
        history: toHistory(t.history as Array<{ type?: string; timestamp?: number }>),
        matchedBy,
        attachments: att(t),
      } satisfies ServerTransport;
    })
    .sort(byCreatedAt);

  /* ── envelope ── */

  const all = [...transports, ...producers, ...consumers, ...dataProducers, ...dataConsumers];
  const createdAt = all.length ? Math.min(...all.map((o) => o.createdAt)) : 0;
  const anyOpen = all.some((o) => o.closedAt == null);
  const closedAt =
    all.length && !anyOpen ? Math.max(...all.map((o) => o.closedAt as number)) : undefined;

  const routerIds = Array.from(
    new Set(all.map((o) => (o as { routerId?: string }).routerId).filter((r): r is string => !!r)),
  );
  const sfuIds = Array.from(
    new Set(routerIds.map((r) => index.sfuIdOfRouter.get(r)).filter((s): s is string => !!s)),
  );

  return {
    id: clientId,
    clientId,
    routerIds,
    sfuIds,
    createdAt,
    closedAt,
    transports,
    producers,
    consumers,
    dataProducers,
    dataConsumers,
    empty: all.length === 0,
  };
}

/* ── coverage ──────────────────────────────────────────── */

/**
 * How well the SFU's view of this client lines up with the client's own view.
 *
 * The interesting cases are the asymmetries: a producer the router created that
 * never carried a packet the browser noticed, or an RTP stream the browser
 * reports against a producer/consumer id no router ever mentioned. Both usually
 * mean something was torn down, renegotiated, or attributed wrongly.
 */
export interface RouterCoverage {
  /** Router producers this client's outbound RTP confirms. */
  producersWithRtp: ServerProducer[];
  /** Router producers with no matching outbound RTP in the client stats. */
  producersWithoutRtp: ServerProducer[];
  /** Router consumers this client's inbound RTP confirms. */
  consumersWithRtp: ServerConsumer[];
  /** Router consumers with no matching inbound RTP in the client stats. */
  consumersWithoutRtp: ServerConsumer[];
  /** producerIds the client reports that no router sample contains. */
  orphanProducerIds: string[];
  /** consumerIds the client reports that no router sample contains. */
  orphanConsumerIds: string[];
  /** How many objects each attribution signal claimed. */
  matchCounts: Record<MatchSource, number>;
  /** 0–1 share of router objects confirmed by client RTP; null when there are none. */
  confirmedRatio: number | null;
}

export function computeRouterCoverage(
  serverData: ClientServerData,
  processedStats: ProcessWebRTCStatsResult | null | undefined,
  routerSamples: Map<string, MediasoupRouterSample>,
): RouterCoverage {
  const { producerIds, consumerIds } = collectClientRtpIds(processedStats);

  // "Confirmed" means the client's own RTP identified the object — by id, by
  // SSRC, or by the producer it consumes. That is exactly what `matchedBy:
  // 'rtp'` records, so read it rather than re-testing the ids: an object found
  // by SSRC has no id to test against and would otherwise read as unconfirmed.
  const producersWithRtp: ServerProducer[] = [];
  const producersWithoutRtp: ServerProducer[] = [];
  for (const p of serverData.producers) {
    (p.matchedBy === 'rtp' || producerIds.has(p.id) ? producersWithRtp : producersWithoutRtp).push(p);
  }

  const consumersWithRtp: ServerConsumer[] = [];
  const consumersWithoutRtp: ServerConsumer[] = [];
  for (const c of serverData.consumers) {
    (c.matchedBy === 'rtp' || consumerIds.has(c.id) ? consumersWithRtp : consumersWithoutRtp).push(c);
  }

  // Orphans are judged against *every* router in the call, not just this
  // client's objects — an id that belongs to another client is mis-attribution,
  // not an orphan, and would be misleading to report here.
  const index = buildRouterIndex(routerSamples);
  const orphanProducerIds = Array.from(producerIds).filter((id) => !index.producers.has(id));
  const orphanConsumerIds = Array.from(consumerIds).filter((id) => !index.consumers.has(id));

  const matchCounts: Record<MatchSource, number> = { attachment: 0, rtp: 0, transport: 0, inferred: 0 };
  for (const o of [
    ...serverData.transports,
    ...serverData.producers,
    ...serverData.consumers,
    ...serverData.dataProducers,
    ...serverData.dataConsumers,
  ]) {
    matchCounts[o.matchedBy] += 1;
  }

  const totalStreams = serverData.producers.length + serverData.consumers.length;
  const confirmed = producersWithRtp.length + consumersWithRtp.length;

  return {
    producersWithRtp,
    producersWithoutRtp,
    consumersWithRtp,
    consumersWithoutRtp,
    orphanProducerIds,
    orphanConsumerIds,
    matchCounts,
    confirmedRatio: totalStreams > 0 ? confirmed / totalStreams : null,
  };
}

/* ── single-object lookup ──────────────────────────────── */

/**
 * Find one producer anywhere in the call's routers and reshape it, without
 * building a whole per-client view. Used by the consumer→producer compare,
 * where the producer belongs to a different client than the page being viewed.
 */
export function findRouterProducer(
  routerSamples: Map<string, MediasoupRouterSample>,
  producerId: string,
): ServerProducer | null {
  for (const [routerId, sample] of routerSamples) {
    for (const p of sample.producers ?? []) {
      if (p.id !== producerId) continue;
      return {
        id: p.id,
        kind: p.kind,
        label: attachedString(p, 'label', 'trackLabel', 'name') ?? p.kind,
        transportId: p.transportId,
        routerId,
        streamRecordingId: attachedString(p, 'streamRecordingId', 'recordingId') ?? '',
        codecInfo: toCodecInfo(p.codecInfo),
        ssrcs: p.ssrcs,
        rids: p.rids,
        createdAt: p.createdAt,
        closedAt: p.closedAt,
        history: toHistory(p.history),
        matchedBy: 'rtp',
        attachments: att(p),
      };
    }
  }
  return null;
}
