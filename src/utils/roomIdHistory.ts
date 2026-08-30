import { ROOM_ID_HISTORY_KEY, MAX_ROOM_ID_HISTORY } from '../constants.ts';

export function getRoomIdHistory(): string[] {
  try {
    const raw = localStorage.getItem(ROOM_ID_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function addToRoomIdHistory(roomId: string): void {
  const trimmed = roomId.trim();
  if (!trimmed) return;
  const history = getRoomIdHistory().filter((s) => s !== trimmed);
  history.unshift(trimmed);
  if (history.length > MAX_ROOM_ID_HISTORY) history.length = MAX_ROOM_ID_HISTORY;
  localStorage.setItem(ROOM_ID_HISTORY_KEY, JSON.stringify(history));
}

export function removeFromRoomIdHistory(item: string): string[] {
  const updated = getRoomIdHistory().filter((s) => s !== item);
  localStorage.setItem(ROOM_ID_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}
