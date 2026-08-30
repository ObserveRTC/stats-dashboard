'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TimelineStream as Producer } from '../../utils/producerTimeline.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import {
  d3TimeFormat,
  d3TimeScale,
  formatDuration,
  formatHMS,
  mediaKindLabelPrefix,
  producerOverviewHoverHtml,
  shortId,
} from '../../utils/formatting.ts';
import {
  PRODUCER_OVERVIEW_COLORS,
  buildProducerInstantBoxes,
  buildProducerLifecycleSegments,
  type ProducerInstantBox,
  type ProducerLifecycleSegment,
} from '../../utils/producerTimeline.ts';
import {
  STREAM_RECORDING_ID_COLOR,
  type StreamRecordingIdEvent,
} from '../../schema/RecordingClientEventTypes.ts';
import styles from './StreamsOverviewTimeline.module.css';

const ROW_H = 11;
const SHARED_AXIS_H = 12;
const MARGIN = { top: 0, right: 16, bottom: 0, left: 148 };
const BOX_H = 10;
const BOX_W = 6;
const BOX_GAP_PX = 1;
const LIFECYCLE_MIN_PX = 5;
const MIN_VIS_PX = 2;
const HIT_PAD_V = 3;

interface TimelineRowModel {
  producer: Producer;
  label: string;
  rowEnd: number;
  segments: ProducerLifecycleSegment[];
  instants: ProducerInstantBox[];
}

interface TooltipHandlers {
  show: (ev: MouseEvent, html: string) => void;
  move: (ev: MouseEvent) => void;
  hide: () => void;
}

interface SpreadItem {
  idealX: number;
  vw: number;
  index: number;
}

interface PositionedSpan {
  seg: ProducerLifecycleSegment;
  vx1: number;
  vw: number;
}

interface RowPointMarker {
  vx1: number;
  vw: number;
  color: string;
  opacity: number;
  tipHtml: string;
}

function sessionDomain(
  globalStart: number,
  globalEnd: number,
  rows: TimelineRowModel[],
  streamRecordingIdEvents: StreamRecordingIdEvent[] = [],
): [Date, Date] {
  let start = globalStart;
  let end = globalEnd;

  for (const row of rows) {
    const p = row.producer;
    if (p.createdAt != null && Number.isFinite(p.createdAt)) {
      if (!Number.isFinite(start) || p.createdAt < start) start = p.createdAt;
    }
    const rowEnd = p.closedAt ?? row.rowEnd;
    if (Number.isFinite(rowEnd) && rowEnd > end) end = rowEnd;
    for (const box of row.instants) {
      if (box.timestamp < start) start = box.timestamp;
      if (box.timestamp > end) end = box.timestamp;
    }
  }

  for (const ev of streamRecordingIdEvents) {
    if (ev.timestamp < start) start = ev.timestamp;
    if (ev.timestamp > end) end = ev.timestamp;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    const now = Date.now();
    return [new Date(now - 60_000), new Date(now)];
  }

  const span = end - start;
  const pad = Math.max(500, span * 0.02);
  return [new Date(start - pad), new Date(end + pad)];
}

function eventTipHtml(label: string, color: string, timestamp: number, tz: string, extra?: string): string {
  const time = formatHMS(timestamp, tz as never);
  return (
    `<strong style="color:${color}">${label}</strong><br/>` +
    `${time}` +
    (extra ? `<br/><span style="color:var(--text-muted)">${extra}</span>` : '')
  );
}

function segmentTipHtml(seg: ProducerLifecycleSegment, tz: string): string {
  const range =
    seg.end > seg.start
      ? `${formatHMS(seg.start, tz as never)} – ${formatHMS(seg.end, tz as never)}<br/>${formatDuration(seg.end - seg.start)}`
      : formatHMS(seg.start, tz as never);
  return `<strong style="color:${seg.color}">${seg.state}</strong><br/>${range}`;
}

