'use client';
import { checkDefinition, checkQuestion, orderedSections, OUTCOME_LABELS, OUTCOME_SYMBOLS } from '../../digest/index.ts';
import type { ClientDigest } from '../../digest/types.ts';
import type { DigestAnswer } from '../../hooks/useCallDigest.ts';
import { clientEvidenceHref } from '../../utils/digestNavigation.ts';
import styles from './QualityFindings.module.css';

export function DigestNotice({ answer }: { answer: DigestAnswer }) {
  if (answer.state === 'ready') return null;
  const labels = { loading: 'Loading quality digest…', missing: 'Quality digest is missing', invalid: 'Quality digest is invalid', 'unsupported-version': 'Quality digest version is unsupported', failed: 'Quality digest could not be loaded' };
  return <aside className={styles.notice} role="status"><strong>{labels[answer.state]}</strong><p>Existing analytics and raw samples remain available.</p>{answer.reason && <p>{answer.reason}</p>}</aside>;
}
export function QualityFindings({ clients, roomId, callId, section }: { clients: ClientDigest[]; roomId: string; callId: string; section?: string }) {
  return <div className={styles.root}><h2>Quality findings</h2>{clients.length === 0 && <p>No client assessments are present in this digest.</p>}{orderedSections().filter(s => !section || s.id === section).map(s => <section id={`findings-${s.id}`} key={s.id}><h3>{s.label}</h3>{clients.map(client => {
    const checks = client.checks.filter(c => checkDefinition(c.id)?.section === s.id);
    if (!checks.length) return null;
    return <div key={client.clientId}><h4><a href={clientEvidenceHref(roomId, callId, client.clientId)}>{client.displayName || client.clientId}</a></h4><p className={styles.coverage}>{client.coverage.assessedSeconds.toFixed(1)}s assessed / {client.coverage.observedSeconds.toFixed(1)}s observed · {client.coverage.unassessedSeconds.toFixed(1)}s unassessed</p>{checks.map((check, i) => <details className={styles.check} key={`${check.id}-${i}`}><summary><span aria-hidden="true">{OUTCOME_SYMBOLS[check.outcome]}</span> {checkQuestion(check.id)} <span className={styles.outcome} data-outcome={check.outcome}>{OUTCOME_LABELS[check.outcome]}</span></summary><div className={styles.detail}><p>{check.rule || checkDefinition(check.id)?.rule}</p>{check.why && <p>{check.why}</p>}{check.subject && <p>Subject: {check.subject.kind} {check.subject.id}</p>}{check.interval && <p>UTC interval: {check.interval.from} – {check.interval.to}</p>}{check.observed?.map((v,j) => <p key={j}>{v.label}: <strong>{v.value ?? 'Unavailable'}</strong> {v.unit !== 'none' && v.unit}{v.threshold != null && <> · threshold {v.threshold} {v.unit}</>}</p>)}{check.issues?.map((issue,j) => <p key={`i${j}`}>Issue: {issue.type} · {issue.at}</p>)}{check.events?.map((event,j) => <p key={`e${j}`}>Event: {event.type} · {event.at}</p>)}{check.evidence?.map((e,j) => <p key={`r${j}`}><a href={clientEvidenceHref(roomId,callId,client.clientId,e)}>Open {e.target === 'samples' ? 'sample browser' : e.target} evidence →</a>{e.id && <span> · resource {e.id}</span>}{e.interval && <span> · {e.interval.from} – {e.interval.to}</span>}</p>)}</div></details>)}</div>;
  })}</section>)}</div>;
}
