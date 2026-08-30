/**
 * When the client's browser tab was in the background.
 *
 * client-monitor 4.7.0 reports `TAB_VISIBILITY_CHANGED` with a payload of
 * `{ visible: boolean }`. That is a *transition*, not a state: the flag says
 * what the tab moved **to**. So a stretch of backgrounded time runs from a
 * `visible: false` event to the next `visible: true` one, and reading the flag
 * as "the tab was visible during this sample" inverts every span.
 *
 * Why it earns a place on every timeline: a backgrounded tab is throttled by
 * the browser. Timers slow, `requestAnimationFrame` stops, capture frame rate
 * collapses, the encoder is starved and stats collection itself misses its
 * schedule. A great many alarming-looking readings — a bitrate cliff, frozen
 * video, a CPU spike on return — are the tab being in the background, and the
 * only honest way to tell them apart from a real fault is to draw when it was.
 *
 * Nothing here is inferred from stats. If the client never sends the event,
 * `reported` is false and no span is drawn: a dashboard that shaded a guess
 * would be worse than one that shades nothing.
 */

import type { ClientSample } from '../schema/ClientSample.ts';
import { ClientEventTypes } from '../schema/ClientEventTypes.ts';
import { parseJsonPayload } from '../schema/clientSampleParse.ts';

/** A stretch of time during which the tab was in the background. */
export interface HiddenSpan {
  start: number;
  end: number;
  /** True when nothing closed the span and it was extended to the session end. */
  openEnded: boolean;
}

export interface TabVisibility {
  /** True when the client sent at least one visibility event. */
  reported: boolean;
  /** Backgrounded stretches, in time order and never overlapping. */
  hidden: HiddenSpan[];
  /** Total backgrounded time in ms. */
  hiddenMs: number;
  /** Share of the session spent backgrounded, 0–1; null when the span is unknown. */
  hiddenRatio: number | null;
  /** How many times the tab changed state. */
  switches: number;
  /**
   * True when the tab was already in the background before the first event.
   * Inferred, not reported: the first event says what the tab moved *to*, so a
   * leading `visible: true` proves it was hidden before it.
   */
  hiddenAtStart: boolean;
}

const EMPTY: TabVisibility = {
  reported: false,
  hidden: [],
  hiddenMs: 0,
  hiddenRatio: null,
  switches: 0,
  hiddenAtStart: false,
};

interface Toggle {
  at: number;
  visible: boolean;
}

