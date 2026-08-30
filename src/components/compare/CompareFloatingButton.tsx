'use client';
import { useCompareStore } from '../../stores/compareStore.ts';
import styles from './CompareFloatingButton.module.css';

export function CompareFloatingButton() {
  const count = useCompareStore((s) => s.pinnedCharts.length);
  const openModal = useCompareStore((s) => s.openModal);

  if (count === 0) return null;

  return (
    <button className={styles.button} onClick={openModal}>
      Compare ({count})
    </button>
  );
}
