'use client';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { buildPerStreamQuality, QUALITY_COLORS } from '../../utils/qualityClassifier.ts';
import { buildSegments } from '../../utils/chartHelpers.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatTimeOnly } from '../../utils/formatting.ts';
import type { QualityState } from '../../api/types.ts';

interface ServerDataLike {
  createdAt?: number;
  closedAt?: number;
  history?: { timestamp: number; event: string }[];
  producers?: { id: string; kind: string; label?: string; createdAt: number; closedAt?: number }[];
  consumers?: { id: string; kind: string; label?: string; createdAt: number; closedAt?: number }[];
}
import styles from './QualityOverview.module.css';

interface QualityOverviewProps {
  serverData: ServerDataLike | null;
  clientStats: ClientSample[] | null;
  eventBus?: EventTarget;
}

interface Lane {
  label: string;
  samples: { timestamp: number; state: string }[];
  colorFn: (state: string) => string;
}

const CONNECTION_COLORS: Record<string, string> = {
  connected: '#10b981',
  disconnected: '#ef4444',
};

const QUALITY_LABELS: Record<string, string> = {
  good: 'Good',
  degraded: 'Degraded',
  'high-jitter': 'High Jitter',
  'packet-loss': 'Packet Loss',
  freezing: 'Freezing',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

function connectionColorFn(state: string): string {
  return CONNECTION_COLORS[state] ?? 'var(--text-muted)';
}

function qualityColorFn(state: string): string {
  return QUALITY_COLORS[state as QualityState] ?? 'var(--text-muted)';
}

function buildConnectionSamples(
  history: Array<{ timestamp: number; event: string }> | undefined,
  startTime: number,
): { timestamp: number; state: string }[] {
  const stateMap: Record<string, string> = {
    disconnect: 'disconnected',
    connect: 'connected',
    join: 'connected',
    left: 'disconnected',
    joined: 'connected',
  };
  const samples: { timestamp: number; state: string }[] = [
    { timestamp: startTime, state: 'connected' },
  ];
  const sorted = [...(history ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  for (const evt of sorted) {
    const mapped = stateMap[evt.event];
    if (mapped) samples.push({ timestamp: evt.timestamp, state: mapped });
  }
  return samples;
}

function formatDurationShort(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem.toFixed(0)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const TRACK_HEIGHT = 14;
const TRACK_SPACING = 3;
const GROUP_GAP = 6;
const LABEL_WIDTH = 90;
const MARGIN = { top: 6, right: 12, bottom: 24, left: LABEL_WIDTH + 8 };

export function QualityOverview({ serverData, clientStats, eventBus }: QualityOverviewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const tz = useTimezoneTick();

  const startTime = serverData?.createdAt
    ?? (clientStats && clientStats.length > 0 ? clientStats[0].timestamp : Date.now() - 60000);
  const endTime = serverData?.closedAt ?? Date.now();

  const { lanes, qualityStates, connectionStates } = useMemo(() => {
    const result: Lane[] = [];
    const qStates = new Set<string>();
    const cStates = new Set<string>();

    // Connection lane
    const connSamples = buildConnectionSamples(serverData?.history, startTime);
    if (connSamples.length > 0) {
      result.push({ label: 'Connection', samples: connSamples, colorFn: connectionColorFn });
      const segs = buildSegments(connSamples, startTime, endTime);
      segs.forEach((s) => cStates.add(s.state));
    }

    // Quality data
    const perStream = buildPerStreamQuality(clientStats, serverData?.producers, serverData?.consumers);

    // Aggregated send/recv
    if (perStream.aggregatedSend.length >= 2) {
      result.push({ label: 'Send Quality', samples: perStream.aggregatedSend, colorFn: qualityColorFn });
      const segs = buildSegments(perStream.aggregatedSend, startTime, endTime);
      segs.forEach((s) => qStates.add(s.state));
    }
    if (perStream.aggregatedRecv.length >= 2) {
      result.push({ label: 'Recv Quality', samples: perStream.aggregatedRecv, colorFn: qualityColorFn });
      const segs = buildSegments(perStream.aggregatedRecv, startTime, endTime);
      segs.forEach((s) => qStates.add(s.state));
    }

    // Per-producer lanes
    const producerMap = new Map((serverData?.producers ?? []).map((p) => [p.id, p]));
    for (const [pid, samples] of perStream.byProducerId) {
      if (samples.length < 2) continue;
      const info = producerMap.get(pid);
      const kind = info?.kind ?? '?';
      const shortId = pid.slice(0, 6);
      result.push({ label: `↑ ${kind} ${shortId}`, samples, colorFn: qualityColorFn });
      const segs = buildSegments(samples, startTime, endTime);
      segs.forEach((s) => qStates.add(s.state));
    }

    // Per-consumer lanes
    const consumerMap = new Map((serverData?.consumers ?? []).map((c) => [c.id, c]));
    for (const [cid, samples] of perStream.byConsumerId) {
      if (samples.length < 2) continue;
      const info = consumerMap.get(cid);
      const kind = info?.kind ?? '?';
      const shortId = cid.slice(0, 6);
      result.push({ label: `↓ ${kind} ${shortId}`, samples, colorFn: qualityColorFn });
      const segs = buildSegments(samples, startTime, endTime);
      segs.forEach((s) => qStates.add(s.state));
    }

    return { lanes: result, qualityStates: qStates, connectionStates: cStates };
  }, [serverData, clientStats, startTime, endTime]);

  const render = useCallback(() => {
    const container = chartRef.current;
    if (!container || lanes.length === 0) return;

    const chartWidth = container.clientWidth;
    if (chartWidth <= 0) return;
    const width = Math.max(400, chartWidth);

    container.innerHTML = '';

    // Calculate row positions - group gap after connection and after aggregated
    const rowYs: number[] = [];
    let y = MARGIN.top;
    for (let i = 0; i < lanes.length; i++) {
      rowYs.push(y);
      y += TRACK_HEIGHT + TRACK_SPACING;
      // Gap after connection row (index 0)
      if (i === 0) y += GROUP_GAP;
      // Gap after aggregated rows (send+recv, indices 1 and 2 if they exist)
      const label = lanes[i].label;
      const nextLabel = lanes[i + 1]?.label;
      if ((label === 'Send Quality' || label === 'Recv Quality') &&
          nextLabel && nextLabel !== 'Send Quality' && nextLabel !== 'Recv Quality') {
        y += GROUP_GAP;
      }
    }
    const totalHeight = y + MARGIN.bottom;

    let domainStart = startTime;
    let domainEnd = endTime;
    if (domainStart === domainEnd) {
      domainStart -= 2000;
      domainEnd += 2000;
    }
    domainEnd += 1000;

    const xScale = d3TimeScale(tz)
      .domain([new Date(domainStart), new Date(domainEnd)])
      .range([MARGIN.left, width - MARGIN.right]);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', `0 0 ${width} ${totalHeight}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .style('cursor', 'crosshair');

    // X axis
    const numTicks = Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 120));
    svg
      .append('g')
      .attr('transform', `translate(0, ${totalHeight - MARGIN.bottom + 2})`)
      .call(d3.axisBottom(xScale).ticks(numTicks).tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '9px')
      .style('fill', 'var(--text-muted)');

    const tooltipDiv = d3
      .select(container)
      .append('div')
      .attr('class', styles.tooltip)
      .style('opacity', '0');

    // Render each lane
    lanes.forEach((lane, laneIdx) => {
      const trackY = rowYs[laneIdx];

      // Row label
      svg
        .append('text')
        .attr('x', MARGIN.left - 6)
        .attr('y', trackY + TRACK_HEIGHT / 2)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'end')
        .text(lane.label)
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('fill', 'var(--text-muted)');

      const segments = buildSegments(lane.samples, startTime, endTime);
      if (segments.length === 0) return;

      // Clip path for rounded bar
      const clipId = `qo-clip-${laneIdx}-${Math.random().toString(36).slice(2, 8)}`;
      const firstX = xScale(new Date(segments[0].start));
      const lastX = xScale(new Date(segments[segments.length - 1].end));
      svg
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('x', firstX)
        .attr('y', trackY)
        .attr('width', Math.max(0, lastX - firstX))
        .attr('height', TRACK_HEIGHT)
        .attr('rx', 3);

      const barGroup = svg.append('g').attr('clip-path', `url(#${clipId})`);

      for (const seg of segments) {
        const x1 = xScale(new Date(seg.start));
        const x2 = xScale(new Date(seg.end));
        const w = Math.max(1, x2 - x1);
        const color = lane.colorFn(seg.state);

        barGroup
          .append('rect')
          .attr('x', x1)
          .attr('y', trackY)
          .attr('width', w)
          .attr('height', TRACK_HEIGHT)
          .attr('fill', color)
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this).attr('opacity', '1');
            const startStr = formatTimeOnly(seg.start, tz);
            const endStr = formatTimeOnly(seg.end, tz);
            const dur = formatDurationShort(seg.end - seg.start);
            const label = QUALITY_LABELS[seg.state] ?? seg.state;
            tooltipDiv
              .style('opacity', '1')
              .html(`<strong>${lane.label}</strong><br/>${label}<br/>${startStr} – ${endStr} (${dur})`)
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

      // Transition markers
      for (let i = 1; i < segments.length; i++) {
        const x = xScale(new Date(segments[i].start));
        svg
          .append('line')
          .attr('x1', x).attr('x2', x)
          .attr('y1', trackY).attr('y2', trackY + TRACK_HEIGHT)
          .attr('stroke', 'var(--timeline-bg)')
          .attr('stroke-width', 1)
          .attr('pointer-events', 'none');
      }
    });

    // Crosshair
    const crosshairLine = svg
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', totalHeight - MARGIN.bottom)
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none')
      .attr('pointer-events', 'none');

    svg
      .on('mousemove', (event: MouseEvent) => {
        const [x] = d3.pointer(event, svg.node());
        if (x >= MARGIN.left && x <= width - MARGIN.right) {
          crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
          eventBus?.dispatchEvent(new CustomEvent('hoverTime', { detail: xScale.invert(x).getTime() }));
        }
      })
      .on('mouseleave', () => {
        crosshairLine.style('display', 'none');
        eventBus?.dispatchEvent(new Event('mouseout'));
      });

    if (eventBus) {
      const onHoverTime = (e: Event) => {
        const x = xScale(new Date((e as CustomEvent<number>).detail));
        if (!Number.isNaN(x)) crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
      };
      const onMouseOut = () => crosshairLine.style('display', 'none');
      eventBus.addEventListener('hoverTime', onHoverTime);
      eventBus.addEventListener('mouseout', onMouseOut);
      return () => {
        eventBus.removeEventListener('hoverTime', onHoverTime);
        eventBus.removeEventListener('mouseout', onMouseOut);
      };
    }
  }, [lanes, startTime, endTime, eventBus, tz]);

  useEffect(() => {
    const cleanup = render();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, [render]);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  if (lanes.length === 0) return null;

  // Build legend entries from unique states
  const legendEntries: { label: string; color: string }[] = [];
  for (const state of connectionStates) {
    legendEntries.push({ label: QUALITY_LABELS[state] ?? state, color: connectionColorFn(state) });
  }
  for (const state of qualityStates) {
    legendEntries.push({ label: QUALITY_LABELS[state] ?? state, color: qualityColorFn(state) });
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <span className={styles.title}>
          Quality Overview
          <span className={styles.infoIcon} title="Unified temporal view of connection state and RTP quality across all streams. Each row shows quality over time — green is good, other colors indicate issues. Arrows: ↑ = sending (producer), ↓ = receiving (consumer).">ⓘ</span>
        </span>
        {legendEntries.length > 0 && (
          <div className={styles.legend}>
            {legendEntries.map((e) => (
              <span key={e.label} className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: e.color, opacity: 0.9 }} />
                {e.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={styles.chartArea} ref={chartRef} />
    </div>
  );
}
