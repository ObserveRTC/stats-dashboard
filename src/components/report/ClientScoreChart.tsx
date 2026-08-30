'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale } from '../../utils/formatting.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import { buildSampleScoreReasons } from '../../utils/sampleScoreReasons.ts';
import styles from './ClientScoreChart.module.css';

const HEIGHT = 120;
const MARGIN = { top: 8, right: 12, bottom: 24, left: 32 };

/** Reasons are client-supplied free text, so they are escaped before injection. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreColor(v: number): string {
  if (v >= 4) return '#22c55e'; // green
  if (v >= 2) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}

interface Props {
  processedStats: ProcessWebRTCStatsResult;
  /** Timestamp of the sample the reasons browser is showing, marked on the chart. */
  selectedTimestamp?: number | null;
  /** Clicking a point asks the browser below to jump to that sample. */
  onSelectSample?: (timestamp: number) => void;
}

/**
 * The client's own quality score over the session, 1–5.
 *
 * This is `ClientSample.score` — what observer-js computed for the client as a
 * whole, not an average of anything the dashboard derived. Hovering a point
 * lists the `scoreReasons` recorded for that sample, which is the part that
 * says *why* it moved.
 *
 * Rendered bare, with no section wrapper: it is the headline of the client
 * report, so the caller places it.
 */
