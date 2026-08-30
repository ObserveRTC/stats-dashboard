'use client';
import * as d3 from 'd3';

const TOOLTIP_CLASS = 'chart-tooltip';

export function getTooltip(
  container: Element
): d3.Selection<HTMLDivElement, unknown, null, undefined> {
  let tooltip = d3.select(container).select<HTMLDivElement>(`.${TOOLTIP_CLASS}`);
  if (tooltip.empty()) {
    tooltip = d3
      .select(container)
      .append('div')
      .attr('class', TOOLTIP_CLASS)
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
  }
  return tooltip;
}
