'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { d3TimeFormat, d3TimeScale, formatDuration } from '../../utils/formatting.ts';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import { paintIssueLane } from '../charts/paintIssueLane.ts';
import {
  uniqueIssueLaneTypes,
  type IssueLaneItem,
} from '../../utils/issueTimelinePlacement.ts';
import {
  paintVisibilityLane,
  TAB_ACTIVE_COLOR,
  TAB_INACTIVE_COLOR,
} from '../charts/paintVisibilityLane.ts';
import { useTabVisibility } from '../charts/tabVisibilityContext.tsx';
import { visibilitySegments } from '../../utils/tabVisibility.ts';
import {
  buildTransportTimeline,
  TRANSPORT_LANE_COLORS,
  type TransportTimelineModel,
} from '../../utils/transportTimeline.ts';
import type { ServerTransport } from '../../utils/routerServerData.ts';
import type { IceSelectedPairValue } from '../../utils/statsTypes.ts';
import styles from './TransportStateTimeline.module.css';

interface TransportStateTimelineProps {
  transport: ServerTransport | null;
  iceSelectedPair?: IceSelectedPairValue[];
  /** The client's samples, for the browser's own view of this transport. */
  clientSamples?: ClientSample[];
  /** Which peer connection a client event must name to belong to this lane set. */
  peerConnectionId?: string;
  issueLane?: IssueLaneItem[];
  fallbackStart?: number;
  fallbackEnd?: number;
}

const LANE_H = 15;
const LANE_GAP = 6;
// Wide enough for the spec-accurate lane names (`Peer connection`, `ICE · SFU`)
// rather than abbreviations that invite the very confusion they save space on.
const LABEL_W = 84;
const MARGIN = { top: 20, right: 12, bottom: 26, left: LABEL_W + 8 };

