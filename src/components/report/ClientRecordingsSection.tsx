'use client';
import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import {
  formatDuration,
  formatDateTime,
  formatHMS,
  formatHMSms,
  formatBps,
  formatBytes,
  shortId,
  d3TimeFormat,
  d3TimeScale,
} from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsProcessor.ts';
import type {
  RecorderServiceSample,
  ClientRecordingEvent,
  RecorderArchiveStats,
  HybridRecorderStats,
} from '../../utils/statsTypes.ts';
import {
  RecordingClientEventTypes as R,
  isRecordingClientEventType,
} from '../../schema/RecordingClientEventTypes.ts';
const TAKE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
import styles from './RecordingsSection.module.css';

// ---------------------------------------------------------------------------
// State machine mappings
// ---------------------------------------------------------------------------

const SESSION_EVENT_TO_STATE: Record<string, string> = {
  [R.RECORDING_SESSION_CREATED]: 'created',
  [R.RECORDING_SESSION_START_RECORDING]: 'started',
  [R.RECORDING_SESSION_COUNTDOWN_ENDS]: 'recording',
  [R.RECORDING_SESSION_STOP_RECORDING]: 'stopped',
  [R.RECORDING_SESSION_CLOSED]: 'closed',
};

const TRACK_EVENT_TO_STATE: Record<string, string> = {
  [R.RECORDING_SESSION_ADD_RECORDING_TRACK]: 'ready',
  [R.RECORDING_SESSION_START_RECORDING_TRACK]: 'recording',
  [R.RECORDING_SESSION_REMOVE_RECORDING_TRACK]: 'closed',
};

/** Recorder ≥ 3.1.0: preroll state + PREROLLED / RECORDING_TRACK_STATE_CHANGED events. */
const RECORDER_SEMVER_V31 = { major: 3, minor: 1 } as const;

const TRACK_EVENT_V31_TYPES = new Set<string>([
  R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED,
  R.RECORDING_TRACK_STATE_CHANGED,
]);

// Events that belong to the RecorderService level — shown in the RecorderService
// events list, never pulled into a take's event list.
const SERVICE_ONLY_EVENTS = new Set<string>([
  R.RECORDER_SERVICE_STATE_CHANGE,
  R.RECORDING_SESSION_UPDATE_PRODUCERS,
  R.RECORDING_SESSION_CREATED,
  R.RECORDING_SESSION_CLOSED,
]);

// All events that belong to an archive track (dot filtering on ArchiveTimeline)
const TRACK_EVENT_TYPES = new Set<string>([
  ...Object.keys(TRACK_EVENT_TO_STATE),
  ...TRACK_EVENT_V31_TYPES,
  R.RECORDING_TRACK_AUDIO_RECORDING_STARTED,
  R.RECORDING_TRACK_AUDIO_RECORDING_STOPPED,
  R.RECORDING_TRACK_VIDEO_RECORDING_STARTED,
  R.RECORDING_TRACK_VIDEO_RECORDING_STOPPED,
]);

const TRACK_EVENT_LABELS: Record<string, string> = {
  [R.RECORDING_SESSION_ADD_RECORDING_TRACK]: 'add recording track',
  [R.RECORDING_SESSION_START_RECORDING_TRACK]: 'start recording track',
  [R.RECORDING_SESSION_REMOVE_RECORDING_TRACK]: 'remove recording track',
  [R.RECORDING_SESSION_STOP_RECORDING_TRACK]: 'stop recording track',
  [R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED]: 'recording track prerolled',
  [R.RECORDING_TRACK_STATE_CHANGED]: 'recording track state changed',
  [R.RECORDING_TRACK_AUDIO_RECORDING_STARTED]: 'recording track audio started',
  [R.RECORDING_TRACK_AUDIO_RECORDING_STOPPED]: 'recording track audio stopped',
  [R.RECORDING_TRACK_VIDEO_RECORDING_STARTED]: 'recording track video started',
  [R.RECORDING_TRACK_VIDEO_RECORDING_STOPPED]: 'recording track video stopped',
};

/** Milestones shown on expanded archive cards (incl. preroll + start; not only A/V monitor). */
const ARCHIVE_TRACK_LIST_EVENT_TYPES = new Set<string>([
  R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED,
  R.RECORDING_SESSION_START_RECORDING_TRACK,
  R.RECORDING_TRACK_AUDIO_RECORDING_STARTED,
  R.RECORDING_TRACK_AUDIO_RECORDING_STOPPED,
  R.RECORDING_TRACK_VIDEO_RECORDING_STARTED,
  R.RECORDING_TRACK_VIDEO_RECORDING_STOPPED,
]);

// For session-level events that can also carry an archiveId, show the track
// variant of the label when archiveId is present in the payload.
const SESSION_TRACK_VARIANT_LABELS: Record<string, string> = {
  [R.RECORDING_SESSION_START_RECORDING]: 'start recording track',
  [R.RECORDING_SESSION_STOP_RECORDING]: 'stop recording track',
};

/** RecorderService / session bars in error — strong red (timeline), not pastel. */
const ERROR_STATE_BAR = '#dc2626';

const STATE_COLORS: Record<string, string> = {
  idle:         '#94a3b8',
  initializing: '#8b5cf6',
  starting:     '#f59e0b',
  stopping:     '#f97316',
  stopped:      '#f97316',
  error:        ERROR_STATE_BAR,
  created:      '#6366f1',
  started:      '#3b82f6',
  recording:    '#10b981',
  preroll:      '#2dd4bf',
  ready:        '#f59e0b',
  closed:       '#7c3aed',
  done:         '#64748b',
  unknown:      '#64748b',
};

function stateColor(state: string | null | undefined): string {
  return STATE_COLORS[state ?? ''] ?? '#64748b';
}
function takeColor(index: number): string {
  return TAKE_COLORS[index % TAKE_COLORS.length];
}
// Track management events: add / start / remove / stop recording track
const TRACK_MGMT_EVENTS = new Set<string>([
  R.RECORDING_SESSION_ADD_RECORDING_TRACK,
  R.RECORDING_SESSION_START_RECORDING_TRACK,
  R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED,
  R.RECORDING_SESSION_REMOVE_RECORDING_TRACK,
  R.RECORDING_SESSION_STOP_RECORDING_TRACK,
  R.RECORDING_TRACK_STATE_CHANGED,
]);

