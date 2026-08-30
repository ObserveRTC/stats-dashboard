'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useCompareStore } from '../../stores/compareStore.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatTimeOnly } from '../../utils/formatting.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import type { IssueLaneItem } from '../../utils/issueTimelinePlacement.ts';
import { uniqueIssueLaneTypes } from '../../utils/issueTimelinePlacement.ts';
import {
  paintVisibilityLane,
  TAB_ACTIVE_COLOR,
  TAB_INACTIVE_COLOR,
} from './paintVisibilityLane.ts';
import { useTabVisibility } from './tabVisibilityContext.tsx';
import { visibilitySegments } from '../../utils/tabVisibility.ts';
import { paintIssueLane } from './paintIssueLane.ts';
import styles from './Timeline.module.css';

interface HistoryEvent {
  timestamp: number;
  event: string;
}

export interface ConsumerData {
  createdAt?: number;
  closedAt?: number;
  history?: HistoryEvent[];
}

interface ConsumerSegment {
  start: number;
  end: number;
  trackActive: boolean;
  producerActive: boolean;
  selfActive: boolean;
}

function generateFlowingConsumerSegments(data: ConsumerData): ConsumerSegment[] {
  const createdAt = data.createdAt ?? 0;
  const closedAt = data.closedAt ?? Date.now();
  const history = data.history ?? [];

  const timestamps = [
    ...new Set([createdAt, ...history.map((e) => e.timestamp), closedAt]),
  ].sort((a, b) => a - b);

  let trackActive = true;
  let producerActive = true;
  let selfActive = false;

  const segments: ConsumerSegment[] = [];
  for (let i = 0; i < timestamps.length - 1; i++) {
    const start = timestamps[i];
    const end = timestamps[i + 1];
    const eventsAtStart = history.filter((e) => e.timestamp === start);
    for (const evt of eventsAtStart) {
      switch (evt.event) {
        case 'stopped': trackActive = false; break;
        case 'started': trackActive = true; break;
        case 'producerPaused': producerActive = false; break;
        case 'producerResumed': producerActive = true; break;
        case 'pause': selfActive = false; break;
        case 'resume': selfActive = true; break;
      }
    }
    if (end > start) {
      segments.push({ start, end, trackActive, producerActive, selfActive });
    }
  }
  return segments;
}

function mergeSegments(
  arr: Array<{ start: number; end: number; active: boolean }>
): Array<{ start: number; end: number; active: boolean }> {
  if (arr.length === 0) return [];
  const merged: Array<{ start: number; end: number; active: boolean }> = [];
  let cur = { ...arr[0] };
  for (let i = 1; i < arr.length; i++) {
    const s = arr[i];
    if (s.active === cur.active) {
      cur.end = s.end;
    } else {
      merged.push(cur);
      cur = { ...s };
    }
  }
  merged.push(cur);
  return merged;
}

export interface StackedConsumerTimelineProps {
  data: ConsumerData;
  description?: string;
  eventBus?: EventTarget;
  /** Client-detected issues matched to this consumer. */
  issueLane?: IssueLaneItem[];
  /** If provided, shows a pin button for cross-chart comparison. */
  pinLabel?: string;
}

const TRACK_HEIGHT = 15;
const TRACK_SPACING = 6;
const LABEL_WIDTH = 55;
const MARGIN = { top: 8, right: 12, bottom: 28, left: LABEL_WIDTH + 8 };
const START_Y = 10;

const TRACKS = [
  { name: 'Track', activeColor: 'var(--success)', inactiveColor: 'var(--danger)' },
  { name: 'Producer', activeColor: 'var(--success)', inactiveColor: 'var(--border-light)' },
  { name: 'Consumer', activeColor: 'var(--success)', inactiveColor: 'var(--border-light)' },
];

