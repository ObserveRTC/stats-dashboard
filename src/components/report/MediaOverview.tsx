'use client';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { buildMediaOverviewData } from '../../utils/mediaOverview.ts';
import { buildVideoProcessingTimelineFromSamples } from '../../utils/videoProcessingTimeline.ts';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsProcessor.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, mediaKindLabelPrefix } from '../../utils/formatting.ts';
import type { MediaOverviewStream } from '../../utils/mediaOverview.ts';
import type { ClientServerData as ServerData } from '../../utils/routerServerData.ts';
import { VideoProcessingOverview } from './VideoProcessingOverview.tsx';
import { CodecOverview } from './CodecOverview.tsx';
import { MediaTrackEventsOverview } from './MediaTrackEventsOverview.tsx';
import styles from './MediaOverview.module.css';

const ROW_HEIGHT = 22;
const GROUP_HEADER_HEIGHT = 22;
const GROUP_GAP = 10;
const MARGIN = { top: 20, right: 20, bottom: 20, left: 150 };

const ACTIVE_COLOR = 'var(--accent)';

interface MediaOverviewProps {
  serverData: ServerData | null;
  /** Raw client stats samples (clock-offset corrected). */
  clientStats: ClientSample[] | null;
  /** Output of processWebRTCStats — includes videoProcessingSamples. */
  processedClientStats: ProcessWebRTCStatsResult | null;
  roomId: string;
  callId: string;
  eventBus?: EventTarget;
}

function buildActiveSegments(
  stream: MediaOverviewStream,
  globalEnd: number,
): { start: number; end: number; active: boolean }[] {
  const start = stream.createdAt;
  const end = stream.closedAt ?? globalEnd;
  const pauseEvents = ['pause', 'producerPaused', 'stopped'];
  const resumeEvents = ['resume', 'producerResumed', 'started'];

  const segments: { start: number; end: number; active: boolean }[] = [];
  let segStart = start;
  let isActive = true;

  for (const h of stream.history) {
    if (h.timestamp < start || h.timestamp > end) continue;
    if (pauseEvents.includes(h.event) && isActive) {
      if (h.timestamp > segStart) segments.push({ start: segStart, end: h.timestamp, active: true });
      segStart = h.timestamp;
      isActive = false;
    } else if (resumeEvents.includes(h.event) && !isActive) {
      if (h.timestamp > segStart) segments.push({ start: segStart, end: h.timestamp, active: false });
      segStart = h.timestamp;
      isActive = true;
    }
  }
  if (segStart < end) segments.push({ start: segStart, end, active: isActive });

  if (segments.length === 0) return [{ start, end, active: true }];

  const merged: typeof segments = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const prev = merged[merged.length - 1];
    if (segments[i].active === prev.active) {
      prev.end = segments[i].end;
    } else {
      merged.push(segments[i]);
    }
  }
  return merged;
}

function scrollToSection(sectionId: string, parentSectionId: string) {
  const openCollapsible = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const btn = el.querySelector('button[aria-expanded="false"]') as HTMLButtonElement | null;
    btn?.click();
  };

  openCollapsible(parentSectionId);

  requestAnimationFrame(() => {
    setTimeout(() => {
      openCollapsible(sectionId);
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }, 50);
  });
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

export function MediaOverview({ serverData, clientStats, processedClientStats, roomId, callId, eventBus }: MediaOverviewProps) {
  const count = (serverData?.producers?.length ?? 0) + (serverData?.consumers?.length ?? 0);
  if (!serverData || count === 0) return null;

  return (
    <CollapsibleSection title="Media Overview" id="media-overview"
      help="client/media-overview" count={count} defaultOpen={false}>
      <MediaOverviewBody
        serverData={serverData}
        clientStats={clientStats}
        processedClientStats={processedClientStats}
        roomId={roomId}
        callId={callId}
        eventBus={eventBus}
      />
    </CollapsibleSection>
  );
}