function parseRecorderSemver(version: string): { major: number; minor: number; patch: number } | null {
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** True when recorder version is ≥ major.minor (patch ignored). */
function isRecorderVersionAtLeast(version: string, major: number, minor: number): boolean {
  const p = parseRecorderSemver(version);
  if (!p) return false;
  if (p.major !== major) return p.major > major;
  return p.minor >= minor;
}

/** `RECORDING_SESSION_CREATED.payload.version` from the latest CREATED event, if set. */
function extractRecorderVersion(events: ClientRecordingEvent[]): string | null {
  const created = events.filter(
    (e) => e.type === R.RECORDING_SESSION_CREATED
      && e.payload.version != null
      && String(e.payload.version).trim() !== '',
  );
  if (!created.length) return null;
  const latest = created.reduce((a, b) =>
    a.timestamp.getTime() >= b.timestamp.getTime() ? a : b,
  );
  return String(latest.payload.version).trim();
}

function trackTransitionFromEvent(
  e: ClientRecordingEvent,
  useRecorderV31: boolean,
): { ts: number; state: string } | null {
  const ts = e.timestamp.getTime();
  if (useRecorderV31) {
    if (e.type === R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED) {
      return { ts, state: 'preroll' };
    }
    if (e.type === R.RECORDING_TRACK_STATE_CHANGED) {
      const newState = e.payload.newState as string | undefined;
      if (newState) return { ts, state: newState };
      return null;
    }
  }
  const mapped = TRACK_EVENT_TO_STATE[e.type];
  return mapped ? { ts, state: mapped } : null;
}

function collapseTrackTransitions(
  transitions: Array<{ ts: number; state: string }>,
): Array<{ ts: number; state: string }> {
  const sorted = [...transitions].sort((a, b) => a.ts - b.ts);
  const out: Array<{ ts: number; state: string }> = [];
  for (const t of sorted) {
    if (out.length && out[out.length - 1].state === t.state) continue;
    out.push(t);
  }
  return out;
}

/** Non-empty payload.error that is a real message (not null/empty or the literal string "undefined"). */
function hasMeaningfulPayloadError(err: unknown): boolean {
  if (err == null) return false;
  const s = String(err).trim();
  if (s === '') return false;
  if (s.toLowerCase() === 'undefined') return false;
  return true;
}

/** Error-ish payload or RecorderService transition involving `error` — dots + list highlight. */
function payloadIndicatesError(ev: ClientRecordingEvent): boolean {
  if (hasMeaningfulPayloadError(ev.payload.error)) return true;
  if (ev.type === R.RECORDER_SERVICE_STATE_CHANGE) {
    const a = ev.payload.actualState as string | undefined;
    const p = ev.payload.prevState as string | undefined;
    if (a === 'error' || p === 'error') return true;
  }
  const sessionState = ev.payload.sessionState as string | undefined;
  if (sessionState === 'error') return true;
  const st = ev.payload.state as string | undefined;
  if (st === 'error') return true;
  return false;
}

function eventColor(ev: ClientRecordingEvent): string {
  if (payloadIndicatesError(ev)) return ERROR_STATE_BAR;
  const type = ev.type;
  if (type === R.RECORDER_SERVICE_STATE_CHANGE) return '#f59e0b'; // amber
  if (type === R.RECORDING_SESSION_UPDATE_PRODUCERS) return '#10b981'; // green
  if (type.startsWith('RECORDING_TRACK_AUDIO')) return '#22d3ee'; // cyan  (audio monitor)
  if (type.startsWith('RECORDING_TRACK_VIDEO')) return '#a78bfa'; // violet (video monitor)
  if (type === R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED) return '#2dd4bf'; // teal (preroll)
  if (type === R.RECORDING_TRACK_STATE_CHANGED) return '#94a3b8'; // slate (state sync)
  if (TRACK_MGMT_EVENTS.has(type))                   return '#fb923c'; // orange (track lifecycle)
  return '#6366f1'; // indigo (general session events)
}

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface StateSegment { start: number; end: number; state: string; color: string; }
interface TrackData    { archiveId: string; source?: string; segments: StateSegment[]; }
interface TakeGroup {
  takeId:          string;
  colorIndex:      number;
  sessionSegments: StateSegment[];
  tracks:          TrackData[];
  takeEvents:      ClientRecordingEvent[];
}

// ---------------------------------------------------------------------------
// Segment builders
// ---------------------------------------------------------------------------

function buildSegments(
  transitions: Array<{ ts: number; state: string }>,
  globalEnd: number,
): StateSegment[] {
  if (!transitions.length) return [];
  return transitions.map((t, i) => ({
    start: t.ts,
    end:   t.state === 'closed' ? t.ts : (transitions[i + 1]?.ts ?? globalEnd),
    state: t.state,
    color: stateColor(t.state),
  }));
}

function buildServiceSegments(
  events: ClientRecordingEvent[],
  globalStart: number,
  globalEnd: number,
): StateSegment[] {
  const changes = events
    .filter((e) => e.type === R.RECORDER_SERVICE_STATE_CHANGE)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (!changes.length) return [];
  const initialState = (changes[0].payload.prevState as string | undefined) ?? 'unknown';
  return buildSegments([
    { ts: globalStart, state: initialState },
    ...changes.map((e) => ({ ts: e.timestamp.getTime(), state: (e.payload.actualState as string | undefined) ?? 'unknown' })),
  ], globalEnd);
}

function buildTakeGroups(
  events: ClientRecordingEvent[],
  globalEnd: number,
  useRecorderV31: boolean,
): TakeGroup[] {
  // Sort once by time so we can scan in chronological order.
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // --- Collect take IDs in first-seen order ---
  const takeOrder: string[] = [];
  const seenTake = new Set<string>();
  for (const ev of sorted) {
    const id = ev.payload.takeId as string | undefined;
    if (id && !seenTake.has(id)) { seenTake.add(id); takeOrder.push(id); }
  }

  // --- Infer take ownership for events that carry archiveId but no takeId
  //     (e.g. ADD_RECORDING_TRACK is emitted by the track itself and may not
  //     re-echo the session's takeId).  We track which take was "active" as we
  //     scan chronologically, then assign archiveId → takeId on first sighting.
  const archiveTake = new Map<string, string>(); // archiveId → takeId
  let activeTake: string | null = null;
  for (const ev of sorted) {
    const tid = ev.payload.takeId as string | undefined;
    const aid = ev.payload.archiveId as string | undefined;
    if (tid) activeTake = tid;
    if (aid && !archiveTake.has(aid) && activeTake) archiveTake.set(aid, activeTake);
  }

  return takeOrder.map((takeId, colorIndex) => {
    // Session timeline segments: built from ALL session-state events for this take
    // using a direct takeId match.  CREATED and CLOSED are SERVICE_ONLY for the
    // event list but must still drive the timeline rows.
    const sessionSegments = buildSegments(
      sorted
        .filter((e) => SESSION_EVENT_TO_STATE[e.type] && (e.payload.takeId as string | undefined) === takeId)
        .map((e) => ({ ts: e.timestamp.getTime(), state: SESSION_EVENT_TO_STATE[e.type] })),
      globalEnd,
    );

    // takeEvents: what appears in the TakeCard event list.
    // • excludes SERVICE_ONLY_EVENTS (CREATED, CLOSED, UPDATE_PRODUCERS, STATE_CHANGE)
    // • includes events with an explicit takeId match (non-service session events)
    // • includes archive-track events that have no takeId via archiveTake inference
    const takeEvents = sorted.filter((e) => {
      if (SERVICE_ONLY_EVENTS.has(e.type)) return false;
      if ((e.payload.takeId as string | undefined) === takeId) return true;
      const aid = e.payload.archiveId as string | undefined;
      return aid ? archiveTake.get(aid) === takeId : false;
    });

    const archiveOrder: string[] = [];
    const seenA = new Set<string>();
    const archiveSrc = new Map<string, string>();
    for (const ev of takeEvents) {
      const aid = ev.payload.archiveId as string | undefined;
      const src = ev.payload.source    as string | undefined;
      if (aid && !seenA.has(aid)) { seenA.add(aid); archiveOrder.push(aid); }
      if (aid && src) archiveSrc.set(aid, src);
    }

    const tracks: TrackData[] = archiveOrder.map((archiveId) => {
      const transitions = collapseTrackTransitions(
        takeEvents
          .filter((e) => e.payload.archiveId === archiveId)
          .map((e) => trackTransitionFromEvent(e, useRecorderV31))
          .filter((t): t is { ts: number; state: string } => t != null),
      );
      return {
        archiveId,
        source: archiveSrc.get(archiveId),
        segments: buildSegments(transitions, globalEnd),
      };
    });

    return { takeId, colorIndex, sessionSegments, tracks, takeEvents };
  });
}

// ---------------------------------------------------------------------------
// D3 timeline helper
// ---------------------------------------------------------------------------

const MIN_VIS     = 4;
const MARGIN      = { top: 26, right: 16, bottom: 8, left: 164 };
const SEP         = 8;
const EVENT_ROW_H = 30;
const ROW_H       = 22;
const TRACK_H     = 18;

function buildD3Chart(
  container: HTMLElement,
  rows: Array<{ label: string; labelColor: string; labelClick?: () => void; labelTitle?: string; segments: StateSegment[]; rowH: number }>,
  events: Array<{ ts: number; color: string; label: string }>,
  globalStart: number,
  globalEnd: number,
  tz: string,
) {
  const width = container.clientWidth;
  if (width <= 0) return;
  container.innerHTML = '';

  const hasEvents = events.length > 0;
  let totalH = MARGIN.top;
  for (const r of rows) totalH += r.rowH;
  if (rows.length > 1) totalH += SEP;
  if (hasEvents) totalH += EVENT_ROW_H;
  totalH += MARGIN.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%').attr('height', totalH)
    .attr('viewBox', `0 0 ${width} ${totalH}`)
    .style('display', 'block');

  const xScale = d3TimeScale(tz as never)
    .domain([new Date(globalStart), new Date(globalEnd)])
    .range([MARGIN.left, width - MARGIN.right]);

  const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const dimColor  = isDark ? '#64748b' : '#9ca3af';
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const bgColor   = isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.05)';
  const numTicks  = Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 120));

  svg.append('g')
    .attr('transform', `translate(0, ${MARGIN.top})`)
    .call(d3.axisTop(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz as never)(d as Date)))
    .call((g) => g.select('.domain').remove())
    .selectAll('text').style('font-size', '9px').attr('fill', dimColor);

  for (const tick of xScale.ticks(numTicks)) {
    svg.append('line')
      .attr('x1', xScale(tick)).attr('x2', xScale(tick))
      .attr('y1', MARGIN.top).attr('y2', totalH - MARGIN.bottom)
      .attr('stroke', gridColor).attr('stroke-width', 0.5);
  }

  const tooltip = d3.select(container)
    .append('div').attr('class', styles.tooltip).style('opacity', '0');
  const showTip = (ev: MouseEvent, html: string) =>
    tooltip.html(html).style('opacity', '1')
      .style('left', `${ev.clientX + 12}px`).style('top', `${ev.clientY - 10}px`);
  const moveTip = (ev: MouseEvent) =>
    tooltip.style('left', `${ev.clientX + 12}px`).style('top', `${ev.clientY - 10}px`);
  const hideTip = () => tooltip.style('opacity', '0');

  // State-change transition lines drawn first (behind content)
  const allSegs = rows.flatMap((r) => r.segments);
  const transitionXs = new Set<number>();
  for (const seg of allSegs) {
    const x = Math.round(xScale(new Date(seg.start)));
    if (!transitionXs.has(x)) {
      transitionXs.add(x);
      svg.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', MARGIN.top).attr('y2', totalH - MARGIN.bottom)
        .attr('stroke', isDark ? '#475569' : '#94a3b8')
        .attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
      svg.append('text')
        .attr('x', x + 3).attr('y', MARGIN.top + 10)
        .attr('font-size', seg.state === 'error' ? '9px' : '8px')
        .attr('font-weight', seg.state === 'error' ? '700' : '400')
        .attr('fill', stateColor(seg.state))
        .text(seg.state);
    }
  }

  let yOff = MARGIN.top;

  for (const row of rows) {
    const barY = yOff + 2;
    const bH   = row.rowH - 4;

    svg.append('rect')
      .attr('x', xScale(new Date(globalStart))).attr('y', barY)
      .attr('width', Math.max(1, xScale(new Date(globalEnd)) - xScale(new Date(globalStart))))
      .attr('height', bH).attr('fill', bgColor).attr('rx', 2);

    const lbl = svg.append('text')
      .attr('x', MARGIN.left - 6).attr('y', yOff + row.rowH / 2 + 4)
      .attr('text-anchor', 'end').attr('font-size', '9px')
      .attr('fill', row.labelColor);
    if (row.labelClick || row.labelTitle) {
      lbl.style('cursor', 'pointer').attr('text-decoration', 'underline');
      if (row.labelClick) lbl.on('click', row.labelClick);
    }
    lbl.text(row.label);
    // Hover area over the label — shows full ID tooltip
    if (row.labelTitle) {
      const tipHtml = `<span style="font-family:ui-monospace,monospace;word-break:break-all">${row.labelTitle}</span>`;
      svg.append('rect')
        .attr('x', 0).attr('y', yOff + 1)
        .attr('width', MARGIN.left - 8).attr('height', row.rowH - 2)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('click', () => navigator.clipboard.writeText(row.labelTitle!).catch(() => {}))
        .on('mouseenter', (e: MouseEvent) => showTip(e, tipHtml))
        .on('mousemove', moveTip).on('mouseleave', hideTip);
    }

    // Pre-compute visual positions: narrow segments get a guaranteed minimum pixel
    // width and push all subsequent segments to the right, so e.g. a 0ms 'ready'
    // block physically appears BEFORE the 'recording' block instead of under it.
    const NARROW_MIN_PX = 12;
    const chartRight    = width - MARGIN.right;
    const segs = row.segments;

    let vDx = 0; // accumulated pixel expansion from narrow segments
    const vSegs = segs.map((seg) => {
      const rawX1 = xScale(new Date(seg.start));
      const rawX2 = xScale(new Date(seg.end));
      const rawW  = Math.max(0, rawX2 - rawX1);
      const isNarrow = rawW < MIN_VIS;
      const vx1 = Math.min(rawX1 + vDx, chartRight);
      const vw  = isNarrow
        ? NARROW_MIN_PX
        : Math.max(0, Math.min(rawW, chartRight - vx1));
      if (isNarrow) vDx += NARROW_MIN_PX - rawW;
      return { seg, vx1, vw, isNarrow };
    });

    // Two-pass: wide blocks first so narrow blocks render on top
    for (const pass of [0, 1] as const) {
      for (const { seg, vx1, vw, isNarrow } of vSegs) {
        if (pass === 0 && isNarrow)  continue;
        if (pass === 1 && !isNarrow) continue;

        const isErrSeg = seg.state === 'error';
        const fillOp   = isErrSeg ? 1 : 0.82;
        const errStroke = isErrSeg ? (isDark ? '#fca5a5' : '#b91c1c') : null;

        const tip =
          `<strong style="color:${seg.color}">${seg.state}</strong><br/>` +
          `${formatHMS(seg.start, tz as never)}` +
          (seg.end > seg.start ? ` – ${formatHMS(seg.end, tz as never)}<br/>${formatDuration(seg.end - seg.start)}` : '');

        if (isNarrow) {
          const overH = 4;
          svg.append('rect')
            .attr('x', vx1).attr('y', barY - overH)
            .attr('width', vw).attr('height', bH + overH * 2)
            .attr('fill', seg.color).attr('opacity', fillOp).attr('rx', 2)
            .attr('stroke', errStroke ?? 'none')
            .attr('stroke-width', isErrSeg ? 2 : 0)
            .attr('pointer-events', 'none');
          svg.append('rect')
            .attr('x', vx1 - 4).attr('y', barY - overH)
            .attr('width', vw + 8).attr('height', bH + overH * 2)
            .attr('fill', 'transparent')
            .on('mouseenter', (e: MouseEvent) => showTip(e, tip))
            .on('mousemove', moveTip).on('mouseleave', hideTip);
        } else {
          svg.append('rect')
            .attr('x', vx1).attr('y', barY).attr('width', vw).attr('height', bH)
            .attr('fill', seg.color).attr('opacity', fillOp).attr('rx', 2)
            .attr('stroke', errStroke ?? 'none')
            .attr('stroke-width', isErrSeg ? 2 : 0)
            .on('mouseenter', (e: MouseEvent) => showTip(e, tip))
            .on('mousemove', moveTip).on('mouseleave', hideTip);
        }
      }
    }

    yOff += row.rowH;
  }

  if (hasEvents) {
    yOff += SEP;
    const evY = yOff + EVENT_ROW_H / 2;
    svg.append('line')
      .attr('x1', xScale(new Date(globalStart))).attr('x2', xScale(new Date(globalEnd)))
      .attr('y1', evY).attr('y2', evY).attr('stroke', gridColor).attr('stroke-width', 1);

    for (const ev of events) {
      const x = xScale(new Date(ev.ts));
      if (x < MARGIN.left || x > width - MARGIN.right) continue;
      svg.append('line')
        .attr('x1', x).attr('x2', x).attr('y1', evY - 10).attr('y2', evY + 10)
        .attr('stroke', ev.color).attr('stroke-width', 1.5).attr('pointer-events', 'none');
      svg.append('circle').attr('cx', x).attr('cy', evY).attr('r', 4)
        .attr('fill', ev.color)
        .attr('stroke', isDark ? '#1e293b' : '#fff').attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', (e: MouseEvent) =>
          showTip(e, `<strong>${ev.label}</strong><br/>${formatRecordingEventTimestamp(new Date(ev.ts), tz)}`))
        .on('mousemove', moveTip).on('mouseleave', hideTip);
    }
  }
}

