'use client';
import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = (stored === 'light' || stored === 'dark') ? stored : preferred;
    useThemeStore.getState().set(theme);
  }, []);
  return null;
}
