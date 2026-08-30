import * as d3 from 'd3';
import type { IssueLaneItem } from '../../utils/issueTimelinePlacement.ts';

const MIN_BAR_W = 4;
const TRI_W = 3;

type SvgSel = d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>;
type TipSel = d3.Selection<HTMLDivElement, unknown, d3.BaseType, unknown>;

export interface PaintIssueLaneOpts {
  svg: SvgSel;
  tooltipDiv: TipSel;
  items: IssueLaneItem[];
  xScale: (date: Date) => number;
  y: number;
  height: number;
  chartLeft: number;
  chartRight: number;
  /** Left-side row label, e.g. "Issues". */
  label?: string;
}

export function paintIssueLane({
  svg,
  tooltipDiv,
  items,
  xScale,
  y,
  height,
  chartLeft,
  chartRight,
  label,
}: PaintIssueLaneOpts): void {
  const width = Math.max(0, chartRight - chartLeft);
  if (width <= 0) return;

  if (label) {
    svg
      .append('text')
      .attr('x', chartLeft - 6)
      .attr('y', y + height / 2)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'end')
      .text(label)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text-muted)');
  }

  svg
    .append('rect')
    .attr('x', chartLeft)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 3)
    .attr('fill', 'var(--bg-tertiary)')
    .attr('stroke', 'var(--border-light)')
    .attr('stroke-width', 0.5);

  if (items.length === 0) return;

  const clipId = `issue-lane-${Math.random().toString(36).slice(2, 8)}`;
  svg
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', chartLeft)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 3);

  const group = svg.append('g').attr('clip-path', `url(#${clipId})`);
  const markers = svg.append('g');

  for (const item of items) {
    const x1 = xScale(new Date(item.start));
    const x2 = xScale(new Date(item.end));
    const vx1 = Math.max(chartLeft, Math.min(x1, chartRight - MIN_BAR_W));
    const vx2 = Math.min(chartRight, Math.max(x2, vx1 + MIN_BAR_W));
    const w = Math.max(MIN_BAR_W, vx2 - vx1);

    const bar = group
      .append('rect')
      .attr('x', vx1)
      .attr('y', y)
      .attr('width', w)
      .attr('height', height)
      .attr('fill', item.color)
      .attr('opacity', 0.88)
      .attr('stroke', item.stillOpen ? 'var(--warning)' : 'none')
      .attr('stroke-width', item.stillOpen ? 1.25 : 0)
      .attr('stroke-dasharray', item.stillOpen ? '3,2' : null)
      .style('cursor', 'pointer');

    markers
      .append('path')
      .attr('d', `M${vx1 + Math.min(TRI_W, w / 2)},${y - 1} l${TRI_W},5 l-${TRI_W * 2},0 Z`)
      .attr('fill', item.color)
      .attr('opacity', 1)
      .attr('pointer-events', 'none');

    bar
      .on('mouseenter', function (event: MouseEvent) {
        d3.select(this).attr('opacity', '1');
        tooltipDiv
          .style('opacity', '1')
          .html(item.tooltipHtml)
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mousemove', function (event: MouseEvent) {
        tooltipDiv
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', '0.88');
        tooltipDiv.style('opacity', '0');
      });
  }
}
