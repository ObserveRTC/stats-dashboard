'use client';
import { useMemo } from 'react';
import { useCompareStore } from '../../stores/compareStore.ts';
import { CompareModal } from './CompareModal.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import { QualityTimeline } from '../charts/QualityTimeline.tsx';
import { Timeline } from '../charts/Timeline.tsx';
import { StackedConsumerTimeline } from '../charts/StackedConsumerTimeline.tsx';
import { CpuChart } from '../report/CpuChart.tsx';
import styles from './ChartCompareModal.module.css';

export function ChartCompareModal() {
  const { pinnedCharts, modalOpen, closeModal, unpinById, clearAll } = useCompareStore();
  const eventBus = useMemo(() => new EventTarget(), []);

  return (
    <CompareModal
      open={modalOpen}
      onClose={closeModal}
      title={`Compare (${pinnedCharts.length})`}
      headerExtra={<button className={styles.clearBtn} onClick={clearAll}>Clear all</button>}
    >
      <div className={styles.wrapper}>
        {pinnedCharts.length === 0 && (
          <div className={styles.empty}>No charts pinned. Click the pin icon on any chart to add it here.</div>
        )}
        <div className={styles.chartStack}>
          {pinnedCharts.map((chart) => (
            <div key={chart.id} className={styles.chartRow}>
              <div className={styles.chartHeader}>
                <span className={styles.chartLabel}>{chart.label}</span>
                <button
                  className={styles.removeBtn}
                  onClick={() => unpinById(chart.id)}
                  title="Remove from comparison"
                >
                  &times;
                </button>
              </div>
              {chart.type === 'minichart' && chart.miniChartProps && (
                <MiniChart {...chart.miniChartProps} eventBus={eventBus} />
              )}
              {chart.type === 'quality-timeline' && chart.qualityTimelineProps && (
                <QualityTimeline {...chart.qualityTimelineProps} eventBus={eventBus} />
              )}
              {chart.type === 'timeline' && chart.timelineProps && (
                <Timeline {...chart.timelineProps} eventBus={eventBus} />
              )}
              {chart.type === 'stacked-consumer-timeline' && chart.stackedConsumerTimelineProps && (
                <StackedConsumerTimeline {...chart.stackedConsumerTimelineProps} eventBus={eventBus} />
              )}
              {chart.type === 'cpu-chart' && chart.cpuChartProps && (
                <CpuChart {...chart.cpuChartProps} eventBus={eventBus} />
              )}
            </div>
          ))}
        </div>
      </div>
    </CompareModal>
  );
}
