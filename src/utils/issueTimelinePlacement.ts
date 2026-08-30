import type { ProcessWebRTCStatsResult } from './statsTypes.ts';
import type { ClientSample } from '../schema/ClientSample.ts';
import { getIssueTypeMeta, isKnownIssueType, issueTimelineTarget } from '../schema/ClientIssueTypes.ts';
import {
  cachedClientIssueEpisodes,
  episodeTooltipHtml,
  type ClientIssueEpisode,
} from './clientIssueEpisodes.ts';
import { getConsumerTrackAttachments, getProducerTrackAttachments } from './clientAttachments.ts';

export interface IssueLaneItem {
  type: string;
  label: string;
  color: string;
  start: number;
  end: number;
  stillOpen: boolean;
  tooltipHtml: string;
}

/**
 * Record a track id, accepting the RTP stream key as one.
 *
 * `statsProcessor` keys a stream by `trackIdentifier || id || <pc>_<dir>_ssrc_N`,
 * so a key is a track id whenever the browser reported one. The synthesised
 * `_ssrc_` form is not, and is skipped rather than matched against.
 */
function addTrackId(ids: Set<string>, trackIdentifier: string | undefined, streamKey: string): void {
  if (trackIdentifier) ids.add(trackIdentifier);
  if (streamKey && !/_ssrc_/.test(streamKey)) ids.add(streamKey);
}

function sessionEndFromSamples(samples: ClientSample[] | undefined, closedAt?: number): number {
  if (closedAt != null) return closedAt;
  const last = samples?.[samples.length - 1]?.timestamp;
  return last ?? Date.now();
}

export function toIssueLaneItems(
  episodes: ClientIssueEpisode[],
  sessionEnd: number,
  tz: string,
): IssueLaneItem[] {
  return episodes.map((episode) => {
    const meta = getIssueTypeMeta(episode.type);
    const end = episode.resolvedAt
      ?? (episode.stillOpen ? sessionEnd : episode.raisedAt);
    return {
      type: episode.type,
      label: meta.label,
      color: meta.color,
      start: episode.raisedAt,
      end: Math.max(end, episode.raisedAt),
      stillOpen: episode.stillOpen,
      tooltipHtml: episodeTooltipHtml(meta, episode, tz),
    };
  });
}

/**
 * Track ids belonging to a consumer.
 *
 * Client detectors report the `trackId`, never the SFU's consumer id, so this
 * set is what connects an issue to a consumer at all. Three routes, because a
 * client that tags nothing still has to resolve:
 *
 *   1. track attachments naming the consumer
 *   2. inbound RTP entries naming the consumer
 *   3. inbound RTP entries naming the *producer* the consumer consumes — the
 *      one link that survives when the application tags no track, and the same
 *      join the router mapping uses
 */
export function collectConsumerTrackIds(
  clientStats: ClientSample[] | undefined,
  processed: ProcessWebRTCStatsResult | null,
  consumer: { id: string; producerId?: string },
): Set<string> {
  const ids = new Set<string>();
  for (const att of getConsumerTrackAttachments(clientStats, consumer.id)) {
    ids.add(att.trackId);
  }
  for (const [key, rtp] of processed?.allObjects?.inboundRtps ?? []) {
    const matches =
      rtp.consumerId === consumer.id ||
      (consumer.producerId != null && rtp.producerId === consumer.producerId);
    if (!matches) continue;
    addTrackId(ids, rtp.trackIdentifier, key);
  }
  for (const [key, entry] of Object.entries(processed?.timeSeries?.inboundRtp ?? {})) {
    const matches =
      entry.consumerId === consumer.id ||
      (consumer.producerId != null && entry.producerId === consumer.producerId);
    if (matches) addTrackId(ids, undefined, key);
  }
  return ids;
}

/**
 * Track ids belonging to a producer.
 *
 * As with consumers, the detectors only ever name a `trackId`. The third route
 * — matching the producer's SSRCs against the client's outbound RTP — is what
 * makes this work for a client that tags no track, and is the same join the
 * router mapping relies on: an SSRC is unique within a call and appears on
 * both sides regardless of tagging.
 */
export function collectProducerTrackIds(
  clientStats: ClientSample[] | undefined,
  processed: ProcessWebRTCStatsResult | null,
  producer: { id: string; ssrcs?: number[] },
): Set<string> {
  const ids = new Set<string>();
  for (const att of getProducerTrackAttachments(clientStats, producer.id)) {
    ids.add(att.trackId);
  }
  const ssrcs = new Set(producer.ssrcs ?? []);
  for (const [key, rtp] of processed?.allObjects?.outboundRtps ?? []) {
    const matches =
      rtp.producerId === producer.id || (rtp.ssrc != null && ssrcs.has(rtp.ssrc));
    if (!matches) continue;
    // `statsProcessor` keys every RTP stream by `trackIdentifier` when the
    // browser reported one, so the key is a track id in its own right.
    addTrackId(ids, rtp.trackIdentifier, key);
  }
  for (const [key, entry] of Object.entries(processed?.timeSeries?.outboundRtp ?? {})) {
    const matches =
      entry.producerId === producer.id || (entry.ssrc != null && ssrcs.has(entry.ssrc));
    if (matches) addTrackId(ids, undefined, key);
  }
  return ids;
}

/**
 * Whether an episode may be drawn on an object of `target`.
 *
 * A known type is routed by its category, which is what the built-in detectors
 * mean. An *unknown* type — an application's own detector, or one newer than
 * this table — has no meaningful category, so routing it by name would drop it
 * from every object timeline even when its payload names the exact object it
 * concerns. For those, the ids in the payload decide.
 */
