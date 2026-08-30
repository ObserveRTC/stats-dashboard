'use client';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type { CallSession } from '../../api/types.ts';
import { formatHMS, d3TimeFormat, d3TimeScale } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './CallTimeline.module.css';

const ROW_HEIGHT = 28;
const BAR_HEIGHT = 18;

interface CallTimelineProps {
  session: CallSession;
  onClientClick?: (clientId: string) => void;
}

export function CallTimeline({ session, onClientClick }: CallTimelineProps) {
  const tz = useTimezoneTick();
  const chartRef = useRef<HTMLDivElement>(null);
  const { clientSessions, callStart, callEnd } = session;

  const sortedClients = Array.from(clientSessions.entries())
    .filter(([, s]) => s.joined != null || s.left != null)
    .sort((a, b) => (a[1].joined ?? 0) - (b[1].joined ?? 0));

  const clientLabelMap = useMemo(() => session._clientLabelMap || new Map<string, string>(), [session._clientLabelMap]);

  const render = useCallback(() => {
    if (!chartRef.current || sortedClients.length === 0) return;

    const container = chartRef.current;
    const chartWidth = container.clientWidth;
    if (chartWidth <= 0) return;

    container.innerHTML = '';

    const numRows = sortedClients.length;
    const MARGIN = { right: 8, bottom: 24 };
    const chartHeight = numRows * ROW_HEIGHT + MARGIN.bottom;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    const xScale = d3TimeScale(tz)
      .domain([new Date(callStart), new Date(callEnd)])
      .range([0, chartWidth - MARGIN.right]);

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(4, Math.floor(chartWidth / 130)))
      .tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date));

    const axisG = svg
      .append('g')
      .attr('transform', `translate(0,${numRows * ROW_HEIGHT})`)
      .call(xAxis);
    axisG.selectAll('text').style('font-size', '10px').style('fill', 'var(--text-primary)');
    axisG.selectAll('line, path').style('stroke', 'var(--border-color)');

    const tooltip = d3
      .select(container)
      .append('div')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('background', 'var(--card-bg)')
      .style('border', '1px solid var(--border-color)')
      .style('border-radius', '6px')
      .style('padding', '6px 10px')
      .style('font-size', '11px')
      .style('line-height', '1.5')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
      .style('opacity', '0')
      .style('z-index', '100')
      .style('white-space', 'nowrap');

    sortedClients.forEach(([cid, clientSession], rowIdx) => {
      const y = rowIdx * ROW_HEIGHT;
      const barColor = '#3b82f6';

      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', Math.max(0, chartWidth - MARGIN.right))
        .attr('height', ROW_HEIGHT)
        .attr('fill', rowIdx % 2 === 0 ? 'var(--hover-bg)' : 'transparent')
        .attr('opacity', 0.3);

      const joined = clientSession.joined ?? callStart;
      const left = clientSession.left ?? callEnd;
      const px1 = xScale(new Date(joined));
      const px2 = xScale(new Date(left));
      const barW = Math.max(3, px2 - px1);
      const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;

      svg
        .append('rect')
        .attr('x', px1)
        .attr('y', barY)
        .attr('width', barW)
        .attr('height', BAR_HEIGHT)
        .attr('rx', 3)
        .attr('fill', barColor)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).attr('opacity', '1').attr('stroke', '#fff').attr('stroke-width', '1');
          tooltip
            .style('opacity', '1')
            .html(
              `<strong>${clientLabelMap.get(cid) || cid}</strong> <span style="opacity:0.6;font-size:10px">${cid}</span><br/>` +
                `${formatHMS(joined, tz)} – ${formatHMS(left, tz)}`,
            );
          tooltip.style('left', event.clientX + 12 + 'px').style('top', event.clientY - 10 + 'px');
        })
        .on('mousemove', function (event: MouseEvent) {
          tooltip.style('left', event.clientX + 12 + 'px').style('top', event.clientY - 10 + 'px');
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', '0.85').attr('stroke', 'none');
          tooltip.style('opacity', '0');
        })
        .on('click', () => {
          onClientClick?.(cid);
        });
    });
  }, [sortedClients, callStart, callEnd, clientLabelMap, onClientClick, tz]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  if (sortedClients.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Call Timeline</h3>
        <p className={styles.subtitle}>
          {formatHMS(callStart, tz)} – {formatHMS(callEnd, tz)} · {sortedClients.length} client(s)
        </p>
      </div>
      <div className={styles.chartArea}>
        <div className={styles.flex}>
          <div className={styles.labels}>
            {sortedClients.map(([cid]) => (
              <div
                key={cid}
                className={styles.labelRow}
                style={{ height: ROW_HEIGHT }}
                title={cid}
                onClick={() => onClientClick?.(cid)}
              >
                {clientLabelMap.get(cid) || cid.slice(0, 8)}
              </div>
            ))}
          </div>
          <div className={styles.chartCol} ref={chartRef} />
        </div>
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <IdBadge value={`${sortedClients.length} client(s)`} />
        </span>
      </div>
    </div>
  );
}
