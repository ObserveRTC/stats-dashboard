'use client';
import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchCalls } from '../api/client.ts';
import { useAppStore, useCallListStore, useCallStore, usePaneStore, useTimezoneTick } from '../stores/index.ts';
import { LoadingSpinner } from '../components/layout/LoadingSpinner.tsx';
import { IdBadge } from '../components/sections/IdBadge.tsx';
import { formatDateTime } from '../utils/formatting.ts';
import styles from './CallListPage.module.css';

export function CallListPage() {
  const params = useParams() ?? {};
  const roomId = (params.roomId as string) ?? '';
  const router = useRouter();
  const tz = useTimezoneTick();
  const { showBanner, clearBanner } = useAppStore();
  const { calls, loading, setCalls, setLoading, setCacheKey, clearCallData } = useCallListStore();

  const abortRef = useRef<AbortController | null>(null);
  const [callSearch, setCallSearch] = useState('');

  const fetchList = useCallback(async () => {
    if (!roomId) return;
    const key = roomId;
    if (useCallListStore.getState().cacheKey === key) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    clearCallData();
    useCallStore.getState().clearCall();
    usePaneStore.getState().clearAll();
    setLoading(true);
    clearBanner();
    try {
      const data = await fetchCalls(roomId, ac.signal);
      if (ac.signal.aborted) return;
      if (!data.success || !data.calls?.length) {
        showBanner('No calls found for this room ID.', 'error');
        setLoading(false);
        return;
      }
      setCalls(data.calls); // already sorted newest-first by the API
      setCacheKey(key);
      setLoading(false);
    } catch (err) {
      if (ac.signal.aborted) return;
      if ((err as Error).name !== 'AbortError') {
        showBanner(err instanceof Error ? err.message : 'Failed to fetch calls.', 'error');
      }
      setLoading(false);
    }
  }, [roomId, clearBanner, clearCallData, setCalls, setLoading, showBanner, setCacheKey]);

  useEffect(() => {
    fetchList();
    return () => abortRef.current?.abort();
  }, [fetchList]);

  const handleLoadCall = useCallback(
    (callId: string) => {
      router.push(`/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}`);
    },
    [roomId, router],
  );

  const searchLower = callSearch.trim().toLowerCase();

  const filteredCalls = useMemo(() => {
    if (!searchLower) return calls;
    return calls.filter((c) => c.id.toLowerCase().includes(searchLower));
  }, [calls, searchLower]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h3 className={styles.title}>
          Calls in <IdBadge value={roomId} />
        </h3>

        <div className={styles.searchWrap}>
          <input
            id="call-id-search"
            type="search"
            className={styles.searchInput}
            placeholder="Filter call IDs…"
            value={callSearch}
            onChange={(e) => setCallSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {searchLower && (
            <p className={styles.searchHint}>
              {filteredCalls.length} of {calls.length} match
            </p>
          )}
        </div>

        {loading && <LoadingSpinner>Loading calls...</LoadingSpinner>}

        <div className={styles.list}>
          {!loading && filteredCalls.length === 0 && (
            <p className={styles.searchHint}>No calls match your filter.</p>
          )}
          {filteredCalls.map(({ id, lastModified }) => (
            <div key={id} className={styles.entry}>
              <div className={styles.entryInfo}>
                <div className={styles.entryHeader}>
                  <IdBadge value={id} />
                </div>
                {lastModified && (
                  <div className={styles.entryMeta}>
                    {formatDateTime(lastModified, tz)}
                  </div>
                )}
              </div>
              <button className={styles.loadBtn} onClick={() => handleLoadCall(id)}>
                Load
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
