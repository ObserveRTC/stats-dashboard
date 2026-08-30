'use client';
import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore, useCallStore, usePaneStore } from '../stores/index.ts';
import { useStatsWorker, useEventBus } from '../hooks/index.ts';
import { processWebRTCStats, extractClientMeta } from '../utils/statsProcessor.ts';
import { clientLabel, shortId } from '../utils/formatting.ts';
import { buildQualityLimitationTimelines } from '../utils/qualityTimelines.ts';
import { getEffectiveClientStats } from '../utils/clockSkew.ts';
import { ensureCallContext, resetCallContextIfChanged } from '../utils/callContext.ts';
import { loadClientPane } from '../utils/clientPaneLoader.ts';
import {
  buildClientServerData,
  buildRouterIndex,
  buildProducerOwnership,
  collectClientRtpIds,
  findRouterProducer,
} from '../utils/routerServerData.ts';
import { findUnmatchedRtp } from '../utils/unmatchedRtp.ts';
import { buildClientTrackIndex } from '../utils/clientTracks.ts';
import { extractStreamRecordingIdEvents } from '../schema/RecordingClientEventTypes.ts';
import { ClientBar } from '../components/report/ClientBar.tsx';
import { ClientContextSection } from '../components/context/ClientContextSection.tsx';
import { TabVisibilityProvider } from '../components/charts/tabVisibilityContext.tsx';
import { UnassociatedTracksSection } from '../components/sections/UnassociatedTracksSection.tsx';
import { MediaOverview } from '../components/report/MediaOverview.tsx';
import { ClientRecordingsSection } from '../components/report/ClientRecordingsSection.tsx';
import { UnmatchedRtpSection } from '../components/report/UnmatchedRtpSection.tsx';
import { TransportSection } from '../components/transport/TransportSection.tsx';
import { CollapsibleSection } from '../components/sections/CollapsibleSection.tsx';
import { CompareModal } from '../components/compare/CompareModal.tsx';
import { ProducerConsumerCompare } from '../components/compare/ProducerConsumerCompare.tsx';
import { LoadingSpinner } from '../components/layout/LoadingSpinner.tsx';
import { ClientOverview } from '../components/client/ClientOverview.tsx';
import { SampleBrowser } from '../components/client/SampleBrowser.tsx';
import { OutboundRtpSection } from '../components/outbound/OutboundRtpSection.tsx';
import { InboundRtpSection } from '../components/inbound/InboundRtpSection.tsx';
import { MediaSourcesSection } from '../components/pc/MediaSourcesSection.tsx';
import { IceCandidatesSection } from '../components/pc/IceCandidatesSection.tsx';
import { DataChannelsOverview } from '../components/datachannels/DataChannelsOverview.tsx';
import { ProducerSection } from '../components/producer/ProducerSection.tsx';
import { StreamsOverviewTimeline } from '../components/charts/StreamsOverviewTimeline.tsx';
import { ConsumerSection } from '../components/consumer/ConsumerSection.tsx';
import { ClientIssuesSection } from '../components/report/ClientIssuesSection.tsx';
import { AudioGlitchSection } from '../components/report/AudioGlitchSection.tsx';
import sectionStyles from '../components/sections/CollapsibleSection.module.css';
import styles from './ClientPage.module.css';

interface CompareTarget {
  consumerId: string;
  producerId: string;
  producingClientId: string | null;
}

