'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  compactDuration,
  digestView,
  shiftDay,
  type DigestCallView,
  type DigestView,
} from '../../utils/digestModel.ts';
import { digestDay, digestMonth, monthOfDay, normalizeDigest } from '../../schema/Digest.ts';
import { shortId, formatTimeOnly } from '../../utils/formatting.ts';
import { useTimezoneTick } from '../../stores/index.ts';
import { LoadingSpinner } from '../layout/LoadingSpinner.tsx';
import { InfoIcon } from '../help/InfoIcon.tsx';
import styles from './DigestPanel.module.css';

type Source = 'stored' | 'rolled';

interface Loaded {
  /** null when nothing has been written for the period. */
  view: DigestView | null;
  source: Source | null;
}

/**
 * What happened today — or on any day, or in any month.
 *
 * First on the page because it answers the question people actually arrive
 * with, *is anything wrong right now*, which used to require knowing which room
 * to open before you could find out.
 *
 * Every figure comes from the digest in the bucket, read in one request. This
 * component does no aggregation over calls and has no fallback that would
 * recount anything: switching period is one fetch, not a reduction over a month
 * of calls. Whatever writes the digests decides how current they are, and the
 * panel says when each one was written rather than implying it is live.
 */
export function DigestPanel() {
  const router = useRouter();
  const tz = useTimezoneTick();

  const [period, setPeriod] = useState<'day' | 'month'>('day');
  const [day, setDay] = useState(() => digestDay(Date.now()));
  const [month, setMonth] = useState(() => digestMonth(Date.now()));

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = period === 'day' ? `day=${day}` : `month=${month}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/digest?${query}`)
      .then((res) => res.json())
      .then((data: { success?: boolean; doc?: unknown; source?: Source | null; error?: string }) => {
        if (cancelled) return;
        if (!data?.success) throw new Error(data?.error ?? 'The digest could not be read.');

        // Validated on the way in even though this server wrote the response:
        // the shape is a storage contract with a writer outside this
        // repository, and that is exactly the case where trusting the envelope
        // turns a version mismatch into a blank panel with no explanation.
        const doc = data.doc == null ? null : normalizeDigest(data.doc);
        if (data.doc != null && !doc) {
          throw new Error('The digest is in a format this dashboard does not understand.');
        }

        setLoaded({ view: doc ? digestView(doc) : null, source: data.source ?? null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'The digest could not be read.');
        setLoaded(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const today = digestDay(Date.now());
  const thisMonth = digestMonth(Date.now());
  const isCurrent = period === 'day' ? day === today : month === thisMonth;

  const step = useCallback(
    (delta: number) => {
      if (period === 'day') {
        setDay((current) => shiftDay(current, delta));
        return;
      }
      setMonth((current) => {
        const at = new Date(`${current}-15T12:00:00.000Z`);
        at.setUTCMonth(at.getUTCMonth() + delta);
        return digestMonth(at);
      });
    },
    [period],
  );

  // Switching to the month view shows the month the chosen day is in, and
  // switching back shows a day inside the chosen month, so the two views stay
  // about the same stretch of time instead of both resetting to now.
  const togglePeriod = useCallback(() => {
    // Both setters called from the handler, not from inside a `setPeriod`
    // updater: an updater has to be pure, and React invokes it twice in
    // development to catch exactly this.
    if (period === 'day') {
      setMonth(monthOfDay(day));
      setPeriod('month');
      return;
    }
    setDay(month === thisMonth ? today : `${month}-01`);
    setPeriod('day');
  }, [period, day, month, thisMonth, today]);

  const openCall = useCallback(
    (row: DigestCallView) => {
      if (!row.roomId || !row.callId) return;
      router.push(`/${encodeURIComponent(row.roomId)}/${encodeURIComponent(row.callId)}`);
    },
    [router],
  );

  const view = loaded?.view ?? null;
  const label = period === 'day' ? (day === today ? 'Today' : day) : month;

  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className={styles.head}>
        <div className="card-title">
          {label} <InfoIcon topic="digest/panel" />
          {loaded?.source && (
            <>
              <SourceBadge source={loaded.source} generatedAt={view?.generatedAt ?? 0} />
              <InfoIcon topic="digest/source" />
            </>
          )}
        </div>
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} onClick={togglePeriod}>
            {period === 'day' ? 'month ▾' : 'day ▾'}
          </button>
          <button type="button" className={styles.navBtn} onClick={() => step(-1)}>
            ← previous
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => step(1)}
            disabled={isCurrent}
            title={isCurrent ? 'This is the most recent period there is' : undefined}
          >
            next →
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner>Reading the digest…</LoadingSpinner>}

      {!loading && error && <p className={styles.note}>{error}</p>}

      {!loading && !error && loaded && !view && (
        <p className={styles.note}>
          No digest has been written for {period === 'day' && day === today ? day : label}. For a
          period still in progress that is expected — the figures appear once it has been digested.
          If an old period is missing it too, check that whatever writes the digests is running, and
          that this dashboard is reading the root it writes to: the{' '}
          <code>roots=</code> line in the container log says which.
        </p>
      )}

      {!loading && !error && view?.empty && (
        <p className={styles.note}>
          The digest for {label} is there and reports no calls — so this period really was quiet
          rather than unprocessed.
        </p>
      )}

      {!loading && !error && view && !view.empty && (
        <>
          <div className={styles.statGrid}>
            {view.stats.map((s) => (
              <div key={s.key} className={styles.stat}>
                <span className={styles.statLabel} title={s.hint}>
                  {s.label}
                  {s.topic && <InfoIcon topic={s.topic} />}
                </span>
                <span className={styles.statValue} style={s.color ? { color: s.color } : undefined}>
                  {s.value}
                  {s.unit && <span className={styles.statUnit}>{s.unit}</span>}
                </span>
              </div>
            ))}
          </div>

          <ActivityStrip view={view} />

          {view.worst.length > 0 && (
            <div>
              <div className={styles.sub}>Look here first</div>
              <p className={styles.note} style={{ marginBottom: 6 }}>
                The lowest-scoring calls of this {view.period}. A score under 2.5 is bad enough that
                people complain.
              </p>
              <CallTable rows={view.worst} onOpen={openCall} tz={tz} />
            </div>
          )}

          {view.calls && (
            <div>
              <div className={styles.sub}>All calls ({view.calls.length})</div>
              <CallTable rows={view.calls} onOpen={openCall} tz={tz} />
            </div>
          )}

          {!view.calls && (
            <p className={styles.note}>
              A month keeps its totals and its worst calls, not every row — step into a day for the
              full list.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Which digest this is, and when it was written.
 *
 * The write time is the part that matters. Nothing on this page is live, so
 * "digested 09:14 UTC" is the difference between a figure somebody can quote
 * and a figure that is four hours stale — and only the document knows.
 */
function SourceBadge({ source, generatedAt }: { source: Source; generatedAt: number }) {
  const when =
    generatedAt > 0 ? new Date(generatedAt).toISOString().replace('T', ' ').slice(0, 16) : null;

  return (
    <span
      className={styles.badge}
      title={
        source === 'stored'
          ? `Read from the digest in the bucket${when ? `, written at ${when} UTC` : ''}. Anything that happened after that is not in these figures.`
          : 'Folded from this month’s daily digests — the month’s own roll-up has not been written yet, so a day digested since could be missing.'
      }
      style={{ marginLeft: 10 }}
    >
      {source === 'stored' ? (when ?? 'digested') : 'rolled up'}
    </span>
  );
}

/** Calls per hour of the day, or per day of the month. */
function ActivityStrip({ view }: { view: DigestView }) {
  const busiest = Math.max(1, ...view.buckets);
  const unit = view.bucketUnit;

  const axis = useMemo(() => {
    if (unit === 'hour') return ['00', '06', '12', '18', '23'];
    return ['1', '8', '15', '22', String(view.buckets.length)];
  }, [unit, view.buckets.length]);

  return (
    <div>
      <div className={styles.sub}>
        {unit === 'hour' ? 'Calls per hour (UTC)' : 'Calls per day'}{' '}
        <InfoIcon topic="digest/activity" />
      </div>
      <div className={styles.hours}>
        {view.buckets.map((count, i) => (
          <div
            key={i}
            className={count > 0 ? styles.hourBar : styles.hourBarEmpty}
            style={count > 0 ? { height: `${(count / busiest) * 100}%` } : undefined}
            title={
              unit === 'hour'
                ? `${String(i).padStart(2, '0')}:00 — ${count} call${count === 1 ? '' : 's'}`
                : `${view.id}-${String(i + 1).padStart(2, '0')} — ${count} call${count === 1 ? '' : 's'}`
            }
          />
        ))}
      </div>
      <div className={styles.hourAxis}>
        {axis.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

function CallTable({
  rows,
  onOpen,
  tz,
}: {
  rows: DigestCallView[];
  onOpen: (row: DigestCallView) => void;
  tz: string;
}) {
  return (
    <div className={styles.scroll}>
      <table className="table">
        <thead>
          <tr>
            <th>Started</th>
            <th>Room</th>
            <th>Quality</th>
            <th title="Joins over the call, and the most present at once">Clients</th>
            <th>Issues</th>
            <th>TURN</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.callId}
              className={row.roomId ? styles.clickable : undefined}
              onClick={() => onOpen(row)}
              title={row.roomId ? `Open ${row.roomId} / ${row.callId}` : row.callId}
            >
              <td className={styles.mono}>
                {row.startedAt == null ? '—' : formatTimeOnly(row.startedAt, tz as never)}
              </td>
              <td className={styles.mono}>{shortId(row.roomId, 14)}</td>
              <td style={{ color: row.scoreColor }}>
                {row.score == null ? '—' : `${row.score.toFixed(1)}/5`}
              </td>
              <td>
                {row.clients ?? '—'}
                {/* The peak, where it differs from the joins — the two answer
                    different questions and a single number hides it. */}
                {row.peak != null && row.peak !== row.clients && (
                  <span className={styles.statUnit} title="Most present at once">
                    peak {row.peak}
                  </span>
                )}
              </td>
              <td>{row.issues || '—'}</td>
              <td>{row.turnClients || '—'}</td>
              <td>{compactDuration(row.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
