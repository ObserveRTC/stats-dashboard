import * as d3 from 'd3';
import { formatTimeOnly } from '../../utils/formatting.ts';
import type { Tz } from '../../stores/tzStore.ts';
import type { VisibilitySegment } from '../../utils/tabVisibility.ts';

type SvgSel = d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>;
type TipSel = d3.Selection<HTMLDivElement, unknown, d3.BaseType, unknown>;

/**
 * Default lane colours: pastel light blue while the tab was in the foreground,
 * grey while it was not. Muted on purpose — this lane is context for reading
 * the ones above it, not a signal competing with them.
 */
export const TAB_ACTIVE_COLOR = '#bae6fd';
export const TAB_INACTIVE_COLOR = '#9ca3af';

export interface PaintVisibilityLaneOpts {
  svg: SvgSel;
  tooltipDiv: TipSel;
  segments: VisibilitySegment[];
  xScale: (date: Date) => number;
  y: number;
  height: number;
  chartLeft: number;
  chartRight: number;
  tz: Tz;
  /** Left-side row label. */
  label?: string;
  activeColor?: string;
  inactiveColor?: string;
}

/**
 * Draw when the client's browser tab was in the foreground, as its own lane.
 *
 * A lane rather than background shading, because the state is a fact about the
 * client worth reading directly — and because shading behind a chart competes
 * with the data it is meant to qualify. What it explains: a browser throttles a
 * backgrounded tab, so timers slow, capture frame rate collapses, the encoder
 * is starved and stats collection misses its schedule. A cliff in the lane
 * above a grey stretch usually needs no further explanation; one above an
 * active stretch does.
 *
 * Nothing is drawn when the client never reported visibility: an all-active
 * lane would be a claim nothing supports.
 */
export function paintVisibilityLane({
  svg,
  tooltipDiv,
  segments,
  xScale,
  y,
  height,
  chartLeft,
  chartRight,
  tz,
  label = 'Tab',
  activeColor = TAB_ACTIVE_COLOR,
  inactiveColor = TAB_INACTIVE_COLOR,
}: PaintVisibilityLaneOpts): void {
  const width = Math.max(0, chartRight - chartLeft);
  if (width <= 0 || segments.length === 0) return;

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

  const clipId = `vis-lane-clip-${Math.round(y)}-${Math.round(chartLeft)}`;
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

  for (const segment of segments) {
    const x1 = xScale(new Date(segment.start));
    const x2 = xScale(new Date(segment.end));
    if (!Number.isFinite(x1) || !Number.isFinite(x2)) continue;
    if (x2 <= chartLeft || x1 >= chartRight) continue;

    const left = Math.max(chartLeft, x1);
    const barWidth = Math.max(1, Math.min(chartRight, x2) - left);

    group
      .append('rect')
      .attr('x', left)
      .attr('y', y)
      .attr('width', barWidth)
      .attr('height', height)
      .attr('fill', segment.visible ? activeColor : inactiveColor)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent) {
        d3.select(this).attr('opacity', '1');
        const seconds = ((segment.end - segment.start) / 1000).toFixed(1);
        const state = segment.visible ? 'in the foreground' : 'in the background';
        // An open-ended stretch is the capture stopping, not the tab returning.
        const tail = segment.openEnded ? '<br/>still hidden when the capture stopped' : '';
        tooltipDiv
          .style('opacity', '1')
          .html(
            `<strong>Tab ${state}</strong><br/>` +
              `${formatTimeOnly(segment.start, tz)} – ${formatTimeOnly(segment.end, tz)}<br/>` +
              `${seconds}s${tail}`,
          )
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
  }
}
