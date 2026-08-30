'use client';
import { useCallback, useEffect, useMemo, useId, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useCompareStore } from '../../stores/compareStore.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale } from '../../utils/formatting.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import styles from './MiniChart.module.css';

export interface MiniChartPinData {
  label: string;
}

/**
 * A single plotted point. `notes` is detail shown in the crosshair tooltip —
 * score reasons, mostly: the number says something changed, the notes say why.
 */
export interface MiniChartPoint {
  timestamp: Date;
  value: number;
  notes?: string[];
}

export interface MiniChartLineSeries {
  label: string;
  data: MiniChartPoint[];
  color: string;
}

export interface MiniChartRegion {
  start: number;
  end: number;
  color?: string;
  /** Issue payload / episode details shown when hovering the marker. */
  tooltipHtml?: string;
}

export interface MiniChartProps {
  title: string;
  description?: string;
  data?: MiniChartPoint[];
  series?: MiniChartLineSeries[];
  formatter?: (v: number) => string;
  color?: string;
  /** Fixed Y-axis domain [min, max]. If omitted, auto-scales from data. */
  yDomain?: [number, number];
  eventBus?: EventTarget;
  /** If provided, shows a pin button for cross-chart comparison. */
  pinLabel?: string;
  /** Shorter chart area and tighter chrome — for dense dashboards. */
  compact?: boolean;
  /** Time windows to shade (issue episodes). */
  regions?: MiniChartRegion[];
}

/** Notes come from the client verbatim, so they are escaped before injection. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEFAULT_COLOR = 'var(--accent)';
const HEIGHT = 80;
const COMPACT_HEIGHT = 56;
/** Multiplier of the median sample interval beyond which a gap breaks the line. */
const GAP_THRESHOLD_FACTOR = 3;

/**
 * Insert NaN sentinel entries where consecutive data points are separated by
 * more than GAP_THRESHOLD_FACTOR × the median sample interval. D3's `defined`
 * filter then breaks the line/area at those points instead of drawing a
 * misleading straight connector across the gap.
 */
function insertGapBreakers(
  data: MiniChartPoint[],
): MiniChartPoint[] {
  if (data.length < 3) return data;

  // Compute median interval
  const intervals: number[] = [];
  for (let i = 1; i < data.length; i++) {
    intervals.push(data[i].timestamp.getTime() - data[i - 1].timestamp.getTime());
  }
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  const threshold = median * GAP_THRESHOLD_FACTOR;

  const result: { timestamp: Date; value: number }[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const gap = data[i].timestamp.getTime() - data[i - 1].timestamp.getTime();
    if (gap > threshold) {
      // Insert a NaN point in the middle of the gap to break the line
      result.push({ timestamp: new Date(data[i - 1].timestamp.getTime() + 1), value: NaN });
    }
    result.push(data[i]);
  }
  return result;
}