/** Nudge overlapping boxes right so they sit side-by-side (same row). */
function spreadHorizontally(
  items: SpreadItem[],
  chartLeft: number,
  chartRight: number,
): Map<number, number> {
  const out = new Map<number, number>();
  if (items.length === 0) return out;

  const sorted = [...items].sort((a, b) => a.idealX - b.idealX || a.index - b.index);
  let cursor = chartLeft - BOX_GAP_PX;

  for (const item of sorted) {
    const idealClamped = Math.max(chartLeft, Math.min(item.idealX, chartRight - item.vw));
    let vx1 = Math.max(idealClamped, cursor + BOX_GAP_PX);
    if (vx1 + item.vw > chartRight) vx1 = Math.max(chartLeft, chartRight - item.vw);
    out.set(item.index, vx1);
    cursor = vx1 + item.vw;
  }

  return out;
}

function layoutProducerRow(
  instants: ProducerInstantBox[],
  segments: ProducerLifecycleSegment[],
  xScale: (d: Date) => number,
  chartLeft: number,
  chartRight: number,
  tz: string,
): { wideSpans: PositionedSpan[]; pointMarkers: RowPointMarker[] } {
  const wideSpans: PositionedSpan[] = [];
  const spreadInput: SpreadItem[] = [];
  const spreadMeta: Array<{ color: string; opacity: number; tipHtml: string }> = [];
  let spreadIndex = 0;

  for (const box of instants) {
    spreadInput.push({
      idealX: xScale(new Date(box.timestamp)),
      vw: BOX_W,
      index: spreadIndex,
    });
    spreadMeta.push({
      color: box.color,
      opacity: box.label === 'degraded' ? 0.7 : 0.98,
      tipHtml: eventTipHtml(box.label, box.color, box.timestamp, tz),
    });
    spreadIndex += 1;
  }

  for (const seg of segments) {
    const rawX1 = xScale(new Date(seg.start));
    const rawX2 = xScale(new Date(seg.end));
    const rawW = Math.max(0, rawX2 - rawX1);
    const isNarrow = rawW < MIN_VIS_PX;
    const idealX = Math.max(chartLeft, Math.min(rawX1, chartRight));
    const maxW = Math.max(0, chartRight - idealX);
    const timeCap = Math.max(0, xScale(new Date(seg.end)) - idealX);
    const vw = Math.max(
      0,
      Math.min(isNarrow ? LIFECYCLE_MIN_PX : rawW, maxW, isNarrow ? LIFECYCLE_MIN_PX : timeCap),
    );

    if (isNarrow) {
      spreadInput.push({ idealX, vw: BOX_W, index: spreadIndex });
      spreadMeta.push({ color: seg.color, opacity: seg.opacity, tipHtml: segmentTipHtml(seg, tz) });
      spreadIndex += 1;
    } else if (vw >= 1) {
      wideSpans.push({ seg, vx1: idealX, vw });
    }
  }

  const spreadVx = spreadHorizontally(spreadInput, chartLeft, chartRight);
  const pointMarkers: RowPointMarker[] = spreadInput.map((item, i) => ({
    vx1: spreadVx.get(item.index) ?? item.idealX,
    vw: item.vw,
    color: spreadMeta[i].color,
    opacity: spreadMeta[i].opacity,
    tipHtml: spreadMeta[i].tipHtml,
  }));

  const adjustedWide = wideSpans.map((span) => {
    const segEndX = xScale(new Date(span.seg.end));
    let vx1 = span.vx1;
    for (const pm of pointMarkers) {
      const pmRight = pm.vx1 + pm.vw;
      if (pm.vx1 <= vx1 + 1 && pmRight > vx1 && pmRight <= segEndX + 1) {
        vx1 = Math.max(vx1, pmRight + BOX_GAP_PX);
      }
    }
    const vw = Math.max(0, Math.min(span.vw, segEndX - vx1));
    return vw >= 1 ? { ...span, vx1, vw } : null;
  }).filter((s): s is PositionedSpan => s != null);

  return { wideSpans: adjustedWide, pointMarkers };
}

