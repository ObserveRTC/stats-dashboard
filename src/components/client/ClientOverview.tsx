'use client';
import { useCallback, useMemo, useState } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { MediasoupRouterSample } from '../../schema/MediasoupRouter.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import type { ClientServerData } from '../../utils/routerServerData.ts';
import { buildSessionSummary } from '../../utils/sessionSummary.ts';
import { buildClientRollups } from '../../utils/clientRollups.ts';
import { WARMUP_SECONDS } from '../../constants.ts';
import { ClientScoreChart } from '../report/ClientScoreChart.tsx';
import { CpuUsagePanel } from '../report/CpuUsagePanel.tsx';
import { ScoreExplanation } from '../report/ScoreExplanation.tsx';
import { ScoreReasonsBrowser } from '../report/ScoreReasonsBrowser.tsx';
import { HealthColumns } from '../report/HealthColumns.tsx';
import { TransmissionCharts, hasTransmissionData } from '../report/TransmissionCharts.tsx';
import { SfuMappingCard } from '../sfu/SfuMappingCard.tsx';
import { AttachmentsCard } from '../sections/AttachmentsCard.tsx';
import { Tabs, type TabDef } from '../sections/Tabs.tsx';
import styles from './ClientOverview.module.css';

interface ClientOverviewProps {
  processedStats: ProcessWebRTCStatsResult;
  clientStats?: ClientSample[] | null;
  serverData: ClientServerData;
  routerSamples: Map<string, MediasoupRouterSample>;
  eventBus?: EventTarget;
  clientLabel?: string;
}

/**
 * Startup ramp distorts every aggregate, so the same warm-up boundary the rest
 * of the report uses is derived here: the first sample of any RTP or candidate
 * pair series, plus the configured window.
 */
function warmupEndOf(processedStats: ProcessWebRTCStatsResult): number {
  const ts = processedStats.timeSeries ?? {};
  let earliest = Infinity;
  for (const group of [ts.candidatePairs, ts.inboundRtp, ts.outboundRtp]) {
    for (const series of Object.values(group ?? {})) {
      const values = (series as { values?: Array<{ timestamp?: Date | number }> }).values;
      const first = values?.[0]?.timestamp;
      if (first == null) continue;
      earliest = Math.min(earliest, first instanceof Date ? first.getTime() : first);
    }
  }
  return Number.isFinite(earliest) ? earliest + WARMUP_SECONDS * 1000 : 0;
}

/**
 * The head of the client report: tabs over the client as a whole.
 *
 * Overall health leads because its cards answer "was this call fine" at a
 * glance; the score chart sits second, where the *shape* of the score over time
 * is one click away and its latest value is already on the tab. These are
 * alternatives rather than a sequence, which is why they are tabs and not
 * stacked sections.
 */
