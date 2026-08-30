'use client';
import { useAppStore } from '../../stores/appStore.ts';
import styles from './Banner.module.css';

export function Banner() {
  const { bannerMessage, bannerType, clearBanner } = useAppStore();

  if (!bannerMessage) return null;

  return (
    <div className={`${styles.banner} ${bannerType === 'error' ? styles.error : styles.info}`}>
      <span>{bannerMessage}</span>
      <button className={styles.close} onClick={clearBanner}>
        ×
      </button>
    </div>
  );
}
