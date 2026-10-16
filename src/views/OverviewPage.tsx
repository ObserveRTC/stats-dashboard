'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  OUTCOME_LABELS,
  OUTCOME_SYMBOLS,
  checkDefinition,
  checkQuestion,
  checkSection,
  type PeriodSummary,
} from '../digest/index.ts';
import styles from './OverviewPage.module.css';
import { OverviewQualityPanels } from '../components/digest/OverviewQualityPanels.tsx';
import { overviewSelection } from '../utils/overviewQuality.ts';
import { BASE_URL } from '../api/client.ts';

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
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  useEffect(() => {
    if (selectedCheck) document.getElementById('overview-affected')?.scrollIntoView({block:'start'});
  }, [selectedCheck, answer.state]);

  const [selectionReady, setSelectionReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      const selection = overviewSelection(window.location.search);
      setPeriod(selection.period); setId(selection.id);
      const issue = new URLSearchParams(window.location.search).get('issue');
      setSelectedCheck(issue && checkDefinition(issue) ? issue : null);
      setSelectionReady(true);
    };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const selectPeriod = useCallback((next: 'day' | 'month', wanted: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('day'); url.searchParams.delete('month'); url.searchParams.delete('issue');
    url.searchParams.set(next, wanted);
    window.history.pushState(window.history.state, '', url);
    setPeriod(next); setId(wanted); setSelectedCheck(null);
  }, []);
  const switchPeriod = useCallback((next: 'day' | 'month') => {
    if (next !== period) selectPeriod(next, next === 'month' ? id.slice(0,7) : `${id}-01`);
  }, [period, id, selectPeriod]);
  const selectCheck = useCallback((check: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('day'); url.searchParams.delete('month');
    url.searchParams.set(period, id);
    if (check) url.searchParams.set('issue', check); else url.searchParams.delete('issue');
    window.history.pushState(window.history.state, '', url);
    setSelectedCheck(check);
  }, [period, id]);

  useEffect(() => {
    if (!selectionReady) return;
    let cancelled = false;
    setAnswer({ state: 'loading', document: null });

    const query = period === 'day' ? `day=${id}` : `month=${id}`;
    fetch(`${BASE_URL}/api/digest?${query}`)
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
  }, [period, id, selectionReady]);

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
      <div className={styles.pageTitle}><h1>Quality overview</h1><p>Call and client quality from saved daily and monthly analytics.</p></div>
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
              onClick={() => selectPeriod(period, shift(period, id, -1))}
              aria-label={`Previous ${period}`}
            >
              &larr;
            </button>
            <input
              className={styles.dateInput}
              type={period === 'day' ? 'date' : 'month'}
              value={id}
              onChange={(e) => e.target.value && selectPeriod(period, e.target.value)}
              aria-label={period === 'day' ? 'Reporting day' : 'Reporting month'}
            />
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => selectPeriod(period, shift(period, id, 1))}
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
              value={doc.classification?.qoeSymptom ?? null}
              tone={(doc.classification?.qoeSymptom ?? 0) > 0 ? 'bad' : 'plain'}
              hint="sessions showing a user-experience symptom"
            />
            <Stat
              label="Transport only"
              value={doc.classification?.qosOnly ?? null}
              hint="a transport condition with no symptom evidence — not a claim anyone noticed"
            />
            <Stat
              label="Insufficient evidence"
              value={doc.classification?.insufficientEvidence ?? null}
              hint="could not be classified at all; not counted as healthy"
            />
          </div>

          <OverviewQualityPanels document={doc} />

          <section className={styles.card}>
            <h3 className={styles.title}>Quality issues</h3>
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
                            {firstCall && <button type="button" className={styles.drillButton} aria-controls="overview-affected" aria-expanded={selectedCheck === roll.id} onClick={() => selectCheck(selectedCheck === roll.id ? null : roll.id)}>View affected calls →</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

                {selectedCheck && (() => {
            const affected = doc.affected?.find(a => a.id === selectedCheck);
            return <section id="overview-affected" className={styles.card} aria-live="polite"><div className={styles.affectedHead}><h3 className={styles.title}>{checkQuestion(selectedCheck)}</h3><button type="button" className={styles.drillButton} onClick={() => selectCheck(null)}>Close</button></div>
              {affected?.truncated && <p className={styles.empty}>This digest contains a capped navigation list. Issue totals above may be larger.</p>}
              <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Room / call</th><th>Client</th><th>Investigate</th></tr></thead><tbody>
                {(affected?.clientSessions ?? []).map(c => <tr key={`${c.roomId}/${c.callId}/${c.clientId}`}><td>{c.roomId} / {c.callId.slice(0,8)}…</td><td>{c.displayName || c.clientId}</td><td><a className={styles.link} href={`/${[c.roomId,c.callId].map(encodeURIComponent).join('/')}#call-findings`}>Call findings</a> · <a className={styles.link} href={`/${[c.roomId,c.callId,c.clientId].map(encodeURIComponent).join('/')}#client-overview/findings`}>Client findings →</a></td></tr>)}
                {(affected?.calls ?? []).filter(c => !affected?.clientSessions?.some(s => s.callId === c.callId && s.roomId === c.roomId)).map(c => <tr key={`${c.roomId}/${c.callId}`}><td>{c.roomId} / {c.callId.slice(0,8)}…</td><td>Not listed in digest</td><td><a className={styles.link} href={`/${[c.roomId,c.callId].map(encodeURIComponent).join('/')}#call-findings`}>Call findings →</a></td></tr>)}
              </tbody></table></div>
            </section>;
          })()}

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



        </>
      )}
      <footer className={styles.branding}>
        Powered by <a href="https://observertc.org/" target="_blank" rel="noopener noreferrer">ObserveRTC</a>
      </footer>
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
  value: number | null;
  hint?: string;
  tone?: 'plain' | 'bad';
}) {
  return (
    <div className={styles.stat} title={hint}>
      <div className={tone === 'bad' ? styles.statValueBad : styles.statValue}>{value ?? '—'}</div>
      <div className={styles.statLabel}>{label}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}
