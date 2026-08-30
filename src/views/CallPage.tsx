'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '../stores/appStore.ts';
import { useCallStore } from '../stores/callStore.ts';
import { useClientLoadStore } from '../stores/clientLoadStore.ts';
import { useStatsWorker } from '../hooks/index.ts';
import { ensureCallContext, resetCallContextIfChanged } from '../utils/callContext.ts';
import { loadClientMetrics, loadManyClientMetrics } from '../utils/clientMetricsLoader.ts';
import { LoadingSpinner } from '../components/layout/LoadingSpinner.tsx';
import { CallDashboard } from '../components/dashboard/CallDashboard.tsx';
import styles from './StudioPage.module.css';

export function CallPage() {
  const params = useParams() ?? {};
  const roomId = (params.roomId as string) ?? '';
  const callId = (params.callId as string) ?? '';

  const router = useRouter();
  const { showBanner, clearBanner } = useAppStore();
  const callSession = useCallStore((s) => s.callSession);
  const callSummary = useCallStore((s) => s.callSummary);
  const routerSamples = useCallStore((s) => s.routerSamples);
  const objectNames = useCallStore((s) => s.objectNames);
  const decompressStats = useStatsWorker();

  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!roomId || !callId) return;

    resetCallContextIfChanged(roomId, callId);
    // Client metrics are scoped to the call, and a load already done for
    // this call survives navigating away and back — that is the point of
    // keeping them.
    useClientLoadStore.getState().resetFor(`${roomId}/${callId}`);
    if (useCallStore.getState().cacheKey === `${roomId}/${callId}`) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    clearBanner();

    void ensureCallContext(roomId, callId, ac.signal).then((res) => {
      if (ac.signal.aborted) return;
      setLoading(false);
      if (!res.ok && res.error !== 'aborted') {
        showBanner(res.error ?? 'Failed to load call.', 'error');
      }
    });

    return () => ac.abort();
  }, [roomId, callId, clearBanner, showBanner]);

  const handleViewClient = useCallback(
    (clientId: string) => {
      router.push(
        `/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/${encodeURIComponent(clientId)}`,
      );
    },
    [roomId, callId, router],
  );

  const handleLoadClient = useCallback(
    (clientId: string) => {
      void loadClientMetrics(roomId, callId, clientId, decompressStats);
    },
    [roomId, callId, decompressStats],
  );

  const handleLoadAllClients = useCallback(
    (clientIds: string[]) => {
      void loadManyClientMetrics(roomId, callId, clientIds, decompressStats);
    },
    [roomId, callId, decompressStats],
  );

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <LoadingSpinner>Fetching call data...</LoadingSpinner>
      </div>
    );
  }

  if (!callSession) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.empty}>No data found for this call.</p>
      </div>
    );
  }

  return (
    <CallDashboard
      callSession={callSession}
      callSummary={callSummary}
      routerSamples={routerSamples}
      objectNames={objectNames}
      roomId={roomId}
      callId={callId}
      onViewClient={handleViewClient}
      onLoadClient={handleLoadClient}
      onLoadAllClients={handleLoadAllClients}
    />
  );
}