/** Which state machines each mediasoup transport flavour runs, for the hover. */
const TRANSPORT_TYPE_NOTE: Record<string, string> = {
  webrtc: 'WebRTC transport: runs ICE, DTLS and SCTP.',
  plain: 'Plain transport: no ICE or DTLS — SCTP only, with an RTP tuple and an RTCP tuple when RTCP-mux is off.',
  pipe: 'Pipe transport, router to router: SCTP only, no ICE or DTLS.',
  direct: 'Direct transport: no ICE, DTLS or SCTP — it moves packets between the router and the application.',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A transport across all of its state machines at once.
 *
 * ICE, DTLS and SCTP run independently on a mediasoup transport, and the
 * router records every transition of each. One lane per machine is what makes
 * the interesting failures legible: DTLS still connecting while ICE says
 * completed, SCTP failing on an otherwise healthy transport, or the selected
 * tuple swapping mid-call. The client's own view of the path — relayed or
 * direct — sits underneath, so both ends of the same transport can be read
 * against one clock.
 */
export function TransportStateTimeline({
  transport,
  iceSelectedPair,
  clientSamples,
  peerConnectionId,
  issueLane,
  fallbackStart,
  fallbackEnd,
}: TransportStateTimelineProps) {
  const tz = useTimezoneTick();
  const visibility = useTabVisibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const model = buildTransportTimeline({
    transport,
    iceSelectedPair,
    clientSamples,
    peerConnectionId,
    fallbackStart,
    fallbackEnd,
  });
  const issues = issueLane ?? [];
  const hasIssues = issueLane != null;
  const issueTypes = uniqueIssueLaneTypes(issues);
  const hasVisibility = visibility.reported;

  const laneCount =
    (model?.lanes.length ?? 0) + (hasIssues ? 1 : 0) + (hasVisibility ? 1 : 0);
  const height = MARGIN.top + laneCount * (LANE_H + LANE_GAP) + MARGIN.bottom;

  const render = useCallback(
    (m: TransportTimelineModel) => {
      const container = chartRef.current;
      if (!container) return;
      const width = container.clientWidth;
      if (width <= 0) return;
      container.innerHTML = '';

      const xScale = d3TimeScale(tz)
        .domain([new Date(m.start), new Date(m.end)])
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
      // Where each component's row landed, so its point events pin into it
      // rather than onto a rail above everything.
      const laneY = new Map<string, number>();

      for (const lane of m.lanes) {
        if (!laneY.has(lane.component)) laneY.set(lane.component, y);
        svg
          .append('text')
          .attr('x', MARGIN.left - 8)
          .attr('y', y + LANE_H / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', 'var(--text-muted)')
          .text(lane.label)
          .append('title')
          .text(
            [lane.attribute, lane.states].filter(Boolean).join('\n') ||
              `${lane.label} (${lane.source === 'sfu' ? 'SFU' : 'browser'})`,
          );

        // Empty track behind the segments, so a gap in the history reads as a
        // gap rather than as background.
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

        // The change that opened each segment, so its hover can say where the
        // state came from without a separate mark to point at.
        const enteredBy = new Map<number, (typeof m.transitions)[number]>();
        for (const change of m.transitions) {
          if (change.component === lane.component) enteredBy.set(change.timestamp, change);
        }

        for (const seg of lane.segments) {
          const x1 = xScale(new Date(seg.start));
          const x2 = xScale(new Date(seg.end));
          const w = Math.max(2, x2 - x1);
          const entry = enteredBy.get(seg.start);
          const durationLabel = formatDuration(seg.end - seg.start);
          const detail = seg.detail ? `<br/>${escapeHtml(seg.detail).replace(/\n/g, '<br/>')}` : '';
          // The opening stretch is mediasoup's documented starting state, not
          // something the sample recorded. Saying so keeps an inference from
          // reading as an observation.
          const initialNote = seg.initial
            ? '<br/><span style="color:var(--text-muted)">starting state — no transition recorded before this</span>'
            : '';
          const cameFrom = entry
            ? `<br/><span style="color:${entry.fromColor}">${escapeHtml(entry.from)}</span>` +
              ` <span style="color:var(--text-muted)">→</span> ` +
              `<strong style="color:${entry.color}">${escapeHtml(entry.to)}</strong>` +
              (entry.heldMs > 0
                ? ` <span style="color:var(--text-muted)">after ${escapeHtml(formatDuration(entry.heldMs))}</span>`
                : '')
            : '';
          const html =
            `<strong style="color:${seg.color}">${escapeHtml(seg.state)}</strong>` +
            ` <span style="color:var(--text-muted)">· ${escapeHtml(seg.machineLabel ?? lane.label)}` +
            ` (${(seg.source ?? lane.source) === 'sfu' ? 'SFU' : 'browser'})</span>` +
            (seg.attribute
              ? `<br/><span style="color:var(--text-muted);font-size:0.9em">${escapeHtml(seg.attribute)}</span>`
              : '') +
            `<br/>${d3TimeFormat('%H:%M:%S', tz)(new Date(seg.start))}` +
            ` – ${d3TimeFormat('%H:%M:%S', tz)(new Date(seg.end))}` +
            ` <span style="color:var(--text-muted)">(${durationLabel})</span>` +
            cameFrom +
            detail +
            initialNote;

          svg
            .append('rect')
            .attr('x', x1)
            .attr('y', y)
            .attr('width', w)
            .attr('height', LANE_H)
            .attr('rx', 2)
            .attr('fill', seg.color)
            .attr('opacity', 0.88)
            .style('cursor', 'pointer')
            // Only the hovered episode lights up: it goes fully opaque and
            // gains an outline, while everything else stays as it was. Nothing
            // is dimmed — darkening the rest to highlight one is a heavier
            // gesture than this chart needs.
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

        // No marks across the lane. A state change *is* the boundary between two
        // segments, and drawing a rule through it as well restated something
        // the colours already say while cutting the episodes into fragments.
        // What the notch's hover carried — where the state came from and how
        // long the last one held — moved into the segment's own hover, which
        // is the thing a reader points at anyway.

        y += LANE_H + LANE_GAP;
      }

      if (hasIssues) {
        paintIssueLane({
          svg,
          tooltipDiv,
          items: issues,
          xScale: (d) => xScale(d),
          y,
          height: LANE_H,
          chartLeft: MARGIN.left,
          chartRight: width - MARGIN.right,
          label: issues.length > 0 ? `Issues (${issues.length})` : 'Issues',
        });
        y += LANE_H + LANE_GAP;
      }

      if (hasVisibility) {
        // Under the state machines: a renegotiation right after the tab came
        // back is a different story from one out of nowhere.
        paintVisibilityLane({
          svg,
          tooltipDiv,
          segments: visibilitySegments(visibility, m.start, m.end),
          xScale: (d) => xScale(d),
          y,
          height: LANE_H,
          chartLeft: MARGIN.left,
          chartRight: width - MARGIN.right,
          tz,
        });
        y += LANE_H + LANE_GAP;
      }

      // Point events sit in the row of the component they concern — a data
      // channel opening on SCTP, an ICE path change on ICE. Nothing is drawn
      // across the chart any more.
      for (const marker of m.markers) {
        const x = xScale(new Date(marker.timestamp));
        const html =
          `<strong style="color:${marker.color}">${escapeHtml(marker.label)}</strong>` +
          ` <span style="color:var(--text-muted)">· ${marker.source === 'sfu' ? 'SFU' : 'browser'}</span>` +
          `<br/>${d3TimeFormat('%H:%M:%S.%L', tz)(new Date(marker.timestamp))}` +
          (marker.detail.length ? `<br/>${marker.detail.map(escapeHtml).join('<br/>')}` : '');

        // A pin on the top rail, and nothing drawn across the lanes. The dashed
        // rule these used to carry ran the full height of the chart for every
        // point event, which turned a busy connection into a picket fence over
        // the very episodes it was meant to annotate. On hover the pin grows
        // and a faint guide appears — only for the one being pointed at.
        // A pin on the lane's own top edge. The dashed rule these used to
        // carry ran the full height of the chart for every point event, which
        // turned a busy connection into a picket fence over the very episodes
        // it was meant to annotate. Only the hovered pin grows.
        const pinY = (laneY.get(marker.component) ?? MARGIN.top) - 1;
        const group = svg.append('g').style('cursor', 'pointer');
        group
          .append('rect')
          .attr('x', x - 6)
          .attr('y', pinY - 6)
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', 'transparent');
        const pin = group
          .append('circle')
          .attr('cx', x)
          .attr('cy', pinY)
          .attr('r', 3)
          .attr('fill', marker.color)
          .attr('stroke', 'var(--card-bg)')
          .attr('stroke-width', 1.25)
          .attr('pointer-events', 'none');
        group
          .on('mouseenter', (event: MouseEvent) => {
            pin.attr('r', 4.75);
            showTip(event, html);
          })
          .on('mousemove', (event: MouseEvent) => showTip(event, html))
          .on('mouseleave', () => {
            pin.attr('r', 3);
            hideTip();
          });
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
    },
    [tz, height, hasIssues, issues, visibility, hasVisibility],
  );

  useEffect(() => {
    if (model) render(model);
  }, [render, model]);

  useEffect(() => {
    const el = chartRef.current;
    if (!el || !model) return;
    const ro = new ResizeObserver(() => render(model));
    ro.observe(el);
    return () => ro.disconnect();
  }, [render, model]);

  if (!model) return null;

  const legendStates = new Map<string, string>();
  for (const lane of model.lanes) {
    for (const seg of lane.segments) legendStates.set(seg.state, seg.color);
  }

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={styles.header}>
        <span className={styles.title}>Timeline · Transport</span>
        {/* The flavour decides which lanes exist at all: only a WebRTC
            transport runs ICE and DTLS, plain and pipe run SCTP alone, and a
            direct transport has no state machine. Naming it here is what keeps
            a missing lane from reading as a missing measurement. */}
        {model.transportType && (
          <span className={styles.typeTag} title={TRANSPORT_TYPE_NOTE[model.transportType]}>
            {model.transportType}
          </span>
        )}
        <span className={styles.changeCount}>
          {model.transitions.length} state change{model.transitions.length === 1 ? '' : 's'}
        </span>
        <ScreenshotButton targetRef={containerRef} className={styles.screenshotBtn} />
      </div>
      <div className={styles.legend}>
        {[...legendStates].map(([state, color]) => (
          <span key={state} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: color }} />
            {state}
          </span>
        ))}
        {model.markers.some((mk) => mk.source === 'client') && (
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: TRANSPORT_LANE_COLORS.clientEvent }}
            />
            browser event
          </span>
        )}
        {model.markers.some((mk) => mk.source === 'sfu') && (
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: TRANSPORT_LANE_COLORS.tuple }}
            />
            tuple change
          </span>
        )}
        {issueTypes.map((issue) => (
          <span key={issue.type} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: issue.color }} />
            {issue.label}
          </span>
        ))}
        {hasVisibility && (
          <>
            <span className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: TAB_ACTIVE_COLOR }} />
              tab active
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: TAB_INACTIVE_COLOR }} />
              tab in background
            </span>
          </>
        )}
      </div>
      <div ref={chartRef} className={styles.chart} />
    </div>
  );
}
