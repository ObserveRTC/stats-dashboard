'use client';
import { create } from 'zustand';

interface AppState {
  roomId: string;
  callId: string;
  bannerMessage: string | null;
  bannerType: 'info' | 'error';

  setRoomId: (roomId: string) => void;
  setCallId: (id: string) => void;
  showBanner: (msg: string, type?: 'info' | 'error') => void;
  clearBanner: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  roomId: '',
  callId: '',
  bannerMessage: null,
  bannerType: 'info',

  setRoomId: (roomId) => set({ roomId }),
  setCallId: (id) => set({ callId: id }),
  showBanner: (msg, type = 'info') => set({ bannerMessage: msg, bannerType: type }),
  clearBanner: () => set({ bannerMessage: null }),
}));