function appendBar(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  vx1: number,
  y: number,
  vw: number,
  h: number,
  color: string,
  opacity: number,
  tipHtml: string,
  handlers: TooltipHandlers,
) {
  if (vw < 1) return;
  const g = parent.append('g').attr('class', styles.barHit);
  g.append('rect')
    .attr('x', vx1)
    .attr('y', y)
    .attr('width', vw)
    .attr('height', h)
    .attr('fill', color)
    .attr('opacity', opacity)
    .attr('rx', 1)
    .attr('pointer-events', 'none');
  g.append('rect')
    .attr('x', vx1 - 2)
    .attr('y', y - HIT_PAD_V)
    .attr('width', vw + 4)
    .attr('height', h + HIT_PAD_V * 2)
    .attr('fill', 'transparent')
    .style('cursor', 'default')
    .on('mouseenter', (e) => handlers.show(e as MouseEvent, tipHtml))
    .on('mousemove', (e) => handlers.move(e as MouseEvent))
    .on('mouseleave', () => handlers.hide());
}

/**
 * Expand the section that owns this stream and scroll its row into view.
 * `sectionId` / `hashPrefix` are the ids the owning CollapsibleSection uses,
 * so the same timeline drives both the producers and the consumers list.
 */
function scrollToStream(streamId: string, sectionId: string, hashPrefix: string) {
  const open = (id: string) => {
    const el = document.getElementById(id);
    const btn = el?.querySelector('button[aria-expanded="false"]') as HTMLButtonElement | null;
    btn?.click();
  };
  open(sectionId);
  requestAnimationFrame(() => {
    setTimeout(() => {
      open(`${hashPrefix}${streamId}`);
      document
        .getElementById(`${hashPrefix}${streamId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  });
}

function streamRecordingIdTipHtml(ev: StreamRecordingIdEvent, tz: string): string {
  const time = formatHMS(ev.timestamp, tz as never);
  const idLine = ev.newId ? `<br/><code class="id-badge">${shortId(ev.newId)}</code>` : '';
  const sourceLine = ev.source ? `<br/><span style="color:var(--text-muted)">${ev.source}</span>` : '';
  return (
    `<strong style="color:${STREAM_RECORDING_ID_COLOR}">stream recording id changed</strong>` +
    `<br/>${time}${idLine}${sourceLine}`
  );
}

function paintTimeline(
  host: HTMLElement,
  rows: TimelineRowModel[],
  globalStart: number,
  globalEnd: number,
  tz: string,
  width: number,
  handlers: TooltipHandlers,
  onOpenStream: ((streamId: string) => void) | undefined,
  sectionId: string,
  hashPrefix: string,
  streamRecordingIdEvents: StreamRecordingIdEvent[] = [],
) {
  const chartLeft = MARGIN.left;
  const chartRight = width - MARGIN.right;
  if (chartRight <= chartLeft || rows.length === 0) return;

  const [domainStart, domainEnd] = sessionDomain(globalStart, globalEnd, rows, streamRecordingIdEvents);
  const xScale = d3TimeScale(tz as never).domain([domainStart, domainEnd]).range([chartLeft, chartRight]);

  const sessionRowCount = streamRecordingIdEvents.length > 0 ? 1 : 0;
  const bodyTop = MARGIN.top + SHARED_AXIS_H;
  const totalH = bodyTop + sessionRowCount * ROW_H + rows.length * ROW_H + MARGIN.bottom;

  const svg = d3
    .select(host)
    .append('svg')
    .attr('width', width)
    .attr('height', totalH)
    .attr('viewBox', `0 0 ${width} ${totalH}`)
    .style('display', 'block');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const dimColor = isDark ? '#64748b' : '#9ca3af';
  const bgColor = isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.05)';
  const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.1)';
  const timeFmt = d3TimeFormat('%H:%M:%S', tz as never);

  const axisG = svg.append('g').attr('transform', `translate(0, ${MARGIN.top + SHARED_AXIS_H})`);
  axisG
    .call(d3.axisTop(xScale).ticks(Math.min(8, Math.max(3, Math.floor(width / 120)))).tickFormat((d) => timeFmt(d as Date)))
    .call((g) => g.select('.domain').remove())
    .selectAll('text')
    .style('font-size', '8px')
    .attr('fill', dimColor);

  const ticks = xScale.ticks(Math.min(8, Math.max(3, Math.floor(width / 120))));
  for (const tick of ticks) {
    const x = xScale(tick);
    svg
      .append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', bodyTop)
      .attr('y2', totalH - MARGIN.bottom)
      .attr('stroke', gridColor)
      .attr('stroke-width', 1);
  }

  let yOff = bodyTop;

  if (streamRecordingIdEvents.length > 0) {
    const barY = yOff + Math.floor((ROW_H - BOX_H) / 2);
    const rowG = svg.append('g').attr('data-row', 'stream-recording-id');

    rowG
      .append('text')
      .attr('x', MARGIN.left - 6)
      .attr('y', yOff + ROW_H / 2)
      .attr('dominant-baseline', 'central')
      .attr('text-anchor', 'end')
      .attr('font-size', '7px')
      .attr('fill', STREAM_RECORDING_ID_COLOR)
      .text('stream rec id');

    const instants: ProducerInstantBox[] = streamRecordingIdEvents.map((ev) => ({
      timestamp: ev.timestamp,
      label: 'stream rec id',
      color: STREAM_RECORDING_ID_COLOR,
    }));
    const { pointMarkers } = layoutProducerRow(
      instants,
      [],
      (d) => xScale(d),
      chartLeft,
      chartRight,
      tz,
    );

    const barsG = rowG.append('g');
    for (let i = 0; i < pointMarkers.length; i++) {
      const { vx1, vw, color, opacity } = pointMarkers[i];
      const ev = streamRecordingIdEvents[i];
      appendBar(
        barsG,
        vx1,
        barY,
        vw,
        BOX_H,
        color,
        opacity,
        ev ? streamRecordingIdTipHtml(ev, tz) : eventTipHtml('stream rec id', color, 0, tz),
        handlers,
      );
    }

    yOff += ROW_H;
  }

  for (const row of rows) {
    const p = row.producer;
    const lifeStart = p.createdAt!;
    const lifeEnd = p.closedAt ?? row.rowEnd;
    const barY = yOff + Math.floor((ROW_H - BOX_H) / 2);

    const rowG = svg.append('g').attr('data-producer-id', p.id);

    const lifeX1 = Math.max(chartLeft, xScale(new Date(lifeStart)));
    const lifeX2 = Math.min(chartRight, xScale(new Date(lifeEnd)));
    if (lifeX2 > lifeX1) {
      rowG
        .append('rect')
        .attr('x', lifeX1)
        .attr('y', barY)
        .attr('width', lifeX2 - lifeX1)
        .attr('height', BOX_H)
        .attr('fill', bgColor)
        .attr('rx', 1);
    }

    const openProducer = () => {
      if (onOpenStream) onOpenStream(p.id);
      else scrollToStream(p.id, sectionId, hashPrefix);
    };

    const labelG = rowG.append('g').style('cursor', 'pointer').on('click', openProducer);
    labelG
      .append('rect')
      .attr('x', 0)
      .attr('y', yOff + 1)
      .attr('width', MARGIN.left - 8)
      .attr('height', ROW_H - 2)
      .attr('fill', 'transparent')
      .on('mouseenter', (e) =>
        handlers.show(e as MouseEvent, producerOverviewHoverHtml(p)))
      .on('mousemove', (e) => handlers.move(e as MouseEvent))
      .on('mouseleave', () => handlers.hide());
    labelG
      .append('text')
      .attr('x', MARGIN.left - 6)
      .attr('y', yOff + ROW_H / 2)
      .attr('dominant-baseline', 'central')
      .attr('text-anchor', 'end')
      .attr('font-size', '7px')
      .attr('fill', 'var(--text-primary)')
      .attr('text-decoration', 'underline')
      .attr('pointer-events', 'none')
      .text(row.label);

    const barsG = rowG.append('g');
    const { wideSpans, pointMarkers } = layoutProducerRow(
      row.instants,
      row.segments,
      (d) => xScale(d),
      chartLeft,
      chartRight,
      tz,
    );

    for (const { seg, vx1, vw } of wideSpans) {
      appendBar(barsG, vx1, barY, vw, BOX_H, seg.color, seg.opacity, segmentTipHtml(seg, tz), handlers);
    }

    for (const { vx1, vw, color, opacity, tipHtml } of pointMarkers) {
      appendBar(barsG, vx1, barY, vw, BOX_H, color, opacity, tipHtml, handlers);
    }

    yOff += ROW_H;
  }
}

const LEGEND_ITEMS = [
  { key: 'active', label: 'active', color: PRODUCER_OVERVIEW_COLORS.active },
  { key: 'degraded', label: 'degraded', color: PRODUCER_OVERVIEW_COLORS.degraded },
  { key: 'muted', label: 'muted', color: PRODUCER_OVERVIEW_COLORS.muted },
  { key: 'added', label: 'added', color: PRODUCER_OVERVIEW_COLORS.created },
  { key: 'closed', label: 'closed', color: PRODUCER_OVERVIEW_COLORS.closed },
] as const;

interface StreamsOverviewTimelineProps {
  /** Producers or consumers — both carry the same lifecycle vocabulary. */
  streams: Producer[];
  globalStart: number;
  globalEnd?: number;
  eventBus?: EventTarget;
  /** Heading above the chart, e.g. "All producers". */
  title?: string;
  /** id of the CollapsibleSection this timeline belongs to, for row click-through. */
  sectionId?: string;
  /** Hash prefix of the per-stream sections, e.g. "producer/". */
  hashPrefix?: string;
  onOpenStream?: (streamId: string) => void;
  /** Session-level markers when UserMediaManager assigns a fresh streamRecordingId. */
  streamRecordingIdEvents?: StreamRecordingIdEvent[];
}

/**
 * One row per stream, drawn on a shared time axis: a bar per lifecycle span
 * (active / muted / degraded) with point markers for added, closed and quality
 * changes. Every row shares the same domain, so a mute on one stream lines up
 * against what every other stream was doing at that instant.
 */
export function StreamsOverviewTimeline({
  streams: producers,
  globalStart,
  globalEnd,
  eventBus: _eventBus,
  title = 'All producers',
  sectionId = 'producers',
  hashPrefix = 'producer/',
  onOpenStream,
  streamRecordingIdEvents = [],
}: StreamsOverviewTimelineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const tz = useTimezoneTick();
  const [sessionEnd] = useState(() => globalEnd ?? Date.now());
  const lastWidthRef = useRef(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

  const effectiveEnd = globalEnd ?? sessionEnd;

  const tipHandlers = useMemo<TooltipHandlers>(
    () => ({
      show: (ev, html) => setTooltip({ x: ev.clientX + 12, y: ev.clientY - 10, html }),
      move: (ev) => setTooltip((t) => (t ? { ...t, x: ev.clientX + 12, y: ev.clientY - 10 } : null)),
      hide: () => setTooltip(null),
    }),
    [],
  );

  const rows = useMemo((): TimelineRowModel[] => {
    return [...producers]
      .filter((p) => p.createdAt != null && Number.isFinite(p.createdAt))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      .map((p) => ({
        producer: p,
        label: `${mediaKindLabelPrefix(p.kind)}${shortId(p.id)}`,
        rowEnd: p.closedAt ?? effectiveEnd,
        segments: buildProducerLifecycleSegments(p, p.closedAt ?? effectiveEnd),
        instants: buildProducerInstantBoxes(p),
      }));
  }, [producers, effectiveEnd]);

  const draw = useCallback(() => {
    const host = hostRef.current;
    if (!host || rows.length === 0) return;

    const width = Math.floor(host.getBoundingClientRect().width);
    if (width < 50) return;
    if (width === lastWidthRef.current && host.childElementCount > 0) return;

    lastWidthRef.current = width;
    host.replaceChildren();
    paintTimeline(
      host,
      rows,
      globalStart,
      effectiveEnd,
      tz,
      width,
      tipHandlers,
      onOpenStream,
      sectionId,
      hashPrefix,
      streamRecordingIdEvents,
    );
  }, [rows, globalStart, effectiveEnd, tz, tipHandlers, onOpenStream, sectionId, hashPrefix, streamRecordingIdEvents]);

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

  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [tooltip]);

  if (rows.length === 0) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.headerRow}>
        <span className={styles.title}>{title}</span>
        <span className={styles.headerSpacer} />
        <ScreenshotButton targetRef={wrapRef} className={styles.screenshotBtn} />
      </div>
      <div className={styles.legend} aria-label={`${title} legend`}>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.key} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
        {streamRecordingIdEvents.length > 0 && (
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: STREAM_RECORDING_ID_COLOR }} />
            stream rec id
          </span>
        )}
      </div>
      <div ref={hostRef} className={styles.chart} />
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y, opacity: 1 }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
