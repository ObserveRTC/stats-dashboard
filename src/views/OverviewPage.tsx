'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  OUTCOME_LABELS,
  OUTCOME_SYMBOLS,
  checkDefinition,
  checkQuestion,
  checkSection,
  orderedSections,
  type PeriodSummary,
} from '../digest/index.ts';
import styles from './OverviewPage.module.css';

/**
 * The landing page: one reporting period, from one saved summary.
 *
 * Reads `/api/digest`, which reads one object. Nothing here counts calls or
 * folds a day — every figure on this page was computed by the digest server and
 * saved, which is why a busy day costs the same to render as a quiet one.
 *
 * ## What this page refuses to do
 *
 * It does not infer quality from the absence of findings. A check that could
 * not be answered is shown as unassessable, in its own section, never folded
 * into a pass. A period with no summary says so rather than showing zeros, and
 * a partial period says it is partial. Those three refusals are most of why the
 * v1 version of this page was rewritten.
 */

type ReadState = 'ready' | 'missing' | 'invalid' | 'unsupported-version' | 'failed' | 'loading';

interface Answer {
  state: ReadState;
  document: PeriodSummary | null;
  reason?: string;
  supportedSchemaVersion?: number;
}

const utcDay = (at: number) => new Date(at).toISOString().slice(0, 10);
const utcMonth = (at: number) => new Date(at).toISOString().slice(0, 7);

/** Shift a day or a month id by whole periods, in UTC. */
function shift(period: 'day' | 'month', id: string, by: number): string {
  if (period === 'day') {
    const at = Date.parse(`${id}T00:00:00.000Z`);
    return utcDay(at + by * 86_400_000);
  }
  const [y, m] = id.split('-').map(Number);
  return utcMonth(Date.UTC(y, m - 1 + by, 1));
}

/**
 * A check's section label, resolved from the catalogue.
 *
 * The digest stores an id and an outcome and nothing else; the wording, the
 * section and the order all live in the catalogue that the processor and the
 * browser share. That is what lets a digest written last month still render
 * with this month's wording without being rewritten.
 */
function sectionLabel(checkId: string): string {
  const section = checkDefinition(checkId)?.section;
  return (section && checkSection(section)?.label) || '—';
}

