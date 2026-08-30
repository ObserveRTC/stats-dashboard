'use client';
import { useCallback, useMemo, useState } from 'react';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { useTimezoneTick } from '../../stores/tzStore.ts';
import { formatHMSms } from '../../utils/formatting.ts';
import {
  buildTransportTimeline,
  COMPONENT_META,
  type BuildTransportTimelineOptions,
  type TransportComponent,
} from '../../utils/transportTimeline.ts';
import styles from './TransportStateLog.module.css';

/** One line of the log: a state change, or a moment worth recording. */
interface LogRow {
  timestamp: number;
  /** The state machine's display name, or the event group for a marker. */
  channel: string;
  /** The spec attribute this row's machine tracks, for the hover. */
  attribute?: string;
  /** Which aspect of the peer connection the row concerns. */
  component: TransportComponent;
  /** Which end of the transport reported it. */
  source: 'sfu' | 'client';
  from?: string;
  to: string;
  color: string;
  /** Colour of the state left behind, so a channel's path reads by colour. */
  fromColor?: string;
  /** Lane key, for the per-channel wash. */
  machine: string;
  /** How long the previous state held, for a transition. */
  fromInitial?: boolean;
  detail?: string[];
  payload?: Record<string, unknown> | null;
}

/**
 * A wash per component of the peer connection.
 *
 * By component and not by state: the state colours already carry meaning in the
 * `from → to` column, and washing the row with them too would say the same
 * thing twice while losing the grouping the eye needs when several components
 * interleave down one list.
 *
 * And by component rather than by *row*, so the SFU's ICE and the browser's ICE
 * share a tint. They are two views of one negotiation; giving them separate
 * colours would present them as separate subjects, which is the misreading this
 * whole table exists to prevent.
 */
const COMPONENT_TINT: Record<TransportComponent, string> = {
  connection: '#f97316',
  signaling: '#ec4899',
  ice: '#22c55e',
  dtls: '#3b82f6',
  sctp: '#06b6d4',
};

/** Fields already shown in their own column, so not repeated in the payload. */
const REDUNDANT_PAYLOAD_FIELDS = new Set([
  'peerConnectionId',
  'connectionState',
  'iceConnectionState',
  'iceGatheringState',
  'signalingState',
]);

interface PayloadField {
  key: string;
  value: string;
}

/** Render one primitive for display. */
function fieldValue(value: unknown): string {
  if (typeof value === 'number') {
    // Timestamps are the one number that reads worse as a number.
    if (value > 1_000_000_000_000) return new Date(value).toISOString();
    return String(value);
  }
  return String(value);
}

/**
 * The payload as labelled fields, minus what the row already says.
 *
 * `peerConnectionId` is identical on every row of one transport and the state
 * field is the `to` column, so repeating either pushes what actually differs
 * off the edge.
 *
 * Several client payloads carry a *JSON document in a string* — the ICE path's
 * `to` and `from`, a simulcast layer snapshot, a track's `settings`. Those are
 * parsed and flattened one level into `to.kind`, `to.pairId` and so on, because
 * an escaped JSON blob in a table cell is unreadable and the fields inside it
 * are the whole reason the event is interesting.
 */
function payloadFields(payload: Record<string, unknown> | null | undefined): PayloadField[] {
  if (!payload) return [];
  const out: PayloadField[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (REDUNDANT_PAYLOAD_FIELDS.has(key) || value == null || value === '') continue;

    if (typeof value === 'string' && /^\s*[{[]/.test(value)) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [subKey, subValue] of Object.entries(parsed as Record<string, unknown>)) {
            if (subValue == null || subValue === '') continue;
            out.push({
              key: `${key}.${subKey}`,
              value:
                typeof subValue === 'object' ? JSON.stringify(subValue) : fieldValue(subValue),
            });
          }
          continue;
        }
      } catch {
        // Not a document after all — fall through and show the string.
      }
    }

    out.push({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : fieldValue(value),
    });
  }

  return out;
}

