'use client';
import { useEffect } from 'react';
import { useTimezoneStore } from '@/stores/tzStore';

export function TzInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem('tz');
    if (stored === 'utc' || stored === 'local') {
      useTimezoneStore.getState().set(stored);
    }
  }, []);
  return null;
}
