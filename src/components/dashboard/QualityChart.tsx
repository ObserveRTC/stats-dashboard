'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { QualityChartData, QualitySeries } from '../../utils/dashboardModel.ts';
import { qualityColor } from '../../utils/dashboardModel.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatHMS } from '../../utils/formatting.ts';
import cardStyles from './CallDashboard.module.css';
import styles from './QualityChart.module.css';
import { InfoIcon } from '../help/InfoIcon.tsx';

const MARGIN = { top: 10, right: 16, bottom: 26, left: 34 };
const HEIGHT = 200;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

/** The score bands the colours come from, drawn as background stripes. */
const BANDS = [
  { from: 4, to: 5, color: 'var(--quality-good)' },
  { from: 2.5, to: 4, color: 'var(--quality-fair)' },
  { from: 0, to: 2.5, color: 'var(--quality-poor)' },
];

/**
 * Every client's quality score on one time axis.
 *
 * Three things this had to fix. It was laid out against a fixed 640x150 box
 * with `width="100%"`, so `preserveAspectRatio` letterboxed it in the middle of
 * a full-width card — it now measures its container and redraws on resize.
 * It plotted by sample index, which stretched every client across the whole
 * width no matter when they were in the call, so a dip on one line sat under a
 * dip on another that happened twenty minutes apart — the axis is time now.
 * And it had no interaction at all: hovering reads every visible line at that
 * moment, and the legend entries are buttons that hide and show their line, so
 * a chart with eight people on it can be reduced to the two being compared.
 */