function mayTarget(episode: ClientIssueEpisode, target: 'consumer' | 'producer' | 'transport'): boolean {
  if (isKnownIssueType(episode.type)) return issueTimelineTarget(episode.type) === target;

  if (episode.consumerId) return target === 'consumer';
  if (episode.producerId) return target === 'producer';
  if (episode.transportId || episode.peerConnectionId) return target === 'transport';
  // Only a trackId: whichever object owns that track claims it, decided by the
  // caller's track set rather than here.
  return true;
}

export function matchConsumerEpisodes(
  episodes: ClientIssueEpisode[],
  consumerId: string,
  trackIds: Set<string>,
): ClientIssueEpisode[] {
  return episodes.filter((episode) => {
    if (!mayTarget(episode, 'consumer')) return false;
    if (episode.consumerId) return episode.consumerId === consumerId;
    if (episode.trackId && trackIds.has(episode.trackId)) return true;
    return false;
  });
}

export function matchProducerEpisodes(
  episodes: ClientIssueEpisode[],
  producerId: string,
  trackIds: Set<string>,
): ClientIssueEpisode[] {
  return episodes.filter((episode) => {
    if (!mayTarget(episode, 'producer')) return false;
    if (episode.producerId) return episode.producerId === producerId;
    if (episode.trackId && trackIds.has(episode.trackId)) return true;
    return false;
  });
}

export function matchTransportEpisodes(
  episodes: ClientIssueEpisode[],
  transportId: string,
): ClientIssueEpisode[] {
  return episodes.filter((episode) => {
    if (!mayTarget(episode, 'transport')) return false;
    if (episode.transportId) return episode.transportId === transportId;
    if (episode.peerConnectionId) return episode.peerConnectionId === transportId;
    return false;
  });
}

export function consumerIssueLaneItems(
  clientStats: ClientSample[] | undefined,
  processed: ProcessWebRTCStatsResult | null,
  consumer: { id: string; producerId?: string; closedAt?: number },
  tz: string,
): IssueLaneItem[] {
  if (!clientStats?.length) return [];
  const episodes = cachedClientIssueEpisodes(clientStats);
  const trackIds = collectConsumerTrackIds(clientStats, processed, consumer);
  const matched = matchConsumerEpisodes(episodes, consumer.id, trackIds);
  return toIssueLaneItems(matched, sessionEndFromSamples(clientStats, consumer.closedAt), tz);
}

export function producerIssueLaneItems(
  clientStats: ClientSample[] | undefined,
  processed: ProcessWebRTCStatsResult | null,
  producer: { id: string; ssrcs?: number[]; closedAt?: number },
  tz: string,
): IssueLaneItem[] {
  if (!clientStats?.length) return [];
  const episodes = cachedClientIssueEpisodes(clientStats);
  const trackIds = collectProducerTrackIds(clientStats, processed, producer);
  const matched = matchProducerEpisodes(episodes, producer.id, trackIds);
  return toIssueLaneItems(matched, sessionEndFromSamples(clientStats, producer.closedAt), tz);
}

export function transportIssueLaneItems(
  clientStats: ClientSample[] | undefined,
  transport: { id: string; closedAt?: number },
  tz: string,
): IssueLaneItem[] {
  if (!clientStats?.length) return [];
  const episodes = cachedClientIssueEpisodes(clientStats);
  const matched = matchTransportEpisodes(episodes, transport.id);
  return toIssueLaneItems(matched, sessionEndFromSamples(clientStats, transport.closedAt), tz);
}

export function uniqueIssueLaneTypes(items: IssueLaneItem[]): Array<{ type: string; label: string; color: string }> {
  const seen = new Map<string, { type: string; label: string; color: string }>();
  for (const item of items) {
    if (!seen.has(item.type)) seen.set(item.type, { type: item.type, label: item.label, color: item.color });
  }
  return [...seen.values()];
}

/** Session-level issues plus entity-scoped issues that could not be matched to a consumer/producer/transport. */
export function filterSessionOverviewEpisodes(
  episodes: ClientIssueEpisode[],
  clientStats: ClientSample[] | undefined,
  processed: ProcessWebRTCStatsResult | null,
  consumers: Array<{ id: string; producerId?: string }>,
  producers: Array<{ id: string; ssrcs?: number[] }>,
  transports: Array<{ id: string }>,
): ClientIssueEpisode[] {
  const consumerTracks = new Map(
    consumers.map((c) => [c.id, collectConsumerTrackIds(clientStats, processed, c)]),
  );
  const producerTracks = new Map(
    producers.map((p) => [p.id, collectProducerTrackIds(clientStats, processed, p)]),
  );

  return episodes.filter((episode) => {
    const target = issueTimelineTarget(episode.type);
    if (target === 'session') return true;
    if (target === 'consumer') {
      return !consumers.some((c) =>
        matchConsumerEpisodes([episode], c.id, consumerTracks.get(c.id) ?? new Set()).length > 0,
      );
    }
    if (target === 'producer') {
      return !producers.some((p) =>
        matchProducerEpisodes([episode], p.id, producerTracks.get(p.id) ?? new Set()).length > 0,
      );
    }
    if (target === 'transport') {
      return !transports.some((t) => matchTransportEpisodes([episode], t.id).length > 0);
    }
    return true;
  });
}