export function OverviewPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<'day' | 'month'>('day');
  const [id, setId] = useState(() => utcDay(Date.now()));
  const [answer, setAnswer] = useState<Answer>({ state: 'loading', document: null });
  const [roomId, setRoomId] = useState('');

  // Switching Daily/Monthly keeps the same point in time rather than resetting
  // to today, so a reader looking at last Tuesday who switches to Monthly gets
  // that Tuesday's month.
  const switchPeriod = useCallback((next: 'day' | 'month') => {
    setId((current) => (next === 'month' ? current.slice(0, 7) : `${current}-01`));
    setPeriod(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAnswer({ state: 'loading', document: null });

    const query = period === 'day' ? `day=${id}` : `month=${id}`;
    fetch(`/api/digest?${query}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.success === false) {
          setAnswer({ state: 'failed', document: null, reason: body.error });
          return;
        }
        setAnswer({
          state: body.state ?? 'failed',
          document: body.document ?? null,
          reason: body.reason,
          supportedSchemaVersion: body.supportedSchemaVersion,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // A fetch that fails is `failed`, never zero findings. Showing an empty
        // period because the network blinked is the worst thing this page can
        // do, because it looks exactly like good news.
        setAnswer({ state: 'failed', document: null, reason: String(err?.message ?? err) });
      });

    return () => {
      cancelled = true;
    };
  }, [period, id]);

  const openRoom = useCallback(() => {
    const trimmed = roomId.trim();
    if (trimmed) router.push(`/${encodeURIComponent(trimmed)}`);
  }, [roomId, router]);

  const doc = answer.document;

  const failing = useMemo(
    () =>
      (doc?.checks ?? [])
        .filter((c) => c.counts.failed > 0)
        .sort((a, b) => b.counts.failed - a.counts.failed),
    [doc],
  );

  const unassessable = useMemo(
    () => (doc?.checks ?? []).filter((c) => c.counts.failed === 0 && c.counts.notAssessable > 0),
    [doc],
  );

  const isNow = period === 'day' ? id === utcDay(Date.now()) : id === utcMonth(Date.now());

  return (
    <div className={styles.wrapper}>
      <header className={styles.head}>
        <div className={styles.periodControls}>
          <div className={styles.toggle} role="group" aria-label="Reporting period">
            {(['day', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={period === p ? styles.toggleActive : styles.toggleBtn}
                aria-pressed={period === p}
                onClick={() => switchPeriod(p)}
              >
                {p === 'day' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>

          <div className={styles.dateNav}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setId(shift(period, id, -1))}
              aria-label={`Previous ${period}`}
            >
              &larr;
            </button>
            <input
              className={styles.dateInput}
              type={period === 'day' ? 'date' : 'month'}
              value={id}
              onChange={(e) => e.target.value && setId(e.target.value)}
              aria-label={period === 'day' ? 'Reporting day' : 'Reporting month'}
            />
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setId(shift(period, id, 1))}
              disabled={isNow}
              aria-label={`Next ${period}`}
            >
              &rarr;
            </button>
          </div>

          {/* The reporting timezone, stated rather than implied. A viewer in
              another zone must not read these figures as their own day. */}
          <span className={styles.tz} title="The digest contract keys every period by UTC date">
            UTC
          </span>
        </div>

        <div className={styles.lookup}>
          <input
            className={styles.roomInput}
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openRoom()}
            aria-label="Open a room"
          />
          <button type="button" className={styles.goBtn} onClick={openRoom}>
            Go
          </button>
        </div>
      </header>

      {answer.state === 'loading' && <div className={styles.notice}>Reading the digest&hellip;</div>}

      {answer.state === 'missing' && (
        <div className={styles.notice}>
          <strong>No digest for this {period}.</strong> Nothing has been folded for {id} yet. The
          digest server writes a summary for every period it processes — including an empty one — so
          an absent summary means it has not run for this {period}, not that nothing happened.
        </div>
      )}

      {answer.state === 'unsupported-version' && (
        <div className={styles.noticeWarn}>
          <strong>This digest was written by a newer version.</strong> {answer.reason ?? ''} This
          build implements schema v{answer.supportedSchemaVersion}. Upgrade the dashboard rather than
          reading it field by field.
        </div>
      )}

      {answer.state === 'invalid' && (
        <div className={styles.noticeWarn}>
          <strong>The digest could not be read.</strong> {answer.reason ?? ''} Something is stored at
          this key and it is not a digest this build can trust, so nothing is shown rather than a
          partial reading of it.
        </div>
      )}

      {answer.state === 'failed' && (
        <div className={styles.noticeWarn}>
          <strong>The digest could not be fetched.</strong> {answer.reason ?? ''} This is a read
          failure, not an empty period — the two look identical on a page that renders zeros, which
          is why this one does not.
        </div>
      )}

      {doc && (
        <>
          {/* Coverage before counts, always. Every number below is bounded by
              what could be assessed, and a reader who sees the totals first
              will read them as the whole truth. */}
          {(!doc.sources.complete || doc.period.provisional) && (
            <div className={styles.notice}>
              {doc.period.provisional && (
                <>
                  <strong>Provisional.</strong> This {doc.period.kind} can still gain data.{' '}
                </>
              )}
              {!doc.sources.complete && (
                <>
                  <strong>Incomplete.</strong> {doc.sources.read} of {doc.sources.found}{' '}
                  {doc.sources.kind} were read
                  {doc.sources.missingDays?.length
                    ? `, and ${doc.sources.missingDays.length} day(s) in this month have never been processed`
                    : ''}
                  {doc.sources.failures?.length
                    ? `. ${doc.sources.failures.length} source(s) failed: ${doc.sources.failures
                        .slice(0, 3)
                        .map((f) => `${f.id} (${f.reason})`)
                        .join(', ')}`
                    : '.'}
                </>
              )}
            </div>
          )}

          <div className={styles.cards}>
            <Stat label="Calls" value={doc.totals.calls} />
            <Stat label="Client sessions" value={doc.totals.clientSessions} />
            <Stat
              label="Assessed sessions"
              value={doc.totals.clientSessionsAssessed}
              hint={`of ${doc.totals.clientSessions} — the rest had too little evidence to answer any check`}
            />
            <Stat
              label="With a symptom"
              value={doc.classification?.qoeSymptom ?? 0}
              tone={(doc.classification?.qoeSymptom ?? 0) > 0 ? 'bad' : 'plain'}
              hint="sessions showing a user-experience symptom"
            />
            <Stat
              label="Transport only"
              value={doc.classification?.qosOnly ?? 0}
              hint="a transport condition with no symptom evidence — not a claim anyone noticed"
            />
            <Stat
              label="Insufficient evidence"
              value={doc.classification?.insufficientEvidence ?? 0}
              hint="could not be classified at all; not counted as healthy"
            />
          </div>

          <section className={styles.card}>
            <h3 className={styles.title}>Findings</h3>
            {failing.length === 0 ? (
              <p className={styles.empty}>
                No check failed for any session in this {doc.period.kind}
                {unassessable.length > 0 && (
                  <>
                    {' '}
                    — though {unassessable.length} check(s) could not be answered for someone. That
                    is not the same as a clean {doc.period.kind}
                  </>
                )}
                .
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Check</th>
                      <th>Section</th>
                      <th className={styles.num}>Sessions failed</th>
                      <th className={styles.num}>of assessed</th>
                      <th className={styles.num}>Calls</th>
                      <th className={styles.num}>Duration</th>
                      {/* A header for the drilldown column. Empty to the eye,
                          named to a screen reader: a column with no header is
                          announced as nothing at all. */}
                      <th>
                        <span className={styles.srOnly}>Drilldown</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {failing.map((roll) => {
                      const assessed = roll.counts.passed + roll.counts.failed;
                      const affected = doc.affected?.find((a) => a.id === roll.id);
                      const firstCall = affected?.calls?.[0];
                      return (
                        <tr key={roll.id}>
                          <td>
                            <span className={styles.symFail} aria-hidden="true">
                              {OUTCOME_SYMBOLS.failed}
                            </span>
                            <span className={styles.srOnly}>{OUTCOME_LABELS.failed}: </span>
                            {checkQuestion(roll.id)}
                          </td>
                          <td className={styles.muted}>{sectionLabel(roll.id)}</td>
                          <td className={styles.num}>{roll.counts.failed}</td>
                          {/* The denominator is assessed sessions, not all of
                              them: a rate over sessions that could not be
                              answered would understate the problem. */}
                          <td className={styles.num}>
                            {assessed}
                            {assessed > 0 && (
                              <span className={styles.muted}>
                                {' '}
                                ({Math.round((roll.counts.failed / assessed) * 100)}%)
                              </span>
                            )}
                          </td>
                          <td className={styles.num}>{roll.callsAffected ?? '—'}</td>
                          <td className={styles.num}>
                            {roll.failedSeconds === undefined || roll.failedSeconds === null ? (
                              <span
                                className={styles.muted}
                                title="This rule has no duration — it is a point observation, not an interval"
                              >
                                —
                              </span>
                            ) : (
                              `${Math.round(roll.failedSeconds)}s`
                            )}
                          </td>
                          <td>
                            {firstCall && (
                              <a
                                className={styles.link}
                                href={`/${encodeURIComponent(firstCall.roomId)}/${encodeURIComponent(firstCall.callId)}#call-findings`}
                              >
                                Open a call &rarr;
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {unassessable.length > 0 && (
            <section className={styles.card}>
              <h3 className={styles.title}>Could not be answered</h3>
              <p className={styles.empty}>
                These checks reached no verdict for at least one session, because the evidence they
                need was absent, partial or reset. They are listed separately rather than counted as
                passes.
              </p>
              <ul className={styles.plainList}>
                {unassessable.map((roll) => (
                  <li key={roll.id}>
                    <span className={styles.symUnknown} aria-hidden="true">
                      {OUTCOME_SYMBOLS['not-assessable']}
                    </span>
                    <span className={styles.srOnly}>{OUTCOME_LABELS['not-assessable']}: </span>
                    {checkQuestion(roll.id)}{' '}
                    <span className={styles.muted}>
                      — {roll.counts.notAssessable} of {roll.counts.evaluated} session(s)
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className={styles.provenance}>
            Rules {doc.provenance.rulesVersion} · schema v{doc.provenance.schemaVersion} · generated{' '}
            {doc.provenance.generatedAt} · {orderedSections().length} sections
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'plain',
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'plain' | 'bad';
}) {
  return (
    <div className={styles.stat} title={hint}>
      <div className={tone === 'bad' ? styles.statValueBad : styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}
