'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { QUALITY_COLORS } from '../../utils/qualityClassifier.ts';
import { useCompareStore } from '../../stores/compareStore.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatTimeOnly } from '../../utils/formatting.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import type { QualityState } from '../../api/types.ts';
import styles from './QualityTimeline.module.css';

export interface QualityTimelineProps {
  title: string;
  description?: string;
  samples: { timestamp: number; state: string }[];
  startTime: number;
  endTime: number;
  eventBus?: EventTarget;
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  /** If provided, shows a pin button for cross-chart comparison. */
  pinLabel?: string;
}

const MARGIN = { top: 14, right: 4, bottom: 18, left: 4 };
const BAR_HEIGHT = 20;

function buildSegments(
  samples: { timestamp: number; state: string }[],
  startTime: number,
  endTime: number
): { start: number; end: number; state: string }[] {
  if (samples.length === 0) return [];
  const raw: { start: number; end: number; state: string }[] = [];

  for (let i = 0; i < samples.length; i++) {
    const segStart = i === 0 ? startTime : samples[i].timestamp;
    const segEnd = i + 1 < samples.length ? samples[i + 1].timestamp : endTime;
    const segStartClipped = Math.max(segStart, startTime);
    const segEndClipped = Math.min(segEnd, endTime);
    if (segStartClipped < segEndClipped) {
      raw.push({ start: segStartClipped, end: segEndClipped, state: samples[i].state });
    }
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

function formatDurationShort(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem.toFixed(0)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const STATE_LABELS: Record<string, string> = {
  good: 'Good',
  degraded: 'Degraded',
  'high-jitter': 'High Jitter',
  'packet-loss': 'Packet Loss',
  freezing: 'Freezing',
};

export function QualityTimeline({ title, description, samples, startTime, endTime, eventBus, colorMap, labelMap, pinLabel }: QualityTimelineProps) {
  const pinned = useCompareStore((s) => pinLabel ? s.isPinned(pinLabel) : false);
  const togglePin = useCompareStore((s) => s.togglePin);
  const tz = useTimezoneTick();

  const handlePin = pinLabel ? () => {
    togglePin({
      type: 'quality-timeline',
      label: pinLabel,
      qualityTimelineProps: { title, description, samples, startTime, endTime, colorMap, labelMap },
    });
  } : undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const getColorFn = useCallback(
    (state: string): string => {
      if (colorMap && state in colorMap) return colorMap[state];
      return QUALITY_COLORS[state as QualityState] ?? 'var(--text-muted)';
    },
    [colorMap],
  );

  const getLabelFn = useCallback(
    (state: string): string => {
      if (labelMap && state in labelMap) return labelMap[state];
      return STATE_LABELS[state] ?? state;
    },
    [labelMap],
  );

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container) return;

    const segments = buildSegments(samples, startTime, endTime);
    if (segments.length === 0) return;

    const width = container.clientWidth;
    const height = BAR_HEIGHT + MARGIN.top + MARGIN.bottom;
    if (width <= 0) return;

    container.innerHTML = '';

    const xScale = d3TimeScale(tz)
      .domain([new Date(startTime), new Date(endTime)])
      .range([MARGIN.left, width - MARGIN.right]);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .style('cursor', 'crosshair');

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    const barY = MARGIN.top;

    // Time axis above the bar
    const tickCount = Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 100));
    svg
      .append('g')
      .attr('transform', `translate(0, ${MARGIN.top})`)
      .call(
        d3.axisTop(xScale)
          .ticks(tickCount)
          .tickSize(3)
          .tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '8px')
      .attr('fill', 'var(--text-muted)');

    svg
      .append('g')
      .attr('transform', `translate(0, ${MARGIN.top + BAR_HEIGHT})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(tickCount)
          .tickSize(3)
          .tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '8px')
      .attr('fill', 'var(--text-muted)');

    const clipId = `qt-bar-clip-${Math.random().toString(36).slice(2, 8)}`;
    const firstX = xScale(new Date(segments[0].start));
    const lastX = xScale(new Date(segments[segments.length - 1].end));
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', firstX)
      .attr('y', barY)
      .attr('width', Math.max(0, lastX - firstX))
      .attr('height', BAR_HEIGHT)
      .attr('rx', 3);

    const barGroup = svg.append('g').attr('clip-path', `url(#${clipId})`);

    segments.forEach((seg) => {
      const x1 = xScale(new Date(seg.start));
      const x2 = xScale(new Date(seg.end));
      const w = Math.max(1, x2 - x1);
      const color = getColorFn(seg.state);

      barGroup
        .append('rect')
        .attr('x', x1)
        .attr('y', barY)
        .attr('width', w)
        .attr('height', BAR_HEIGHT)
        .attr('fill', color)
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).attr('opacity', '1');
          const startStr = formatTimeOnly(seg.start, tz);
          const endStr = formatTimeOnly(seg.end, tz);
          const dur = formatDurationShort(seg.end - seg.start);
          const label = getLabelFn(seg.state);
          tooltipDiv
            .style('opacity', '1')
            .html(`<strong>${label}</strong><br/>${startStr} – ${endStr} (${dur})`)
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

      // Inline label for segments wide enough
      const label = getLabelFn(seg.state);
      const labelMinWidth = label.length * 5.5 + 8;
      if (w > labelMinWidth) {
        // Determine text color based on background luminance
        const needsLightText = color.startsWith('var(--success)') || color.startsWith('var(--danger)') || color.startsWith('#e') || color.startsWith('#f8');
        barGroup
          .append('text')
          .attr('x', x1 + w / 2)
          .attr('y', barY + BAR_HEIGHT / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .attr('fill', needsLightText ? '#fff' : '#1e293b')
          .attr('pointer-events', 'none')
          .text(label);
      }
    });

    // Transition markers between segments
    for (let i = 1; i < segments.length; i++) {
      const x = xScale(new Date(segments[i].start));
      svg
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', barY)
        .attr('y2', barY + BAR_HEIGHT)
        .attr('stroke', 'var(--card-bg)')
        .attr('stroke-width', 1.5)
        .attr('pointer-events', 'none');
    }

    const crosshairLine = svg
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', height - MARGIN.bottom)
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
  }, [samples, startTime, endTime, eventBus, getColorFn, getLabelFn, tz]);

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

  // Compute unique states present in the data for the legend
  const segments = buildSegments(samples, startTime, endTime);
  const uniqueStates = [...new Set(segments.map((s) => s.state))];

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.headerRow}>
        {title && (
          <div className={styles.titleGroup}>
            <span className={styles.title}>{title}</span>
            {description && <span className={styles.infoIcon} title={description}>ⓘ</span>}
          </div>
        )}
        {uniqueStates.length > 0 && (
          <div className={styles.legend}>
            {uniqueStates.map((state) => (
              <span key={state} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: getColorFn(state), opacity: 0.9 }}
                />
                {getLabelFn(state)}
              </span>
            ))}
          </div>
        )}
        <div className={styles.actions}>
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
      </div>
      <div className={styles.chartArea} ref={chartRef} />
    </div>
  );
}