function makeEventDots(
  events: ClientRecordingEvent[],
  filterFn: (ev: ClientRecordingEvent) => boolean,
) {
  return events.filter(filterFn).map((ev) => {
    const color   = eventColor(ev);
    const isTrack = TRACK_EVENT_TYPES.has(ev.type);
    let label: string;
    if (isTrack) {
      const base  = TRACK_EVENT_LABELS[ev.type] ?? ev.type.toLowerCase();
      const aid   = ev.payload.archiveId ? ` [${shortId(String(ev.payload.archiveId))}]` : '';
      const extra = ev.payload.type      ? ` · ${ev.payload.type}`                        : '';
      const stateChg = ev.type === R.RECORDING_TRACK_STATE_CHANGED
        && ev.payload.prevState != null && ev.payload.newState != null
        ? ` (${ev.payload.prevState} → ${ev.payload.newState})`
        : '';
      const prerollExtra = ev.type === R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED
        ? [
            ev.payload.recorderMode != null ? `mode:${ev.payload.recorderMode}` : '',
            ev.payload.recordingType != null ? `type:${ev.payload.recordingType}` : '',
          ].filter(Boolean).join(' · ')
        : '';
      const prerollSuffix = prerollExtra ? ` · ${prerollExtra}` : '';
      label = base + aid + extra + stateChg + prerollSuffix;
    } else {
      label = ev.type.replace(/^RECORDING_SESSION_|^RECORDER_SERVICE_/, '').toLowerCase().replace(/_/g, ' ') +
        (ev.payload.prevState ? ` (${ev.payload.prevState} → ${ev.payload.actualState})` : '') +
        (ev.payload.source    ? ` · ${ev.payload.source}` : '');
    }
    return { ts: ev.timestamp.getTime(), color, label };
  });
}

// ---------------------------------------------------------------------------
// Timeline screenshot state captions
// ---------------------------------------------------------------------------

type TimelineChartRow = {
  label: string;
  labelColor: string;
  labelClick?: () => void;
  labelTitle?: string;
  segments: StateSegment[];
  rowH: number;
};

function stateSegmentAt(segments: StateSegment[], t: number): StateSegment | null {
  if (!segments.length) return null;
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (t >= s.start && t <= s.end) return s;
  }
  if (t < segments[0].start) return segments[0];
  return segments[segments.length - 1];
}

function formatSegmentRange(seg: StateSegment, tz: string): string {
  const start = formatHMS(seg.start, tz as never);
  if (seg.end <= seg.start) return `${seg.state} @ ${start}`;
  return `${seg.state} ${start}–${formatHMS(seg.end, tz as never)} (${formatDuration(seg.end - seg.start)})`;
}

/** Preferred legend order (matches typical lifecycle left → right). */
const STATE_LEGEND_ORDER = [
  'idle', 'initializing', 'starting', 'created', 'ready', 'preroll', 'started',
  'recording', 'stopping', 'stopped', 'error', 'closed', 'done', 'unknown',
] as const;

function collectStatesFromRows(rows: TimelineChartRow[]): Set<string> {
  const active = new Set<string>();
  for (const row of rows) {
    for (const seg of row.segments) active.add(seg.state);
  }
  return active;
}

function orderedStatesForLegend(active: Set<string>): string[] {
  const out: string[] = [];
  for (const state of STATE_LEGEND_ORDER) {
    if (active.has(state)) out.push(state);
  }
  for (const state of active) {
    if (!out.includes(state)) out.push(state);
  }
  return out;
}

function appendStateColorLegend(parent: HTMLElement, rows: TimelineChartRow[]) {
  const states = orderedStatesForLegend(collectStatesFromRows(rows));
  if (!states.length) return;

  const legend = document.createElement('div');
  legend.className = styles.timelineCaptionLegend;

  const legendTitle = document.createElement('div');
  legendTitle.className = styles.timelineStateCaptionTitle;
  legendTitle.textContent = 'State colors (timeline bars)';
  legend.appendChild(legendTitle);

  const items = document.createElement('div');
  items.className = styles.timelineCaptionLegendItems;
  for (const state of states) {
    const item = document.createElement('span');
    item.className = styles.legendItem;
    const swatch = document.createElement('span');
    swatch.className = styles.legendSwatch;
    swatch.style.background = stateColor(state);
    item.append(swatch, document.createTextNode(state));
    items.appendChild(item);
  }
  legend.appendChild(items);
  parent.appendChild(legend);
}

function buildTimelineStateCaptionEl(
  rows: TimelineChartRow[],
  tz: string,
  globalEnd: number,
): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = styles.timelineStateCaption;
  wrap.setAttribute('data-screenshot-caption', 'true');

  const title = document.createElement('div');
  title.className = styles.timelineStateCaptionTitle;
  title.textContent = `States at screenshot (${formatDateTime(Date.now(), tz as never)})`;
  wrap.appendChild(title);

  appendStateColorLegend(wrap, rows);

  for (const row of rows) {
    const line = document.createElement('div');
    line.className = styles.timelineStateRow;

    const label = document.createElement('span');
    label.className = styles.timelineStateLabel;
    label.textContent = `${row.labelTitle ?? row.label}: `;

    const value = document.createElement('span');
    value.className = styles.timelineStateValue;
    const atEnd = stateSegmentAt(row.segments, globalEnd);
    const timeline = row.segments.map((s) => formatSegmentRange(s, tz)).join(' · ');
    const parts: string[] = [];
    if (atEnd) parts.push(`end of view: ${atEnd.state}`);
    if (timeline) parts.push(timeline);
    value.textContent = parts.length ? parts.join(' | ') : '—';

    line.append(label, value);
    wrap.appendChild(line);
  }

  return wrap;
}

// ---------------------------------------------------------------------------
// Reusable timeline React wrapper
// ---------------------------------------------------------------------------

