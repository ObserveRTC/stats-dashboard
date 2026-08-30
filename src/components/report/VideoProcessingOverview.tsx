'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale } from '../../utils/formatting.ts';
import type { VideoProcessingInterval, VideoProcessingTimelineResult } from '../../utils/videoProcessingTimeline.ts';
import styles from './MediaOverview.module.css';

const ROW_H = 14;
const MARGIN = { top: 0, right: 16, bottom: 4, left: 120 };
const VP_TRUE_COLOR = '#8b5cf6';
const VP_FALSE_COLOR = 'var(--border-light)';

interface VideoProcessingOverviewProps {
  timeline: VideoProcessingTimelineResult;
  eventBus?: EventTarget;
}

export function VideoProcessingOverview({
  timeline,
  eventBus: _eventBus,
}: VideoProcessingOverviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tz = useTimezoneTick();
  const lastWidthRef = useRef(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

  const rows = useMemo(
    () =>
      [...timeline.intervalsByKey.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([participantKey, intervals]) => ({ participantKey, intervals })),
    [timeline],
  );

  const draw = useCallback(() => {
    const host = hostRef.current;
    if (!host || rows.length === 0) return;

    const width = Math.floor(host.getBoundingClientRect().width);
    if (width < 50) return;
    if (width === lastWidthRef.current && host.childElementCount > 0) return;
    lastWidthRef.current = width;

    const chartLeft = MARGIN.left;
    const chartRight = width - MARGIN.right;
    const totalH = MARGIN.top + rows.length * ROW_H + MARGIN.bottom;

    host.replaceChildren();

    const svg = d3
      .select(host)
      .append('svg')
      .attr('width', width)
      .attr('height', totalH)
      .attr('viewBox', `0 0 ${width} ${totalH}`)
      .style('display', 'block');

    const xScale = d3TimeScale(tz)
      .domain([new Date(timeline.sessionStartMs), new Date(timeline.sessionEndMs)])
      .range([chartLeft, chartRight]);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.1)';

    for (const tick of xScale.ticks(Math.min(6, Math.max(3, Math.floor(width / 100))))) {
      const x = xScale(tick);
      svg
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', totalH)
        .attr('stroke', gridColor)
        .attr('stroke-width', 0.5);
    }

    let yOff = MARGIN.top;

    const showTip = (ev: MouseEvent, interval: VideoProcessingInterval) => {
      const dur = interval.endMs - interval.startMs;
      const fmt = d3TimeFormat('%H:%M:%S', tz as never);
      setTooltip({
        x: ev.clientX + 12,
        y: ev.clientY - 10,
        html:
          `<strong>${interval.participantKey}</strong><br/>` +
          `videoProcessing: <strong>${interval.state}</strong><br/>` +
          `${fmt(new Date(interval.startMs))} – ${fmt(new Date(interval.endMs))}<br/>` +
          `${(dur / 1000).toFixed(1)}s · ${interval.sampleCount} reading${interval.sampleCount !== 1 ? 's' : ''}` +
          (interval.hasInferredSpan
            ? '<br/><span style="color:var(--text-muted)">state held between sparse readings</span>'
            : ''),
      });
    };

    for (const { participantKey, intervals } of rows) {
      const barY = yOff + 2;
      const barH = ROW_H - 4;

      svg
        .append('text')
        .attr('x', MARGIN.left - 6)
        .attr('y', yOff + ROW_H / 2 + 3)
        .attr('text-anchor', 'end')
        .attr('font-size', '8px')
        .attr('fill', 'var(--text-muted)')
        .text(participantKey);

      const rowG = svg.append('g');

      for (const interval of intervals) {
        const x1 = Math.max(chartLeft, xScale(new Date(interval.startMs)));
        const x2 = Math.min(chartRight, xScale(new Date(interval.endMs)));
        const w = Math.max(0, x2 - x1);
        if (w < 1) continue;

        const g = rowG.append('g');
        g.append('rect')
          .attr('x', x1)
          .attr('y', barY)
          .attr('width', w)
          .attr('height', barH)
          .attr('fill', interval.state ? VP_TRUE_COLOR : VP_FALSE_COLOR)
          .attr('opacity', interval.state ? 0.88 : 0.55)
          .attr('rx', 1);
        g.append('rect')
          .attr('x', x1)
          .attr('y', barY)
          .attr('width', w)
          .attr('height', barH)
          .attr('fill', 'transparent')
          .on('mouseenter', (e) => showTip(e as MouseEvent, interval))
          .on('mousemove', (e) => showTip(e as MouseEvent, interval))
          .on('mouseleave', () => setTooltip(null));
      }

      yOff += ROW_H;
    }
  }, [timeline, rows, tz]);

  useEffect(() => {
    lastWidthRef.current = 0;
    const id = requestAnimationFrame(() => draw());
    return () => cancelAnimationFrame(id);
  }, [draw]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = Math.floor(host.getBoundingClientRect().width);
        if (w >= 50 && w !== lastWidthRef.current) draw();
      });
    });
    ro.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [draw]);

  return (
    <div className={styles.vpSection}>
      <div className={styles.vpHeader}>Video processing</div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: VP_TRUE_COLOR, opacity: 0.88 }} />
          Processing on
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: VP_FALSE_COLOR, opacity: 0.55 }} />
          Processing off
        </span>
        <span className={styles.legendItem} style={{ color: 'var(--text-muted)' }}>
          (state held between extension-stats samples)
        </span>
      </div>
      <div ref={hostRef} className={styles.vpChart} />
      {tooltip && (
        <div
          className={styles.hoverTooltip}
          style={{ left: tooltip.x, top: tooltip.y, opacity: 1 }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
