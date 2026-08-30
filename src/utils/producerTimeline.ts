import type { ServerProducer, ServerConsumer } from './routerServerData.ts';

/**
 * Anything with a lifecycle worth drawing as a bar. Producers and consumers
 * share the same event vocabulary — `pause`/`resume` on the near side,
 * `producerPaused`/`producerResumed`/`stopped`/`started` on the far side — so
 * one set of builders serves both.
 */
export type TimelineStream = Pick<
  ServerProducer & ServerConsumer,
  'id' | 'kind' | 'createdAt'
> & {
  label?: string;
  closedAt?: number;
  history?: Array<{ timestamp: number; event: string }>;
};

type Producer = TimelineStream;

/** Harmonized palette: sky (added) → green (active/degraded) → orange (muted) → violet (closed). */
export const PRODUCER_OVERVIEW_COLORS = {
  active: '#16a34a',
  degraded: '#86efac',
  muted: '#f97316',
  created: '#0ea5e9',
  closed: '#8b5cf6',
} as const;

const STATE_MAP: Record<string, string> = {
  pause: 'muted',
  producerPaused: 'muted',
  stopped: 'muted',
  resume: 'active',
  producerResumed: 'active',
  started: 'active',
  degraded: 'degraded',
  restored: 'active',
};

/** Lifecycle transitions drawn as continuous bars — not duplicate point boxes. */
const LIFECYCLE_ONLY_EVENTS = new Set([
  'pause',
  'producerPaused',
  'stopped',
  'resume',
  'producerResumed',
  'started',
]);

/** Point-in-time markers on the overview (quality + session boundaries). */
const OVERVIEW_INSTANT_EVENTS = new Set(['degraded', 'restored']);

function relevantHistory(producer: Producer): Array<{ timestamp: number; event: string }> {
  return producer.history ?? [];
}

export interface ProducerLifecycleSegment {
  start: number;
  end: number;
  state: string;
  color: string;
  opacity: number;
}

export interface ProducerInstantBox {
  timestamp: number;
  label: string;
  color: string;
}

export function segmentColor(state: string): string {
  if (state === 'active') return PRODUCER_OVERVIEW_COLORS.active;
  if (state === 'degraded') return PRODUCER_OVERVIEW_COLORS.degraded;
  if (state === 'muted') return PRODUCER_OVERVIEW_COLORS.muted;
  return '#64748b';
}

export function segmentOpacity(state: string): number {
  if (state === 'active') return 0.92;
  if (state === 'degraded') return 0.55;
  if (state === 'muted') return 0.88;
  return 0.75;
}

export function instantBoxColor(event: string): string {
  if (event === 'created') return PRODUCER_OVERVIEW_COLORS.created;
  if (event === 'closed') return PRODUCER_OVERVIEW_COLORS.closed;
  if (event === 'pause' || event === 'producerPaused' || event === 'stopped') {
    return PRODUCER_OVERVIEW_COLORS.muted;
  }
  if (event === 'resume' || event === 'producerResumed' || event === 'started' || event === 'restored') {
    return PRODUCER_OVERVIEW_COLORS.active;
  }
  if (event === 'degraded') return PRODUCER_OVERVIEW_COLORS.degraded;
  return '#94a3b8';
}

function instantLabel(event: string): string {
  if (event === 'created') return 'added';
  if (event === 'pause' || event === 'producerPaused') return 'muted';
  if (event === 'resume' || event === 'producerResumed' || event === 'restored') return 'active';
  if (event === 'degraded') return 'degraded';
  return event;
}

/**
 * Active/muted spans between created and closed (lifecycle only — not instant markers).
 */
export function buildProducerLifecycleSegments(
  producer: Producer,
  globalEnd: number,
): ProducerLifecycleSegment[] {
  const start = producer.createdAt;
  const end = producer.closedAt ?? globalEnd;
  if (start == null || end <= start) return [];

  const history = [...relevantHistory(producer)].sort((a, b) => a.timestamp - b.timestamp);

  const boundaries = new Set<number>([start, end]);
  for (const h of history) {
    if (h.timestamp > start && h.timestamp < end) boundaries.add(h.timestamp);
  }
  const points = [...boundaries].sort((a, b) => a - b);

  let currentState = 'active';
  let historyIdx = 0;

  const raw: ProducerLifecycleSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    while (historyIdx < history.length && history[historyIdx].timestamp <= segStart) {
      currentState = STATE_MAP[history[historyIdx].event] ?? currentState;
      historyIdx++;
    }
    if (segEnd > segStart) {
      raw.push({
        start: segStart,
        end: segEnd,
        state: currentState,
        color: segmentColor(currentState),
        opacity: segmentOpacity(currentState),
      });
    }
  }

  if (raw.length === 0) return [];
  const merged: ProducerLifecycleSegment[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const prev = merged[merged.length - 1];
    if (raw[i].state === prev.state && raw[i].opacity === prev.opacity) {
      prev.end = raw[i].end;
    } else {
      merged.push(raw[i]);
    }
  }
  return merged;
}

/** Point-in-time markers only (added/closed + quality). Muted/active use lifecycle bars. */
export function buildProducerInstantBoxes(producer: Producer): ProducerInstantBox[] {
  const out: ProducerInstantBox[] = [];
  if (producer.createdAt != null) {
    out.push({
      timestamp: producer.createdAt,
      label: 'added',
      color: instantBoxColor('created'),
    });
  }
  for (const h of relevantHistory(producer)) {
    if (LIFECYCLE_ONLY_EVENTS.has(h.event)) continue;
    if (h.event === 'created' || h.event === 'closed') continue;
    if (!OVERVIEW_INSTANT_EVENTS.has(h.event)) continue;
    out.push({
      timestamp: h.timestamp,
      label: instantLabel(h.event),
      color: instantBoxColor(h.event),
    });
  }
  if (producer.closedAt != null) {
    out.push({
      timestamp: producer.closedAt,
      label: 'closed',
      color: instantBoxColor('closed'),
    });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}
