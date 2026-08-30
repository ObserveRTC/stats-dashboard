'use client';
import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

export const useThemeStore = create<ThemeState>(() => ({
  theme: 'light' as Theme,
  toggle: () =>
    useThemeStore.setState((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
  set: (theme: Theme) => {
    applyTheme(theme);
    useThemeStore.setState({ theme });
  },
}));
