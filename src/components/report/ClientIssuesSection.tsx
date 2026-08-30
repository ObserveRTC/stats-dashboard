'use client';
import { useEffect, useMemo, useState } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { getIssueTypeMeta } from '../../schema/ClientIssueTypes.ts';
import {
  cachedClientIssueEpisodes,
  formatIssueDuration,
  type ClientIssueEpisode,
} from '../../utils/clientIssueEpisodes.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { formatHMSms } from '../../utils/formatting.ts';
import styles from './ClientIssuesSection.module.css';

const PALETTE = [
  '#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#64748b',
];

/** Longest payload rendered in a hover tooltip before it is trimmed. */
const TOOLTIP_PAYLOAD_LIMIT = 1200;

/** Narrowest a resolved episode is drawn, so a short one is still hoverable. */
const MIN_BAR_PCT = 0.8;

interface Props {
  samples: ClientSample[];
}

function formatPayloadObject(payload: Record<string, unknown> | null): string | null {
  if (!payload || Object.keys(payload).length === 0) return null;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function trim(text: string): string {
  return text.length > TOOLTIP_PAYLOAD_LIMIT
    ? `${text.slice(0, TOOLTIP_PAYLOAD_LIMIT)}\n… (expand the type below for the rest)`
    : text;
}

interface HoverState {
  x: number;
  y: number;
  color: string;
  episode: ClientIssueEpisode;
}

/**
 * Issues the client itself reported, one row per issue type.
 *
 * The unit here is the **episode**, not the wire entry. client-monitor 4.6.0
 * sends a stateful issue twice — a raise, then a `<type>-resolved` entry
 * sharing its `key` — and a resolution is the client saying the problem went
 * away. Read entry-by-entry it would show up as its own row, its own marker and
 * its own place in the count, which reads a recovery as a second fault and
 * doubles every stateful issue in the section header. So raise and resolution
 * are paired first (`buildClientIssueEpisodes`) and drawn as one span: a bar
 * from raise to resolution, a dot where an issue was point-in-time or never
 * closed.
 */
export function ClientIssuesSection({ samples }: Props) {
  const tz = useTimezoneTick();
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<HoverState | null>(null);

  const model = useMemo(() => {
    const episodes = cachedClientIssueEpisodes(samples);

    const byType = new Map<string, ClientIssueEpisode[]>();
    for (const episode of episodes) {
      const arr = byType.get(episode.type) ?? [];
      arr.push(episode);
      byType.set(episode.type, arr);
    }
    for (const arr of byType.values()) arr.sort((a, b) => a.raisedAt - b.raisedAt);

    const types = [...byType.keys()].sort();
    const stamps = episodes.flatMap((e) =>
      e.resolvedAt != null ? [e.raisedAt, e.resolvedAt] : [e.raisedAt],
    );
    const minTs = stamps.length ? Math.min(...stamps) : 0;
    const maxTs = stamps.length ? Math.max(...stamps) : 0;
    const resolved = episodes.filter((e) => e.resolvedByClient).length;
    const open = episodes.filter((e) => e.stillOpen).length;

    return {
      episodes,
      byType,
      types,
      colorMap: new Map(types.map((t, i) => [t, getIssueTypeMeta(t).color || PALETTE[i % PALETTE.length]])),
      minTs,
      span: maxTs - minTs || 1,
      resolved,
      open,
    };
  }, [samples]);

  // A tooltip positioned in viewport coordinates would drift if the page moved.
  useEffect(() => {
    if (!hover) return;
    const hide = () => setHover(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [hover]);

  if (model.episodes.length === 0) return null;

  const { byType, types, colorMap, minTs, span, episodes, resolved, open } = model;
  const pctOf = (ts: number) => ((ts - minTs) / span) * 100;

  const toggleType = (t: string) => {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <CollapsibleSection
      title="Client Issues"
      id="client-issues"
      help="client/issues"
      count={episodes.length}
      defaultOpen
    >
      <p className={styles.lede}>
        {episodes.length} issue{episodes.length === 1 ? '' : 's'} raised
        {resolved > 0 ? `, ${resolved} of them resolved by the client` : ''}
        {open > 0 ? `, ${open} never closed` : ''}. A bar spans from the raise to the
        resolution; a dot is an issue reported at a single moment.
      </p>

      <div className={styles.timeline}>
        {types.map((type) => {
          const list = byType.get(type)!;
          const color = colorMap.get(type)!;
          const meta = getIssueTypeMeta(type);
          return (
            <div key={type} className={styles.timelineRow}>
              <span className={styles.timelineLabel} title={`${meta.label} (${type})`}>
                {meta.label}
              </span>
              <div className={styles.timelineTrack}>
                <div className={styles.trackLine} />
                {list.map((episode, i) => {
                  const show = (e: { clientX: number; clientY: number }) =>
                    setHover({ x: e.clientX + 14, y: e.clientY + 12, color, episode });
                  const left = pctOf(episode.raisedAt);
                  const hasSpan = episode.resolvedAt != null && episode.resolvedAt > episode.raisedAt;

                  if (!hasSpan) {
                    return (
                      <div
                        key={i}
                        className={episode.stillOpen ? styles.trackDotOpen : styles.trackDot}
                        style={
                          episode.stillOpen
                            ? { left: `${left}%`, borderColor: color }
                            : { left: `${left}%`, background: color }
                        }
                        onMouseEnter={show}
                        onMouseMove={show}
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  }

                  const width = Math.max(pctOf(episode.resolvedAt as number) - left, MIN_BAR_PCT);
                  return (
                    <div
                      key={i}
                      className={styles.trackBar}
                      style={{ left: `${left}%`, width: `${width}%`, background: color }}
                      onMouseEnter={show}
                      onMouseMove={show}
                      onMouseLeave={() => setHover(null)}
                    >
                      {/* The closing cap marks where the client said it cleared. */}
                      {episode.resolvedByClient && <span className={styles.barEnd} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {hover && (
        <div className={styles.hoverCard} style={{ left: hover.x, top: hover.y }}>
          <div className={styles.hoverHeader}>
            <span className={styles.hoverDot} style={{ background: hover.color }} />
            <span className={styles.hoverType}>{getIssueTypeMeta(hover.episode.type).label}</span>
            <span className={styles.hoverTs}>
              {formatHMSms(hover.episode.raisedAt, tz)}
              {hover.episode.resolvedAt != null && hover.episode.resolvedAt > hover.episode.raisedAt
                ? ` → ${formatHMSms(hover.episode.resolvedAt, tz)}`
                : ''}
            </span>
          </div>

          <div className={styles.hoverState}>
            {hover.episode.stillOpen ? (
              <span className={styles.stateOpen}>never closed in this capture</span>
            ) : hover.episode.resolvedByClient ? (
              <span className={styles.stateResolved}>
                resolved
                {hover.episode.durationMs != null
                  ? ` after ${formatIssueDuration(hover.episode.durationMs)}`
                  : ''}
              </span>
            ) : (
              <span className={styles.statePoint}>
                reported once
                {hover.episode.durationMs != null
                  ? `, lasting ${formatIssueDuration(hover.episode.durationMs)}`
                  : ''}
              </span>
            )}
          </div>

          {hover.episode.resolveComment && (
            <div className={styles.hoverComment}>{hover.episode.resolveComment}</div>
          )}
          {hover.episode.key && <div className={styles.hoverKey}>key: {hover.episode.key}</div>}

          {formatPayloadObject(hover.episode.payload) ? (
            <pre className={styles.hoverPayload}>
              {trim(formatPayloadObject(hover.episode.payload) as string)}
            </pre>
          ) : (
            <span className={styles.hoverEmpty}>No payload recorded for this issue.</span>
          )}
        </div>
      )}

      <div className={styles.accordion}>
        {types.map((type) => {
          const list = byType.get(type)!;
          const color = colorMap.get(type)!;
          const isOpen = openTypes.has(type);
          const meta = getIssueTypeMeta(type);
          return (
            <div key={type} className={styles.accordionItem}>
              <button className={styles.accordionHeader} onClick={() => toggleType(type)}>
                <span className={styles.accordionDot} style={{ background: color }} />
                <span className={styles.accordionType}>{meta.label}</span>
                <code className={styles.accordionKey}>{type}</code>
                <span className={styles.accordionCount}>{list.length}</span>
                <svg className={isOpen ? styles.chevronOpen : styles.chevron} viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
              {isOpen && (
                <div className={styles.accordionBody}>
                  {meta.summary && <p className={styles.typeMeaning}>{meta.summary}</p>}
                  {list.map((episode, i) => {
                    const raise = formatPayloadObject(episode.payload);
                    const resolve = formatPayloadObject(episode.resolvePayload);
                    return (
                      <div key={i} className={styles.issueRow}>
                        <span className={styles.issueTs}>
                          {formatHMSms(episode.raisedAt, tz)}
                          <span className={styles.issueState}>
                            {episode.stillOpen
                              ? 'open'
                              : episode.durationMs != null
                                ? formatIssueDuration(episode.durationMs)
                                : 'once'}
                          </span>
                        </span>
                        <div className={styles.issueBody}>
                          {episode.resolveComment && (
                            <div className={styles.issueComment}>{episode.resolveComment}</div>
                          )}
                          {raise && <pre className={styles.issuePayload}>{raise}</pre>}
                          {/* The resolution carries only what was passed to it —
                              the raise payload is not repeated — so it is worth
                              showing beside the raise rather than merged into it. */}
                          {resolve && (
                            <pre className={styles.issuePayloadResolve} title="Payload attached to the resolution">
                              {resolve}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
