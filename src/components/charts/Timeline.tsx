'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useCompareStore } from '../../stores/compareStore.ts';
import { useTimezoneTick, type Tz } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatTimeOnly } from '../../utils/formatting.ts';
import type { IceSelectedPairValue } from '../../utils/statsTypes.ts';
import type { IssueLaneItem } from '../../utils/issueTimelinePlacement.ts';
import { uniqueIssueLaneTypes } from '../../utils/issueTimelinePlacement.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import { paintIssueLane } from './paintIssueLane.ts';
import {
  paintVisibilityLane,
  TAB_ACTIVE_COLOR,
  TAB_INACTIVE_COLOR,
} from './paintVisibilityLane.ts';
import { useTabVisibility } from './tabVisibilityContext.tsx';
import { visibilitySegments } from '../../utils/tabVisibility.ts';
import styles from './Timeline.module.css';

interface HistoryEvent {
  timestamp: number;
  event: string;
}

function extractTimeRange(data: unknown): { start: number; end: number } | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const createdAt = obj.createdAt as number | undefined;
  const closedAt = obj.closedAt as number | undefined;
  if (createdAt == null) return null;
  return { start: createdAt, end: closedAt ?? Date.now() };
}

interface StatefulConfig {
  initialState: string;
  stateMap: Record<string, string>;
  colorMap: Record<string, string>;
}

const PRODUCER_CONFIG: StatefulConfig = {
  initialState: 'active',
  stateMap: { pause: 'inactive', resume: 'active', degraded: 'active', restored: 'active' },
  colorMap: { active: 'var(--success)', inactive: 'var(--border-light)' },
};

const CONSUMER_CONFIG: StatefulConfig = {
  initialState: 'active',
  stateMap: { pause: 'inactive', resume: 'active', stopped: 'inactive', started: 'active', producerPaused: 'inactive', producerResumed: 'active' },
  colorMap: { active: 'var(--success)', inactive: 'var(--border-light)' },
};

const TRANSPORT_CONFIG: StatefulConfig = {
  initialState: 'new',
  stateMap: { new: 'new', checking: 'checking', connected: 'connected', completed: 'completed', disconnected: 'disconnected', failed: 'failed' },
  colorMap: { new: '#e5e7eb', checking: '#fde047', connected: '#86efac', completed: '#10b981', disconnected: '#fca5a5', failed: '#ef4444' },
};

const MEDIA_PLAYER_CONFIG: StatefulConfig = {
  initialState: 'active',
  stateMap: {},
  colorMap: { active: '#10b981' },
};

/**
 * Connect/disconnect state, selected by a title containing "Connection" or
 * "Client". Not exported — the only consumer was a signalling timeline
 * specific to another deployment's stack.
 */
const PARTICIPANT_CONFIG: StatefulConfig = {
  initialState: 'connected',
  stateMap: { disconnect: 'disconnected', connect: 'connected', join: 'connected', left: 'disconnected', joined: 'connected' },
  colorMap: { connected: '#10b981', disconnected: '#ef4444' },
};

function getConfig(title: string): StatefulConfig {
  if (title.includes('Producer')) return PRODUCER_CONFIG;
  if (title.includes('Consumer')) return CONSUMER_CONFIG;
  if (title.includes('Transport')) return TRANSPORT_CONFIG;
  if (title.includes('Media Player')) return MEDIA_PLAYER_CONFIG;
  if (title.includes('Connection') || title.includes('Client')) return PARTICIPANT_CONFIG;
  return PRODUCER_CONFIG;
}

function generateStatefulSegments(
  data: unknown,
  config: StatefulConfig,
): { start: number; end: number; state: string }[] {
  const range = extractTimeRange(data);
  if (!range) return [];

  const obj = data as Record<string, unknown>;
  const history = (obj.history as HistoryEvent[] | undefined) ?? [];

  const allEvents = [
    { timestamp: range.start, event: 'created' },
    ...history,
  ].sort((a, b) => a.timestamp - b.timestamp);
  if (range.end > range.start) {
    allEvents.push({ timestamp: range.end, event: 'closed' });
  }

  const raw: { start: number; end: number; state: string }[] = [];
  let currentState = config.initialState;

  for (let i = 0; i < allEvents.length - 1; i++) {
    const evt = allEvents[i];
    const nextEvt = allEvents[i + 1];
    const newState = config.stateMap[evt.event] ?? currentState;
    raw.push({ start: evt.timestamp, end: nextEvt.timestamp, state: newState });
    currentState = newState;
  }

  if (raw.length === 0) return [];
  const merged: { start: number; end: number; state: string }[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const prev = merged[merged.length - 1];
    if (raw[i].state === prev.state) {
      prev.end = raw[i].end;
    } else {
      merged.push(raw[i]);
    }
  }
  return merged;
}

