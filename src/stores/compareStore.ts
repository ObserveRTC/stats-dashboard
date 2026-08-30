'use client';
import { create } from 'zustand';
import type { IceSelectedPairValue } from '../utils/statsTypes.ts';
import type { ConsumerData } from '../components/charts/StackedConsumerTimeline.tsx';
import type { TimelineOverlay, TimelinePointMarker } from '../components/charts/Timeline.tsx';
import type { IssueLaneItem } from '../utils/issueTimelinePlacement.ts';

export type PinnedChartType = 'minichart' | 'quality-timeline' | 'timeline' | 'stacked-consumer-timeline' | 'cpu-chart';

export interface PinnedChart {
  id: string;
  type: PinnedChartType;
  label: string;

  miniChartProps?: {
    title: string;
    description?: string;
    data?: { timestamp: Date; value: number }[];
    series?: { label: string; data: { timestamp: Date; value: number }[]; color: string }[];
    formatter?: (v: number) => string;
    color?: string;
    yDomain?: [number, number];
    regions?: { start: number; end: number; color?: string; tooltipHtml?: string }[];
  };

  qualityTimelineProps?: {
    title: string;
    description?: string;
    samples: { timestamp: number; state: string }[];
    startTime: number;
    endTime: number;
    colorMap?: Record<string, string>;
    labelMap?: Record<string, string>;
  };

  timelineProps?: {
    title: string;
    description?: string;
    data: unknown;
    iceValues?: IceSelectedPairValue[];
    overlays?: TimelineOverlay[];
    pointMarkers?: TimelinePointMarker[];
    issueLane?: IssueLaneItem[];
  };

  stackedConsumerTimelineProps?: {
    data: ConsumerData;
    description?: string;
    issueLane?: IssueLaneItem[];
  };

  cpuChartProps?: {
    cpuData: Array<{ timestamp: Date; total: number; encode: number; decode: number }>;
  };
}

interface CompareState {
  pinnedCharts: PinnedChart[];
  modalOpen: boolean;

  pinChart: (chart: Omit<PinnedChart, 'id'>) => void;
  unpinByLabel: (label: string) => void;
  unpinById: (id: string) => void;
  togglePin: (chart: Omit<PinnedChart, 'id'>) => boolean;
  isPinned: (label: string) => boolean;
  clearAll: () => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  pinnedCharts: [],
  modalOpen: false,

  pinChart: (chart) =>
    set((s) => ({
      pinnedCharts: [...s.pinnedCharts, { ...chart, id: crypto.randomUUID() }],
    })),

  unpinByLabel: (label) =>
    set((s) => ({
      pinnedCharts: s.pinnedCharts.filter((c) => c.label !== label),
    })),

  unpinById: (id) =>
    set((s) => ({
      pinnedCharts: s.pinnedCharts.filter((c) => c.id !== id),
      modalOpen: s.pinnedCharts.length <= 1 ? false : s.modalOpen,
    })),

  togglePin: (chart) => {
    const { pinnedCharts } = get();
    if (pinnedCharts.some((c) => c.label === chart.label)) {
      get().unpinByLabel(chart.label);
      return false;
    }
    get().pinChart(chart);
    return true;
  },

  isPinned: (label) => get().pinnedCharts.some((c) => c.label === label),
  clearAll: () => set({ pinnedCharts: [], modalOpen: false }),
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