function smartAxisLabel(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (abs >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (Number.isInteger(n)) return String(n);
  if (abs < 0.01) return n.toPrecision(2);
  if (abs < 1) return n.toFixed(2).replace(/0$/, '');
  return n.toFixed(1).replace(/\.0$/, '');
}

export function MiniChart({
  title,
  description,
  data,
  series,
  formatter = (v) => String(v),
  color = DEFAULT_COLOR,
  yDomain,
  eventBus,
  pinLabel,
  compact = false,
  regions,
}: MiniChartProps) {
  const activeSeries = useMemo<MiniChartLineSeries[]>(
    () => series ?? (data ? [{ label: title, data, color }] : []),
    [series, data, title, color],
  );
  const primaryData = activeSeries[0]?.data ?? [];
  const isMulti = activeSeries.length > 1;
  const pinned = useCompareStore((s) => pinLabel ? s.isPinned(pinLabel) : false);
  const togglePin = useCompareStore((s) => s.togglePin);
  const tz = useTimezoneTick();

  const handlePin = pinLabel ? () => {
    togglePin({
      type: 'minichart',
      label: pinLabel,
      miniChartProps: {
        title,
        description,
        data: primaryData,
        series: isMulti ? activeSeries : undefined,
        formatter,
        color: activeSeries[0]?.color ?? color,
        yDomain,
        regions,
      },
    });
  } : undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const gradientIdRef = useRef<string | null>(null);
  if (gradientIdRef.current === null) {
    gradientIdRef.current = `mc-grad-${reactId.replace(/:/g, '')}`;
  }
  const gradientId = gradientIdRef.current;
  const [infoTip, setInfoTip] = useState<{ x: number; y: number } | null>(null);

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container || activeSeries.length === 0) return;
    const hasEnoughPoints = activeSeries.some((s) => s.data.length >= 2);
    if (!hasEnoughPoints) return;

    const width = container.clientWidth;
    if (width <= 0) return;

    container.innerHTML = '';

    const chartHeight = compact ? COMPACT_HEIGHT : HEIGHT;
    const MARGIN = compact
      ? { top: 4, right: 6, bottom: 14, left: 34 }
      : { top: 6, right: 8, bottom: 20, left: 40 };

    const allPoints = activeSeries.flatMap((s) => s.data);
    const xValues: Date[] = allPoints.map((d) => d.timestamp);
    if (regions) {
      for (const region of regions) {
        xValues.push(new Date(region.start), new Date(region.end));
      }
    }
    const yMax = yDomain
      ? yDomain[1]
      : Math.max((Number(d3.max(allPoints, (d) => d.value)) || 0) * 1.1, 1e-6);
    const yScaleTmp = d3.scaleLinear().domain([0, yMax]).range([chartHeight - MARGIN.bottom, MARGIN.top]).nice();
    const longestLabel = yScaleTmp.ticks(3).reduce((longest, t) => {
      const label = smartAxisLabel(t);
      return label.length > longest.length ? label : longest;
    }, '');
    MARGIN.left = Math.max(32, longestLabel.length * 7 + 10);

    const xScale = d3TimeScale(tz)
      .domain(d3.extent(xValues) as [Date, Date])
      .range([MARGIN.left, width - MARGIN.right]);

    const yScale = d3.scaleLinear().domain([0, yMax]).range([chartHeight - MARGIN.bottom, MARGIN.top]).nice();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${width} ${chartHeight}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    const primaryColor = activeSeries[0]?.color ?? color;
    grad.append('stop').attr('offset', '0%').attr('stop-color', primaryColor).attr('stop-opacity', 0.25);
    grad.append('stop').attr('offset', '100%').attr('stop-color', primaryColor).attr('stop-opacity', 0);

    const plotTop = MARGIN.top;
    const plotBottom = chartHeight - MARGIN.bottom;

    const line = d3
      .line<{ timestamp: Date; value: number }>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value))
      .defined((d) => d.value != null && !Number.isNaN(d.value));

    const area = d3
      .area<{ timestamp: Date; value: number }>()
      .x((d) => xScale(d.timestamp))
      .y0(chartHeight - MARGIN.bottom)
      .y1((d) => yScale(d.value))
      .defined((d) => d.value != null && !Number.isNaN(d.value));

    for (const [idx, s] of activeSeries.entries()) {
      const chartData = insertGapBreakers(s.data);
      if (!isMulti && idx === 0) {
        svg.append('path').datum(chartData).attr('fill', `url(#${gradientId})`).attr('d', area);
      }
      svg
        .append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', s.color)
        .attr('stroke-width', compact ? 1.25 : 1.5)
        .attr('d', line);
    }

    const axisFontSize = compact ? '8px' : '9px';
    const numTicks = Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / (compact ? 80 : 100)));
    svg
      .append('g')
      .attr('transform', `translate(0, ${chartHeight - MARGIN.bottom})`)
      .call(d3.axisBottom(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', axisFontSize)
      .style('fill', 'var(--text-muted)');

    svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(3).tickFormat((d) => smartAxisLabel(d as number)))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', 'var(--grid-line)').attr('x2', width - MARGIN.left - MARGIN.right))
      .selectAll('text')
      .style('font-size', axisFontSize)
      .style('fill', 'var(--text-muted)');

    if (regions && regions.length > 0) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const markColor = isDark ? '#a398b3' : '#c9bfd8';
      const markerG = svg.append('g').attr('pointer-events', 'none');
      const markAt = (x: number) => {
        if (x < MARGIN.left || x > width - MARGIN.right) return;
        markerG
          .append('line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', plotTop)
          .attr('y2', plotBottom)
          .attr('stroke', markColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('stroke-opacity', 0.8);
      };
      for (const region of regions) {
        markAt(xScale(new Date(region.start)));
        if (region.end > region.start + 250) markAt(xScale(new Date(region.end)));
      }
    }

    const crosshairLine = svg
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', chartHeight - MARGIN.bottom)
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none')
      .attr('pointer-events', 'none');

    const hoverCircles = activeSeries.map((s) =>
      svg
        .append('circle')
        .attr('r', compact ? 3 : 3.5)
        .attr('fill', s.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('display', 'none')
        .attr('pointer-events', 'none'),
    );

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    const bisect = d3.bisector<{ timestamp: Date; value: number }, Date>((d) => d.timestamp).left;

    const nearestPoint = (pts: { timestamp: Date; value: number }[], time: number) => {
      if (pts.length === 0) return null;
      const idx = bisect(pts, new Date(time), 1);
      const d0 = pts[idx - 1];
      const d1 = pts[idx];
      if (!d0) return d1 ?? null;
      if (!d1) return d0;
      return time - d0.timestamp.getTime() > d1.timestamp.getTime() - time ? d1 : d0;
    };

    const HIT_PX = 8;
    const regionAt = (x: number, time: number): MiniChartRegion | null => {
      if (!regions?.length) return null;
      let nearest: MiniChartRegion | null = null;
      let nearestDist = HIT_PX;
      for (const region of regions) {
        const x1 = xScale(new Date(region.start));
        const x2 = xScale(new Date(region.end));
        if (region.end > region.start && x >= Math.min(x1, x2) && x <= Math.max(x1, x2)) return region;
        const dStart = Math.abs(x - x1);
        if (dStart < nearestDist) {
          nearestDist = dStart;
          nearest = region;
        }
        const dTime = Math.abs(time - region.start);
        if (dTime < 400 && dStart < HIT_PX + 4) nearest = region;
      }
      return nearest;
    };

    const showCrosshair = (time: number) => {
      const x = xScale(new Date(time));
      if (Number.isNaN(x) || x < MARGIN.left || x > width - MARGIN.right) {
        hideCrosshair();
        return;
      }
      crosshairLine.attr('x1', x).attr('x2', x).style('display', null);

      const hits = activeSeries
        .map((s, i) => ({ s, i, d: nearestPoint(s.data, time) }))
        .filter((h): h is { s: MiniChartLineSeries; i: number; d: MiniChartPoint } => h.d != null);

      const region = regionAt(x, time);

      if (hits.length === 0 && !region) {
        hideCrosshair();
        return;
      }

      for (const circle of hoverCircles) circle.style('display', 'none');
      for (const { i, d } of hits) {
        const px = xScale(d.timestamp);
        const py = yScale(d.value);
        hoverCircles[i].attr('cx', px).attr('cy', py).style('display', null);
      }

      const timeStr = d3TimeFormat('%H:%M:%S.%L', tz)(new Date(time));
      const valueLines = hits
        .map(({ s, d }) => `<span style="color:${s.color}">${s.label}: <strong>${formatter(d.value)}</strong></span>`)
        .join('<br/>');
      // Point notes (score reasons) are per-series; de-duplicate so a reason
      // shared across series is not repeated.
      const noteLines = Array.from(
        new Set(hits.flatMap(({ d }) => d.notes ?? []).filter((n) => n.trim() !== '')),
      )
        .map((n) => `<span class="${styles.tooltipNote}">${escapeHtml(n)}</span>`)
        .join('')

      const issueHtml = region?.tooltipHtml;
      const base = issueHtml
        ? `${issueHtml}${valueLines ? `<br/>${valueLines}` : ''}`
        : `${valueLines}<br/><span style="color:var(--text-muted)">${timeStr}</span>`;
      const html = noteLines ? `${base}<br/>${noteLines}` : base;
      const rect = container.getBoundingClientRect();
      const anchorY = hits[0] ? yScale(hits[0].d.value) : plotTop + 8;
      tooltipDiv
        .attr('class', issueHtml || noteLines ? `${styles.tooltip} ${styles.tooltipRich}` : styles.tooltip)
        .html(html)
        .style('opacity', '1')
        .style('left', `${rect.left + x + 12}px`)
        .style('top', `${rect.top + anchorY - 10}px`);
    };

    const hideCrosshair = () => {
      crosshairLine.style('display', 'none');
      for (const circle of hoverCircles) circle.style('display', 'none');
      tooltipDiv.style('opacity', '0');
    };

    svg
      .append('rect')
      .attr('x', MARGIN.left)
      .attr('y', MARGIN.top)
      .attr('width', Math.max(0, width - MARGIN.left - MARGIN.right))
      .attr('height', chartHeight - MARGIN.top - MARGIN.bottom)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, svg.node());
        const time = xScale.invert(mx).getTime();
        showCrosshair(time);
        eventBus?.dispatchEvent(new CustomEvent('hoverTime', { detail: time }));
      })
      .on('mouseleave', () => {
        hideCrosshair();
        eventBus?.dispatchEvent(new Event('mouseout'));
      });

    if (eventBus) {
      const onHoverTime = (e: Event) => showCrosshair((e as CustomEvent<number>).detail);
      const onMouseOut = () => hideCrosshair();
      eventBus.addEventListener('hoverTime', onHoverTime);
      eventBus.addEventListener('mouseout', onMouseOut);
      return () => {
        eventBus.removeEventListener('hoverTime', onHoverTime);
        eventBus.removeEventListener('mouseout', onMouseOut);
      };
    }
  }, [activeSeries, color, formatter, eventBus, tz, yDomain, isMulti, compact, gradientId, regions]);

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

  useEffect(() => {
    if (!infoTip) return;
    const hide = () => setInfoTip(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [infoTip]);

  return (
    <div className={`${styles.container} ${compact ? styles.containerCompact : ''}`} ref={containerRef}>
      <div className={styles.titleRow}>
        <span className={styles.title}>{title}</span>
        {isMulti && (
          <span className={styles.seriesLegend}>
            {activeSeries.map((s) => (
              <span key={s.label} className={styles.seriesLegendItem}>
                <span className={styles.seriesLegendSwatch} style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </span>
        )}
        {description && (
          <span
            className={styles.infoIcon}
            role="img"
            aria-label={description}
            onMouseEnter={(e) => setInfoTip({ x: e.clientX + 12, y: e.clientY - 10 })}
            onMouseMove={(e) => setInfoTip({ x: e.clientX + 12, y: e.clientY - 10 })}
            onMouseLeave={() => setInfoTip(null)}
          >
            ⓘ
          </span>
        )}
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
      <div className={`${styles.chartArea} ${compact ? styles.chartAreaCompact : ''}`} ref={chartRef} />
      {description && infoTip && (
        <div
          className={styles.infoTooltip}
          style={{ left: infoTip.x, top: infoTip.y }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
