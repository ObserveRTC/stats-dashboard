'use client';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type { SessionModel } from '../../utils/sessionModel.ts';
import { formatHMS, d3TimeFormat, d3TimeScale } from '../../utils/formatting.ts';
import { useTimezoneTick, type Tz } from '../../stores/tzStore.ts';
import styles from './SessionTimeline.module.css';

const ROW_HEIGHT = 28;
const BAR_HEIGHT = 18;
const LABEL_WIDTH = 110;

interface SessionTimelineProps {
  model: SessionModel;
  onClientClick?: (clientId: string) => void;
}

export function SessionTimeline({ model, onClientClick }: SessionTimelineProps) {
  const tz = useTimezoneTick() as Tz;
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { sfuSummaries, clientStintSessions, sessionStart, sessionEnd, _clientLabelMap } = model;

  // Clients with at least one stint — sorted by first stint joined
  const sortedClients = useMemo(() => {
    return Array.from(clientStintSessions.entries())
      .filter(([, s]) => s.stints.length > 0)
      .sort((a, b) => {
        const aJ = a[1].stints[0]?.joined ?? 0;
        const bJ = b[1].stints[0]?.joined ?? 0;
        return aJ - bJ;
      });
  }, [clientStintSessions]);

  const render = useCallback(() => {
    const container = chartRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !tooltip || sortedClients.length === 0) return;

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
      .domain([new Date(sessionStart), new Date(sessionEnd)])
      .range([0, chartWidth - MARGIN.right]);

    // X axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(4, Math.floor(chartWidth / 130)))
      .tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date));

    svg
      .append('g')
      .attr('transform', `translate(0,${numRows * ROW_HEIGHT})`)
      .call(xAxis)
      .call((g) => {
        g.select('.domain').attr('stroke', 'var(--border-light)');
        g.selectAll('.tick line').attr('stroke', 'var(--border-light)');
        g.selectAll('.tick text')
          .attr('fill', 'var(--text-muted)')
          .attr('font-size', '10px');
      });

    sortedClients.forEach(([clientId, session], rowIdx) => {
      const y = rowIdx * ROW_HEIGHT;

      // Zebra row background
      svg.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', chartWidth - MARGIN.right).attr('height', ROW_HEIGHT)
        .attr('fill', rowIdx % 2 === 0 ? 'var(--hover-bg)' : 'transparent')
        .attr('opacity', 0.3);

      const label = _clientLabelMap.get(clientId) || clientId.slice(0, 10);

      // One bar per stint
      for (const stint of session.stints) {
        const joined = stint.joined ?? sessionStart;
        const left   = stint.left   ?? sessionEnd;
        const px1 = xScale(new Date(joined));
        const px2 = xScale(new Date(left));
        const barW = Math.max(3, px2 - px1);
        const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;

        const bar = svg.append('rect')
          .attr('x', px1).attr('y', barY)
          .attr('width', barW).attr('height', BAR_HEIGHT)
          .attr('rx', 3)
          .attr('fill', stint.color || '#6b7280')
          .attr('opacity', 0.85)
          .style('cursor', 'pointer');

        // Region label inside bar when wide enough
        if (barW > 56 && stint.region) {
          svg.append('text')
            .attr('x', px1 + barW / 2)
            .attr('y', barY + BAR_HEIGHT / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .attr('pointer-events', 'none')
            .text(barW > 100 ? stint.region : stint.region.slice(0, Math.floor(barW / 7)));
        }

        bar
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this).attr('opacity', '1').attr('stroke', '#fff').attr('stroke-width', '1.5');
            const sfuLine = stint.region
              ? `<div class="${styles.tooltipSfu}">SFU: ${stint.region}${stint.routerId ? ` · ${stint.routerId.slice(0, 10)}…` : ''}</div>`
              : '';
            tooltip.innerHTML = `
              <div class="${styles.tooltipName}">${label}<span class="${styles.tooltipId}">${clientId}</span></div>
              ${sfuLine}
              <div class="${styles.tooltipTime}">${formatHMS(joined, tz)} – ${formatHMS(left, tz)}</div>
            `;
            tooltip.style.opacity = '1';
            tooltip.style.left = event.clientX + 12 + 'px';
            tooltip.style.top  = event.clientY - 10 + 'px';
          })
          .on('mousemove', function (event: MouseEvent) {
            tooltip.style.left = event.clientX + 12 + 'px';
            tooltip.style.top  = event.clientY - 10 + 'px';
          })
          .on('mouseleave', function () {
            d3.select(this).attr('opacity', '0.85').attr('stroke', 'none');
            tooltip.style.opacity = '0';
          })
          .on('click', () => onClientClick?.(clientId));
      }
    });
  }, [sortedClients, sessionStart, sessionEnd, _clientLabelMap, onClientClick, tz]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  if (sfuSummaries.length === 0 && sortedClients.length === 0) return null;

  const numSfus = sfuSummaries.length;
  const numClients = sortedClients.length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Session Timeline</h3>
        <p className={styles.subtitle}>
          {formatHMS(sessionStart, tz)} – {formatHMS(sessionEnd, tz)}
          {numSfus > 0 && ` · ${numSfus} router${numSfus !== 1 ? 's' : ''}`}
          {numClients > 0 && ` · ${numClients} client${numClients !== 1 ? 's' : ''}`}
        </p>
      </div>

      {sortedClients.length > 0 && (
        <div className={styles.chartArea}>
          <div className={styles.flex}>
            <div className={styles.labels} style={{ width: LABEL_WIDTH }}>
              {sortedClients.map(([cid], i) => (
                <div
                  key={cid}
                  className={styles.labelRow}
                  style={{ height: ROW_HEIGHT }}
                  title={cid}
                  onClick={() => onClientClick?.(cid)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onClientClick?.(cid)}
                  aria-label={`Go to client ${_clientLabelMap.get(cid) || cid}`}
                  role="button"
                >
                  <span style={{ display: 'block', maxWidth: LABEL_WIDTH - 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {_clientLabelMap.get(cid) || cid.slice(0, 10)}
                  </span>
                  {/* Colored dots for each router this client touched */}
                  <span style={{ display: 'flex', gap: 2, marginLeft: 4, flexShrink: 0 }}>
                    {Array.from(new Set(
                      (clientStintSessions.get(cid)?.stints ?? [])
                        .filter(s => s.routerId)
                        .map(s => s.color)
                    )).map((color, ci) => (
                      <span key={ci} style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.chartCol} ref={chartRef} />
          </div>
        </div>
      )}

      {/* Legend — one entry per router */}
      {sfuSummaries.length > 0 && (
        <div className={styles.legend}>
          {sfuSummaries.map((sfu) => (
            <div key={sfu.routerId} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: sfu.color }} />
              {sfu.region && <span className={styles.legendRegion}>{sfu.region}</span>}
              <span className={styles.legendId}>{sfu.routerId.slice(0, 12)}…</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                ({sfu.producerCount}P / {sfu.consumerCount}C)
              </span>
            </div>
          ))}
        </div>
      )}

      <div ref={tooltipRef} className={styles.tooltip} />
    </div>
  );
}