/**
 * Every state change this transport recorded, in order, as text.
 *
 * The timeline above shows the same events in time, which is the right way to
 * see *when* things happened and what overlapped. It is the wrong way to read
 * exact values: the answer to "what did DTLS do, in what order, and how long
 * did each state hold" is a list, and getting it off a chart means hovering
 * every notch in turn and remembering what the last one said.
 *
 * So both, from one model. Times are to the millisecond because that is the
 * scale connection setup happens on — a DTLS handshake that took 40ms and one
 * that took 400ms round to the same second.
 *
 * Both ends are in the same list, tagged by which reported them. The SFU and
 * the browser are the two peers of one negotiation and each only ever sees its
 * own half, so interleaving them is the point: the browser declaring ICE
 * `failed` while the SFU still reads `connected` is a whole diagnosis, and it
 * is invisible in either half alone.
 */
export function TransportStateLog(props: BuildTransportTimelineOptions) {
  const tz = useTimezoneTick();
  const { transport, iceSelectedPair, clientSamples, peerConnectionId, fallbackStart, fallbackEnd } =
    props;

  const rows = useMemo<LogRow[]>(() => {
    const model = buildTransportTimeline({
      transport,
      iceSelectedPair,
      clientSamples,
      peerConnectionId,
      fallbackStart,
      fallbackEnd,
    });
    if (!model) return [];

    const out: LogRow[] = model.transitions.map((t) => ({
      timestamp: t.timestamp,
      channel: t.machineLabel,
      attribute: t.attribute,
      component: t.component,
      machine: t.machine,
      source: t.source,
      from: t.from,
      to: t.to,
      color: t.color,
      fromColor: t.fromColor,
      fromInitial: t.fromInitial,
      payload: t.payload,
    }));

    // Markers are moments rather than changes — no `from`, and their detail is
    // addresses rather than a state name.
    for (const marker of model.markers) {
      out.push({
        timestamp: marker.timestamp,
        // Point events, not states — grouped apart from the machines so they
        // filter as one, and named for the end that raised them.
        // Named by the component it concerns, so a data-channel event files
        // under SCTP rather than into an undifferentiated "events" bucket.
        channel: COMPONENT_META[marker.component].label,
        component: marker.component,
        machine: marker.machine,
        source: marker.source,
        to: marker.label,
        color: marker.color,
        detail: marker.detail,
        payload: marker.payload,
      });
    }

    return out.sort((a, b) => a.timestamp - b.timestamp);
  }, [transport, iceSelectedPair, clientSamples, peerConnectionId, fallbackStart, fallbackEnd]);

  // Which channels the rows actually contain, in the order they first appear —
  // a fixed list would offer checkboxes for machines this transport never ran.
  const channels = useMemo(() => {
    // One checkbox per component, not per row: hiding "ICE" should hide the
    // SFU's view and the browser's together, since they answer one question.
    const seen = new Map<TransportComponent, { component: TransportComponent; count: number }>();
    for (const row of rows) {
      const entry = seen.get(row.component);
      if (entry) entry.count += 1;
      else seen.set(row.component, { component: row.component, count: 1 });
    }
    return [...seen.values()].sort(
      (a, b) => COMPONENT_META[a.component].order - COMPONENT_META[b.component].order,
    );
  }, [rows]);

  // Hidden rather than visible, so a channel that appears later — a client
  // reconnecting and reporting a machine it had not before — arrives shown.
  // Tracking the visible set instead would leave it silently filtered out.
  const [hidden, setHidden] = useState<Set<TransportComponent>>(() => new Set());

  const toggle = useCallback((component: TransportComponent) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(component)) next.delete(component);
      else next.add(component);
      return next;
    });
  }, []);

  const visibleRows = useMemo(
    () => rows.filter((row) => !hidden.has(row.component)),
    [rows, hidden],
  );

  if (rows.length === 0) return null;

  // The offset column measures from the first event of the *whole* transport,
  // not of the filtered view: hiding a channel must not silently renumber the
  // ones left behind.
  const first = rows[0].timestamp;

  return (
    <CollapsibleSection title="State changes"
      help="client/transport-state-log" count={rows.length} defaultOpen>
      <div className={styles.filters}>
        {channels.map((entry) => {
          const tint = COMPONENT_TINT[entry.component];
          const shown = !hidden.has(entry.component);
          return (
            <label
              key={entry.component}
              className={`${styles.filter} ${shown ? '' : styles.filterOff}`}
              style={shown ? { borderColor: `color-mix(in srgb, ${tint} 45%, var(--border-light))` } : undefined}
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={shown}
                onChange={() => toggle(entry.component)}
              />
              <span className={styles.channelDot} style={{ background: tint }} />
              {COMPONENT_META[entry.component].label}
              <span className={styles.filterCount}>{entry.count}</span>
            </label>
          );
        })}
        {hidden.size > 0 && (
          <button type="button" className={styles.showAll} onClick={() => setHidden(new Set())}>
            Show all
          </button>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <p className={styles.empty}>
          Every channel is hidden. Tick one above to see its changes.
        </p>
      ) : (
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.numeric}>Time</th>
            <th className={styles.numeric}>+</th>
            <th>Reported by</th>
            <th>Component</th>
            <th>Change</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
            // A light wash per channel, so ICE rows read as one group even
            // when DTLS and the client interleave between them.
            <tr
              key={`${row.timestamp}-${row.channel}-${i}`}
              style={{
                background: `color-mix(in srgb, ${COMPONENT_TINT[row.component]} 8%, transparent)`,
              }}
            >
              <td className={styles.numeric}>{formatHMSms(row.timestamp, tz)}</td>
              {/* Offset from the first recorded event: connection setup is read
                  as elapsed time far more often than as wall-clock. */}
              <td className={styles.offset}>
                {/* Measured against the transport's first event, not the first
                    *visible* row — otherwise hiding a channel renumbers the
                    ones left and a 4-second gap silently becomes zero. */}
                {row.timestamp === first ? '—' : `+${((row.timestamp - first) / 1000).toFixed(3)}s`}
              </td>
              <td>
                <span
                  className={`${styles.source} ${row.source === 'sfu' ? styles.sourceSfu : styles.sourceClient}`}
                >
                  {row.source === 'sfu' ? 'SFU' : 'browser'}
                </span>
              </td>
              <td className={styles.channel} title={row.attribute}>
                <span
                  className={styles.channelDot}
                  style={{ background: COMPONENT_TINT[row.component] }}
                />
                {row.channel}
              </td>
              <td>
                {row.from != null ? (
                  <span className={styles.change}>
                    {/* The state left behind keeps its own colour, so one
                        channel's path can be followed down the column by
                        colour alone — each row's `from` is the previous row's
                        `to`. */}
                    <span className={styles.fromState} style={{ color: row.fromColor }}>
                      {row.from}
                      {row.fromInitial && <span className={styles.initialMark}>*</span>}
                    </span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.toState} style={{ color: row.color }}>
                      {row.to}
                    </span>
                  </span>
                ) : (
                  <>
                    <span className={styles.marker} style={{ color: row.color }}>
                      {row.to}
                    </span>

                  </>
                )}
              </td>
              <td className={styles.payload}>
                {(() => {
                  const fields = payloadFields(row.payload);
                  if (fields.length > 0) {
                    return (
                      <span className={styles.fields}>
                        {fields.map((field) => (
                          <span key={field.key} className={styles.field}>
                            <span className={styles.fieldKey}>{field.key}</span>
                            <span className={styles.fieldValue}>{field.value}</span>
                          </span>
                        ))}
                      </span>
                    );
                  }
                  return row.detail?.length ? (
                    <span className={styles.fields}>
                      {row.detail.map((line, n) => (
                        <span key={n} className={styles.field}>
                          <span className={styles.fieldValue}>{line}</span>
                        </span>
                      ))}
                    </span>
                  ) : null;
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}

      {visibleRows.some((r) => r.fromInitial) && (
        <p className={styles.footnote}>
          <span className={styles.initialMark}>*</span> mediasoup&apos;s starting state. Every
          history entry is a change <em>to</em> a state, so the state left behind by the first
          change is inferred rather than recorded.
        </p>
      )}
    </CollapsibleSection>
  );
}