export function QualityChart({
  chart,
  startLabel,
  endLabel,
}: {
  chart: QualityChartData;
  startLabel: string;
  endLabel: string;
}) {
  const tz = useTimezoneTick();
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  /** Client ids the viewer has switched off. */
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  /** The legend entry under the cursor, which brings its line forward. */
  const [focused, setFocused] = useState<string | null>(null);

  const toggle = useCallback((clientId: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }, []);

  const showOnly = useCallback(
    (clientId: string) =>
      setHidden(new Set(chart.series.map((s) => s.clientId).filter((id) => id !== clientId))),
    [chart.series],
  );

  const visible = useMemo(
    () => chart.series.filter((s) => !hidden.has(s.clientId)),
    [chart.series, hidden],
  );

  const anyApproximate = chart.series.some((s) => s.approximateTiming);

  const render = useCallback(() => {
    const container = chartRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !tooltip) return;

    const width = container.clientWidth;
    if (width <= 0 || chart.empty) return;
    container.querySelectorAll('svg').forEach((el) => el.remove());

    const x = d3TimeScale(tz)
      .domain([new Date(chart.xStart), new Date(chart.xEnd)])
      .range([MARGIN.left, width - MARGIN.right]);
    const y = d3.scaleLinear().domain([0, 5]).range([MARGIN.top + PLOT_H, MARGIN.top]);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', HEIGHT)
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)
      .style('display', 'block');

    // Faint quality bands, so a line's height reads as good/fair/poor without
    // anyone having to map 3.2 onto a scale in their head.
    for (const band of BANDS) {
      svg
        .append('rect')
        .attr('x', MARGIN.left)
        .attr('y', y(band.to))
        .attr('width', Math.max(0, width - MARGIN.left - MARGIN.right))
        .attr('height', Math.max(0, y(band.from) - y(band.to)))
        .attr('fill', band.color)
        .attr('opacity', 0.07);
    }

    for (const tick of [0, 2.5, 5]) {
      svg
        .append('line')
        .attr('x1', MARGIN.left)
        .attr('x2', width - MARGIN.right)
        .attr('y1', y(tick))
        .attr('y2', y(tick))
        .attr('stroke', 'var(--color-divider)')
        .attr('stroke-dasharray', tick === 2.5 ? '3,3' : null);
      svg
        .append('text')
        .attr('x', MARGIN.left - 6)
        .attr('y', y(tick) + 3)
        .attr('text-anchor', 'end')
        .attr('font-size', 9)
        .attr('fill', 'var(--color-neutral-500)')
        .text(tick);
    }

    svg
      .append('g')
      .attr('transform', `translate(0,${MARGIN.top + PLOT_H})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(Math.max(2, Math.floor(width / 110)))
          .tickFormat((d) => d3TimeFormat('%H:%M', tz)(d as Date))
          .tickSizeOuter(0),
      )
      .call((g) => g.selectAll('text').attr('font-size', 9).attr('fill', 'var(--color-neutral-500)'))
      .call((g) => g.selectAll('line,path').attr('stroke', 'var(--color-divider)'));

    const line = d3
      .line<{ t: number; v: number }>()
      .x((d) => x(new Date(d.t)))
      .y((d) => y(Math.max(0, Math.min(5, d.v))))
      .curve(d3.curveMonotoneX);

    // Dimming the rest rather than hiding them: the focused line has to stay
    // readable *against* the others, which is the whole point of comparing.
    const dimmed = (s: QualitySeries) => focused != null && s.clientId !== focused;

    for (const series of visible) {
      svg
        .append('path')
        .datum(series.points)
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', focused === series.clientId ? 2.5 : 1.75)
        .attr('opacity', dimmed(series) ? 0.18 : 1)
        .attr('stroke-dasharray', series.approximateTiming ? '5,3' : null)
        .attr('d', line);
    }

    if (visible.length === 0) return;

    /* Hover readout: one vertical guide and one tooltip listing every visible
       client at that moment, rather than a hit target per point. The question a
       viewer has here is "who else was struggling when this one dipped", and
       that is only answerable if the readout is shared. */
    const guide = svg
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', MARGIN.top + PLOT_H)
      .attr('stroke', 'var(--text-muted)')
      .attr('stroke-width', 1)
      .attr('opacity', 0);

    const markers = svg.append('g');

    const bisect = d3.bisector<{ t: number; v: number }, number>((d) => d.t).center;

    svg
      .append('rect')
      .attr('x', MARGIN.left)
      .attr('y', MARGIN.top)
      .attr('width', Math.max(0, width - MARGIN.left - MARGIN.right))
      .attr('height', PLOT_H)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, svg.node());
        const at = (x.invert(mx) as Date).getTime();

        const readings = visible
          .map((series) => {
            if (series.points.length === 0) return null;
            const point = series.points[bisect(series.points, at)];
            return point ? { series, point } : null;
          })
          .filter((r): r is { series: QualitySeries; point: { t: number; v: number } } => r !== null)
          // Worst first: the reason anyone is hovering is to find who was bad.
          .sort((a, b) => a.point.v - b.point.v);

        if (readings.length === 0) return;

        guide.attr('x1', mx).attr('x2', mx).attr('opacity', 0.5);

        markers
          .selectAll('circle')
          .data(readings)
          .join('circle')
          .attr('cx', (d) => x(new Date(d.point.t)))
          .attr('cy', (d) => y(Math.max(0, Math.min(5, d.point.v))))
          .attr('r', (d) => (focused === d.series.clientId ? 4.5 : 3.5))
          .attr('fill', (d) => d.series.color)
          .attr('stroke', 'var(--color-surface)')
          .attr('stroke-width', 1)
          .attr('opacity', (d) => (dimmed(d.series) ? 0.25 : 1));

        const rows = readings
          .map(
            (r) =>
              `<div style="display:flex;align-items:center;gap:6px">` +
              `<span style="width:8px;height:8px;border-radius:2px;background:${r.series.color};flex:none"></span>` +
              `<span style="flex:1">${escapeHtml(r.series.label)}</span>` +
              `<strong style="color:${qualityColor(r.point.v)}">${r.point.v.toFixed(1)}</strong>` +
              `</div>`,
          )
          .join('');

        tooltip.innerHTML =
          `<div style="color:var(--text-muted);margin-bottom:3px">${formatHMS(at, tz)}</div>${rows}`;
        tooltip.style.opacity = '1';

        // Flip to the left of the cursor near the right edge so the readout
        // never runs off the card.
        const tipW = tooltip.offsetWidth;
        const left = mx + 14 + tipW > width ? mx - 14 - tipW : mx + 14;
        tooltip.style.left = `${Math.max(0, left)}px`;
        tooltip.style.top = `${MARGIN.top}px`;
      })
      .on('mouseleave', () => {
        guide.attr('opacity', 0);
        markers.selectAll('circle').remove();
        tooltip.style.opacity = '0';
      });
  }, [chart, visible, focused, tz]);

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

  const allHidden = chart.series.length > 0 && visible.length === 0;

  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className={styles.head}>
        <div className="card-title">
          Quality per client <InfoIcon topic="call/quality-chart" />
        </div>
        {!chart.empty && (
          <span className={styles.hint}>
            {startLabel} – {endLabel} · hover to read every line
          </span>
        )}
      </div>

      {chart.empty ? (
        <p className={cardStyles.emptyNote}>
          No per-client quality series yet. Load a client in the table below to chart theirs.
        </p>
      ) : (
        <>
          <div className={styles.legend}>
            {chart.series.map((series) => {
              const off = hidden.has(series.clientId);
              return (
                <button
                  key={series.clientId}
                  type="button"
                  className={`${styles.legendItem} ${off ? styles.legendItemOff : ''}`}
                  aria-pressed={!off}
                  onClick={() => toggle(series.clientId)}
                  onDoubleClick={() => showOnly(series.clientId)}
                  onMouseEnter={() => setFocused(series.clientId)}
                  onMouseLeave={() => setFocused(null)}
                  title={
                    (off ? 'Show' : 'Hide') +
                    ` ${series.label} — double-click to show only this one` +
                    (series.approximateTiming
                      ? '. Timing is approximate: the summary carries this series without timestamps, so it is spread across the time this client was in the call.'
                      : '')
                  }
                >
                  <span className={styles.legendSwatch} style={{ background: series.color }} />
                  {series.label}
                  {series.approximateTiming && <span className={styles.legendApprox}>≈</span>}
                </button>
              );
            })}
            {hidden.size > 0 && (
              <button
                type="button"
                className={styles.legendAction}
                onClick={() => setHidden(new Set())}
              >
                show all
              </button>
            )}
          </div>

          <div className={styles.chart} ref={chartRef}>
            <div className={styles.tooltip} ref={tooltipRef} />
          </div>

          {allHidden && <p className={styles.footNote}>Every line is hidden.</p>}
          {anyApproximate && !allHidden && (
            <p className={styles.footNote}>
              Dashed lines (≈) come from the call summary, which carries scores without
              timestamps — they are spread across the time that client was in the call, so their
              shape is real but their position on the axis is not. Loading a client replaces the
              line with its measured one.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
}