export function StackedConsumerTimeline({ data, description, eventBus, issueLane, pinLabel }: StackedConsumerTimelineProps) {
  const pinned = useCompareStore((s) => pinLabel ? s.isPinned(pinLabel) : false);
  const togglePin = useCompareStore((s) => s.togglePin);
  const tz = useTimezoneTick();
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
      type: 'stacked-consumer-timeline',
      label: pinLabel,
      stackedConsumerTimelineProps: { data, description, issueLane: issues },
    });
  } : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const trackCount = TRACKS.length + (hasIssues ? 1 : 0) + (hasVisibility ? 1 : 0);
  const HEIGHT = START_Y + trackCount * (TRACK_HEIGHT + TRACK_SPACING) + MARGIN.bottom;

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container) return;

    const createdAt = data.createdAt ?? 0;
    const closedAt = data.closedAt ?? Date.now();
    if (createdAt === 0) return;

    const segments = generateFlowingConsumerSegments(data);
    if (segments.length === 0) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;
    const width = Math.max(400, containerWidth);

    container.innerHTML = '';

    let domainStart = createdAt;
    let domainEnd = closedAt;
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
      .attr('height', HEIGHT)
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)
      .style('display', 'block')
      .style('cursor', 'crosshair');

    svg
      .append('g')
      .attr('transform', `translate(0, ${HEIGHT - MARGIN.bottom + 2})`)
      .call(
        d3.axisBottom(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--text-muted)');

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    const mergedTrack = mergeSegments(
      segments.map((s) => ({ start: s.start, end: s.end, active: s.trackActive })),
    );
    const mergedProducer = mergeSegments(
      segments.map((s) => ({ start: s.start, end: s.end, active: s.producerActive })),
    );
    const mergedConsumer = mergeSegments(
      segments.map((s) => ({ start: s.start, end: s.end, active: s.selfActive })),
    );

    const mergedArrays = [mergedTrack, mergedProducer, mergedConsumer];

    TRACKS.forEach((track, trackIndex) => {
      const trackY = START_Y + trackIndex * (TRACK_HEIGHT + TRACK_SPACING);

      svg
        .append('text')
        .attr('x', MARGIN.left - 6)
        .attr('y', trackY + TRACK_HEIGHT / 2)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'end')
        .text(track.name)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', 'var(--text-muted)');

      const clipId = `stacked-clip-${trackIndex}`;
      svg
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('x', xScale.range()[0])
        .attr('y', trackY)
        .attr('width', Math.max(0, xScale.range()[1] - xScale.range()[0]))
        .attr('height', TRACK_HEIGHT)
        .attr('rx', 3);

      svg
        .append('rect')
        .attr('x', xScale.range()[0])
        .attr('y', trackY)
        .attr('width', Math.max(0, xScale.range()[1] - xScale.range()[0]))
        .attr('height', TRACK_HEIGHT)
        .attr('rx', 3)
        .attr('fill', 'var(--bg-tertiary)')
        .attr('stroke', 'var(--border-light)')
        .attr('stroke-width', 0.5);

      const trackGroup = svg.append('g').attr('clip-path', `url(#${clipId})`);

      for (const seg of mergedArrays[trackIndex]) {
        const x1 = xScale(new Date(seg.start));
        const x2 = xScale(new Date(seg.end));
        const w = Math.max(1, x2 - x1);
        const color = seg.active ? track.activeColor : track.inactiveColor;

        trackGroup
          .append('rect')
          .attr('x', x1)
          .attr('y', trackY)
          .attr('width', w)
          .attr('height', TRACK_HEIGHT)
          .attr('fill', color)
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this).attr('opacity', '1');
            const state = seg.active ? 'active' : 'inactive';
            const startStr = formatTimeOnly(seg.start, tz);
            const endStr = formatTimeOnly(seg.end, tz);
            const dur = ((seg.end - seg.start) / 1000).toFixed(1);
            tooltipDiv
              .style('opacity', '1')
              .html(
                `<strong>${track.name}: ${state}</strong><br/>${startStr} – ${endStr}<br/>${dur}s`,
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
            d3.select(this).attr('opacity', '0.9');
            tooltipDiv.style('opacity', '0');
          });
      }
    });

    if (hasIssues) {
      const issueY = START_Y + TRACKS.length * (TRACK_HEIGHT + TRACK_SPACING);
      paintIssueLane({
        svg,
        tooltipDiv,
        items: issues,
        xScale: (d) => xScale(d),
        y: issueY,
        height: TRACK_HEIGHT,
        chartLeft: xScale.range()[0],
        chartRight: xScale.range()[1],
        label: issues.length > 0 ? `Issues (${issues.length})` : 'Issues',
      });
    }

    if (hasVisibility) {
      // Last row, under Track / Producer / Consumer and the issues: a grey
      // stretch here explains a whole column of stalled rows above it.
      const visY =
        START_Y + (TRACKS.length + (hasIssues ? 1 : 0)) * (TRACK_HEIGHT + TRACK_SPACING);
      paintVisibilityLane({
        svg,
        tooltipDiv,
        segments: visibilitySegments(visibility, domainStart, domainEnd),
        xScale: (d) => xScale(d),
        y: visY,
        height: TRACK_HEIGHT,
        chartLeft: xScale.range()[0],
        chartRight: xScale.range()[1],
        tz,
      });
    }

    const history = data.history ?? [];
    const allEvents = [
      { timestamp: createdAt, event: 'created' },
      ...history,
    ].sort((a, b) => a.timestamp - b.timestamp);
    if (closedAt > createdAt) {
      allEvents.push({ timestamp: closedAt, event: 'closed' });
    }

    const trackMap: Record<string, number> = {
      stopped: 0, started: 0,
      producerPaused: 1, producerResumed: 1,
      pause: 2, resume: 2, degraded: 2, restored: 2,
    };

    for (const evt of allEvents) {
      const trackIdx = trackMap[evt.event];
      if (trackIdx == null) continue;
      const x = xScale(new Date(evt.timestamp));
      const trackY = START_Y + trackIdx * (TRACK_HEIGHT + TRACK_SPACING);

      const circle = svg
        .append('circle')
        .attr('cx', x)
        .attr('cy', trackY + TRACK_HEIGHT / 2)
        .attr('r', 4)
        .attr('fill', 'var(--accent)')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');

      circle
        .on('mouseenter', (event: MouseEvent) => {
          circle.attr('r', 6);
          tooltipDiv
            .style('opacity', '1')
            .html(
              `<strong>${evt.event}</strong><br/>${formatTimeOnly(evt.timestamp, tz)}`,
            )
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mousemove', (event: MouseEvent) => {
          tooltipDiv
            .style('left', `${event.clientX + 12}px`)
            .style('top', `${event.clientY - 10}px`);
        })
        .on('mouseleave', () => {
          circle.attr('r', 4);
          tooltipDiv.style('opacity', '0');
        });
    }

    const crosshairLine = svg
      .append('line')
      .attr('y1', 0)
      .attr('y2', HEIGHT - MARGIN.bottom)
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none')
      .attr('pointer-events', 'none');

    svg
      .on('mousemove', (event: MouseEvent) => {
        const [x] = d3.pointer(event, svg.node());
        if (x >= MARGIN.left && x <= width - MARGIN.right) {
          crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
          eventBus?.dispatchEvent(
            new CustomEvent('hoverTime', { detail: xScale.invert(x).getTime() }),
          );
        }
      })
      .on('mouseleave', () => {
        crosshairLine.style('display', 'none');
        eventBus?.dispatchEvent(new Event('mouseout'));
      });

    if (eventBus) {
      const onHoverTime = (e: Event) => {
        const x = xScale(new Date((e as CustomEvent<number>).detail));
        if (!Number.isNaN(x))
          crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
      };
      const onMouseOut = () => crosshairLine.style('display', 'none');
      eventBus.addEventListener('hoverTime', onHoverTime);
      eventBus.addEventListener('mouseout', onMouseOut);
      return () => {
        eventBus.removeEventListener('hoverTime', onHoverTime);
        eventBus.removeEventListener('mouseout', onMouseOut);
      };
    }
  }, [data, eventBus, HEIGHT, tz, hasIssues, issues, visibility, hasVisibility]);

  useEffect(() => {
    const cleanup = render();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [render]);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.titleRow}>
        <span className={styles.title}>Timeline · Consumer</span>
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
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'var(--success)' }} />
          active
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'var(--danger)' }} />
          track off
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'var(--border-light)' }} />
          paused
        </span>
        {issueTypes.map((issue) => (
          <span key={issue.type} className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: issue.color }} />
            {issue.label}
          </span>
        ))}
        {hasVisibility && (
          <>
            <span className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: TAB_ACTIVE_COLOR }} />
              tab active
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: TAB_INACTIVE_COLOR }} />
              tab in background
            </span>
          </>
        )}
      </div>
      <div className={styles.chartArea} ref={chartRef} />
    </div>
  );
}