export function ClientOverview({
  processedStats,
  clientStats,
  serverData,
  routerSamples,
  eventBus,
  clientLabel,
}: ClientOverviewProps) {
  // Shared by the score chart and the reasons browser below it.
  const [selectedSample, setSelectedSample] = useState<number | null>(null);
  /**
   * Bumped when the *chart* picks a sample, so the reasons browser opens and
   * scrolls to itself.
   *
   * Only the chart bumps it. A click on a row in the browser also moves the
   * selection, and revealing a section the viewer is already inside would
   * scroll the page for no reason.
   */
  const [reasonsReveal, setReasonsReveal] = useState(0);
  const selectFromChart = useCallback((timestamp: number) => {
    setSelectedSample(timestamp);
    setReasonsReveal((n) => n + 1);
  }, []);

  const warmupEnd = useMemo(() => warmupEndOf(processedStats), [processedStats]);

  const summary = useMemo(
    () => buildSessionSummary(processedStats, clientStats, { warmupEnd }),
    [processedStats, clientStats, warmupEnd],
  );
  const rollups = useMemo(() => buildClientRollups(processedStats), [processedStats]);

  // Root-level attachments from the first ClientSample that has them.
  const rootAttachments = useMemo<Record<string, unknown> | null>(() => {
    for (const s of clientStats ?? []) {
      if (s.attachments && Object.keys(s.attachments).some((k) => s.attachments![k] != null)) {
        return s.attachments as Record<string, unknown>;
      }
    }
    return null;
  }, [clientStats]);

  const cpuBadge = summary.cpu.max != null ? `${summary.cpu.max.toFixed(0)}%` : undefined;

  // The latest score rides on the tab, so the headline number stays readable
  // without opening its panel.
  const latestScore = useMemo(() => {
    const series = (processedStats.scores?.session ?? []).filter((v) => v.score > 0);
    return series.length > 0 ? series[series.length - 1].score : null;
  }, [processedStats]);

  const pcCount = processedStats.peerConnections.length;
  const outboundCount = Object.keys(processedStats.timeSeries.outboundRtp).length;
  const inboundCount = Object.keys(processedStats.timeSeries.inboundRtp).length;
  const icePairCount = processedStats.peerConnections.reduce(
    (acc, pc) => acc + pc.candidatePairs.length,
    0,
  );

  const shape = (
    <>
      <span><span className={styles.shapeLabel}>PCs:</span> {pcCount}</span>
      <span><span className={styles.shapeLabel}>Outbound streams:</span> {outboundCount}</span>
      <span><span className={styles.shapeLabel}>Inbound streams:</span> {inboundCount}</span>
      <span><span className={styles.shapeLabel}>ICE pairs:</span> {icePairCount}</span>
    </>
  );

  const tabs: TabDef[] = [
    {
      id: 'health',
      label: 'Overall health',
      badge: summary.issues.total > 0 ? summary.issues.total : undefined,
      render: () => <HealthColumns summary={summary} footer={shape} />,
    },
    {
      id: 'score',
      label: 'Quality score',
      badge: latestScore != null ? latestScore.toFixed(1) : undefined,
      render: () => (
        <>
          {/* The chart and the browser are two views of one selection: clicking
              a point opens the browser, brings it on screen and parks it on
              that sample, and picking a sample below moves the chart's marker.
              The browser sits below a whole explanation card, so parking it
              without revealing it looked like nothing had happened. */}
          <ClientScoreChart
            processedStats={processedStats}
            selectedTimestamp={selectedSample}
            onSelectSample={selectFromChart}
          />
          <ScoreExplanation processedStats={processedStats} warmupEnd={warmupEnd} />
          <ScoreReasonsBrowser
            processedStats={processedStats}
            selectedTimestamp={selectedSample}
            onSelectSample={setSelectedSample}
            revealToken={reasonsReveal}
          />
        </>
      ),
    },
    {
      id: 'sfu',
      label: 'SFU mapping',
      badge: serverData.empty ? undefined : serverData.producers.length + serverData.consumers.length,
      render: () => (
        <SfuMappingCard
          serverData={serverData}
          routerSamples={routerSamples}
          processedStats={processedStats}
          embedded
        />
      ),
    },
    {
      id: 'transmission',
      label: 'Transmission',
      render: () =>
        hasTransmissionData(rollups) ? (
          <TransmissionCharts
            rollups={rollups}
            eventBus={eventBus}
            clientLabel={clientLabel}
          />
        ) : (
          <p className={styles.empty}>No RTP bitrate was reported for this client.</p>
        ),
    },
    {
      id: 'cpu',
      label: 'CPU usage',
      badge: cpuBadge,
      render: () => (
        <CpuUsagePanel
          processedStats={processedStats}
          eventBus={eventBus}
          clientLabel={clientLabel}
        />
      ),
    },
    {
      id: 'attachments',
      label: 'Client attachments',
      badge: rootAttachments ? Object.keys(rootAttachments).length : undefined,
      render: () =>
        rootAttachments ? (
          <AttachmentsCard attachments={rootAttachments} title="Client attachments" />
        ) : (
          <p className={styles.empty}>
            This client attached nothing to its samples. Applications use the root{' '}
            <code>attachments</code> to carry their own identifiers — a user id, a room role, a
            build number — which is what makes a report searchable by something other than a UUID.
          </p>
        ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <Tabs tabs={tabs} label="Client overview" />
    </div>
  );
}
