'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatDuration } from '../../utils/formatting.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import type { RouterEntityGroup } from '../../utils/routerEntityTimeline.ts';
import styles from './RouterEntityTimeline.module.css';

const LANE_H = 13;
const LANE_GAP = 4;
const LABEL_W = 96;
const MARGIN = { top: 8, right: 12, bottom: 24, left: LABEL_W + 8 };
/** Beyond this, the group scrolls rather than growing the page. */
const MAX_LANES_BEFORE_SCROLL = 24;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Props {
  group: RouterEntityGroup;
  start: number;
  end: number;
}

/**
 * One router group — its producers, or its consumers — as a lane each.
 *
 * Same reading rules as the transport timeline, for the same reasons: episodes
 * butt against each other so a state change is a boundary rather than a mark
 * drawn over the data, and hovering lights up only the episode under the
 * cursor. Nothing is dimmed to achieve that; the outline does the work.
 */
export function RouterEntityTimeline({ group, start, end }: Props) {
  const tz = useTimezoneTick();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const height = MARGIN.top + group.lanes.length * (LANE_H + LANE_GAP) + MARGIN.bottom;

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
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block');

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    const showTip = (event: MouseEvent, html: string) => {
      tooltipDiv
        .style('opacity', '1')
        .html(html)
        .style('left', `${event.clientX + 12}px`)
        .style('top', `${event.clientY - 10}px`);
    };
    const hideTip = () => tooltipDiv.style('opacity', '0');

    let y = MARGIN.top;

    for (const lane of group.lanes) {
      svg
        .append('text')
        .attr('x', MARGIN.left - 8)
        .attr('y', y + LANE_H / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .attr('fill', 'var(--text-muted)')
        .text(lane.label)
        .append('title')
        .text([lane.id, lane.detail, ...lane.meta].filter(Boolean).join('\n'));

      // The empty track: a lane that starts late should read as "not yet
      // created", not as background.
      svg
        .append('rect')
        .attr('x', MARGIN.left)
        .attr('y', y)
        .attr('width', Math.max(0, width - MARGIN.right - MARGIN.left))
        .attr('height', LANE_H)
        .attr('rx', 3)
        .attr('fill', 'var(--bg-tertiary)')
        .attr('stroke', 'var(--border-light)')
        .attr('stroke-width', 0.5);

      for (const episode of lane.episodes) {
        const x1 = Math.max(MARGIN.left, xScale(new Date(episode.start)));
        const x2 = Math.min(width - MARGIN.right, xScale(new Date(episode.end)));
        if (!Number.isFinite(x1) || !Number.isFinite(x2) || x2 <= x1) continue;

        const html =
          `<strong style="color:${episode.color}">${escapeHtml(episode.state)}</strong>` +
          ` <span style="color:var(--text-muted)">· ${escapeHtml(lane.detail ?? group.title)}</span>` +
          `<br/><code>${escapeHtml(lane.id)}</code>` +
          `<br/>${d3TimeFormat('%H:%M:%S', tz)(new Date(episode.start))}` +
          ` – ${d3TimeFormat('%H:%M:%S', tz)(new Date(episode.end))}` +
          ` <span style="color:var(--text-muted)">(${escapeHtml(
            formatDuration(episode.end - episode.start),
          )})</span>` +
          (episode.initial
            ? '<br/><span style="color:var(--text-muted)">created in this state — no event before it</span>'
            : '') +
          (lane.meta.length
            ? `<br/><span style="color:var(--text-muted)">${lane.meta.map(escapeHtml).join('<br/>')}</span>`
            : '') +
          (lane.closedAt == null
            ? '<br/><span style="color:var(--text-muted)">still open when the router closed</span>'
            : '');

        svg
          .append('rect')
          .attr('x', x1)
          .attr('y', y)
          .attr('width', Math.max(2, x2 - x1))
          .attr('height', LANE_H)
          .attr('rx', 2)
          .attr('fill', episode.color)
          .attr('opacity', 0.88)
          .style('cursor', 'pointer')
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this)
              .attr('opacity', '1')
              .attr('stroke', 'var(--text)')
              .attr('stroke-width', 1);
            showTip(event, html);
          })
          .on('mousemove', (event: MouseEvent) => showTip(event, html))
          .on('mouseleave', function () {
            d3.select(this).attr('opacity', '0.88').attr('stroke', 'none');
            hideTip();
          });
      }

      y += LANE_H + LANE_GAP;
    }

    const numTicks = Math.max(3, Math.floor((width - MARGIN.left) / 120));
    svg
      .append('g')
      .attr('transform', `translate(0, ${height - MARGIN.bottom + 2})`)
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
  }, [group, start, end, height, tz]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => ro.disconnect();
  }, [render]);

  const states = new Map<string, string>();
  for (const lane of group.lanes) {
    for (const episode of lane.episodes) states.set(episode.state, episode.color);
  }

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={styles.header}>
        <span className={styles.title}>
          {group.title}
          <span className={styles.count}>{group.lanes.length}</span>
        </span>
        <div className={styles.legend}>
          {[...states].map(([state, color]) => (
            <span key={state} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: color }} />
              {state}
            </span>
          ))}
        </div>
        <ScreenshotButton targetRef={containerRef} className={styles.screenshotBtn} />
      </div>
      <div
        className={styles.chart}
        ref={chartRef}
        style={
          group.lanes.length > MAX_LANES_BEFORE_SCROLL
            ? { maxHeight: `${MARGIN.top + MAX_LANES_BEFORE_SCROLL * (LANE_H + LANE_GAP) + MARGIN.bottom}px`, overflowY: 'auto' }
            : undefined
        }
      />
    </div>
  );
}
