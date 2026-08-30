// Minimal stub — server-side recording overlays are not used in observertc-stats
export interface RecordingOverlay {
  start: number;
  end: number;
  label: string;
  color?: string;
}

export const TAKE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#14b8a6', '#06b6d4', '#f97316',
];
