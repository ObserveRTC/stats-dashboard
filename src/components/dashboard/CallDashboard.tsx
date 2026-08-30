'use client';
import { useCallback, useMemo } from 'react';
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
    <div className={styles.root}>
      <div className={styles.stack}>
        <StatCards cards={model.statCards} />
        <CallFactsCard groups={model.factGroups} />
        <QualityChart
          chart={model.qualityChart}
          startLabel={model.startLabel}
          endLabel={model.endLabel}
        />
        <SfuTopologyCard topology={model.topology} />
        <RoutersCard rows={model.routerRows} />
        <ClientsCard
          clients={model.clients}
          onView={onViewClient}
          onLoad={onLoadClient}
          onLoadAll={handleLoadAll}
        />
        <DiagnosticsCard context={diagnosticContext} />

        {/* One section per router, in the order the topology lists them: the
            SFU's own account of what it held, before any of it is attributed
            to a client. */}
        {[...routerSamples.entries()].map(([routerId, sample]) => (
          <RouterDetailSection key={routerId} routerId={routerId} sample={sample} />
        ))}
        <CallObjectBrowser roomId={roomId} callId={callId} objectNames={objectNames} />
      </div>
    </div>
  );
}
