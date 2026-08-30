/**
 * What a router sample says about the things it hosted, as lanes on one clock.
 *
 * `MediasoupRouterSample` carries every producer, consumer, data producer, data
 * consumer and transport the router held, each with a `createdAt`, an optional
 * `closedAt`, and a `history` of what happened in between. Rendered as a table
 * that is a wall of ids and timestamps; rendered as lanes it answers the
 * questions people actually bring to a router: what was alive at once, what
 * paused while everything else kept going, and whether the thing that stopped
 * stopped on its own or because its producer did.
 *
 * Every entity here is a *simple* state machine — one state at a time, changed
 * by named events — unlike a transport, which runs three concurrently. So each
 * entity is one lane, and the episodes within it are contiguous.
 */

import type {
  MediasoupRouterSample,
  MediasoupConsumerSample,
  MediasoupProducerSample,
} from '../schema/MediasoupRouter.ts';

export type RouterEntityKind = 'producer' | 'consumer' | 'dataProducer' | 'dataConsumer';

export interface RouterEntityEpisode {
  state: string;
  start: number;
  end: number;
  color: string;
  /**
   * True for the stretch before the first recorded event. mediasoup creates a
   * producer or consumer running, so that opening state is the documented
   * starting point rather than something the sample stated.
   */
  initial?: boolean;
}

export interface RouterEntityLane {
  id: string;
  label: string;
  kind: RouterEntityKind;
  createdAt: number;
  closedAt?: number;
  /** `audio` / `video` for media, the label for a data channel. */
  detail?: string;
  /** Ids worth showing in the hover, as `label: value` rows. */
  meta: string[];
  episodes: RouterEntityEpisode[];
  /** How many times the entity changed state, for the row summary. */
  changes: number;
}

export interface RouterEntityGroup {
  kind: RouterEntityKind;
  title: string;
  lanes: RouterEntityLane[];
}

export interface RouterEntityTimeline {
  start: number;
  end: number;
  groups: RouterEntityGroup[];
}

/* ── state machines ────────────────────────────────────── */

const ACTIVE = '#22c55e';
const PAUSED = '#94a3b8';
const DEGRADED = '#f59e0b';
const STOPPED = '#ef4444';

const STATE_COLORS: Record<string, string> = {
  active: ACTIVE,
  paused: PAUSED,
  'producer paused': PAUSED,
  degraded: DEGRADED,
  stopped: STOPPED,
  closed: '#64748b',
};

/**
 * mediasoup creates a producer running, and `pause`/`resume` toggle it.
 * `degraded`/`restored` are the SFU's own quality verdict on the stream and do
 * not stop it — they are a different colour, not a different lane, because a
 * degraded producer is still producing.
 */
const PRODUCER_STATES: Record<string, string> = {
  pause: 'paused',
  resume: 'active',
  degraded: 'degraded',
  restored: 'active',
};

/**
 * A consumer has two ways to fall silent and they mean different things: it was
 * paused locally, or the producer it consumes was paused. Keeping them apart is
 * the point of the lane — one is this subscriber's doing, the other is
 * everyone's, and a room full of `producer paused` at the same instant is a
 * publisher problem rather than four subscriber problems.
 */
const CONSUMER_STATES: Record<string, string> = {
  pause: 'paused',
  resume: 'active',
  producerPaused: 'producer paused',
  producerResumed: 'active',
  stopped: 'stopped',
  started: 'active',
  degraded: 'degraded',
  restored: 'active',
};

interface HistoryItem {
  type?: string;
  timestamp?: number;
}

function episodesFrom(
  history: HistoryItem[] | undefined,
  stateMap: Record<string, string>,
  createdAt: number,
  closedAt: number | undefined,
  windowEnd: number,
): { episodes: RouterEntityEpisode[]; changes: number } {
  const end = closedAt ?? windowEnd;
  const events = (history ?? [])
    .filter((h) => h?.type && typeof h.timestamp === 'number' && stateMap[h.type] != null)
    .sort((a, b) => (a.timestamp as number) - (b.timestamp as number));

  const episodes: RouterEntityEpisode[] = [];
  let state = 'active';
  let since = createdAt;
  let changes = 0;

  for (const event of events) {
    const at = Math.max(createdAt, event.timestamp as number);
    const next = stateMap[event.type as string];
    if (next === state) continue; // a re-announcement, not a change
    if (at > since) {
      episodes.push({
        state,
        start: since,
        end: at,
        color: STATE_COLORS[state] ?? PAUSED,
        initial: changes === 0,
      });
    }
    state = next;
    since = at;
    changes += 1;
  }

  if (end > since) {
    episodes.push({
      state,
      start: since,
      end,
      color: STATE_COLORS[state] ?? PAUSED,
      initial: changes === 0,
    });
  }

  return { episodes, changes };
}

function shortId(id: string, length = 10): string {
  return id.length > length ? `${id.slice(0, length)}…` : id;
}