/** Read the `visible` flag, tolerating a payload written as a JSON string. */
function readVisible(payload: string | Record<string, unknown> | undefined): boolean | undefined {
  const parsed = parseJsonPayload(payload);
  const value = parsed?.visible;
  if (typeof value === 'boolean') return value;
  // A producer that stringifies booleans should not silently drop the event.
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export interface BuildTabVisibilityOptions {
  /** Session start; a span open before the first event is clamped to it. */
  sessionStart?: number;
  /** Session end; a span never closed is extended to it. */
  sessionEnd?: number;
}

/**
 * Collect the tab's backgrounded stretches from a client's samples.
 *
 * Repeated events for the state the tab is already in are ignored rather than
 * closing and reopening a span — a client is free to re-announce, and a stream
 * of `visible: false` events describes one stretch in the background, not many.
 */
export function buildTabVisibility(
  samples: ClientSample[] | null | undefined,
  options: BuildTabVisibilityOptions = {},
): TabVisibility {
  if (!samples?.length) return EMPTY;

  const toggles: Toggle[] = [];
  for (const sample of samples) {
    for (const event of sample.clientEvents ?? []) {
      if (event?.type !== ClientEventTypes.TAB_VISIBILITY_CHANGED) continue;
      const visible = readVisible(event.payload);
      if (visible === undefined) continue;
      const at = event.timestamp ?? sample.timestamp;
      if (!Number.isFinite(at)) continue;
      toggles.push({ at, visible });
    }
  }

  if (toggles.length === 0) return EMPTY;

  // Samples arrive in order but events inside one may not, and a re-uploaded
  // stream can interleave; sorting costs nothing and removes the assumption.
  toggles.sort((a, b) => a.at - b.at);

  const first = toggles[0];
  const sessionStart = options.sessionStart ?? samples[0]?.timestamp ?? first.at;
  const sessionEnd =
    options.sessionEnd ?? samples[samples.length - 1]?.timestamp ?? toggles[toggles.length - 1].at;

  // The first event states what the tab moved to, so the state before it was
  // the opposite. A leading `visible: true` therefore means the session opened
  // with the tab already in the background.
  const hiddenAtStart = first.visible && first.at > sessionStart;

  const hidden: HiddenSpan[] = [];
  // Walk the toggles from the state the first event implies, opening a span on
  // every real change to hidden and closing it on the change back.
  let state = !hiddenAtStart; // true = visible
  let openedAt: number | null = hiddenAtStart ? sessionStart : null;
  let switches = 0;

  for (const toggle of toggles) {
    if (toggle.visible === state) continue; // a re-announcement, not a change
    state = toggle.visible;
    switches += 1;
    if (!toggle.visible) {
      openedAt = toggle.at;
    } else if (openedAt != null) {
      if (toggle.at > openedAt) hidden.push({ start: openedAt, end: toggle.at, openEnded: false });
      openedAt = null;
    }
  }

  if (openedAt != null) {
    const end = Math.max(sessionEnd, openedAt);
    hidden.push({ start: openedAt, end, openEnded: true });
  }

  const hiddenMs = hidden.reduce((a, s) => a + Math.max(0, s.end - s.start), 0);
  const sessionMs = sessionEnd - sessionStart;

  return {
    reported: true,
    hidden,
    hiddenMs,
    hiddenRatio: sessionMs > 0 ? Math.min(1, hiddenMs / sessionMs) : null,
    switches,
    hiddenAtStart,
  };
}

/** True when `at` falls inside a backgrounded stretch. */
export function isHiddenAt(visibility: TabVisibility, at: number): boolean {
  return visibility.hidden.some((span) => at >= span.start && at <= span.end);
}

/** Cache keyed on the sample array, so every chart shares one computation. */
const cache = new WeakMap<ClientSample[], TabVisibility>();

export function cachedTabVisibility(
  samples: ClientSample[] | null | undefined,
  options: BuildTabVisibilityOptions = {},
): TabVisibility {
  if (!samples?.length) return EMPTY;
  const hit = cache.get(samples);
  if (hit) return hit;
  const built = buildTabVisibility(samples, options);
  cache.set(samples, built);
  return built;
}

/** One stretch of the lane: the tab was either in the foreground, or not. */
export interface VisibilitySegment {
  start: number;
  end: number;
  /** True while the tab was in the foreground. */
  visible: boolean;
  /** True when nothing closed the stretch and it was extended to `to`. */
  openEnded: boolean;
}

/**
 * The tab's state across a whole time range, as back-to-back segments.
 *
 * `hidden` alone cannot be drawn as a lane: a lane has to say what the tab was
 * doing at *every* moment, so the gaps between the hidden stretches are filled
 * in as visible. Segments are clipped to `[from, to]`, so a chart whose domain
 * is narrower than the session gets exactly the part it can draw.
 *
 * Returns an empty list when the client never reported visibility — a lane
 * covering the whole range in "visible" would be a claim nothing supports.
 */
export function visibilitySegments(
  visibility: TabVisibility,
  from: number,
  to: number,
): VisibilitySegment[] {
  if (!visibility.reported || !(to > from)) return [];

  const segments: VisibilitySegment[] = [];
  let cursor = from;

  for (const span of visibility.hidden) {
    const start = Math.max(from, span.start);
    const end = Math.min(to, span.end);
    if (end <= from || start >= to) continue;
    if (start > cursor) segments.push({ start: cursor, end: start, visible: true, openEnded: false });
    segments.push({ start, end, visible: false, openEnded: span.openEnded && end >= to });
    cursor = end;
  }

  if (cursor < to) segments.push({ start: cursor, end: to, visible: true, openEnded: false });

  return segments;
}
