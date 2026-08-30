'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useCompareStore } from '../../stores/compareStore.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale } from '../../utils/formatting.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import styles from './CpuChart.module.css';

function smartAxisLabel(n: number): string {
  if (n === 0) return '0%';
  if (Number.isInteger(n)) return `${n}%`;
  return `${n.toFixed(1).replace(/\.0$/, '')}%`;
}

const CPU_HEIGHT = 160;

const ENCODE_COLOR = '#3b82f6';
const DECODE_COLOR = '#f59e0b';
const TOTAL_COLOR = '#6b7280';


export function CpuChart({
  cpuData,
  eventBus,
  pinLabel,
}: {
  cpuData: Array<{ timestamp: Date; total: number; encode: number; decode: number }>;
  eventBus?: EventTarget;
  /** If provided, shows a pin button for cross-chart comparison. */
  pinLabel?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tz = useTimezoneTick();
  const pinned = useCompareStore((s) => (pinLabel ? s.isPinned(pinLabel) : false));
  const togglePin = useCompareStore((s) => s.togglePin);
  const handlePin = pinLabel
    ? () => togglePin({ type: 'cpu-chart', label: pinLabel, cpuChartProps: { cpuData } })
    : undefined;

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container || cpuData.length < 2) return;
    const width = container.clientWidth;
    if (width <= 0) return;
    container.innerHTML = '';

    const MARGIN = { top: 6, right: 8, bottom: 24, left: 40 };

    const rawMax = d3.max(cpuData, (d) => d.total) ?? 50;
    const yMax = Math.max(20, Math.ceil(rawMax * 1.15 / 20) * 20);
    const yScaleTmp = d3.scaleLinear().domain([0, yMax]).range([CPU_HEIGHT - MARGIN.bottom, MARGIN.top]).nice();
    const longestLabel = yScaleTmp.ticks(5).reduce((longest, t) => {
      const label = smartAxisLabel(t);
      return label.length > longest.length ? label : longest;
    }, '');
    MARGIN.left = Math.max(36, longestLabel.length * 7 + 10);

    const xScale = d3TimeScale(tz)
      .domain(d3.extent(cpuData, (d) => d.timestamp) as [Date, Date])
      .range([MARGIN.left, width - MARGIN.right]);
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([CPU_HEIGHT - MARGIN.bottom, MARGIN.top])
      .nice();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', CPU_HEIGHT)
      .attr('viewBox', `0 0 ${width} ${CPU_HEIGHT}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    const defs = svg.append('defs');
    const encGradId = `enc_grad_${Math.random().toString(36).slice(2, 8)}`;
    const decGradId = `dec_grad_${Math.random().toString(36).slice(2, 8)}`;
    const encGrad = defs.append('linearGradient').attr('id', encGradId).attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
    encGrad.append('stop').attr('offset', '0%').attr('stop-color', ENCODE_COLOR).attr('stop-opacity', 0.5);
    encGrad.append('stop').attr('offset', '100%').attr('stop-color', ENCODE_COLOR).attr('stop-opacity', 0.05);
    const decGrad = defs.append('linearGradient').attr('id', decGradId).attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
    decGrad.append('stop').attr('offset', '0%').attr('stop-color', DECODE_COLOR).attr('stop-opacity', 0.5);
    decGrad.append('stop').attr('offset', '100%').attr('stop-color', DECODE_COLOR).attr('stop-opacity', 0.05);

    const baseline = CPU_HEIGHT - MARGIN.bottom;

    // Encode area: baseline → encode (blue, bottom stack)
    svg.append('path')
      .datum(cpuData)
      .attr('fill', `url(#${encGradId})`)
      .attr('d', d3.area<(typeof cpuData)[0]>()
        .x((d) => xScale(d.timestamp))
        .y0(baseline)
        .y1((d) => yScale(d.encode))
        .defined((d) => d.encode != null));

    // Decode area: encode → total (orange, stacked on top)
    svg.append('path')
      .datum(cpuData)
      .attr('fill', `url(#${decGradId})`)
      .attr('d', d3.area<(typeof cpuData)[0]>()
        .x((d) => xScale(d.timestamp))
        .y0((d) => yScale(d.encode))
        .y1((d) => yScale(d.total))
        .defined((d) => d.total != null));

    // Encode line
    svg.append('path')
      .datum(cpuData)
      .attr('fill', 'none')
      .attr('stroke', ENCODE_COLOR)
      .attr('stroke-width', 1.5)
      .attr('d', d3.line<(typeof cpuData)[0]>()
        .x((d) => xScale(d.timestamp))
        .y((d) => yScale(d.encode))
        .defined((d) => d.encode != null));

    // Total line (dashed, top edge)
    svg.append('path')
      .datum(cpuData)
      .attr('fill', 'none')
      .attr('stroke', TOTAL_COLOR)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2')
      .attr('d', d3.line<(typeof cpuData)[0]>()
        .x((d) => xScale(d.timestamp))
        .y((d) => yScale(d.total))
        .defined((d) => d.total != null));

    // 100% core boundary reference lines
    for (let pct = 100; pct < yScale.domain()[1]; pct += 100) {
      svg.append('line')
        .attr('x1', MARGIN.left).attr('x2', width - MARGIN.right)
        .attr('y1', yScale(pct)).attr('y2', yScale(pct))
        .attr('stroke', 'var(--danger)').attr('stroke-dasharray', '4,3').attr('opacity', 0.35);
      svg.append('text')
        .attr('x', width - MARGIN.right + 3).attr('y', yScale(pct) + 3)
        .style('font-size', '8px').style('fill', 'var(--text-muted)')
        .text(`${pct}%`);
    }

    const numTicks = Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 100));
    svg
      .append('g')
      .attr('transform', `translate(0, ${baseline})`)
      .call(d3.axisBottom(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '9px')
      .style('fill', 'var(--text-muted)');

    svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => smartAxisLabel(d as number)))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', 'var(--grid-line)').attr('x2', width - MARGIN.left - MARGIN.right))
      .selectAll('text')
      .style('font-size', '9px')
      .style('fill', 'var(--text-muted)');

    const crosshairLine = svg.append('line')
      .attr('y1', MARGIN.top).attr('y2', baseline)
      .attr('stroke', '#9ca3af').attr('stroke-width', 1).attr('stroke-dasharray', '3,3')
      .style('display', 'none').attr('pointer-events', 'none');
    const encDot = svg.append('circle')
      .attr('r', 3.5).attr('fill', ENCODE_COLOR).attr('stroke', '#fff').attr('stroke-width', 1)
      .style('display', 'none').attr('pointer-events', 'none');
    const decDot = svg.append('circle')
      .attr('r', 3.5).attr('fill', DECODE_COLOR).attr('stroke', '#fff').attr('stroke-width', 1)
      .style('display', 'none').attr('pointer-events', 'none');

    const tooltipDiv = d3.select(container).append('div')
      .style('position', 'fixed').style('pointer-events', 'none')
      .style('background', 'var(--card-bg)').style('border', '1px solid var(--border-color)')
      .style('border-radius', '6px').style('padding', '4px 8px').style('font-size', '11px')
      .style('line-height', '1.5').style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
      .style('opacity', '0').style('z-index', '100').style('white-space', 'nowrap');

    const bisect = d3.bisector<(typeof cpuData)[0], Date>((d) => d.timestamp).left;

    const showHover = (time: number) => {
      const x = xScale(new Date(time));
      if (Number.isNaN(x) || x < MARGIN.left || x > width - MARGIN.right) { hideHover(); return; }
      crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
      const idx = bisect(cpuData, new Date(time), 1);
      const d0 = cpuData[idx - 1];
      const d1 = cpuData[idx];
      const d = d1 && time - d0.timestamp.getTime() > d1.timestamp.getTime() - time ? d1 : d0;
      if (d) {
        const px = xScale(d.timestamp);
        encDot.attr('cx', px).attr('cy', yScale(d.encode)).style('display', null);
        decDot.attr('cx', px).attr('cy', yScale(d.total)).style('display', null);
        const timeStr = d3TimeFormat('%H:%M:%S', tz)(d.timestamp);
        const rect = container.getBoundingClientRect();
        tooltipDiv
          .html(`<strong>Total: ${d.total.toFixed(1)}%</strong><br/>Encode: ${d.encode.toFixed(1)}% · Decode: ${d.decode.toFixed(1)}%<br/><span style="color:var(--text-muted)">${timeStr}</span>`)
          .style('opacity', '1').style('left', `${rect.left + px + 12}px`).style('top', `${rect.top + yScale(d.total) - 10}px`);
      }
    };
    const hideHover = () => {
      crosshairLine.style('display', 'none');
      encDot.style('display', 'none');
      decDot.style('display', 'none');
      tooltipDiv.style('opacity', '0');
    };

    svg.append('rect')
      .attr('x', MARGIN.left).attr('y', MARGIN.top)
      .attr('width', Math.max(0, width - MARGIN.left - MARGIN.right))
      .attr('height', CPU_HEIGHT - MARGIN.top - MARGIN.bottom)
      .attr('fill', 'transparent').style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, svg.node());
        const time = xScale.invert(mx).getTime();
        showHover(time);
        eventBus?.dispatchEvent(new CustomEvent('hoverTime', { detail: time }));
      })
      .on('mouseleave', () => {
        hideHover();
        eventBus?.dispatchEvent(new Event('mouseout'));
      });

    if (eventBus) {
      const onHoverTime = (e: Event) => showHover((e as CustomEvent<number>).detail);
      const onMouseOut = () => hideHover();
      eventBus.addEventListener('hoverTime', onHoverTime);
      eventBus.addEventListener('mouseout', onMouseOut);
      return () => {
        eventBus.removeEventListener('hoverTime', onHoverTime);
        eventBus.removeEventListener('mouseout', onMouseOut);
      };
    }
  }, [cpuData, eventBus, tz]);

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

  return (
    <div className={styles.cpuContainer} ref={containerRef}>
      <div className={styles.cpuTitleRow}>
        <span className={styles.cpuTitle}>Video Encode + Decode CPU Timeline</span>
        <span className={styles.cpuInfoIcon} title="CPU time spent encoding and decoding video. High values (>80%) indicate the device is struggling — expect quality drops, frame skips, or throttling. Encode is what you send, decode is what you receive.">ⓘ</span>
        <span className={styles.cpuLegend}>
          <span className={styles.cpuLegendItem}><span className={styles.cpuLegendSwatch} style={{ backgroundColor: ENCODE_COLOR }} />Encode</span>
          <span className={styles.cpuLegendItem}><span className={styles.cpuLegendSwatch} style={{ backgroundColor: DECODE_COLOR }} />Decode</span>
          <span className={styles.cpuLegendItem}><span className={styles.cpuLegendLine} />Total</span>
        </span>
        {handlePin && (
          <button
            className={`${styles.cpuPinBtn} ${pinned ? styles.cpuPinBtnActive : ''}`}
            onClick={handlePin}
            title={pinned ? 'Remove from comparison' : 'Add to comparison'}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <path d="M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 010 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 01.16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 01-.707 0l-2.829-2.828-3.182 3.182a.5.5 0 01-.707-.708l3.182-3.182L2.398 8.04a.5.5 0 010-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 011.013.16l3.134-3.133a3 3 0 01-.04-.461c0-.43.109-1.022.589-1.503a.5.5 0 01.353-.146z" />
            </svg>
          </button>
        )}
        <ScreenshotButton targetRef={containerRef} className={styles.cpuScreenshotBtn} />
      </div>
      <div ref={chartRef} style={{ width: '100%', height: CPU_HEIGHT, position: 'relative' }} />
    </div>
  );
}

/**
 * The deep dive on a session: per-transport send/receive quality timelines,
 * the video CPU timeline, and the audio glitch metrics.
 *
 * The headline figures — latency, issues, transmission, CPU — moved into the
 * tabs beneath the client quality score, where they are seen without scrolling.
 * What is left here is what you go looking for once those say something is
 * wrong, which is why it all sits behind an expander.
 */
