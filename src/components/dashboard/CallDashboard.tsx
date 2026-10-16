'use client';
import { useCallback, useEffect, useMemo } from 'react';
import type { CallSession, CallSummary, MediasoupRouterSample } from '../../api/types.ts';
import { buildDashboardModel } from '../../utils/dashboardModel.ts';
import { useClientLoadStore } from '../../stores/clientLoadStore.ts';
import { StatCards } from './StatCards.tsx';
import { CallFactsCard } from './CallFactsCard.tsx';
import { QualityChart } from './QualityChart.tsx';
import { SfuTopologyCard } from './SfuTopologyCard.tsx';
import { RoutersCard } from './RoutersCard.tsx';
import { ClientsCard } from './ClientsCard.tsx';
import { DiagnosticsCard } from './DiagnosticsCard.tsx';
import { CallObjectBrowser } from './CallObjectBrowser.tsx';
import { RouterDetailSection } from './RouterDetailSection.tsx';
import styles from './CallDashboard.module.css';
import { useCallDigest } from '../../hooks/useCallDigest.ts';
import { QualityFindings, DigestNotice } from '../digest/QualityFindings.tsx';
import { orderedSections } from '../../digest/index.ts';

/**
 * The call quality dashboard.
 *
 * Cards follow the Nocturne "Call Quality Dashboard" design, stacked in one
 * column inside the same 1200px container the individual client report uses,
 * so the two pages line up. The page-level chrome (breadcrumbs, theme
 * toggle) comes from the app layout.
 */
export function CallDashboard({
  callSession,
  callSummary,
  routerSamples,
  objectNames,
  roomId,
  callId,
  onViewClient,
  onLoadClient,
  onLoadAllClients,
}: {
  callSession: CallSession;
  callSummary: CallSummary | null;
  routerSamples: Map<string, MediasoupRouterSample>;
  /** Raw call-folder object names, for the samples browser. */
  objectNames: string[];
  roomId: string;
  callId: string;
  onViewClient: (clientId: string) => void;
  /** Fetch and process one client's stats in place. */
  onLoadClient: (clientId: string) => void;
  /** Start every client that has not been loaded yet, in parallel. */
  onLoadAllClients: (clientIds: string[]) => void;
}) {
  // Subscribed rather than read once: each row settles on its own, so the
  // model rebuilds as loads land instead of waiting for all of them.
  const digest = useCallDigest(roomId, callId);
  const ready = digest.state === 'ready' ? digest.document : null;
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (ready && (hash === 'call-findings' || hash.startsWith('findings-'))) {
      document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    }
  }, [ready]);

  const loadedClients = useClientLoadStore((s) => s.entries);

  const model = useMemo(
    () => buildDashboardModel(callSession, callSummary, routerSamples, loadedClients),
    [callSession, callSummary, routerSamples, loadedClients],
  );

  const handleLoadAll = useCallback(() => {
    onLoadAllClients(
      model.clients
        .filter((p) => p.loadStatus === 'idle' || p.loadStatus === 'error')
        .map((p) => p.clientId),
    );
  }, [model.clients, onLoadAllClients]);

  const diagnosticContext = useMemo(() => ({ routerSamples }), [routerSamples]);

  return (
    <div className={`${styles.root} ${styles.withNavigation}`}>
      <nav className={styles.sideNav} aria-label="Call analysis">
        <strong>Call analysis</strong>
        {[['call-summary','Call summary'],['call-clients','Clients'],['call-quality','Quality per client'],['call-topology','SFU topology'],['call-routers','Routers'],['call-diagnostics','Diagnostics'],['call-samples','Sample browser']].map(([id,label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        {ready && <><strong>From quality digest</strong><a href="#call-findings">All quality checks</a>{orderedSections().map(s => <a key={s.id} href={`#findings-${s.id}`}>{s.label}</a>)}</>}
      </nav>
      <div className={styles.stack}>
        <DigestNotice answer={digest} />
        <div id="call-summary" className={styles.stack}>
        <StatCards cards={model.statCards} />
        <CallFactsCard groups={model.factGroups} />
        {ready && <aside className={styles.digestSummary}><strong>Quality digest available</strong><p>{ready.coverage.clientsAssessed} / {ready.coverage.clientsObserved} clients assessed · {ready.checks.filter(c => c.counts.failed > 0).length} checks with failures. <a href="#call-findings">Review quality checks →</a></p></aside>}
        </div>
        {ready && <section id="call-findings"><QualityFindings clients={ready.clients} roomId={roomId} callId={callId} />{ready.coverage.limitations?.map((text,i) => <p key={i}>{text}</p>)}</section>}
        <div id="call-quality"><QualityChart
          chart={model.qualityChart}
          startLabel={model.startLabel}
          endLabel={model.endLabel}
        />
        </div>
        <div id="call-topology"><SfuTopologyCard topology={model.topology} /></div>
        <div id="call-routers"><RoutersCard rows={model.routerRows} /></div>
        <div id="call-clients"><ClientsCard
          clients={model.clients}
          onView={onViewClient}
          onLoad={onLoadClient}
          onLoadAll={handleLoadAll}
          findingsHref={clientId => ready?.clients.some(c => c.clientId === clientId) ? `/${[roomId,callId,clientId].map(encodeURIComponent).join('/')}#client-overview/findings` : undefined}
        />
        </div>
        <div id="call-diagnostics"><DiagnosticsCard context={diagnosticContext} /></div>

        {/* One section per router, in the order the topology lists them: the
            SFU's own account of what it held, before any of it is attributed
            to a client. */}
        {[...routerSamples.entries()].map(([routerId, sample]) => (
          <RouterDetailSection key={routerId} routerId={routerId} sample={sample} />
        ))}
        <div id="call-samples"><CallObjectBrowser roomId={roomId} callId={callId} objectNames={objectNames} /></div>
      </div>
    </div>
  );
}