export function ClientScoreChart({
  processedStats,
  selectedTimestamp,
  onSelectSample,
}: Props) {
  const tz = useTimezoneTick();
  const chartRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

  const sessionScores = processedStats.scores?.session ?? [];

  /**
   * Reasons by sample, rebuilt from the components that raised them.
   *
   * client-monitor 4.7.0 stopped shipping the aggregate on the client entry, so
   * `ScoreSample.reasons` on the session line is empty by design. Reading it
   * would show a client that never has a reason for anything; the components of
   * the same sample are where the answer now lives.
   */
  const reasonsAt = useMemo(() => {
    const map = new Map<number, ReturnType<typeof buildSampleScoreReasons>[number]>();
    for (const entry of buildSampleScoreReasons(processedStats)) map.set(entry.timestamp, entry);
    return map;
  }, [processedStats]);

  const data = useMemo(
    () =>
      sessionScores
        .filter((s) => s.score != null && s.score > 0)
        .map((s) => {
          const at = s.timestamp instanceof Date ? s.timestamp.getTime() : s.timestamp;
          return {
            timestamp: new Date(at),
            value: s.score,
            entry: reasonsAt.get(at),
          };
        }),
    [sessionScores, reasonsAt],
  );

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container || data.length < 2) return;
    const width = container.clientWidth;
    if (width <= 0) return;
    container.innerHTML = '';

    const xScale = d3TimeScale(tz)
      .domain(d3.extent(data, (d) => d.timestamp) as [Date, Date])
      .range([MARGIN.left, width - MARGIN.right]);

    const yScale = d3.scaleLinear()
      .domain([0, 5])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', HEIGHT)
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    // Grid lines at 2 and 4
    for (const v of [2, 4]) {
      svg.append('line')
        .attr('x1', MARGIN.left).attr('x2', width - MARGIN.right)
        .attr('y1', yScale(v)).attr('y2', yScale(v))
        .attr('stroke', 'var(--border-light)').attr('stroke-dasharray', '3,3');
    }

    // Colored line segments
    for (let i = 1; i < data.length; i++) {
      const d0 = data[i - 1];
      const d1 = data[i];
      const midVal = (d0.value + d1.value) / 2;
      svg.append('line')
        .attr('x1', xScale(d0.timestamp)).attr('y1', yScale(d0.value))
        .attr('x2', xScale(d1.timestamp)).attr('y2', yScale(d1.value))
        .attr('stroke', scoreColor(midVal))
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');
    }

    // Dots
    svg.selectAll('circle')
      .data(data)
      .enter().append('circle')
      .attr('cx', (d) => xScale(d.timestamp))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 3)
      .attr('fill', (d) => scoreColor(d.value))
      .attr('stroke', 'var(--card-bg)')
      .attr('stroke-width', 1);

    const numTicks = Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 100));
    svg.append('g')
      .attr('transform', `translate(0, ${HEIGHT - MARGIN.bottom})`)
      .call(d3.axisBottom(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '9px').style('fill', 'var(--text-muted)');

    svg.append('g')
      .attr('transform', `translate(${MARGIN.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => String(d)))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', 'var(--grid-line)').attr('x2', width - MARGIN.left - MARGIN.right))
      .selectAll('text')
      .style('font-size', '9px').style('fill', 'var(--text-muted)');

    // Hover: the score alone says the call got worse; `scoreReasons` says why,
    // so the nearest sample's explanation is what the tooltip leads with.
    const marker = svg.append('circle')
      .attr('r', 5)
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .style('display', 'none')
      .style('pointer-events', 'none');

    const nearest = (time: number) => {
      let best = data[0];
      let bestDelta = Infinity;
      for (const d of data) {
        const delta = Math.abs(d.timestamp.getTime() - time);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = d;
        }
      }
      return best;
    };

    svg.append('rect')
      .attr('x', MARGIN.left)
      .attr('y', MARGIN.top)
      .attr('width', Math.max(0, width - MARGIN.left - MARGIN.right))
      .attr('height', Math.max(0, HEIGHT - MARGIN.top - MARGIN.bottom))
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, svg.node());
        const point = nearest(xScale.invert(mx).getTime());
        if (!point) return;
        marker
          .attr('cx', xScale(point.timestamp))
          .attr('cy', yScale(point.value))
          .attr('stroke', scoreColor(point.value))
          .style('display', null);
        const time = d3TimeFormat('%H:%M:%S', tz)(point.timestamp);
        const reasons = point.entry?.reasons ?? [];

        // Grouped by the component that raised them, because that is the thing
        // 4.7.0's change is about: the client score is a weighted aggregate,
        // and every reason belongs to something underneath it.
        const byEntity = new Map<string, typeof reasons>();
        for (const reason of reasons) {
          const list = byEntity.get(reason.entityLabel) ?? [];
          list.push(reason);
          byEntity.set(reason.entityLabel, list);
        }

        const body = [...byEntity.entries()]
          .map(
            ([label, list]) =>
              `<div class="${styles.reasonGroup}">` +
              `<span class="${styles.reasonEntity}">${escapeHtml(label)}</span>` +
              `<ul class="${styles.reasons}">` +
              list
                .map(
                  (r) =>
                    `<li>${escapeHtml(r.meta.label)}` +
                    (typeof r.points === 'number' && r.points > 0
                      ? ` <span class="${styles.reasonPoints}">\u2212${r.points.toFixed(
                          r.points % 1 === 0 ? 0 : 1,
                        )}</span>`
                      : '') +
                    '</li>',
                )
                .join('') +
              '</ul></div>',
          )
          .join('');

        setTooltip({
          x: event.clientX + 12,
          y: event.clientY - 10,
          html:
            `<strong style="color:${scoreColor(point.value)}">${point.value.toFixed(2)} / 5</strong>` +
            `<span style="color:var(--text-muted)"> · ${time}</span>` +
            (body ||
              `<div class="${styles.reasonEmpty}">No component raised a reason in this sample.</div>`) +
            (onSelectSample && reasons.length > 0
              ? `<div class="${styles.reasonHint}">Click to open this sample below</div>`
              : ''),
        });
      })
      .on('mouseleave', () => {
        marker.style('display', 'none');
        setTooltip(null);
      })
      .on('click', (event: MouseEvent) => {
        if (!onSelectSample) return;
        const [mx] = d3.pointer(event, svg.node());
        const point = nearest(xScale.invert(mx).getTime());
        if (point) onSelectSample(point.timestamp.getTime());
      });

    // Where the browser below is currently parked, so the two stay tied
    // together in both directions.
    if (selectedTimestamp != null) {
      const x = xScale(new Date(selectedTimestamp));
      if (Number.isFinite(x) && x >= MARGIN.left && x <= width - MARGIN.right) {
        svg
          .append('line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', MARGIN.top)
          .attr('y2', HEIGHT - MARGIN.bottom)
          .attr('stroke', 'var(--accent)')
          .attr('stroke-width', 1.5)
          .attr('pointer-events', 'none');
      }
    }
  }, [data, tz, selectedTimestamp, onSelectSample]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => ro.disconnect();
  }, [render]);

  // A tooltip anchored to viewport coordinates would drift on scroll.
  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [tooltip]);

  if (data.length < 2) return null;

  const latest = data[data.length - 1];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.latest} style={{ color: scoreColor(latest.value) }}>
          {latest.value.toFixed(1)}
          <span className={styles.latestUnit}>/5</span>
        </span>
        <span className={styles.title}>latest</span>
        <span className={styles.legend}>
          <span className={styles.dot} style={{ background: '#22c55e' }} />≥4 good
          <span className={styles.dot} style={{ background: '#f59e0b', marginLeft: 10 }} />2–4 fair
          <span className={styles.dot} style={{ background: '#ef4444', marginLeft: 10 }} />&lt;2 poor
        </span>
      </div>
      <p className={styles.hint}>
        Hover a point to read the reasons the client recorded for that score.
      </p>
      <div ref={chartRef} style={{ width: '100%', height: HEIGHT, position: 'relative' }} />
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
