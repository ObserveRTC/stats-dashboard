'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { RoomEntry } from '../api/types.ts';
import { useAppStore } from '../stores/index.ts';
import { RoomIdInput } from '../components/layout/RoomIdInput.tsx';
import { IdBadge } from '../components/sections/IdBadge.tsx';
import { StorageStatusNotice } from '../components/layout/StorageStatusNotice.tsx';
import { LoadingSpinner } from '../components/layout/LoadingSpinner.tsx';
import { addToRoomIdHistory } from '../utils/roomIdHistory.ts';
import { fetchRooms } from '../api/client.ts';
import { formatDateTime } from '../utils/formatting.ts';
import { useTimezoneTick } from '../stores/index.ts';
import styles from './HomePage.module.css';

export function HomePage() {
  const router = useRouter();
  const { showBanner, clearBanner } = useAppStore();
  const tz = useTimezoneTick();

  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');

  const [roomId, setRoomId] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadRooms = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRoomsLoading(true);
    clearBanner();
    try {
      const data = await fetchRooms(ac.signal);
      if (ac.signal.aborted) return;
      setRooms(data.rooms ?? []);
      setRoomsLoaded(true);
      setListOpen(true);
    } catch (err) {
      if (ac.signal.aborted) return;
      if ((err as Error).name !== 'AbortError') {
        showBanner(err instanceof Error ? err.message : 'Failed to fetch rooms.', 'error');
      }
    } finally {
      if (!ac.signal.aborted) setRoomsLoading(false);
    }
  }, [showBanner, clearBanner]);

  const navigateToRoom = useCallback((id: string) => {
    addToRoomIdHistory(id);
    clearBanner();
    router.push(`/${encodeURIComponent(id)}`);
  }, [router, clearBanner]);

  const handleManualSubmit = useCallback(() => {
    const trimmed = roomId.trim();
    if (!trimmed) {
      showBanner('Room ID is required.', 'error');
      return;
    }
    navigateToRoom(trimmed);
  }, [roomId, navigateToRoom, showBanner]);

  const searchLower = roomSearch.trim().toLowerCase();
  const filteredRooms = searchLower
    ? rooms.filter((r) => r.id.toLowerCase().includes(searchLower))
    : rooms;

  return (
    <div className={styles.wrapper}>

      {/* Jump input — always visible at top */}
      <div className={styles.jumpBox}>
        <RoomIdInput value={roomId} onChange={setRoomId} onSubmit={handleManualSubmit} />
        <button className={styles.btnPrimary} onClick={handleManualSubmit}>Go</button>
      </div>

      {/* Room list — collapsible, loaded on demand */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.title}>Rooms</h3>
          <div className={styles.headerActions}>
            {roomsLoaded && (
              <button
                className={styles.toggleBtn}
                onClick={() => setListOpen((v) => !v)}
                type="button"
              >
                <svg
                  className={listOpen ? styles.chevronOpen : styles.chevron}
                  viewBox="0 0 20 20" fill="currentColor" width="12" height="12"
                >
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
                {listOpen ? 'Hide' : `Show (${rooms.length})`}
              </button>
            )}
            <button className={styles.btnPrimary} onClick={loadRooms} disabled={roomsLoading}>
              {roomsLoading ? 'Loading…' : roomsLoaded ? 'Refresh' : 'Load Rooms'}
            </button>
          </div>
        </div>

        {/* Only appears when storage is misconfigured or unreachable, so an
            empty room list never has to be guessed at. */}
        <StorageStatusNotice />

        {roomsLoading && <LoadingSpinner>Loading rooms...</LoadingSpinner>}

        {listOpen && !roomsLoading && (
          <>
            {rooms.length > 0 && (
              <div className={styles.searchWrap}>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Filter rooms…"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
            <div className={styles.list}>
              {filteredRooms.map(({ id, lastModified }) => (
                <div key={id} className={styles.entry}>
                  <div className={styles.entryInfo}>
                    <IdBadge value={id} />
                    {lastModified && (
                      <span className={styles.entryMeta}>
                        {formatDateTime(lastModified, tz)}
                      </span>
                    )}
                  </div>
                  <button className={styles.loadBtn} onClick={() => navigateToRoom(id)}>
                    Open
                  </button>
                </div>
              ))}
              {rooms.length === 0 && (
                <p className={styles.empty}>No rooms found in the bucket.</p>
              )}
              {searchLower && filteredRooms.length === 0 && (
                <p className={styles.empty}>No rooms match your filter.</p>
              )}
            </div>
          </>
        )}
      </div>


    </div>
  );
}