function TimelineChart({
  rows, eventDots, globalStart, globalEnd,
}: {
  rows: TimelineChartRow[];
  eventDots: Array<{ ts: number; color: string; label: string }>;
  globalStart: number;
  globalEnd:   number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tz = useTimezoneTick();

  const render = useCallback(() => {
    if (!containerRef.current) return;
    buildD3Chart(containerRef.current, rows, eventDots, globalStart, globalEnd, tz);
  }, [rows, eventDots, globalStart, globalEnd, tz]);

  useEffect(() => { render(); }, [render]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => ro.disconnect();
  }, [render]);

  const handleBeforeCapture = useCallback(
    (root: HTMLElement) => {
      const cap = buildTimelineStateCaptionEl(rows, tz, globalEnd);
      root.appendChild(cap);
      return () => cap.remove();
    },
    [rows, tz, globalEnd],
  );

  return (
    <div className={styles.timelineWrap} ref={wrapRef}>
      <div ref={containerRef} className={styles.timeline} />
      <ScreenshotButton
        targetRef={wrapRef}
        className={styles.timelineScreenshotBtn}
        beforeCapture={handleBeforeCapture}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main timeline (RecorderService + session rows)
// ---------------------------------------------------------------------------

function MainTimeline({
  serviceSegments, takeGroups, events, globalStart, globalEnd,
}: {
  serviceSegments: StateSegment[];
  takeGroups:      TakeGroup[];
  events:          ClientRecordingEvent[];
  globalStart:     number;
  globalEnd:       number;
}) {
  const rows = useMemo(() => [
    { label: 'RecorderService', labelColor: 'var(--text-primary)' as string, segments: serviceSegments, rowH: ROW_H },
    ...takeGroups.map((g) => ({
      label:      `⎘ ${shortId(g.takeId)}`,
      labelTitle: g.takeId,
      labelColor: takeColor(g.colorIndex),
      labelClick: () => navigator.clipboard.writeText(g.takeId).catch(() => {}),
      segments:   g.sessionSegments,
      rowH:       ROW_H,
    })),
  ], [serviceSegments, takeGroups]);

  const dots = useMemo(
    () => makeEventDots(events, (ev) => !TRACK_EVENT_TYPES.has(ev.type)),
    [events],
  );

  return <TimelineChart rows={rows} eventDots={dots} globalStart={globalStart} globalEnd={globalEnd} />;
}

// ---------------------------------------------------------------------------
// Archive timeline inside expanded take card
// Session state row is first, then archive rows
// ---------------------------------------------------------------------------

function ArchiveTimeline({
  takeId, sessionSegments, sessionColor, tracks, events, globalStart, globalEnd,
}: {
  takeId:          string;
  sessionSegments: StateSegment[];
  sessionColor:    string;
  tracks:          TrackData[];
  events:          ClientRecordingEvent[];
  globalStart:     number;
  globalEnd:       number;
}) {
  const rows = useMemo(() => [
    // Session row on top — short takeId, hover shows full, click copies
    ...(sessionSegments.length ? [{
      label:      `⎘ ${shortId(takeId)}`,
      labelTitle: takeId,
      labelColor: sessionColor,
      labelClick: () => navigator.clipboard.writeText(takeId).catch(() => {}),
      segments:   sessionSegments,
      rowH:       ROW_H,
    }] : []),
    // Archive track rows — short archiveId + hover shows full, click copies
    ...tracks.map((t) => ({
      label:      shortId(t.archiveId),
      labelTitle: t.archiveId,
      labelColor: 'var(--text-primary)' as string,
      labelClick: () => navigator.clipboard.writeText(t.archiveId).catch(() => {}),
      segments:   t.segments,
      rowH:       TRACK_H,
    })),
  ], [takeId, sessionSegments, sessionColor, tracks]);

  const dots = useMemo(
    () => makeEventDots(events, (ev) => TRACK_EVENT_TYPES.has(ev.type)),
    [events],
  );

  return <TimelineChart rows={rows} eventDots={dots} globalStart={globalStart} globalEnd={globalEnd} />;
}

// ---------------------------------------------------------------------------
// Archive time series builder
// ---------------------------------------------------------------------------

interface HybridTimeSeries {
  bitrateData:     { timestamp: Date; value: number }[];
  throttleData:    { timestamp: Date; value: number }[];
  segCreated:      { timestamp: Date; value: number }[];
  segConfirmed:    { timestamp: Date; value: number }[];
  segProcessed:    { timestamp: Date; value: number }[];
  incomingFrames:  { timestamp: Date; value: number }[];
  sentFrames:      { timestamp: Date; value: number }[];
  recordedFrames:  { timestamp: Date; value: number }[];
  discardedFrames: { timestamp: Date; value: number }[];
  incomingBytes:   { timestamp: Date; value: number }[];
  fileReadMs:      { timestamp: Date; value: number }[];
}

function buildHybridTimeSeries(
  pts: Array<{ ts: Date; h: HybridRecorderStats }>,
): HybridTimeSeries {
  return {
    bitrateData:     pts.map((p) => ({ timestamp: p.ts, value: p.h.incomingBitrate      ?? 0 })),
    throttleData:    pts.map((p) => ({ timestamp: p.ts, value: p.h.throttlerLevel       ?? 0 })),
    segCreated:      pts.map((p) => ({ timestamp: p.ts, value: p.h.createdSegments      ?? 0 })),
    segConfirmed:    pts.map((p) => ({ timestamp: p.ts, value: p.h.confirmedSegments    ?? 0 })),
    segProcessed:    pts.map((p) => ({ timestamp: p.ts, value: p.h.processedSegments    ?? 0 })),
    incomingFrames:  pts.map((p) => ({ timestamp: p.ts, value: p.h.incomingFrames       ?? 0 })),
    sentFrames:      pts.map((p) => ({ timestamp: p.ts, value: p.h.sentFrames           ?? 0 })),
    recordedFrames:  pts.map((p) => ({ timestamp: p.ts, value: p.h.recordedFrames       ?? 0 })),
    discardedFrames: pts.map((p) => ({ timestamp: p.ts, value: p.h.discardedFrames      ?? 0 })),
    incomingBytes:   pts.map((p) => ({ timestamp: p.ts, value: p.h.incomingBytes        ?? 0 })),
    fileReadMs:      pts.map((p) => ({ timestamp: p.ts, value: p.h.totalFileHandleReadTimeMs ?? 0 })),
  };
}

interface LocalTrackSeries {
  chunks: { timestamp: Date; value: number }[];
  bytes:  { timestamp: Date; value: number }[];
}

function buildLocalTrackSeries(
  pts: Array<{ ts: Date; chunks: number; bytes: number }>,
): LocalTrackSeries {
  return {
    chunks: pts.map((p) => ({ timestamp: p.ts, value: p.chunks })),
    bytes:  pts.map((p) => ({ timestamp: p.ts, value: p.bytes  })),
  };
}

interface ArchiveTimeSeries {
  video?:       HybridTimeSeries;
  audio?:       HybridTimeSeries;
  localVideo?:  LocalTrackSeries;
  localAudio?:  LocalTrackSeries;
  kfReqRate:    { timestamp: Date; value: number }[];
  kfRetryRate:  { timestamp: Date; value: number }[];
}

function buildArchiveTimeSeries(archiveId: string, samples: RecorderServiceSample[]): ArchiveTimeSeries | null {
  const pts = samples
    .filter((s) => s.archives[archiveId] != null)
    .map((s) => ({ ts: s.timestamp, stats: s.archives[archiveId] as RecorderArchiveStats }));

  if (pts.length < 2) return null;

  const videoPts      = pts.filter((p) => p.stats.hybridVideo != null).map((p) => ({ ts: p.ts, h: p.stats.hybridVideo! }));
  const audioPts      = pts.filter((p) => p.stats.hybridAudio != null).map((p) => ({ ts: p.ts, h: p.stats.hybridAudio! }));
  const localVideoPts = pts.filter((p) => p.stats.localVideo  != null).map((p) => ({ ts: p.ts, chunks: p.stats.localVideo!.chunks, bytes: p.stats.localVideo!.bytes }));
  const localAudioPts = pts.filter((p) => p.stats.localAudio  != null).map((p) => ({ ts: p.ts, chunks: p.stats.localAudio!.chunks, bytes: p.stats.localAudio!.bytes }));

  // Cumulative key frame counters (only include points where value > 0)
  const kfReqRate   = pts
    .filter((p) => (p.stats.keyFrameRequests ?? 0) > 0)
    .map((p) => ({ timestamp: p.ts, value: p.stats.keyFrameRequests! }));
  const kfRetryRate = pts
    .filter((p) => (p.stats.keyFrameRequestRetries ?? 0) > 0)
    .map((p) => ({ timestamp: p.ts, value: p.stats.keyFrameRequestRetries! }));

  return {
    video:      videoPts.length      >= 2 ? buildHybridTimeSeries(videoPts)      : undefined,
    audio:      audioPts.length      >= 2 ? buildHybridTimeSeries(audioPts)      : undefined,
    localVideo: localVideoPts.length >= 2 ? buildLocalTrackSeries(localVideoPts) : undefined,
    localAudio: localAudioPts.length >= 2 ? buildLocalTrackSeries(localAudioPts) : undefined,
    kfReqRate,
    kfRetryRate,
  };
}

// ---------------------------------------------------------------------------
// Archive graphs — organized by stat group, each group collapsible
// ---------------------------------------------------------------------------

function ChartGroup({
  title, color, children,
}: {
  title:    string;
  color:    string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid var(--border-light)`, borderRadius: 6,
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.5rem',
          background: open ? `color-mix(in srgb, ${color} 8%, var(--info-card-bg))` : 'var(--info-card-bg)',
          border: 'none', borderLeft: `3px solid ${color}`,
          font: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color, letterSpacing: '0.03em' }}>
          {title}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0.4rem 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function HybridCharts({
  ts, label, bitrateColor, frameColor, eventBus,
}: {
  ts:           HybridTimeSeries;
  label:        string;
  bitrateColor: string;
  frameColor:   string;
  eventBus:     EventTarget;
}) {
  const fmt = (v: number) => v.toLocaleString();

  return (
    <>
      {/* Bitrate (live rate — not cumulative by nature) + Throttle level */}
      <div className={styles.chartRow}>
        {ts.bitrateData.length >= 2 && (
          <MiniChart
            title="Incoming Bitrate"
            description={`Live bitrate arriving at the ${label} track.`}
            data={ts.bitrateData}
            formatter={(v) => formatBps(v)}
            color={bitrateColor}
            eventBus={eventBus}
          />
        )}
        {ts.throttleData.some((d) => d.value > 0) && (
          <MiniChart
            title="Throttler Level"
            description="Higher values mean frames are being dropped to reduce write pressure."
            data={ts.throttleData}
            formatter={(v) => v.toFixed(0)}
            color="var(--warning)"
            eventBus={eventBus}
          />
        )}
      </div>

      {/* Cumulative frame counts */}
      {ts.incomingFrames.length >= 2 && (
        <div className={styles.chartRow}>
          <MiniChart
            title="Frames In"
            description="Cumulative frames received from the media source."
            data={ts.incomingFrames}
            formatter={fmt}
            color={frameColor}
            eventBus={eventBus}
          />
          <MiniChart
            title="Frames Recorded"
            description="Cumulative frames written to the recording file."
            data={ts.recordedFrames}
            formatter={fmt}
            color="var(--success)"
            eventBus={eventBus}
          />
          {ts.sentFrames.some((d) => d.value > 0) && (
            <MiniChart
              title="Frames Sent"
              description="Cumulative frames forwarded to the segment uploader."
              data={ts.sentFrames}
              formatter={fmt}
              color="var(--accent)"
              eventBus={eventBus}
            />
          )}
          {ts.discardedFrames.some((d) => d.value > 0) && (
            <MiniChart
              title="Frames Discarded"
              description="Cumulative frames dropped due to throttling or buffer overflow."
              data={ts.discardedFrames}
              formatter={fmt}
              color="var(--danger)"
              eventBus={eventBus}
            />
          )}
        </div>
      )}

      {/* Cumulative incoming bytes + file handle read time */}
      {ts.incomingBytes.some((d) => d.value > 0) && (
        <div className={styles.chartRow}>
          <MiniChart
            title="Incoming Bytes"
            description="Cumulative bytes received by this track."
            data={ts.incomingBytes}
            formatter={(v) => formatBytes(v)}
            color={bitrateColor}
            eventBus={eventBus}
          />
          {ts.fileReadMs.some((d) => d.value > 0) && (
            <MiniChart
              title="File Handle Read Time"
              description="Cumulative milliseconds spent reading from the segment file handle."
              data={ts.fileReadMs}
              formatter={(v) => `${v.toFixed(0)} ms`}
              color="var(--violet)"
              eventBus={eventBus}
            />
          )}
        </div>
      )}

      {/* Cumulative segment counts */}
      {ts.segCreated.some((d) => d.value > 0) && (
        <div className={styles.chartRow}>
          <MiniChart
            title="Segments Created"
            description="Cumulative HLS/DASH segments created."
            data={ts.segCreated}
            formatter={fmt}
            color="var(--violet)"
            eventBus={eventBus}
          />
          <MiniChart
            title="Segments Confirmed"
            description="Cumulative segments acknowledged by the storage backend."
            data={ts.segConfirmed}
            formatter={fmt}
            color="var(--warning)"
            eventBus={eventBus}
          />
          <MiniChart
            title="Segments Processed"
            description="Cumulative segments fully processed end-to-end."
            data={ts.segProcessed}
            formatter={fmt}
            color="var(--success)"
            eventBus={eventBus}
          />
        </div>
      )}
    </>
  );
}

function ArchiveGraphs({ archiveId, samples }: { archiveId: string; samples: RecorderServiceSample[] }) {
  const eventBus = useMemo(() => new EventTarget(), []);
  const ts = useMemo(() => buildArchiveTimeSeries(archiveId, samples), [archiveId, samples]);

  if (!ts) {
    return (
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0.25rem 0' }}>
        No time series data available for this archive.
      </div>
    );
  }

  const { video, audio, localVideo, localAudio, kfReqRate, kfRetryRate } = ts;
  const hasLocalVideo = localVideo && localVideo.chunks.some((d) => d.value > 0);
  const hasLocalAudio = localAudio && localAudio.chunks.some((d) => d.value > 0);
  const hasKf         = kfReqRate.length >= 2 || kfRetryRate.length >= 2;

  const fmt = (v: number) => v.toLocaleString();

  return (
    <div className={styles.chartsSection}>

      {video && (
        <ChartGroup title="hybridVideo" color="var(--accent)">
          <HybridCharts
            ts={video} label="hybridVideo"
            bitrateColor="var(--accent)" frameColor="var(--violet)"
            eventBus={eventBus}
          />
        </ChartGroup>
      )}

      {audio && (
        <ChartGroup title="hybridAudio" color="var(--success)">
          <HybridCharts
            ts={audio} label="hybridAudio"
            bitrateColor="var(--success)" frameColor="#10b981"
            eventBus={eventBus}
          />
        </ChartGroup>
      )}

      {hasLocalVideo && (
        <ChartGroup title="localVideo" color="var(--violet)">
          <div className={styles.chartRow}>
            <MiniChart
              title="Chunks (cumulative)"
              description="Total local video chunks received."
              data={localVideo!.chunks}
              formatter={fmt}
              color="var(--violet)"
              eventBus={eventBus}
            />
            <MiniChart
              title="Bytes (cumulative)"
              description="Total local video bytes received."
              data={localVideo!.bytes}
              formatter={(v) => formatBytes(v)}
              color="var(--accent)"
              eventBus={eventBus}
            />
          </div>
        </ChartGroup>
      )}

      {hasLocalAudio && (
        <ChartGroup title="localAudio" color="#10b981">
          <div className={styles.chartRow}>
            <MiniChart
              title="Chunks (cumulative)"
              description="Total local audio chunks received."
              data={localAudio!.chunks}
              formatter={fmt}
              color="#10b981"
              eventBus={eventBus}
            />
            <MiniChart
              title="Bytes (cumulative)"
              description="Total local audio bytes received."
              data={localAudio!.bytes}
              formatter={(v) => formatBytes(v)}
              color="var(--success)"
              eventBus={eventBus}
            />
          </div>
        </ChartGroup>
      )}

      {hasKf && (
        <ChartGroup title="track" color="var(--warning)">
          <div className={styles.chartRow}>
            {kfReqRate.length >= 2 && (
              <MiniChart
                title="Key Frame Requests (cumulative)"
                description="Cumulative key frame requests sent to the encoder."
                data={kfReqRate}
                formatter={fmt}
                color="var(--warning)"
                eventBus={eventBus}
              />
            )}
            {kfRetryRate.length >= 2 && (
              <MiniChart
                title="Key Frame Retries (cumulative)"
                description="Cumulative retried key frame requests — elevated values indicate encoder unresponsiveness."
                data={kfRetryRate}
                formatter={fmt}
                color="var(--danger)"
                eventBus={eventBus}
              />
            )}
          </div>
        </ChartGroup>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// START_RECORDING_TRACK timing (per archiveId)
// ---------------------------------------------------------------------------

const START_TRACK_TIMING_THRESHOLD_MS = 2000;

const START_TRACK_TIMESTAMP_ROWS = [
  { key: 'clientTimestamp', label: 'clientTimestamp', hint: 'Client Date.now() at countdown end' },
  { key: 'referenceTimestamp', label: 'referenceTimestamp', hint: 'Server time (skew-aware), same moment as client' },
  { key: 'startRequestTimestamp', label: 'startRequestTimestamp', hint: 'Server time at start request (may be updated later)' },
  { key: 'serverTimestamp', label: 'serverTimestamp', hint: 'Server time when first frame arrived' },
] as const;

function parsePayloadTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatTimingDeltaMs(ms: number): string {
  const sign = ms >= 0 ? '+' : '';
  if (Math.abs(ms) < 1000) return `${sign}${ms.toFixed(0)} ms`;
  return `${sign}${(ms / 1000).toFixed(3)} s`;
}

/** Client recording event list: epoch ms with human-readable datetime in brackets. */
function formatRecordingEventTimestamp(ts: Date, tz: string): string {
  const ms = ts.getTime();
  return `${ms} (${formatDateTime(ms, tz as never)})`;
}

const TRACK_ADD_EVENT_TYPES = [R.RECORDING_SESSION_ADD_RECORDING_TRACK] as const;
const TRACK_REMOVE_EVENT_TYPES = [R.RECORDING_SESSION_REMOVE_RECORDING_TRACK] as const;
const TRACK_START_EVENT_TYPES = [
  R.RECORDING_SESSION_START_RECORDING_TRACK,
  R.RECORDING_SESSION_START_RECORDING,
] as const;
const TRACK_STOP_EVENT_TYPES = [
  R.RECORDING_SESSION_STOP_RECORDING_TRACK,
  R.RECORDING_SESSION_STOP_RECORDING,
] as const;

function archiveTrackEvents(events: ClientRecordingEvent[], archiveId: string): ClientRecordingEvent[] {
  return events.filter((e) => String(e.payload.archiveId ?? '') === archiveId);
}

function firstEventTimeMs(matches: ClientRecordingEvent[], types: readonly string[]): number | null {
  const filtered = matches
    .filter((e) => types.includes(e.type))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return filtered[0]?.timestamp.getTime() ?? null;
}

function lastEventTimeMs(matches: ClientRecordingEvent[], types: readonly string[]): number | null {
  const filtered = matches
    .filter((e) => types.includes(e.type))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return filtered[filtered.length - 1]?.timestamp.getTime() ?? null;
}

interface LifecycleDurationRow {
  label: string;
  hint: string;
  fromMs: number | null;
  toMs: number | null;
}

function buildArchiveLifecycleDurations(
  events: ClientRecordingEvent[],
  archiveId: string,
): LifecycleDurationRow[] {
  const trackEvents = archiveTrackEvents(events, archiveId);
  const addMs = firstEventTimeMs(trackEvents, TRACK_ADD_EVENT_TYPES);
  const removeMs = lastEventTimeMs(trackEvents, TRACK_REMOVE_EVENT_TYPES);
  const startMs = firstEventTimeMs(trackEvents, TRACK_START_EVENT_TYPES);
  const stopMs = lastEventTimeMs(trackEvents, TRACK_STOP_EVENT_TYPES);

  return [
    {
      label: 'add → remove',
      hint: 'RECORDING_SESSION_ADD_RECORDING_TRACK → RECORDING_SESSION_REMOVE_RECORDING_TRACK',
      fromMs: addMs,
      toMs: removeMs,
    },
    {
      label: 'start → stop',
      hint: 'Start recording track → stop recording track (incl. session-level events with this archiveId)',
      fromMs: startMs,
      toMs: stopMs,
    },
  ];
}

function StartRecordingTrackTimestampsTable({
  archiveId,
  payload,
  events,
  tz,
}: {
  archiveId: string;
  payload: Record<string, unknown>;
  events: ClientRecordingEvent[];
  tz: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rows = START_TRACK_TIMESTAMP_ROWS.map(({ key, label, hint }) => ({
    key,
    label,
    hint,
    ms: parsePayloadTimestampMs(payload[key]),
  }));

  const clientMs = parsePayloadTimestampMs(payload.clientTimestamp);
  const referenceMs = parsePayloadTimestampMs(payload.referenceTimestamp);
  const serverMs = parsePayloadTimestampMs(payload.serverTimestamp);

  const hasAny = rows.some((r) => r.ms != null);
  if (!hasAny) return null;

  const clientRefDriftMs =
    clientMs != null && referenceMs != null ? Math.abs(clientMs - referenceMs) : null;
  const referenceServerGapMs =
    referenceMs != null && serverMs != null ? serverMs - referenceMs : null;

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.6rem',
    marginBottom: '0.5rem',
  };
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '0.2rem 0.35rem',
    borderBottom: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    fontWeight: 600,
  };
  const tdStyle: React.CSSProperties = {
    padding: '0.2rem 0.35rem',
    borderBottom: '1px solid var(--border-light)',
    verticalAlign: 'top',
  };
  const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, monospace',
    fontVariantNumeric: 'tabular-nums',
  };

  const alertColor = '#dc2626';
  const driftAlert =
    clientRefDriftMs != null && clientRefDriftMs > START_TRACK_TIMING_THRESHOLD_MS;
  const startGapAlert =
    referenceServerGapMs != null && referenceServerGapMs > START_TRACK_TIMING_THRESHOLD_MS;

  const takeId = payload.takeId != null ? String(payload.takeId) : null;
  const sessionId = payload.sessionId != null ? String(payload.sessionId) : null;
  const lifecycleRows = buildArchiveLifecycleDurations(events, archiveId);
  const showLifecycleDurations = lifecycleRows.some((r) => r.fromMs != null || r.toMs != null);

  return (
    <div className={styles.startTrackTimestampsWrap} ref={wrapRef}>
      <div className={styles.startTrackTimestampsHeader}>
        <div>
          <div className={styles.startTrackTimestampsTitle}>
            Start recording track timestamps
          </div>
          <div className={styles.startTrackTimestampsMeta}>
            <div>
              <strong>archiveId</strong>{' '}
              <span className={styles.startTrackTimestampsArchiveId}>{archiveId}</span>
            </div>
            {takeId && (
              <div>
                <strong>takeId</strong>{' '}
                <span className={styles.startTrackTimestampsArchiveId}>{takeId}</span>
              </div>
            )}
            {sessionId && (
              <div>
                <strong>sessionId</strong>{' '}
                <span className={styles.startTrackTimestampsArchiveId}>{sessionId}</span>
              </div>
            )}
          </div>
        </div>
        <ScreenshotButton
          targetRef={wrapRef}
          className={styles.startTrackTimestampsScreenshotBtn}
        />
      </div>
      <div className={styles.startTrackFieldHints}>
        {START_TRACK_TIMESTAMP_ROWS.map(({ key, label, hint }) => (
          <div key={key} className={styles.startTrackFieldHintRow}>
            <strong>{label}</strong> — {hint}
          </div>
        ))}
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Value (ms)</th>
            <th style={thStyle}>Human readable</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, hint, ms }) => (
            <tr key={key} title={hint}>
              <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{label}</td>
              <td style={{ ...tdStyle, ...mono, color: ms != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {ms != null ? String(ms) : '—'}
              </td>
              <td style={{ ...tdStyle, ...mono, color: ms != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {ms != null ? formatDateTime(ms, tz as never) : '—'}
                {ms != null && (
                  <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                    {formatHMSms(ms, tz as never)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showLifecycleDurations && (
        <>
          <div
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              margin: '0.35rem 0 0.25rem',
            }}
          >
            Lifecycle durations
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Interval</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>From (ms)</th>
                <th style={thStyle}>To (ms)</th>
              </tr>
            </thead>
            <tbody>
              {lifecycleRows.map(({ label, hint, fromMs, toMs }) => {
                const durationMs =
                  fromMs != null && toMs != null && toMs >= fromMs ? toMs - fromMs : null;
                return (
                  <tr key={label} title={hint}>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</td>
                    <td style={{ ...tdStyle, ...mono, fontWeight: 600 }}>
                      {durationMs != null ? formatDuration(durationMs) : '—'}
                      {durationMs != null && (
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                          {' '}({formatTimingDeltaMs(durationMs)})
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, ...mono, color: fromMs != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {fromMs != null ? (
                        <>
                          {String(fromMs)}
                          <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                            ({formatDateTime(fromMs, tz as never)})
                          </span>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, ...mono, color: toMs != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {toMs != null ? (
                        <>
                          {String(toMs)}
                          <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                            ({formatDateTime(toMs, tz as never)})
                          </span>
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Client ↔ reference drift
            </td>
            <td
              colSpan={2}
              style={{
                ...tdStyle,
                ...mono,
                color: driftAlert ? alertColor : 'var(--text-primary)',
                fontWeight: driftAlert ? 700 : 400,
              }}
            >
              {clientRefDriftMs != null
                ? `${formatTimingDeltaMs(clientRefDriftMs)} (|client − reference|)`
                : '—'}
              {driftAlert && ' · exceeds 2s threshold'}
            </td>
          </tr>
          <tr>
            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Reference → server gap
            </td>
            <td
              colSpan={2}
              style={{
                ...tdStyle,
                ...mono,
                color: startGapAlert ? alertColor : 'var(--text-primary)',
                fontWeight: startGapAlert ? 700 : 400,
              }}
            >
              {referenceServerGapMs != null
                ? `${formatTimingDeltaMs(referenceServerGapMs)} (server − reference)`
                : '—'}
              {startGapAlert && ' · exceeds 2s threshold (processing mitigation)'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Archive card — title: archiveId, body: source + state, click to expand graphs
// ---------------------------------------------------------------------------

function ArchiveCard({
  track, stats, samples, events,
}: {
  track:   TrackData;
  stats?:  RecorderArchiveStats;
  samples: RecorderServiceSample[];
  events:  ClientRecordingEvent[];
}) {
  const tz     = useTimezoneTick();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(track.archiveId).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const hv = stats?.hybridVideo ?? stats?.hybridAudio;
  const hasErrors = (stats?.errorCount ?? 0) > 0
    || (stats?.audioWatchdogTimeouts ?? 0) > 0
    || (stats?.videoWatchdogTimeouts ?? 0) > 0;
  const color = stateColor(stats?.state);

  const startTrackEvent = useMemo(() => {
    const matches = events.filter(
      (e) =>
        e.type === R.RECORDING_SESSION_START_RECORDING_TRACK
        && String(e.payload.archiveId ?? '') === track.archiveId,
    );
    if (matches.length === 0) return null;
    return matches.reduce((latest, e) =>
      e.timestamp.getTime() >= latest.timestamp.getTime() ? e : latest,
    );
  }, [events, track.archiveId]);

  return (
    <div
      style={{
        background: 'var(--info-card-bg)',
        border: `1px solid var(--border-light)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {/* Header — click to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch',
          gap: '0.2rem', padding: '0.45rem 0.5rem',
          background: 'none', border: 'none', font: 'inherit', color: 'inherit',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Row 1: archiveId + copy button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {open ? '▾' : '▸'}
          </span>
          <span
            style={{
              fontFamily: 'ui-monospace, monospace', fontSize: '0.65rem',
              fontWeight: 700, color: 'var(--text-primary)',
              flex: 1, wordBreak: 'break-all', lineHeight: 1.3,
            }}
          >
            {track.archiveId}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy archive ID"
            style={{
              flexShrink: 0, padding: '0.05rem 0.3rem', fontSize: '0.6rem',
              border: '1px solid var(--border-light)', borderRadius: 4,
              background: 'var(--card-bg)', color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>
        {/* Row 2: source | state badges */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', paddingLeft: '0.95rem' }}>
          {track.source && (
            <span style={{
              fontSize: '0.6rem', padding: '0.05rem 0.35rem', borderRadius: 4,
              background: 'var(--badge-bg, rgba(100,116,139,0.15))', color: 'var(--text-secondary)',
            }}>
              {track.source}
            </span>
          )}
          {stats?.state && (
            <span style={{
              fontSize: '0.6rem', padding: '0.05rem 0.35rem', borderRadius: 4,
              background: `${color}22`, color,
              border: `1px solid ${color}44`,
            }}>
              {stats.state}
            </span>
          )}
          {hasErrors && (
            <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>
              ⚠ {(stats?.errorCount ?? 0) > 0 ? `${stats!.errorCount} err` : ''}
              {(stats?.audioWatchdogTimeouts ?? 0) > 0 ? ` ${stats!.audioWatchdogTimeouts} aud wd` : ''}
              {(stats?.videoWatchdogTimeouts ?? 0) > 0 ? ` ${stats!.videoWatchdogTimeouts} vid wd` : ''}
            </span>
          )}
          {hv && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {hv.incomingFrames.toLocaleString()} in · {hv.recordedFrames.toLocaleString()} rec
            </span>
          )}
        </div>
      </button>

      {/* Expanded — stats + graphs */}
      {open && (
        <div style={{ padding: '0.4rem 0.5rem 0.5rem', borderTop: '1px solid var(--border-light)' }}>
          {/* Stats summary */}
          {hv && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.75rem', fontSize: '0.6rem', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Frames in/sent/rec: </span>
                {(hv.incomingFrames ?? 0).toLocaleString()} / {(hv.sentFrames ?? 0).toLocaleString()} / {(hv.recordedFrames ?? 0).toLocaleString()}
                {(hv.discardedFrames ?? 0) > 0 && <span style={{ color: '#ef4444' }}> ({hv.discardedFrames.toLocaleString()} discarded)</span>}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Segments cr/cf/pr: </span>
                {hv.createdSegments ?? 0}/{hv.confirmedSegments ?? 0}/{hv.processedSegments ?? 0}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Bitrate: </span>
                {formatBps(hv.incomingBitrate ?? 0)}
              </div>
              {(hv.throttlerLevel ?? 0) > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Throttler: </span>
                  <span style={{ color: '#f97316' }}>{hv.throttlerLevel}</span>
                </div>
              )}
              {(stats?.keyFrameRequests ?? 0) > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Key frame req: </span>
                  {stats!.keyFrameRequests}
                  {(stats?.keyFrameRequestRetries ?? 0) > 0 && (
                    <span style={{ color: '#f59e0b' }}> / {stats!.keyFrameRequestRetries} retries</span>
                  )}
                </div>
              )}
            </div>
          )}
          {startTrackEvent && (
            <StartRecordingTrackTimestampsTable
              archiveId={track.archiveId}
              payload={startTrackEvent.payload as Record<string, unknown>}
              events={events}
              tz={tz}
            />
          )}
          {/* Time series graphs */}
          <ArchiveGraphs archiveId={track.archiveId} samples={samples} />

          {/* Audio / video track events for this archive */}
          {(() => {
            const archiveEvents = events.filter(
              (e) => ARCHIVE_TRACK_LIST_EVENT_TYPES.has(e.type) && e.payload.archiveId === track.archiveId,
            );
            return archiveEvents.length > 0
              ? <TakeEventList events={archiveEvents} tz={tz} listLabel="Track Events" hideArchiveId />
              : null;
          })()}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Take card (expandable)
// ---------------------------------------------------------------------------

function TakeCard({
  group, latestArchiveStats, allSamples,
}: {
  group:              TakeGroup;
  latestArchiveStats: Map<string, RecorderArchiveStats>;
  allSamples:         RecorderServiceSample[];
}) {
  const tz = useTimezoneTick();
  const [open, setOpen] = useState(false);

  // group.takeEvents is already computed with full archiveTake inference in
  // buildTakeGroups — includes events that carry archiveId but no takeId.
  const takeEvents = group.takeEvents;

  const tsTimes = useMemo(() => {
    // Use sessionSegments for accurate start (CREATED) and end (CLOSED) boundaries,
    // supplemented by takeEvents timestamps for any events outside that window.
    const segTs  = group.sessionSegments.flatMap((s) => [s.start, s.end]).filter(Boolean);
    const evTs   = takeEvents.map((e) => e.timestamp.getTime());
    const allTs  = [...segTs, ...evTs];
    return allTs.length ? { start: Math.min(...allTs), end: Math.max(...allTs) } : null;
  }, [group.sessionSegments, takeEvents]);

  const finalState = group.sessionSegments[group.sessionSegments.length - 1]?.state;
  const color      = takeColor(group.colorIndex);
  const duration   = tsTimes ? formatDuration(tsTimes.end - tsTimes.start) : null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(group.takeId).catch(() => {});
  };

  return (
    <div
      style={{
        background: 'var(--info-card-bg)',
        border: `1px solid var(--border-light)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch',
          gap: '0.15rem', padding: '0.5rem 0.6rem',
          background: 'none', border: 'none', font: 'inherit', color: 'inherit',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Row 1: chevron + full takeId + copy button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {open ? '▾' : '▸'}
          </span>
          <span
            style={{
              fontFamily: 'ui-monospace, monospace', fontSize: '0.65rem',
              fontWeight: 700, color,
              flex: 1, wordBreak: 'break-all', lineHeight: 1.3,
            }}
          >
            {group.takeId}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy take ID"
            style={{
              flexShrink: 0, padding: '0.05rem 0.35rem', fontSize: '0.6rem',
              border: '1px solid var(--border-light)', borderRadius: 4,
              background: 'var(--card-bg)', color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            ⎘ ID
          </button>
        </div>
        {/* Row 2: state + duration + track count */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', paddingLeft: '1rem' }}>
          {finalState && (
            <span style={{
              fontSize: '0.6rem', padding: '0.05rem 0.35rem', borderRadius: 4,
              background: `${stateColor(finalState)}22`, color: stateColor(finalState),
              border: `1px solid ${stateColor(finalState)}55`,
            }}>
              {finalState}
            </span>
          )}
          {duration && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{duration}</span>
          )}
          {group.tracks.length > 0 && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {group.tracks.length} track{group.tracks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: '0 0.6rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* Archive timeline: session row first, then archive rows */}
          {tsTimes && (
            <ArchiveTimeline
              takeId={group.takeId}
              sessionSegments={group.sessionSegments}
              sessionColor={color}
              tracks={group.tracks}
              events={takeEvents}
              globalStart={tsTimes.start}
              globalEnd={tsTimes.end}
            />
          )}

          {/* Archive cards */}
          {group.tracks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {group.tracks.map((track) => (
                <ArchiveCard
                  key={track.archiveId}
                  track={track}
                  stats={latestArchiveStats.get(track.archiveId)}
                  samples={allSamples}
                  events={takeEvents}
                />
              ))}
            </div>
          )}

          {/* Events list */}
          <TakeEventList events={takeEvents} tz={tz} contextTakeId={group.takeId} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event list
// ---------------------------------------------------------------------------

function recordingEventsToClipboardText(events: ClientRecordingEvent[]): string {
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return JSON.stringify(
    sorted.map((e) => ({
      timestamp: e.timestamp.toISOString(),
      type: e.type,
      payload: e.payload,
    })),
    null,
    2,
  );
}

/** Copy control for recording event exports (readable size / touch target). */
const RECORDING_EVENTS_COPY_BTN_STYLE: React.CSSProperties = {
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.28rem 0.55rem',
  fontSize: '0.95rem',
  lineHeight: 1,
  minWidth: 36,
  minHeight: 36,
  border: '1px solid var(--border-light)',
  borderRadius: 6,
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontWeight: 600,
};

// ── Vertical event timeline helpers ─────────────────────────────────────────

const COPYABLE_FIELD_NAMES = new Set([
  'archiveId', 'takeId', 'sessionId', 'callId', 'connectionId', 'roomId',
  'cameraHybridAudioProducerId', 'cameraHybridVideoProducerId',
  'cameraStandardAudioProducerId', 'cameraStandardVideoProducerId',
  'screenShareAudioProducerId', 'screenShareVideoProducerId',
]);
const STATE_FIELD_NAMES = new Set(['state', 'prevState', 'actualState', 'sessionState']);

function EvtCopyChip({ id, display }: { id: string; display?: string }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(id).catch(() => {}); }}
      onKeyDown={(e) => e.key === 'Enter' && navigator.clipboard.writeText(id).catch(() => {})}
      title={`Click to copy\n${id}`}
      style={{
        fontFamily: 'ui-monospace, monospace', fontSize: '0.58rem',
        color: 'var(--text-primary)', background: 'var(--badge-bg, rgba(100,116,139,0.12))',
        border: '1px solid var(--border-light)', borderRadius: 3,
        padding: '0.02rem 0.3rem', cursor: 'copy', lineHeight: '1.5',
        maxWidth: '22rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {display ?? id}
    </span>
  );
}

function EventPayloadView({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(([k, v]) => {
    if (k === 'error' && !hasMeaningfulPayloadError(v)) return false;
    return v != null && v !== '' && v !== undefined;
  });
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <div style={{
      marginTop: '0.25rem', marginLeft: '0.6rem',
      padding: '0.4rem 0.55rem',
      background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.8)',
      border: '1px solid var(--border-light)',
      borderLeft: '2px solid var(--border-light)',
      borderRadius: '0 5px 5px 0',
      display: 'grid',
      gridTemplateColumns: 'max-content 1fr',
      columnGap: '0.7rem', rowGap: '0.12rem',
      fontSize: '0.6rem',
    }}>
      {entries.map(([k, v]) => {
        // inPersonProducerIds — array of {source, producerId}
        if (k === 'inPersonProducerIds' && Array.isArray(v)) {
          return (
            <React.Fragment key={k}>
              <span style={{ color: 'var(--text-muted)', alignSelf: 'start', paddingTop: '0.1rem' }}>{k}</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {(v as Array<{ source: string; producerId: string }>).map((ip, ii) => (
                  <span key={ii} style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{ip.source}</span>
                    <EvtCopyChip id={ip.producerId} />
                  </span>
                ))}
                {v.length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </span>
            </React.Fragment>
          );
        }

        const val      = String(v);
        const isCopy   = COPYABLE_FIELD_NAMES.has(k);
        const isSt     = STATE_FIELD_NAMES.has(k);
        const isError  = k === 'error';
        const isBool   = typeof v === 'boolean';

        return (
          <React.Fragment key={k}>
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{k}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {isCopy   ? <EvtCopyChip id={val} />
             : isSt     ? <span style={{ color: stateColor(val), fontWeight: 600 }}>{val}</span>
             : isError  ? <span style={{ color: '#ef4444' }}>⚠ {val}</span>
             : isBool   ? <span style={{ color: v ? '#10b981' : '#ef4444' }}>{val}</span>
             :             <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text-primary)' }}>{val}</span>
              }
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TakeEventList({
  events, tz, contextTakeId, listLabel = 'Events',
  showCopyEvents = true,
  eventsForClipboard,
  hideArchiveId = false,
}: {
  events: ClientRecordingEvent[];
  tz: string;
  contextTakeId?: string;
  listLabel?: string;
  /** Set false to hide the JSON copy control on this list. */
  showCopyEvents?: boolean;
  /** When set, copy uses this list (e.g. all recording events) instead of `events`. */
  eventsForClipboard?: ClientRecordingEvent[];
  /** Omit archiveId chips when the list is already scoped to one archive (e.g. archive card). */
  hideArchiveId?: boolean;
}) {
  const [open, setOpen]         = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied]     = useState(false);

  if (!events.length) return null;

  const listThemeDark =
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

  const toggleRow = (i: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const clipboardSource = eventsForClipboard ?? events;

  const handleCopyEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clipboardSource.length) return;
    navigator.clipboard.writeText(recordingEventsToClipboardText(clipboardSource)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div style={{ marginTop: '0.25rem' }}>
      {/* Collapsible header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        marginBottom: open ? '0.35rem' : 0, flexWrap: 'wrap',
      }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
            padding: '0.1rem 0', flex: 1, minWidth: 0, textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {listLabel} ({events.length})
          </span>
        </button>
        {showCopyEvents && (
          <button
            type="button"
            onClick={handleCopyEvents}
            title={
              eventsForClipboard && eventsForClipboard.length !== events.length
                ? 'Copy all recording events (JSON, chronological)'
                : 'Copy these events (JSON, chronological)'
            }
            style={RECORDING_EVENTS_COPY_BTN_STYLE}
          >
            {copied ? '✓' : '⎘'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ position: 'relative', paddingLeft: '1.3rem' }}>
          {/* Vertical spine */}
          <div style={{
            position: 'absolute', left: '0.33rem', top: 0, bottom: 0,
            width: 1, background: 'var(--border-light)',
          }} />

          {events.map((ev, i) => {
            const color      = eventColor(ev);
            const rowAlert   = payloadIndicatesError(ev);
            const isExpanded = expanded.has(i);
            const isUpdProd = ev.type === R.RECORDING_SESSION_UPDATE_PRODUCERS;

            // Human label — prefer track variant when archiveId is present
            const _archiveId = ev.payload.archiveId != null ? String(ev.payload.archiveId) : null;
            const label =
              (_archiveId && SESSION_TRACK_VARIANT_LABELS[ev.type])
              ?? TRACK_EVENT_LABELS[ev.type]
              ?? ev.type.replace(/^RECORDING_(SESSION_|TRACK_)|^RECORDER_SERVICE_/, '')
                        .toLowerCase().replace(/_/g, ' ');

            // Inline summary fields
            const archiveId = _archiveId;
            const source    = ev.payload.source      != null ? String(ev.payload.source)     : null;
            const recType   = ev.payload.type        != null ? String(ev.payload.type)       : null;
            const error     = hasMeaningfulPayloadError(ev.payload.error)
              ? String(ev.payload.error).trim()
              : null;
            const isTrackStateChg = ev.type === R.RECORDING_TRACK_STATE_CHANGED;
            const prevSt    = isTrackStateChg
              ? (ev.payload.prevState != null ? String(ev.payload.prevState) : null)
              : (ev.payload.prevState != null ? String(ev.payload.prevState) : null);
            const nextSt    = isTrackStateChg
              ? (ev.payload.newState != null ? String(ev.payload.newState) : null)
              : (ev.payload.actualState != null ? String(ev.payload.actualState) : null);
            const createdVersion = ev.type === R.RECORDING_SESSION_CREATED && ev.payload.version != null
              ? String(ev.payload.version)
              : null;
            const recorderMode = ev.type === R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED
              && ev.payload.recorderMode != null ? String(ev.payload.recorderMode) : null;
            const recordingTypePreroll = ev.type === R.RECORDING_SESSION_RECORDING_TRACK_PREROLLED
              && ev.payload.recordingType != null ? String(ev.payload.recordingType) : null;
            // Only show takeId chip in the RecorderService list (no contextTakeId).
            // Inside a TakeCard every event already belongs to the same take.
            const evTakeId  = contextTakeId
              ? null
              : (ev.payload.takeId != null ? String(ev.payload.takeId) : null);
            const prodCount = isUpdProd
              ? Object.keys(ev.payload).filter((k) => k.endsWith('ProducerId') && ev.payload[k]).length
              : 0;
            const inPersonCount = isUpdProd && Array.isArray(ev.payload.inPersonProducerIds)
              ? (ev.payload.inPersonProducerIds as unknown[]).length
              : 0;

            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  marginBottom: '0.25rem',
                  ...(rowAlert
                    ? {
                      background: listThemeDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(254, 202, 202, 0.42)',
                      borderRadius: 6,
                      border: listThemeDark
                        ? '1px solid rgba(248, 113, 113, 0.35)'
                        : '1px solid rgba(248, 113, 113, 0.45)',
                      padding: '0.22rem 0.38rem 0.26rem',
                    }
                    : {}),
                }}
              >
                {/* Dot on the spine */}
                <div style={{
                  position: 'absolute', left: '-0.96rem', top: '0.32rem',
                  width: 7, height: 7, borderRadius: '50%',
                  background: color, border: '1.5px solid var(--card-bg)', zIndex: 1,
                }} />

                {/* Clickable row */}
                <button
                  type="button"
                  onClick={() => toggleRow(i)}
                  style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
                    gap: '0.25rem', width: '100%', background: 'transparent', border: 'none',
                    padding: rowAlert ? '0.02rem 0' : '0.05rem 0', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span
                    style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                    title={formatHMSms(ev.timestamp.getTime(), tz as never)}
                  >
                    {formatRecordingEventTimestamp(ev.timestamp, tz)}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color, flexShrink: 0 }}>{label}</span>

                  {/* Inline chips */}
                  {archiveId && !hideArchiveId && (
                    <EvtCopyChip
                      id={archiveId}
                      display={
                        TRACK_MGMT_EVENTS.has(ev.type) || ev.type.startsWith('RECORDING_TRACK_')
                          ? archiveId          // full id for all track events
                          : shortId(archiveId) // abbreviated elsewhere
                      }
                    />
                  )}
                  {createdVersion && (
                    <span style={{ fontSize: '0.58rem', color: 'var(--accent)', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 3, padding: '0.02rem 0.25rem', fontFamily: 'ui-monospace, monospace' }}>
                      v{createdVersion}
                    </span>
                  )}
                  {source    && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', background: 'var(--badge-bg, rgba(100,116,139,0.12))', border: '1px solid var(--border-light)', borderRadius: 3, padding: '0.02rem 0.25rem' }}>{source}</span>}
                  {recType   && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', background: 'var(--badge-bg, rgba(100,116,139,0.12))', border: '1px solid var(--border-light)', borderRadius: 3, padding: '0.02rem 0.25rem' }}>{recType}</span>}
                  {recorderMode && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', background: 'var(--badge-bg, rgba(100,116,139,0.12))', border: '1px solid var(--border-light)', borderRadius: 3, padding: '0.02rem 0.25rem' }}>{recorderMode}</span>}
                  {recordingTypePreroll && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', background: 'var(--badge-bg, rgba(100,116,139,0.12))', border: '1px solid var(--border-light)', borderRadius: 3, padding: '0.02rem 0.25rem' }}>{recordingTypePreroll}</span>}
                  {prevSt && nextSt && (
                    <span style={{ fontSize: '0.62rem' }}>
                      <span style={{ color: stateColor(prevSt) }}>{prevSt}</span>
                      <span style={{ color: 'var(--text-muted)' }}> → </span>
                      <span style={{ color: stateColor(nextSt), fontWeight: 700 }}>{nextSt}</span>
                    </span>
                  )}
                  {evTakeId && <EvtCopyChip id={evTakeId} display={`take:${shortId(evTakeId)}`} />}
                  {isUpdProd && (prodCount + inPersonCount) > 0 && (
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                      {prodCount} producer{prodCount !== 1 ? 's' : ''}
                      {inPersonCount > 0 ? ` + ${inPersonCount} in-person` : ''}
                    </span>
                  )}
                  {error && (
                    <span style={{ fontSize: '0.6rem', color: listThemeDark ? '#fca5a5' : '#9f1239' }}>
                      ⚠ {error}
                    </span>
                  )}
                </button>

                {/* Expanded full payload */}
                {isExpanded && <EventPayloadView payload={ev.payload as Record<string, unknown>} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Shown only when there is no RecorderService-only list (no ⎘ on that header). */
function StandaloneRecordingEventsCopy({ events }: { events: ClientRecordingEvent[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(recordingEventsToClipboardText(events)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      title="Copy all recording events (JSON, chronological)"
      style={RECORDING_EVENTS_COPY_BTN_STYLE}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClientRecordingsSection({ processedStats }: { processedStats: ProcessWebRTCStatsResult | null }) {
  const tz = useTimezoneTick();

  const samples = useMemo(
    () => (processedStats?.recorderServiceSamples ?? []) as RecorderServiceSample[],
    [processedStats],
  );
  const allEvents = useMemo(
    () => (processedStats?.clientRecordingEvents ?? []) as ClientRecordingEvent[],
    [processedStats],
  );
  const events = useMemo(
    () => allEvents.filter((ev) => isRecordingClientEventType(ev.type)),
    [allEvents],
  );
  const serviceOnlyEvents = useMemo(
    () => events.filter((e) => SERVICE_ONLY_EVENTS.has(e.type)),
    [events],
  );

  const hasData = samples.length > 0 || events.length > 0;

  const allTs       = hasData ? [...samples.map((s) => s.timestamp.getTime()), ...events.map((e) => e.timestamp.getTime())] : [0, 1];
  const globalStart = Math.min(...allTs);
  const globalEnd   = Math.max(...allTs);

  const serviceSegments = useMemo(
    () => hasData ? buildServiceSegments(events, globalStart, globalEnd) : [],
    [events, globalStart, globalEnd, hasData],
  );
  const recorderVersion = useMemo(() => extractRecorderVersion(events), [events]);
  const recorderUsesV31 = useMemo(
    () => recorderVersion != null && isRecorderVersionAtLeast(recorderVersion, RECORDER_SEMVER_V31.major, RECORDER_SEMVER_V31.minor),
    [recorderVersion],
  );

  const takeGroups = useMemo(
    () => hasData ? buildTakeGroups(events, globalEnd, recorderUsesV31) : [],
    [events, globalEnd, hasData, recorderUsesV31],
  );

  const latestArchiveStats = useMemo(() => {
    const map = new Map<string, RecorderArchiveStats>();
    for (const s of samples)
      for (const [id, stats] of Object.entries(s.archives))
        map.set(id, stats as RecorderArchiveStats);
    return map;
  }, [samples]);

  const activeStates = useMemo(() => {
    const s = new Set<string>();
    const addSegs = (segs: StateSegment[]) => segs.forEach((seg) => s.add(seg.state));
    addSegs(serviceSegments);
    takeGroups.forEach((g) => { addSegs(g.sessionSegments); g.tracks.forEach((t) => addSegs(t.segments)); });
    return s;
  }, [serviceSegments, takeGroups]);

  if (!processedStats || !hasData) return null;

  const lastSample        = samples[samples.length - 1] ?? null;
  const finalServiceState = lastSample?.state ?? serviceSegments[serviceSegments.length - 1]?.state ?? null;
  const sampleCount       = samples.length;
  const duration          = sampleCount >= 2
    ? formatDuration(samples[sampleCount - 1].timestamp.getTime() - samples[0].timestamp.getTime())
    : null;

  return (
    <CollapsibleSection
      title="Recordings (Client Side)"
      id="client-recordings"
      count={takeGroups.length || undefined}
      defaultOpen={false}
    >
      <div className={styles.summary}>
        {sampleCount} snapshot{sampleCount !== 1 ? 's' : ''}
        {duration && ` · ${duration}`}
        {finalServiceState && (
          <> · service <strong style={{ color: stateColor(finalServiceState) }}>{finalServiceState}</strong></>
        )}
        {recorderVersion && (
          <>
            {' · '}recorder{' '}
            <strong style={{ color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' }}>
              v{recorderVersion}
            </strong>
            {recorderUsesV31 && (
              <span style={{ color: 'var(--text-muted)' }}> (≥3.1 track preroll)</span>
            )}
          </>
        )}
        {takeGroups.length > 0 && ` · ${takeGroups.length} take${takeGroups.length !== 1 ? 's' : ''}`}
        {events.length > 0 && ` · ${events.length} event${events.length !== 1 ? 's' : ''}`}
      </div>

      <div className={styles.legend}>
        {Object.entries(STATE_COLORS)
          .filter(([state]) => activeStates.has(state))
          .map(([state, color]) => (
            <span key={state} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: color }} />
              {state}
            </span>
          ))}
      </div>

      <MainTimeline
        serviceSegments={serviceSegments}
        takeGroups={takeGroups}
        events={events}
        globalStart={globalStart}
        globalEnd={globalEnd}
      />

      {takeGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
          {takeGroups.map((group) => (
            <TakeCard
              key={group.takeId}
              group={group}
              latestArchiveStats={latestArchiveStats}
              allSamples={samples}
            />
          ))}
        </div>
      )}

      {events.length > 0 && serviceOnlyEvents.length === 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Recording events
          </span>
          <StandaloneRecordingEventsCopy events={events} />
        </div>
      )}

      {serviceOnlyEvents.length > 0 && (
        <div style={{ marginTop: takeGroups.length > 0 ? '0.5rem' : undefined }}>
          <TakeEventList
            events={serviceOnlyEvents}
            tz={tz}
            listLabel="RecorderService Events"
            eventsForClipboard={events}
          />
        </div>
      )}
    </CollapsibleSection>
  );
}