function MediaOverviewBody({ serverData, clientStats, processedClientStats, roomId, callId, eventBus }: MediaOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const router = useRouter();
  const tz = useTimezoneTick();
  const overviewData = useMemo(
    () => buildMediaOverviewData(serverData, clientStats),
    [serverData, clientStats],
  );

  const renderChart = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    if (containerWidth <= 0) return;

    const data = overviewData;
    if (!data || data.groups.length === 0) return;

    const width = Math.max(300, containerWidth);

    let totalHeight = MARGIN.top + 15 + MARGIN.bottom;
    for (const group of data.groups) {
      totalHeight += GROUP_HEADER_HEIGHT + group.rows.length * ROW_HEIGHT + GROUP_GAP;
    }

    container.innerHTML = '';

    const tooltipDiv = d3.select(container)
      .append('div')
      .attr('class', styles.hoverTooltip)
      .style('opacity', '0');

    const svg = d3
      .create('svg')
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', `0 0 ${width} ${totalHeight}`)
      .style('display', 'block');

    const timeScale = d3TimeScale(tz)
      .domain([new Date(data.globalStart), new Date(data.globalEnd)])
      .range([MARGIN.left, width - MARGIN.right]);

    svg
      .append('g')
      .attr('transform', `translate(0, ${MARGIN.top})`)
      .call(
        d3
          .axisTop(timeScale)
          .ticks(Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 120)))
          .tickFormat((d) => d3TimeFormat('%H:%M:%S', tz)(d as Date)),
      )
      .selectAll('text')
      .style('font-size', '10px');

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    const defs = svg.append('defs');
    const pausePattern = defs.append('pattern')
      .attr('id', 'paused-stripes')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6)
      .attr('height', 6)
      .attr('patternTransform', 'rotate(45)');
    pausePattern.append('rect')
      .attr('width', 6).attr('height', 6)
      .attr('fill', 'var(--text-muted)').attr('opacity', 0.45);
    pausePattern.append('line')
      .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)
      .attr('stroke', isDarkMode ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)')
      .attr('stroke-width', 2);
    const textColor = isDarkMode ? '#cbd5e1' : '#374151';
    const dimTextColor = isDarkMode ? '#64748b' : '#9ca3af';
    const groupBgColor = isDarkMode ? 'rgba(51,65,85,0.15)' : 'rgba(241,245,249,0.3)';
    const gridLineColor = isDarkMode ? '#334155' : '#e5e7eb';
    const highlightStroke = isDarkMode ? '#e2e8f0' : '#1e293b';
    const bracketColor = isDarkMode ? '#94a3b8' : '#475569';

    const ticks = timeScale.ticks(
      Math.max(3, Math.floor((width - MARGIN.left - MARGIN.right) / 120)),
    );

    // Layered rendering: bg → bars → hit areas → overlay
    // This ensures hit areas are always above decorative backgrounds.
    const bgLayer = svg.append('g').attr('class', 'bg-layer').attr('pointer-events', 'none');
    const barsLayer = svg.append('g').attr('class', 'bars-layer').attr('pointer-events', 'none');
    const hitLayer = svg.append('g').attr('class', 'hit-layer');
    const hoverOverlay = svg.append('g').attr('class', 'hover-overlay').attr('pointer-events', 'none');

    for (const tick of ticks) {
      bgLayer
        .append('line')
        .attr('x1', timeScale(tick))
        .attr('x2', timeScale(tick))
        .attr('y1', MARGIN.top)
        .attr('y2', totalHeight - MARGIN.bottom)
        .attr('stroke', gridLineColor)
        .attr('stroke-width', 0.5);
    }

    const startBracket = hoverOverlay.append('g').style('display', 'none');
    startBracket.append('line')
      .attr('stroke', bracketColor).attr('stroke-width', 1).attr('stroke-dasharray', '2,2');
    startBracket.append('text')
      .attr('font-size', '9px').attr('fill', bracketColor).attr('text-anchor', 'middle');

    const endBracket = hoverOverlay.append('g').style('display', 'none');
    endBracket.append('line')
      .attr('stroke', bracketColor).attr('stroke-width', 1).attr('stroke-dasharray', '2,2');
    endBracket.append('text')
      .attr('font-size', '9px').attr('fill', bracketColor).attr('text-anchor', 'middle');

    const highlightRect = hoverOverlay.append('rect')
      .attr('fill', 'none')
      .attr('stroke', highlightStroke)
      .attr('stroke-width', 1.5)
      .attr('rx', 3)
      .style('display', 'none');

    interface BarInfo {
      barGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
      startX: number;
      endX: number;
      barY: number;
      barW: number;
      barHeight: number;
      stream: MediaOverviewStream;
      kind: string;
      label: string;
      direction: string;
    }
    const allBars: BarInfo[] = [];

    let activeBar: BarInfo | null = null;

    const showHover = (bar: BarInfo, event: MouseEvent) => {
      if (activeBar === bar) return;
      activeBar = bar;

      barsLayer.selectAll('g').attr('opacity', 0.45);
      bar.barGroup.attr('opacity', 1);

      highlightRect
        .attr('x', bar.startX - 0.5)
        .attr('y', bar.barY - 0.5)
        .attr('width', bar.barW + 1)
        .attr('height', bar.barHeight + 1)
        .style('display', null);

      const sX = bar.startX;
      startBracket.style('display', null);
      startBracket.select('line')
        .attr('x1', sX).attr('x2', sX)
        .attr('y1', MARGIN.top).attr('y2', bar.barY);
      startBracket.select('text')
        .attr('x', sX).attr('y', MARGIN.top - 4)
        .text(d3TimeFormat('%H:%M:%S', tz)(new Date(bar.stream.createdAt)));

      const eX = bar.endX;
      endBracket.style('display', null);
      endBracket.select('line')
        .attr('x1', eX).attr('x2', eX)
        .attr('y1', MARGIN.top).attr('y2', bar.barY);
      endBracket.select('text')
        .attr('x', eX).attr('y', MARGIN.top - 4)
        .text(bar.stream.closedAt
          ? d3TimeFormat('%H:%M:%S', tz)(new Date(bar.stream.closedAt))
          : 'ongoing');

      const typeLabel = bar.direction === 'send' ? 'Producer' : 'Consumer';
      const durationMs = (bar.stream.closedAt ?? data.globalEnd) - bar.stream.createdAt;
      const activeSegs = buildActiveSegments(bar.stream, data.globalEnd);
      const activeDur = activeSegs.filter(s => s.active).reduce((t, s) => t + (s.end - s.start), 0);
      const pausedDur = durationMs - activeDur;

      tooltipDiv.html(
        `<div class="${styles.ttHeader}">${mediaKindLabelPrefix(bar.kind)}${bar.label}</div>` +
        `<div class="${styles.ttType}">${typeLabel}</div>` +
        `<div class="${styles.ttRow}"><span>Duration</span><strong>${formatDurationShort(durationMs)}</strong></div>` +
        `<div class="${styles.ttRow}"><span>Active</span><strong>${formatDurationShort(activeDur)}</strong></div>` +
        (pausedDur > 0 ? `<div class="${styles.ttRow}"><span>Paused</span><strong>${formatDurationShort(pausedDur)}</strong></div>` : '') +
        `<div class="${styles.ttRow}"><span>Start</span><strong>${d3TimeFormat('%H:%M:%S', tz)(new Date(bar.stream.createdAt))}</strong></div>` +
        `<div class="${styles.ttRow}"><span>End</span><strong>${bar.stream.closedAt ? d3TimeFormat('%H:%M:%S', tz)(new Date(bar.stream.closedAt)) : 'ongoing'}</strong></div>` +
        `<div class="${styles.ttHint}">Click to jump to ${typeLabel.toLowerCase()}</div>`
      );

      tooltipDiv.style('opacity', '1');
      repositionTooltip(event);
    };

    const repositionTooltip = (event: MouseEvent) => {
      const tipNode = tooltipDiv.node() as HTMLElement;
      const tipW = tipNode.offsetWidth;
      const tipH = tipNode.offsetHeight;
      // Use viewport coordinates because the tooltip is position:fixed — it
      // needs to escape the parent CollapsibleSection's overflow:hidden.
      let left = event.clientX + 12;
      let top = event.clientY - tipH - 8;
      if (left + tipW > window.innerWidth) left = event.clientX - tipW - 12;
      if (top < 0) top = event.clientY + 16;
      if (left < 0) left = 4;
      if (top + tipH > window.innerHeight) top = window.innerHeight - tipH - 4;
      tooltipDiv.style('left', `${left}px`).style('top', `${top}px`);
    };

    const hideHover = () => {
      if (!activeBar) return;
      activeBar = null;
      barsLayer.selectAll('g').attr('opacity', 1);
      highlightRect.style('display', 'none');
      startBracket.style('display', 'none');
      endBracket.style('display', 'none');
      tooltipDiv.style('opacity', '0');
    };

    let yOffset = MARGIN.top + 15;

    for (let groupIndex = 0; groupIndex < data.groups.length; groupIndex++) {
      const group = data.groups[groupIndex]!;
      const groupRowCount = group.rows.length;
      const groupTotalHeight = GROUP_HEADER_HEIGHT + groupRowCount * ROW_HEIGHT;

      if (groupIndex > 0) {
        bgLayer
          .append('line')
          .attr('x1', 8)
          .attr('x2', width - 8)
          .attr('y1', yOffset - GROUP_GAP / 2)
          .attr('y2', yOffset - GROUP_GAP / 2)
          .attr('stroke', gridLineColor)
          .attr('stroke-width', 0.5);
      }

      bgLayer
        .append('rect')
        .attr('x', 0)
        .attr('y', yOffset)
        .attr('width', width)
        .attr('height', groupTotalHeight)
        .attr('fill', groupBgColor)
        .attr('rx', 4);

      const headerY = yOffset + GROUP_HEADER_HEIGHT / 2 + 4;
      if (group.clientId) {
        hitLayer
          .append('text')
          .attr('x', 8)
          .attr('y', headerY)
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .attr('fill', 'var(--accent)')
          .attr('cursor', 'pointer')
          .attr('text-decoration', 'underline')
          .text(group.label)
          .on('click', () => {
            router.push(
              `/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/${encodeURIComponent(group.clientId!)}`,
            );
          });
      } else {
        bgLayer
          .append('text')
          .attr('x', 8)
          .attr('y', headerY)
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .attr('fill', textColor)
          .text(group.label);
      }

      yOffset += GROUP_HEADER_HEIGHT;

      for (const row of group.rows) {
        const rowY = yOffset;
        const barY = rowY + 3;
        const barHeight = ROW_HEIGHT - 6;

        bgLayer
          .append('text')
          .attr('x', 24)
          .attr('y', rowY + ROW_HEIGHT / 2 + 4)
          .attr('fill', dimTextColor)
          .attr('font-size', '10px')
          .text(`${mediaKindLabelPrefix(row.kind)}${row.label}`);

        for (const stream of row.segments) {
          const segStart = new Date(stream.createdAt);
          const segEnd = new Date(stream.closedAt ?? data.globalEnd);
          const startX = timeScale(segStart);
          const endX = timeScale(segEnd);
          const barW = Math.max(2, endX - startX);

          const clipId = `mo-clip-${groupIndex}-${row.label}-${stream.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          svg.append('clipPath').attr('id', clipId)
            .append('rect')
            .attr('x', startX).attr('y', barY)
            .attr('width', barW).attr('height', barHeight)
            .attr('rx', 3);

          const barGroup = barsLayer.append('g').attr('clip-path', `url(#${clipId})`);

          // Subtle outline showing full stream span (so paused-heavy streams are still visible)
          barGroup
            .append('rect')
            .attr('x', startX)
            .attr('y', barY)
            .attr('width', barW)
            .attr('height', barHeight)
            .attr('fill', 'none')
            .attr('stroke', isDarkMode ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)')
            .attr('stroke-width', 1)
            .attr('rx', 3);

          const activeSegs = buildActiveSegments(stream, data.globalEnd);
          for (const seg of activeSegs) {
            const x1 = timeScale(new Date(seg.start));
            const x2 = timeScale(new Date(seg.end));
            const w = Math.max(1, x2 - x1);
            if (seg.active) {
              barGroup
                .append('rect')
                .attr('x', x1)
                .attr('y', barY)
                .attr('width', w)
                .attr('height', barHeight)
                .attr('fill', ACTIVE_COLOR)
                .attr('opacity', 0.85);
            } else {
              barGroup
                .append('rect')
                .attr('x', x1)
                .attr('y', barY)
                .attr('width', w)
                .attr('height', barHeight)
                .attr('fill', 'url(#paused-stripes)');
            }
          }

          const sectionId = row.direction === 'send' ? `producer/${stream.id}` : `consumer/${stream.id}`;
          const parentId = row.direction === 'send' ? 'producers' : 'consumers';

          hitLayer
            .append('rect')
            .attr('x', startX)
            .attr('y', barY)
            .attr('width', barW)
            .attr('height', barHeight)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer')
            .on('click', (event: MouseEvent) => {
              event.stopPropagation();
              scrollToSection(sectionId, parentId);
            })
            .on('mouseenter', function (event: MouseEvent) {
              showHover(allBars.find(b => b.stream === stream)!, event);
            })
            .on('mousemove', function (event: MouseEvent) {
              repositionTooltip(event);
            })
            .on('mouseleave', hideHover);

          allBars.push({
            barGroup: barGroup as d3.Selection<SVGGElement, unknown, null, undefined>,
            startX, endX, barY, barW, barHeight,
            stream, kind: row.kind, label: row.label, direction: row.direction,
          });
        }

        yOffset += ROW_HEIGHT;
      }

      yOffset += GROUP_GAP;
    }

    const crosshairLine = svg
      .append('line')
      .attr('y1', MARGIN.top)
      .attr('y2', totalHeight - MARGIN.bottom)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none')
      .attr('pointer-events', 'none');

    svg
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, svg.node());
        if (mx >= MARGIN.left && mx <= width - MARGIN.right) {
          crosshairLine.attr('x1', mx).attr('x2', mx).style('display', null);
          eventBus?.dispatchEvent(new CustomEvent('hoverTime', { detail: timeScale.invert(mx).getTime() }));
        }
      })
      .on('mouseleave', () => {
        crosshairLine.style('display', 'none');
        hideHover();
        eventBus?.dispatchEvent(new Event('mouseout'));
      });

    container.appendChild(svg.node()!);

    let cleanupBus: (() => void) | undefined;
    if (eventBus) {
      const onHoverTime = (e: Event) => {
        const x = timeScale(new Date((e as CustomEvent<number>).detail));
        if (!Number.isNaN(x)) crosshairLine.attr('x1', x).attr('x2', x).style('display', null);
      };
      const onMouseOut = () => crosshairLine.style('display', 'none');
      eventBus.addEventListener('hoverTime', onHoverTime);
      eventBus.addEventListener('mouseout', onMouseOut);
      cleanupBus = () => {
        eventBus.removeEventListener('hoverTime', onHoverTime);
        eventBus.removeEventListener('mouseout', onMouseOut);
      };
    }

    return cleanupBus;
  }, [overviewData, roomId, callId, router, eventBus, tz]);

  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  const attachRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerNode(node);
  }, []);

  useEffect(() => {
    if (!containerNode) return;
    cleanupRef.current?.();
    cleanupRef.current = renderChart() ?? undefined;
    return () => { cleanupRef.current?.(); cleanupRef.current = undefined; };
  }, [renderChart, containerNode]);

  useEffect(() => {
    if (!containerNode) return;
    const ro = new ResizeObserver(() => {
      cleanupRef.current?.();
      cleanupRef.current = renderChart() ?? undefined;
    });
    ro.observe(containerNode);
    return () => ro.disconnect();
  }, [renderChart, containerNode]);

  const vpTimeline = useMemo(() => {
    if (!overviewData || !processedClientStats?.videoProcessingSamples?.length) return null;
    return buildVideoProcessingTimelineFromSamples(
      processedClientStats.videoProcessingSamples,
      overviewData.globalStart,
      overviewData.globalEnd,
    );
  }, [processedClientStats, overviewData]);

  if (!overviewData || overviewData.groups.length === 0) return null;

  return (
    <>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: ACTIVE_COLOR, opacity: 0.85, borderRadius: '2px' }} />
          Active
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{
            background: `repeating-linear-gradient(45deg, var(--text-muted), var(--text-muted) 2px, transparent 2px, transparent 4px)`,
            opacity: 0.7,
          }} />
          Paused
        </span>
      </div>
      <div ref={attachRef} className={styles.chart} />
      <MediaTrackEventsOverview
        clientStats={clientStats}
        processedClientStats={processedClientStats}
        eventBus={eventBus}
      />
      <CodecOverview
        serverData={serverData}
        clientStats={clientStats}
        processedClientStats={processedClientStats}
      />
      {vpTimeline && <VideoProcessingOverview timeline={vpTimeline} eventBus={eventBus} />}
    </>
  );
}