export type { IceSelectedPairValue } from '../../utils/statsTypes.ts';

export interface TimelineOverlay {
  /** Epoch ms of the overlay start. */
  start: number;
  /** Epoch ms of the overlay end. */
  end: number;
  /** CSS color for the overlay band. Rendered at low opacity behind the main bar. */
  color: string;
  /** Optional label shown on hover. */
  label?: string;
  /** Optional tooltip HTML shown on hover. Falls back to label + time range. */
  tooltip?: string;
}

export interface TimelinePointMarker {
  timestamp: number;
  label: string;
  color?: string;
  tooltip?: string;
}

export interface TimelineProps {
  title: string;
  description?: string;
  data: unknown;
  eventBus?: EventTarget;
  iceValues?: IceSelectedPairValue[];
  /** Faint background bands drawn behind the main bar — used e.g. to show when
   * a take recording overlapped a producer's lifetime. */
  overlays?: TimelineOverlay[];
  /** Point-in-time markers (e.g. stream recording id changes). */
  pointMarkers?: TimelinePointMarker[];
  /** Client-detected issues matched to this producer or transport. */
  issueLane?: IssueLaneItem[];
  /** If provided, shows a pin button for cross-chart comparison. */
  pinLabel?: string;
}

const BAR_HEIGHT = 20;
const ICE_BAR_HEIGHT = 12;
const ICE_BAR_GAP = 4;
const ISSUE_BAR_HEIGHT = 15;
const ISSUE_BAR_GAP = 6;
const VIS_BAR_HEIGHT = 12;
const VIS_BAR_GAP = 6;
const BAR_Y = 30;
const MARGIN = { top: 8, right: 50, bottom: 28, left: 50 };
const HEIGHT = 90;
const EVENT_HIT_WIDTH = 12;

const ICE_DIRECT_COLOR = 'var(--success)';
const ICE_RELAY_COLOR = 'var(--accent)';

function getIceSegmentColor(state: string): string {
  const s = state.toLowerCase();
  if (s === 'direct' || s === 'host' || s === 'srflx') return ICE_DIRECT_COLOR;
  return ICE_RELAY_COLOR;
}

interface IceSegment {
  start: Date;
  end: Date;
  state: string;
  candidateType?: string;
  ip?: string;
  selectedCandidatePairId?: string;
  relayProtocol?: string;
  url?: string;
}

function toDate(v: Date | number): Date {
  return v instanceof Date ? v : new Date(v);
}

function buildIceSegments(values: IceSelectedPairValue[]): IceSegment[] {
  if (values.length === 0) return [];
  const segments: IceSegment[] = [];
  let current: IceSegment = {
    start: toDate(values[0].timestamp), end: toDate(values[0].timestamp),
    state: values[0].state, candidateType: values[0].candidateType ?? undefined, ip: values[0].ip ?? undefined,
    selectedCandidatePairId: values[0].selectedCandidatePairId ?? undefined,
    relayProtocol: values[0].relayProtocol ?? undefined, url: values[0].url ?? undefined,
  };
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const ts = toDate(v.timestamp);
    if (getIceSegmentColor(v.state) === getIceSegmentColor(current.state)) {
      current.end = ts;
    } else {
      current.end = ts;
      segments.push({ ...current });
      current = {
        start: ts, end: ts,
        state: v.state, candidateType: v.candidateType ?? undefined, ip: v.ip ?? undefined,
        selectedCandidatePairId: v.selectedCandidatePairId ?? undefined,
        relayProtocol: v.relayProtocol ?? undefined, url: v.url ?? undefined,
      };
    }
  }
  current.end = new Date(current.end.getTime() + 1000);
  segments.push(current);
  return segments;
}

