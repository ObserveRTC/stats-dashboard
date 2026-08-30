'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatDuration } from '../../utils/formatting.ts';
import { paintVisibilityLane } from '../charts/paintVisibilityLane.ts';
import { visibilitySegments, type TabVisibility } from '../../utils/tabVisibility.ts';
import styles from './TabFocusTimeline.module.css';

/** Green while the tab had focus, grey while it did not. */
const ACTIVE_COLOR = 'var(--success)';
const INACTIVE_COLOR = '#9ca3af';

const LANE_H = 18;
const MARGIN = { top: 6, right: 12, bottom: 24, left: 44 };
const HEIGHT = MARGIN.top + LANE_H + MARGIN.bottom;

interface TabFocusTimelineProps {
  visibility: TabVisibility;
  /** Session bounds, so the lane spans the call rather than only the events. */
  start: number;
  end: number;
}

/**
 * Whether the client's browser tab had focus, across the whole session.
 *
 * The per-object timelines carry this as one lane among many, where it explains
 * the lanes above it. Here it is the subject: a single strip answering "was
 * this person actually looking at the call?" — which is a fact about the client
 * itself, and belongs beside the browser it ran on and the devices it could
 * see.
 *
 * Rendered only for a client that reports `TAB_VISIBILITY_CHANGED`. An
 * all-green strip for a client that never sent the event would be an invention.
 */
export function TabFocusTimeline({ visibility, start, end }: TabFocusTimelineProps) {
  const tz = useTimezoneTick();
  const chartRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container) return;
    const width = container.clientWidth;
    if (width <= 0 || !(end > start)) return;
    container.innerHTML = '';

    const xScale = d3TimeScale(tz)
      .domain([new Date(start), new Date(end)])
      .range([MARGIN.left, width - MARGIN.right]);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', HEIGHT)
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)
      .style('display', 'block');

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    paintVisibilityLane({
      svg,
      tooltipDiv,
      segments: visibilitySegments(visibility, start, end),
      xScale: (d) => xScale(d),
      y: MARGIN.top,
      height: LANE_H,
      chartLeft: MARGIN.left,
      chartRight: width - MARGIN.right,
      tz,
      label: 'Tab',
      activeColor: ACTIVE_COLOR,
      inactiveColor: INACTIVE_COLOR,
    });

    const numTicks = Math.max(3, Math.floor((width - MARGIN.left) / 120));
    svg
      .append('g')
      .attr('transform', `translate(0, ${HEIGHT - MARGIN.bottom + 2})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(numTicks)
          .tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--text-muted)');
  }, [visibility, start, end, tz]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => render());
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  if (!visibility.reported) return null;

  const pct =
    visibility.hiddenRatio != null ? Math.round(visibility.hiddenRatio * 100) : null;

  return (
    <div className={styles.wrap}>
      <p className={styles.summary}>
        {visibility.hiddenMs > 0 ? (
          <>
            The tab was in the background for {formatDuration(visibility.hiddenMs)}
            {pct != null ? ` (${pct}% of the session)` : ''} across {visibility.switches}{' '}
            switch{visibility.switches === 1 ? '' : 'es'}. A browser throttles a backgrounded
            tab — timers slow, capture frame rate collapses and the encoder is starved — so
            readings from those stretches describe power saving rather than the call.
          </>
        ) : (
          <>The tab stayed in the foreground for the whole session.</>
        )}
      </p>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: ACTIVE_COLOR }} />
          active
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: INACTIVE_COLOR }} />
          in the background
        </span>
      </div>
      <div ref={chartRef} className={styles.chart} />
    </div>
  );
}