function codecOf(producer: MediasoupProducerSample): string | undefined {
  const mime = producer.codecInfo?.mimeType;
  return typeof mime === 'string' ? mime.replace(/^(audio|video)\//i, '') : undefined;
}

/* ── model ─────────────────────────────────────────────── */

/**
 * Lanes for everything a router hosted.
 *
 * The window runs from the router's own `createdAt` to its `closedAt`, widened
 * to cover any entity that outlived the recorded close — an entity is never
 * clipped to make the window tidy.
 */
export function buildRouterEntityTimeline(
  sample: MediasoupRouterSample | null | undefined,
): RouterEntityTimeline | null {
  if (!sample) return null;

  const stamps: number[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'number' && v > 0) stamps.push(v);
  };
  push(sample.createdAt);
  push(sample.closedAt);
  for (const list of [sample.producers, sample.consumers, sample.dataProducers, sample.dataConsumers, sample.transports]) {
    for (const entity of list ?? []) {
      push((entity as { createdAt?: number }).createdAt);
      push((entity as { closedAt?: number }).closedAt);
      for (const item of ((entity as { history?: HistoryItem[] }).history ?? [])) push(item?.timestamp);
    }
  }
  if (stamps.length === 0) return null;

  const start = Math.min(...stamps);
  const end = Math.max(Math.max(...stamps), start + 1000);

  const groups: RouterEntityGroup[] = [];

  const producerLanes: RouterEntityLane[] = (sample.producers ?? []).map((producer) => {
    const { episodes, changes } = episodesFrom(
      producer.history,
      PRODUCER_STATES,
      producer.createdAt,
      producer.closedAt,
      end,
    );
    const codec = codecOf(producer);
    return {
      id: producer.id,
      label: shortId(producer.id),
      kind: 'producer' as const,
      createdAt: producer.createdAt,
      closedAt: producer.closedAt,
      detail: [producer.kind, codec].filter(Boolean).join(' · '),
      meta: [
        `Transport: ${shortId(producer.transportId, 14)}`,
        producer.ssrcs?.length ? `SSRCs: ${producer.ssrcs.join(', ')}` : '',
        producer.rids?.length ? `RIDs: ${producer.rids.join(', ')}` : '',
      ].filter(Boolean),
      episodes,
      changes,
    };
  });

  const consumerLanes: RouterEntityLane[] = (sample.consumers ?? []).map(
    (consumer: MediasoupConsumerSample) => {
      const { episodes, changes } = episodesFrom(
        consumer.history,
        CONSUMER_STATES,
        consumer.createdAt,
        consumer.closedAt,
        end,
      );
      return {
        id: consumer.id,
        label: shortId(consumer.id),
        kind: 'consumer' as const,
        createdAt: consumer.createdAt,
        closedAt: consumer.closedAt,
        detail: consumer.kind,
        meta: [
          `Producer: ${shortId(consumer.producerId, 14)}`,
          `Transport: ${shortId(consumer.transportId, 14)}`,
        ],
        episodes,
        changes,
      };
    },
  );

  // Data producers and consumers carry no history: a lifetime bar is the whole
  // truth about them, and drawing it as one `active` episode says exactly that.
  const dataLane = (
    entity: { id: string; createdAt: number; closedAt?: number; label?: string; protocol?: string },
    kind: 'dataProducer' | 'dataConsumer',
    meta: string[],
  ): RouterEntityLane => ({
    id: entity.id,
    label: shortId(entity.id),
    kind,
    createdAt: entity.createdAt,
    closedAt: entity.closedAt,
    detail: [entity.label, entity.protocol].filter(Boolean).join(' · ') || undefined,
    meta,
    episodes: [
      {
        state: 'active',
        start: entity.createdAt,
        end: entity.closedAt ?? end,
        color: ACTIVE,
        initial: true,
      },
    ],
    changes: 0,
  });

  const dataProducerLanes = (sample.dataProducers ?? []).map((dp) =>
    dataLane(dp, 'dataProducer', [`Transport: ${shortId(dp.transportId, 14)}`]),
  );
  const dataConsumerLanes = (sample.dataConsumers ?? []).map((dc) =>
    dataLane(dc, 'dataConsumer', [
      `Data producer: ${shortId(dc.dataProducerId, 14)}`,
      `Transport: ${shortId(dc.transportId, 14)}`,
    ]),
  );

  const byStart = (a: RouterEntityLane, b: RouterEntityLane) => a.createdAt - b.createdAt;

  if (producerLanes.length)
    groups.push({ kind: 'producer', title: 'Producers', lanes: producerLanes.sort(byStart) });
  if (consumerLanes.length)
    groups.push({ kind: 'consumer', title: 'Consumers', lanes: consumerLanes.sort(byStart) });
  if (dataProducerLanes.length)
    groups.push({ kind: 'dataProducer', title: 'Data producers', lanes: dataProducerLanes.sort(byStart) });
  if (dataConsumerLanes.length)
    groups.push({ kind: 'dataConsumer', title: 'Data consumers', lanes: dataConsumerLanes.sort(byStart) });

  if (groups.length === 0) return null;
  return { start, end, groups };
}

export const ROUTER_ENTITY_STATE_COLORS = STATE_COLORS;