/** Detect points where the selected candidate pair changed. */
function buildIceChangePoints(values: IceSelectedPairValue[]): IceSelectedPairValue[] {
  if (values.length < 2) return [];
  const changes: IceSelectedPairValue[] = [];
  let prevPairId = values[0].selectedCandidatePairId;
  let prevState = values[0].state;
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const pairId = v.selectedCandidatePairId;
    // Detect change by pair ID if available, otherwise by state change
    if ((pairId && pairId !== prevPairId) || (!pairId && v.state !== prevState)) {
      changes.push(v);
    }
    prevPairId = pairId;
    prevState = v.state;
  }
  return changes;
}

function iceSegmentTooltip(seg: IceSegment, tz: Tz): string {
  const parts = [`<strong>${seg.state}</strong>`];
  if (seg.candidateType) parts.push(`Type: ${seg.candidateType}`);
  if (seg.ip) parts.push(`IP: ${seg.ip}`);
  if (seg.relayProtocol) parts.push(`Relay: ${seg.relayProtocol}`);
  if (seg.url) parts.push(`URL: ${seg.url}`);
  if (seg.selectedCandidatePairId) parts.push(`Pair: ${seg.selectedCandidatePairId}`);
  parts.push(`${formatTimeOnly(seg.start, tz)} – ${formatTimeOnly(seg.end, tz)}`);
  return parts.join('<br/>');
}

function iceChangeTooltip(cp: IceSelectedPairValue, tz: Tz): string {
  const parts = [`<strong>Pair changed → ${cp.state}</strong>`];
  if (cp.candidateType) parts.push(`Type: ${cp.candidateType}`);
  if (cp.ip) parts.push(`IP: ${cp.ip}`);
  if (cp.relayProtocol) parts.push(`Relay: ${cp.relayProtocol}`);
  if (cp.url) parts.push(`URL: ${cp.url}`);
  if (cp.selectedCandidatePairId) parts.push(`Pair: ${cp.selectedCandidatePairId}`);
  parts.push(formatTimeOnly(cp.timestamp, tz));
  return parts.join('<br/>');
}

