import type { PeriodSummary } from '../../digest/types.ts';
import { overviewQuality } from '../../utils/overviewQuality.ts';
import styles from './OverviewQualityPanels.module.css';

export function OverviewQualityPanels({ document: doc }: {document: PeriodSummary}) {
  const {classifications, sections, coverage} = overviewQuality(doc);
  const buckets = doc.trend?.buckets ?? [];
  const max = Math.max(1, ...buckets.map(b => b.clientSessions));
  return <div className={styles.grid}>
    <section className={`${styles.panel} ${styles.wide}`}>
      <header><h3>Quality over the {doc.period.kind}</h3><p>Sessions grouped by their start {doc.trend?.bucket || 'time'} · UTC. Failed checks include QoS and data-confidence checks.</p></header>
      {buckets.length ? <>
        <div className={styles.legend}><span><i data-tone="sessions"/>Observed client sessions</span><span><i data-tone="symptom"/>Sessions with a failed check</span></div>
        <div className={styles.chart} role="img" aria-label="Client sessions and sessions with failed checks by UTC start bucket">
          <div className={styles.axis}><span>{max} sessions</span><span>0</span></div>
          <div className={styles.buckets}>{buckets.map(b => <div className={styles.bucket} key={b.at} title={`${b.at}: ${b.clientSessionsFailed} with failures / ${b.clientSessions} observed`}>
            <div className={styles.columns}><span style={{height: `${b.clientSessions/max*100}%`}}/><span data-tone="symptom" style={{height: `${b.clientSessionsFailed/max*100}%`}}/></div>
            <span className={styles.tick}>{doc.trend?.bucket === 'day' ? Number(b.at.slice(8,10)) : b.at.slice(11,13)}</span>
          </div>)}</div>
        </div>
        <details className={styles.values}><summary>View chart values</summary><div className={styles.tableWrap}><table><thead><tr><th>UTC start</th><th>Observed sessions</th><th>With failed checks</th><th>Assessed sessions</th></tr></thead><tbody>{buckets.map(b => <tr key={b.at}><td>{b.at}</td><td>{b.clientSessions}</td><td>{b.clientSessionsFailed}</td><td>{b.clientSessionsAssessed ?? 'Unavailable'}</td></tr>)}</tbody></table></div></details>
      </> : <p>No trend buckets are available in this digest.</p>}
    </section>
    <section className={styles.panel}><h3>Client experience</h3><p>Disjoint client-session classifications.</p>
      {classifications.length ? <><div className={styles.stack} role="img" aria-label={classifications.map(c=>`${c.label}: ${c.count}`).join(', ')}>{classifications.map(c => <span key={c.tone} data-tone={c.tone} style={{flex:c.count}}/>)}</div>
      <ul className={styles.classifications}>{classifications.map(c => <li key={c.tone}><span><i data-tone={c.tone}/>{c.label}</span><strong>{c.count}</strong></li>)}</ul></> : <p>Classification was not provided by this digest.</p>}
    </section>
    <section className={styles.panel}><h3>Assessment coverage</h3><div className={styles.big}>{coverage === null ? '—' : `${(coverage*100).toFixed(1)}%`}</div><p>Of observed client time assessed; this is evidence coverage, not a quality score.</p>
      <div className={styles.stack} role="img" aria-label={`${doc.totals.assessedSeconds}s assessed, ${doc.totals.unassessedSeconds}s unassessed`}><span data-tone="passed" style={{flex:doc.totals.assessedSeconds}}/><span data-tone="unknown" style={{flex:doc.totals.unassessedSeconds}}/></div>
      <ul className={styles.classifications}><li><span>Assessed client time</span><strong>{doc.totals.assessedSeconds?.toFixed(1) ?? '—'}s</strong></li><li><span>Unassessed client time</span><strong>{doc.totals.unassessedSeconds?.toFixed(1) ?? '—'}s</strong></li><li><span>Readable source {doc.sources.kind}</span><strong>{doc.sources.read} / {doc.sources.found}</strong></li><li><span>Missing source days</span><strong>{doc.sources.missingDays?.length ?? 0}</strong></li></ul>
    </section>
    <section className={`${styles.panel} ${styles.wide}`}><h3>Where checks found problems</h3><p>Check outcomes across client sessions. One client can contribute to multiple checks; these are not unique affected clients.</p>
      <div className={styles.legend}>{[['symptom','Failed'],['passed','Passed'],['unknown','Not assessable'],['ineligible','Not applicable']].map(([tone,label])=><span key={tone}><i data-tone={tone}/>{label}</span>)}</div>
      {sections.map(s => <div className={styles.sectionRow} key={s.id}><span>{s.label}</span><div className={styles.stack} role="img" aria-label={`${s.label}: ${s.failed} failed, ${s.passed} passed, ${s.unknown} not assessable, ${s.ineligible} not applicable`}>{[['symptom',s.failed],['passed',s.passed],['unknown',s.unknown],['ineligible',s.ineligible]].map(([tone,n])=><span key={tone} data-tone={tone} style={{flex:Number(n)}}/>)}</div><span>{s.failed} failed / {s.failed+s.passed} assessed</span></div>)}
    </section>
  </div>;
}