export function ClientPage() {
  const params = useParams() ?? {};
  const roomId = (params.roomId as string) ?? '';
  const callId = (params.callId as string) ?? '';
  const clientId = (params.clientId as string) ?? '';

  const { showBanner, clearBanner } = useAppStore();
  const decompressStats = useStatsWorker();
  const { bus: eventBus } = useEventBus();

  // Start loading=true only when the pane isn't already in the store.
  // This prevents a blank/spinner flash when navigating back to a cached client.
  const [loading, setLoading] = useState(
    () => (clientId ? !usePaneStore.getState().panes.has(clientId) : false),
  );
  const prevCallRef = useRef<string>('');

  // Clear all cached panes only when switching to a different call.
  useEffect(() => {
    if (prevCallRef.current && prevCallRef.current !== callId) {
      resetCallContextIfChanged(roomId, callId);
    }
    prevCallRef.current = callId;
  }, [roomId, callId]);

  const loadReport = useCallback(
    async (cid: string, signal?: AbortSignal) => {
      // The SFU side of the page needs the call's router samples, and the
      // client chips need the client list. Landing straight on a client URL
      // means neither is loaded yet, so pull them in alongside the stats.
      const contextPromise = ensureCallContext(roomId, callId, signal);

      if (usePaneStore.getState().panes.has(cid)) {
        setLoading(false);
        await contextPromise;
        return;
      }

      setLoading(true);
      clearBanner();
      try {
        const [ok] = await Promise.all([
          loadClientPane(roomId, callId, cid, decompressStats, signal),
          contextPromise,
        ]);
        if (!ok && !signal?.aborted) {
          showBanner('No stats found for this client.', 'error');
        }
      } catch (err) {
        if (signal?.aborted) return;
        if ((err as Error).name !== 'AbortError') {
          showBanner(err instanceof Error ? err.message : 'Failed to load report.', 'error');
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [roomId, callId, decompressStats, showBanner, clearBanner],
  );

  useEffect(() => {
    if (!clientId) return;
    const ac = new AbortController();
    loadReport(clientId, ac.signal);
    return () => ac.abort();
  }, [clientId, loadReport]);

  /* ── client-side stats ─────────────────────────────── */

  const entry = usePaneStore((s) => s.panes.get(clientId));
  const clockOffsetMs = entry?.clockOffsetMs;
  const clockOffsetMode = entry?.clockOffsetMode;

  const routerSamples = useCallStore((s) => s.routerSamples);
  const producerOwners = useCallStore((s) => s.producerOwners);
  const callSession = useCallStore((s) => s.callSession);

  // Two passes, because clock-skew detection needs the SFU's view of this
  // client and the SFU view is what tells us how far off the client clock is.
  //
  // The first pass processes the raw samples purely to read the producer /
  // consumer ids out of them. Attribution depends only on ids, never on
  // timestamps, so the mapping is identical before and after any offset — it
  // is safe to build the server view from the raw pass and then use it to
  // detect the skew.
  const rawProcessed = useMemo(
    () => (entry?.statsData?.length ? processWebRTCStats(entry.statsData) : null),
    [entry?.statsData],
  );

  const producerOwnership = useMemo(
    () => buildProducerOwnership(buildRouterIndex(routerSamples), producerOwners),
    [routerSamples, producerOwners],
  );

  const serverData = useMemo(
    () => buildClientServerData(clientId, routerSamples, rawProcessed, { producerOwnership }),
    [clientId, routerSamples, rawProcessed, producerOwnership],
  );

  const {
    stats: effectiveStats,
    offsetMs: effectiveOffsetMs,
    clockSkew,
    hasSignificantSkew,
  } = useMemo(
    () =>
      getEffectiveClientStats(entry?.statsData, serverData.empty ? null : serverData, {
        clockOffsetMs,
        clockOffsetMode,
      }),
    [entry?.statsData, serverData, clockOffsetMs, clockOffsetMode],
  );

  // Reuse the raw pass when no offset was applied — the common case.
  const processedStats = useMemo(
    () =>
      effectiveOffsetMs === 0
        ? rawProcessed
        : effectiveStats
          ? processWebRTCStats(effectiveStats)
          : null,
    [effectiveOffsetMs, rawProcessed, effectiveStats],
  );
  const clientMeta = useMemo(
    () => (effectiveStats ? extractClientMeta(effectiveStats) : null),
    [effectiveStats],
  );
  // Producer / consumer lifecycles let the quality timeline tell "this stream
  // was paused" apart from "this stream went bad", so feed the SFU view in.
  const qualityData = useMemo(
    () =>
      effectiveStats
        ? buildQualityLimitationTimelines(
            effectiveStats,
            serverData.empty ? undefined : serverData.producers,
            serverData.empty ? undefined : serverData.consumers,
            serverData.empty ? undefined : serverData.transports,
          )
        : null,
    [effectiveStats, serverData],
  );

  /* ── SFU side ──────────────────────────────────────── */

  // Whatever this client produces, this client owns. Feed it back into the
  // call-wide map so other clients' consumers can name it later.
  const ownRtpIds = useMemo(() => collectClientRtpIds(rawProcessed), [rawProcessed]);
  useEffect(() => {
    if (!clientId || ownRtpIds.producerIds.size === 0) return;
    useCallStore.getState().registerProducerOwners(clientId, ownRtpIds.producerIds);
  }, [clientId, ownRtpIds]);

  const unmatchedRtp = useMemo(
    () =>
      processedStats && !serverData.empty
        ? findUnmatchedRtp(processedStats, serverData.producers, serverData.consumers)
        : [],
    [processedStats, serverData],
  );

  // One window for every stream timeline on the page, so a producer row and a
  // consumer row can be read against each other. Widened to the call bounds
  // from the summary when it has them — a client that joined late should not
  // make its own arrival look like the start of the call.
  const callSummary = useCallStore((s) => s.callSummary);
  const { timelineStart, timelineEnd } = useMemo(() => {
    const candidatesStart = [serverData.createdAt, callSummary?.startedAt].filter(
      (v): v is number => typeof v === 'number' && v > 0,
    );
    const candidatesEnd = [serverData.closedAt, callSummary?.endedAt].filter(
      (v): v is number => typeof v === 'number' && v > 0,
    );
    return {
      timelineStart: candidatesStart.length ? Math.min(...candidatesStart) : serverData.createdAt,
      timelineEnd: candidatesEnd.length ? Math.max(...candidatesEnd) : serverData.closedAt,
    };
  }, [serverData.createdAt, serverData.closedAt, callSummary?.startedAt, callSummary?.endedAt]);

  // The browser's own tracks, keyed by the SFU object they feed. Producers and
  // consumers render their track's score and reasons inline, so there is no
  // separate Outbound/Inbound Tracks list to cross-reference.
  const trackIndex = useMemo(() => buildClientTrackIndex(effectiveStats), [effectiveStats]);

  const streamRecordingIdEvents = useMemo(
    () => extractStreamRecordingIdEvents(processedStats?.clientRecordingEvents ?? []),
    [processedStats],
  );

  /* ── labels ────────────────────────────────────────── */

  const displayName = entry?.displayName ?? null;
  const label = clientLabel(clientId, displayName);
  const compactLabel = clientLabel(clientId, displayName, true);
  const skewBannerActive = hasSignificantSkew && effectiveOffsetMs === 0;

  const pcs = processedStats?.peerConnections ?? [];
  const multiPc = pcs.length > 1;
  const allOutbound = processedStats ? Object.entries(processedStats.timeSeries.outboundRtp) : [];
  const allInbound = processedStats ? Object.entries(processedStats.timeSeries.inboundRtp) : [];

  /* ── consumer filter ───────────────────────────────── */

  const [consumerFilter, setConsumerFilter] = useState('');
  const filteredConsumers = useMemo(() => {
    const needle = consumerFilter.trim().toLowerCase();
    if (!needle) return serverData.consumers;
    return serverData.consumers.filter(
      (c) =>
        c.id.toLowerCase().includes(needle) ||
        c.producerId.toLowerCase().includes(needle) ||
        (c.producingClientId?.toLowerCase().includes(needle) ?? false),
    );
  }, [serverData.consumers, consumerFilter]);

  /* ── consumer ↔ producer compare ───────────────────── */

  const [compareTarget, setCompareTarget] = useState<CompareTarget | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [resolvedOwner, setResolvedOwner] = useState<string | null>(null);

  const handleCompareProducer = useCallback(
    (consumerId: string, producerId: string, producingClientId: string | null) => {
      setCompareTarget({ consumerId, producerId, producingClientId: producingClientId });
      setCompareError(null);
      setResolvedOwner(producingClientId);
    },
    [],
  );

  /**
   * Find and load the client that produced `producerId`.
   *
   * The SFU does not always tag producers with an owner, so when the id is
   * unknown the only way to find it is to open other clients in the call and
   * check whether their outbound RTP claims it. Each client checked is cached
   * in the pane store and its producers recorded, so the walk gets shorter as
   * the session goes on.
   */
  useEffect(() => {
    if (!compareTarget) return;
    const { producerId, producingClientId } = compareTarget;

    const known = producingClientId ?? useCallStore.getState().producerOwners.get(producerId) ?? null;
    const ac = new AbortController();

    const run = async () => {
      setCompareLoading(true);
      setCompareError(null);
      try {
        if (known) {
          setResolvedOwner(known);
          const ok = await loadClientPane(roomId, callId, known, decompressStats, ac.signal);
          if (!ok && !ac.signal.aborted) {
            setCompareError('No stats found for the producing client.');
          }
          return;
        }

        const candidates = Array.from(callSession?.clientSessions.keys() ?? []).filter(
          (cid) => cid !== clientId,
        );
        if (candidates.length === 0) {
          setCompareError('No other clients in this call to search for the producer.');
          return;
        }

        for (const candidate of candidates) {
          if (ac.signal.aborted) return;
          const ok = await loadClientPane(roomId, callId, candidate, decompressStats, ac.signal);
          if (!ok) continue;
          const stats = usePaneStore.getState().panes.get(candidate)?.statsData;
          if (!stats) continue;
          const ids = collectClientRtpIds(processWebRTCStats(stats));
          useCallStore.getState().registerProducerOwners(candidate, ids.producerIds);
          if (ids.producerIds.has(producerId)) {
            setResolvedOwner(candidate);
            return;
          }
        }

        if (!ac.signal.aborted) {
          setCompareError('Could not find which client produced this stream.');
        }
      } catch (err) {
        if (!ac.signal.aborted && (err as Error).name !== 'AbortError') {
          setCompareError(err instanceof Error ? err.message : 'Failed to load the producer.');
        }
      } finally {
        if (!ac.signal.aborted) setCompareLoading(false);
      }
    };

    queueMicrotask(() => void run());
    return () => ac.abort();
  }, [compareTarget, roomId, callId, clientId, callSession, decompressStats]);

  const producerPaneEntry = usePaneStore((s) =>
    resolvedOwner ? (s.panes.get(resolvedOwner) ?? null) : null,
  );
  const compareConsumer = compareTarget
    ? (serverData.consumers.find((c) => c.id === compareTarget.consumerId) ?? null)
    : null;
  const compareProducer = compareTarget
    ? findRouterProducer(routerSamples, compareTarget.producerId)
    : null;
  const { stats: compareProducerStats } = useMemo(
    () =>
      getEffectiveClientStats(producerPaneEntry?.statsData, null, producerPaneEntry ?? undefined),
    [producerPaneEntry],
  );

  const closeCompare = useCallback(() => {
    setCompareTarget(null);
    setResolvedOwner(null);
    setCompareError(null);
  }, []);

  /* ── render ────────────────────────────────────────── */

  const hasServerView = !serverData.empty;

  return (
    <div className={styles.wrapper}>
      <ClientBar roomId={roomId} callId={callId} currentClientId={clientId} displayName={displayName} />

      {loading && <LoadingSpinner>Loading client report...</LoadingSpinner>}

      {!loading && !entry && (
        <p className={styles.empty}>No data available for this client.</p>
      )}

      {entry && (
        // Every chart below reads the client's backgrounded stretches from
        // here. The compare modal renders from the app layout, outside this
        // subtree, so a chart pinned from another client is never shaded with
        // this client's background time.
        <TabVisibilityProvider
          samples={effectiveStats}
          sessionStart={timelineStart}
          sessionEnd={timelineEnd}
        >
        <div className={styles.report}>
          {processedStats && (
            <ClientOverview
              processedStats={processedStats}
              clientStats={effectiveStats}
              serverData={serverData}
              routerSamples={routerSamples}
              eventBus={eventBus}
              clientLabel={label}
            />
          )}

          <ClientContextSection
            clientMeta={clientMeta}
            samples={effectiveStats}
            sessionStart={timelineStart}
            sessionEnd={timelineEnd}
          />



          {hasServerView && (
            <MediaOverview
              serverData={serverData}
              clientStats={effectiveStats}
              processedClientStats={processedStats}
              roomId={roomId}
              callId={callId}
              eventBus={eventBus}
            />
          )}

          {/* Transports — SFU-side when the router sample maps to this client,
              otherwise one section per peer connection from the client stats. */}
          {hasServerView && serverData.transports.length > 0 ? (
            <CollapsibleSection
              title="Transports"
              id="transports" help="client/transports"
              hashPrefix="transport/"
              count={serverData.transports.length}
              defaultOpen={serverData.transports.length === 1}
            >
              {serverData.transports.map((t) => (
                <TransportSection
                  key={t.id}
                  transport={t}
                  processedClientStats={processedStats}
                  paneKey={clientId}
                  clientStats={effectiveStats ?? undefined}
                  eventBus={eventBus}
                  clientLabel={label}
                />
              ))}
            </CollapsibleSection>
          ) : (
            processedStats && pcs.length > 0 && (
              <CollapsibleSection title="Transports" id="transports" count={pcs.length} defaultOpen={pcs.length === 1}>
                {pcs.map((pc) => {
                  const pcId = pc.peerConnectionId ?? pc.transportId ?? String(pc.index);
                  return (
                    <TransportSection
                      key={pcId}
                      transport={null}
                      processedClientStats={processedStats}
                      paneKey={clientId}
                      clientStats={effectiveStats ?? undefined}
                      eventBus={eventBus}
                      clientLabel={label}
                      pcId={pcId}
                    />
                  );
                })}
              </CollapsibleSection>
            )
          )}

          {/* Producers — what this client sends. Replaces the flat Outbound RTP
              list: every outbound stream is reached through the producer that
              owns it, on that producer's own timeline. */}
          {serverData.producers.length > 0 && (
            <CollapsibleSection
              title="Producers"
              id="producers" help="client/producers"
              hashPrefix="producer/"
              count={serverData.producers.length}
              defaultOpen
            >
              <StreamsOverviewTimeline
                streams={serverData.producers}
                globalStart={timelineStart}
                globalEnd={timelineEnd}
                title="All producers"
                sectionId="producers"
                hashPrefix="producer/"
                eventBus={eventBus}
                streamRecordingIdEvents={streamRecordingIdEvents}
              />
              {serverData.producers.map((p) => (
                <ProducerSection
                  key={p.id}
                  producer={p}
                  processedClientStats={processedStats}
                  paneKey={clientId}
                  clientStats={effectiveStats ?? undefined}
                  eventBus={eventBus}
                  clientLabel={label}
                  tracks={trackIndex.byProducerId.get(p.id)}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* Consumers — SFU objects, joined with this client's inbound RTP. */}
          {serverData.consumers.length > 0 && (
            <CollapsibleSection
              title="Consumers"
              id="consumers" help="client/consumers"
              hashPrefix="consumer/"
              count={serverData.consumers.length}
              defaultOpen
              filterContent={
                <div className={sectionStyles.filterWrap}>
                  <input
                    className={sectionStyles.filterInput}
                    type="text"
                    placeholder="Filter by ID..."
                    value={consumerFilter}
                    onChange={(e) => setConsumerFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {consumerFilter.trim() && (
                    <span className={sectionStyles.filterCount}>
                      {filteredConsumers.length}/{serverData.consumers.length}
                    </span>
                  )}
                </div>
              }
            >
              <StreamsOverviewTimeline
                streams={serverData.consumers}
                globalStart={timelineStart}
                globalEnd={timelineEnd}
                title="All consumers"
                sectionId="consumers"
                hashPrefix="consumer/"
                eventBus={eventBus}
              />
              {filteredConsumers.length === 0 && (
                <p className={styles.filterEmpty}>No consumers match the filter.</p>
              )}
              {filteredConsumers.map((c) => (
                <ConsumerSection
                  key={c.id}
                  consumer={c}
                  processedClientStats={processedStats}
                  paneKey={clientId}
                  clientStats={effectiveStats ?? undefined}
                  eventBus={eventBus}
                  clientLabel={label}
                  tracks={trackIndex.byConsumerId.get(c.id)}
                  onCompareProducer={(producerId, producingClientId) =>
                    handleCompareProducer(c.id, producerId, producingClientId)
                  }
                />
              ))}
            </CollapsibleSection>
          )}

          <DataChannelsOverview
            dataProducers={serverData.dataProducers}
            dataConsumers={serverData.dataConsumers}
            samples={effectiveStats}
            eventBus={eventBus}
          />

          {unmatchedRtp.length > 0 && (
            <UnmatchedRtpSection entries={unmatchedRtp} eventBus={eventBus} />
          )}

          {/* Raw per-SSRC RTP. Only shown when there is no SFU view to hang the
              streams off — with router samples loaded, the same data is reached
              through the producer or consumer that owns it, and anything left
              over surfaces in Unmatched RTP above. */}
          {!hasServerView && allOutbound.length > 0 && processedStats && (
            <CollapsibleSection title="Outbound RTP" id="outbound-rtp" help="client/outbound-rtp" count={allOutbound.length} defaultOpen={false}>
              {allOutbound.map(([streamId, streamEntry]) => (
                <OutboundRtpSection
                  key={streamId}
                  streamId={streamId}
                  entry={streamEntry}
                  processedStats={processedStats}
                  eventBus={eventBus}
                  pinPrefix={compactLabel}
                  pcId={multiPc ? (streamEntry.peerConnectionId ?? undefined) : undefined}
                />
              ))}
            </CollapsibleSection>
          )}

          {!hasServerView && allInbound.length > 0 && processedStats && (
            <CollapsibleSection title="Inbound RTP" id="inbound-rtp" help="client/inbound-rtp" count={allInbound.length} defaultOpen={false}>
              {allInbound.map(([streamId, streamEntry]) => (
                <InboundRtpSection
                  key={streamId}
                  streamId={streamId}
                  entry={streamEntry}
                  processedStats={processedStats}
                  eventBus={eventBus}
                  pinPrefix={compactLabel}
                  pcId={multiPc ? (streamEntry.peerConnectionId ?? undefined) : undefined}
                />
              ))}
            </CollapsibleSection>
          )}

          <ClientRecordingsSection processedStats={processedStats} />

          {effectiveStats && effectiveStats.length > 0 && processedStats && (
            <>
              <MediaSourcesSection samples={effectiveStats} processedStats={processedStats} eventBus={eventBus} />
              <IceCandidatesSection samples={effectiveStats} multiPc={multiPc} />
            </>
          )}

          {/* Tracks the client reported that name no producer or consumer.
              Everything else is rendered inside the object it belongs to. */}
          <UnassociatedTracksSection index={trackIndex} eventBus={eventBus} />

          <AudioGlitchSection processedStats={processedStats} eventBus={eventBus} />

          {effectiveStats && effectiveStats.length > 0 && (
            <ClientIssuesSection samples={effectiveStats} />
          )}

          {effectiveStats && effectiveStats.length > 0 && (
            <SampleBrowser
              samples={effectiveStats}
              statsUrl={entry?.statsUrl}
              clientId={clientId}
            />
          )}

          {!processedStats && (
            <p className={styles.filterEmpty}>No data available to display.</p>
          )}
        </div>
        </TabVisibilityProvider>
      )}

      <CompareModal
        open={compareTarget != null}
        onClose={closeCompare}
        title={
          compareTarget
            ? `Consumer ${shortId(compareTarget.consumerId)} / Producer ${shortId(compareTarget.producerId)}`
            : 'Consumer / Producer Compare'
        }
      >
        {compareTarget && compareConsumer && (
          <ProducerConsumerCompare
            consumer={compareConsumer}
            consumerStats={effectiveStats ?? null}
            producer={compareProducer}
            producerStats={compareProducerStats}
            producerLoading={compareLoading}
            producerError={compareError}
            eventBus={eventBus}
          />
        )}
      </CompareModal>
    </div>
  );
}