export function Timeline({ title, description, data, eventBus, iceValues, overlays, pointMarkers, issueLane, pinLabel }: TimelineProps) {
  const pinned = useCompareStore((s) => pinLabel ? s.isPinned(pinLabel) : false);
  const togglePin = useCompareStore((s) => s.togglePin);
  const tz = useTimezoneTick();
  // Backgrounded stretches for the client this chart belongs to; empty for a
  // chart pinned from another client, which is drawn outside any provider.
  const visibility = useTabVisibility();
  const hasVisibility = visibility.reported;
  const issues = issueLane ?? [];
  // Shown whenever the caller passes a lane at all, empty or not: an object
  // with no issues is worth stating, and a row that appears only sometimes
  // reads as a missing feature rather than as good news.
  const hasIssues = issueLane != null;
  const issueTypes = uniqueIssueLaneTypes(issues);

  const handlePin = pinLabel ? () => {
    togglePin({
      type: 'timeline',
      label: pinLabel,
      timelineProps: { title, description, data, iceValues, overlays, pointMarkers, issueLane: issues },
    });
  } : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const config = getConfig(title);
  const hasIce = iceValues != null && iceValues.length > 0;

  const render = useCallback(() => {
    const container = chartRef.current;
    const range = extractTimeRange(data);
    if (!container || !range) return;

    const segments = generateStatefulSegments(data, config);
    if (segments.length === 0) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;
    const width = Math.max(400, containerWidth);

    container.innerHTML = '';

    const extraIce = hasIce ? ICE_BAR_HEIGHT + ICE_BAR_GAP : 0;
    const extraIssues = hasIssues ? ISSUE_BAR_HEIGHT + ISSUE_BAR_GAP : 0;
    // The tab lane is drawn only for a client that reports visibility, so it
    // costs no height on a client that does not.
    const extraVis = hasVisibility ? VIS_BAR_HEIGHT + VIS_BAR_GAP : 0;
    const totalHeight = HEIGHT + extraIce + extraIssues + extraVis;
    const iceBarY = hasIce ? BAR_Y : 0;
    const mainBarY = hasIce ? BAR_Y + ICE_BAR_HEIGHT + ICE_BAR_GAP : BAR_Y;
    const issueBarY = mainBarY + BAR_HEIGHT + ISSUE_BAR_GAP;
    const visBarY = (hasIssues ? issueBarY + ISSUE_BAR_HEIGHT : mainBarY + BAR_HEIGHT) + VIS_BAR_GAP;

    let domainStart = range.start;
    let domainEnd = range.end;
    if (domainStart === domainEnd) {
      domainStart -= 2000;
      domainEnd += 2000;
    }
    domainEnd += 1000;

    const xScale = d3TimeScale(tz)
      .domain([new Date(domainStart), new Date(domainEnd)])
      .range([MARGIN.left, width - MARGIN.right]);

    const numTicks = Math.max(3, Math.floor((width - 100) / 120));

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', `0 0 ${width} ${totalHeight}`)
      .style('display', 'block')
      .style('cursor', 'crosshair');

    svg
      .append('g')
      .attr('transform', `translate(0, ${totalHeight - MARGIN.bottom + 2})`)
      .call(d3.axisBottom(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--text-muted)');

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    // ICE selected pair bar (thin bar above the main transport bar)
    if (hasIce) {
      const iceSegments = buildIceSegments(iceValues!);
      if (iceSegments.length > 0) {
        const iceClipId = `ice-clip-${Math.random().toString(36).slice(2, 8)}`;
        const firstIceX = xScale(iceSegments[0].start);
        const lastIceX = xScale(iceSegments[iceSegments.length - 1].end);
        svg.append('clipPath').attr('id', iceClipId)
          .append('rect')
          .attr('x', firstIceX).attr('y', iceBarY)
          .attr('width', Math.max(0, lastIceX - firstIceX))
          .attr('height', ICE_BAR_HEIGHT).attr('rx', 2);

        const iceGroup = svg.append('g').attr('clip-path', `url(#${iceClipId})`);

        for (const seg of iceSegments) {
          const x1 = xScale(seg.start);
          const x2 = xScale(seg.end);
          const w = Math.max(1, x2 - x1);
          iceGroup.append('rect')
            .attr('x', x1).attr('y', iceBarY)
            .attr('width', w).attr('height', ICE_BAR_HEIGHT)
            .attr('fill', getIceSegmentColor(seg.state))
            .attr('opacity', 0.9)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event: MouseEvent) {
              d3.select(this).attr('opacity', '1');
              tooltipDiv.style('opacity', '1').html(iceSegmentTooltip(seg, tz))
                .style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 10}px`);
            })
            .on('mousemove', function (event: MouseEvent) {
              tooltipDiv.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 10}px`);
            })
            .on('mouseleave', function () {
              d3.select(this).attr('opacity', '0.9');
              tooltipDiv.style('opacity', '0');
            });
        }

        // Change-point markers on the ICE bar
        const iceChanges = buildIceChangePoints(iceValues!);
        const iceMidY = iceBarY + ICE_BAR_HEIGHT / 2;
        for (const cp of iceChanges) {
          const x = xScale(cp.timestamp);
          const cpGroup = svg.append('g').style('cursor', 'pointer');

          cpGroup.append('rect')
            .attr('x', x - EVENT_HIT_WIDTH / 2).attr('y', iceBarY - 2)
            .attr('width', EVENT_HIT_WIDTH).attr('height', ICE_BAR_HEIGHT + 4)
            .attr('fill', 'transparent');

          cpGroup.append('path')
            .attr('d', d3.symbol().type(d3.symbolDiamond).size(30)())
            .attr('transform', `translate(${x}, ${iceMidY})`)
            .attr('fill', '#fff').attr('stroke', '#475569').attr('stroke-width', 1)
            .attr('pointer-events', 'none');

          cpGroup
            .on('mouseenter', function (event: MouseEvent) {
              d3.select(this).select('path').attr('fill', 'var(--accent)').attr('stroke', 'var(--accent)');
              tooltipDiv.style('opacity', '1').html(iceChangeTooltip(cp, tz))
                .style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 10}px`);
            })
            .on('mousemove', function (event: MouseEvent) {
              tooltipDiv.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 10}px`);
            })
            .on('mouseleave', function () {
              d3.select(this).select('path').attr('fill', '#fff').attr('stroke', '#475569');
              tooltipDiv.style('opacity', '0');
            });
        }
      }
    }

    // Faint background overlays (e.g. take recording spans). Drawn behind the
    // main state bar and extended slightly above/below so they remain visible.
    if (overlays && overlays.length > 0) {
      const OVERLAY_PAD = 4;
      const overlayY = mainBarY - OVERLAY_PAD;
      const overlayH = BAR_HEIGHT + OVERLAY_PAD * 2;
      const overlayGroup = svg.append('g');
      for (const ov of overlays) {
        const x1 = xScale(new Date(ov.start));
        const x2 = xScale(new Date(ov.end));
        const w = Math.max(1, x2 - x1);
        const rect = overlayGroup
          .append('rect')
          .attr('x', x1)
          .attr('y', overlayY)
          .attr('width', w)
          .attr('height', overlayH)
          .attr('fill', ov.color)
          .attr('opacity', 0.35)
          .attr('rx', 3)
          .style('cursor', 'help');
        overlayGroup
          .append('line')
          .attr('x1', x1).attr('x2', x1)
          .attr('y1', overlayY).attr('y2', overlayY + overlayH)
          .attr('stroke', ov.color).attr('stroke-width', 1.5).attr('opacity', 0.7);
        overlayGroup
          .append('line')
          .attr('x1', x2).attr('x2', x2)
          .attr('y1', overlayY).attr('y2', overlayY + overlayH)
          .attr('stroke', ov.color).attr('stroke-width', 1.5).attr('opacity', 0.7);
        rect
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this).attr('opacity', 0.5);
            const startStr = formatTimeOnly(ov.start, tz);
            const endStr = formatTimeOnly(ov.end, tz);
            const dur = ((ov.end - ov.start) / 1000).toFixed(1);
            const tooltipHtml = ov.tooltip
              ?? `<strong>${ov.label ?? 'Recording'}</strong><br/>${startStr} – ${endStr}<br/>${dur}s`;
            tooltipDiv.style('opacity', '1').html(tooltipHtml)
              .style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 10}px`);
          })
          .on('mousemove', function (event: MouseEvent) {
            tooltipDiv.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 10}px`);
          })
          .on('mouseleave', function () {
            d3.select(this).attr('opacity', 0.35);
            tooltipDiv.style('opacity', '0');
          });
      }
    }

    // Main transport state bar
    const clipId = `bar-clip-${Math.random().toString(36).slice(2, 8)}`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', xScale(new Date(segments[0].start)))
      .attr('y', mainBarY)
      .attr('width', Math.max(0, xScale(new Date(segments[segments.length - 1].end)) - xScale(new Date(segments[0].start))))
      .attr('height', BAR_HEIGHT)
      .attr('rx', 3);

    const barGroup = svg.append('g').attr('clip-path', `url(#${clipId})`);

    for (const seg of segments) {
      const x1 = xScale(new Date(seg.start));
      const x2 = xScale(new Date(seg.end));
      const w = Math.max(1, x2 - x1);
      const color = config.colorMap[seg.state] ?? 'var(--accent)';

      barGroup
        .append('rect')
        .attr('x', x1)
        .attr('y', mainBarY)
        .attr('width', w)
        .attr('height', BAR_HEIGHT)
        .attr('fill', color)
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).attr('opacity', '1');
          const startStr = formatTimeOnly(seg.start, tz);
          const endStr = formatTimeOnly(seg.end, tz);
          const dur = ((seg.end - seg.start) / 1000).toFixed(1);
          tooltipDiv
            .style('opacity', '1')
            .html(`<strong>${seg.state}</strong><br/>${startStr} – ${endStr}<br/>${dur}s`)
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mousemove', function (event: MouseEvent) {
          tooltipDiv
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', '0.9');
          tooltipDiv.style('opacity', '0');
        });
    }

    if (hasIssues) {
      paintIssueLane({
        svg,
        tooltipDiv,
        items: issues,
        xScale: (d) => xScale(d),
        y: issueBarY,
        height: ISSUE_BAR_HEIGHT,
        chartLeft: xScale.range()[0],
        chartRight: xScale.range()[1],
        label: issues.length > 0 ? `Issues (${issues.length})` : 'Issues',
      });
    }

    if (hasVisibility) {
      // Under everything else: it qualifies the lanes above rather than
      // reporting on this object, so it reads last.
      paintVisibilityLane({
        svg,
        tooltipDiv,
        segments: visibilitySegments(visibility, domainStart, domainEnd),
        xScale: (d) => xScale(d),
        y: visBarY,
        height: VIS_BAR_HEIGHT,
        chartLeft: xScale.range()[0],
        chartRight: xScale.range()[1],
        tz,
      });
    }

    const crosshairLine = svg
      .append('line')
      .attr('y1', 0)
      .attr('y2', totalHeight - MARGIN.bottom)
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none')
      .attr('pointer-events', 'none');

    const obj = data as Record<string, unknown>;
    const history = (obj.history as HistoryEvent[] | undefined) ?? [];
    const allEvents = [
      { timestamp: range.start, event: 'created' },
      ...history,
    ].sort((a: HistoryEvent, b: HistoryEvent) => a.timestamp - b.timestamp);
    if (range.end > range.start) {
      allEvents.push({ timestamp: range.end, event: 'closed' });
    }

    const evtBottomY = mainBarY + BAR_HEIGHT + 4;

    for (const evt of allEvents) {
      const x = xScale(new Date(evt.timestamp));
      const evtGroup = svg
        .append('g')
        .style('cursor', 'pointer');

      evtGroup
        .append('rect')
        .attr('x', x - EVENT_HIT_WIDTH / 2)
        .attr('y', MARGIN.top)
        .attr('width', EVENT_HIT_WIDTH)
        .attr('height', evtBottomY - MARGIN.top)
        .attr('fill', 'transparent');

      evtGroup
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', MARGIN.top)
        .attr('y2', evtBottomY)
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.5)
        .attr('pointer-events', 'none');

      evtGroup
        .append('path')
        .attr('d', d3.symbol().type(d3.symbolDiamond).size(28)())
        .attr('transform', `translate(${x}, ${MARGIN.top})`)
        .attr('fill', '#9ca3af')
        .attr('opacity', 0.7)
        .attr('pointer-events', 'none');

      evtGroup
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).select('line').attr('opacity', '1').attr('stroke', 'var(--accent)');
          d3.select(this).select('path').attr('fill', 'var(--accent)').attr('opacity', '1');
          tooltipDiv
            .style('opacity', '1')
            .html(`<strong>${evt.event}</strong><br/>${formatTimeOnly(evt.timestamp, tz)}`)
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mousemove', function (event: MouseEvent) {
          tooltipDiv
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).select('line').attr('opacity', '0.5').attr('stroke', '#9ca3af');
          d3.select(this).select('path').attr('fill', '#9ca3af').attr('opacity', '0.7');
          tooltipDiv.style('opacity', '0');
        });
    }

    for (const marker of pointMarkers ?? []) {
      const x = xScale(new Date(marker.timestamp));
      const markerColor = marker.color ?? '#ec4899';
      const evtGroup = svg.append('g').style('cursor', 'pointer');

      evtGroup
        .append('rect')
        .attr('x', x - EVENT_HIT_WIDTH / 2)
        .attr('y', MARGIN.top)
        .attr('width', EVENT_HIT_WIDTH)
        .attr('height', evtBottomY - MARGIN.top)
        .attr('fill', 'transparent');

      evtGroup
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', MARGIN.top)
        .attr('y2', evtBottomY)
        .attr('stroke', markerColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.65)
        .attr('pointer-events', 'none');

      evtGroup
        .append('circle')
        .attr('cx', x)
        .attr('cy', MARGIN.top)
        .attr('r', 4)
        .attr('fill', markerColor)
        .attr('opacity', 0.9)
        .attr('pointer-events', 'none');

      evtGroup
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).select('line').attr('opacity', '1');
          d3.select(this).select('circle').attr('opacity', '1');
          tooltipDiv
            .style('opacity', '1')
            .html(
              marker.tooltip
              ?? `<strong style="color:${markerColor}">${marker.label}</strong><br/>${formatTimeOnly(marker.timestamp, tz)}`,
            )
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mousemove', function (event: MouseEvent) {
          tooltipDiv
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).select('line').attr('opacity', '0.65');
          d3.select(this).select('circle').attr('opacity', '0.9');
          tooltipDiv.style('opacity', '0');
        });
    }

    svg
      .on('mousemove', (event: MouseEvent) => {
        const [x] = d3.pointer(event, svg.node());
        if (x >= MARGIN.left && x <= width - MARGIN.right) {
          crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
          eventBus?.dispatchEvent(new CustomEvent('hoverTime', { detail: xScale.invert(x).getTime() }));
        }
      })
      .on('mouseleave', () => {
        crosshairLine.style('display', 'none');
        eventBus?.dispatchEvent(new Event('mouseout'));
      });

    if (eventBus) {
      const onHoverTime = (e: Event) => {
        const x = xScale(new Date((e as CustomEvent<number>).detail));
        if (!Number.isNaN(x)) crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
      };
      const onMouseOut = () => crosshairLine.style('display', 'none');
      eventBus.addEventListener('hoverTime', onHoverTime);
      eventBus.addEventListener('mouseout', onMouseOut);
      return () => {
        eventBus.removeEventListener('hoverTime', onHoverTime);
        eventBus.removeEventListener('mouseout', onMouseOut);
      };
    }
  }, [data, config, hasIce, iceValues, overlays, pointMarkers, eventBus, tz, hasIssues, issues, visibility, hasVisibility]);

  useEffect(() => {
    const cleanup = render();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, [render]);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  const showLegend = Object.keys(config.colorMap).length > 2 || hasIce || hasIssues;
  const colorEntries = Object.entries(config.colorMap);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.titleRow}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.infoIcon} title={description}>ⓘ</span>}
        <span className={styles.actionSpacer} />
        {handlePin && (
          <button
            className={`${styles.pinBtn} ${pinned ? styles.pinBtnActive : ''}`}
            onClick={handlePin}
            title={pinned ? 'Remove from comparison' : 'Add to comparison'}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <path d="M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 010 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 01.16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 01-.707 0l-2.829-2.828-3.182 3.182a.5.5 0 01-.707-.708l3.182-3.182L2.398 8.04a.5.5 0 010-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 011.013.16l3.134-3.133a3 3 0 01-.04-.461c0-.43.109-1.022.589-1.503a.5.5 0 01.353-.146z" />
            </svg>
          </button>
        )}
        <ScreenshotButton targetRef={containerRef} className={styles.screenshotBtn} />
      </div>
      {showLegend && (
        <div className={styles.legend}>
          {colorEntries.map(([state, color]) => (
            <span key={state} className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: color }} />
              {state}
            </span>
          ))}
          {hasIce && (
            <>
              <span className={styles.legendItem} style={{ marginLeft: 6, opacity: 0.5 }}>|</span>
              <span className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: ICE_DIRECT_COLOR }} />
                Direct
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: ICE_RELAY_COLOR }} />
                TURN (Relay)
              </span>
            </>
          )}
          {hasIssues && (
            <>
              {(Object.keys(config.colorMap).length > 2 || hasIce) && (
                <span className={styles.legendItem} style={{ marginLeft: 6, opacity: 0.5 }}>|</span>
              )}
              {issueTypes.map((issue) => (
                <span key={issue.type} className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: issue.color }} />
                  {issue.label}
                </span>
              ))}
            </>
          )}
          {hasVisibility && (
            <>
              <span className={styles.legendItem} style={{ marginLeft: 6, opacity: 0.5 }}>|</span>
              <span className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: TAB_ACTIVE_COLOR }} />
                Tab active
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: TAB_INACTIVE_COLOR }} />
                Tab in background
              </span>
            </>
          )}
        </div>
      )}
      <div className={styles.chartArea} ref={chartRef} />
    </div>
  );
}
