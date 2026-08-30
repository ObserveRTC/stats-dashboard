'use client';
import { useTimezoneStore } from '../../stores/tzStore.ts';
import styles from './TimezoneToggle.module.css';

export function TimezoneToggle() {
  const { tz, toggle } = useTimezoneStore();
  const label = tz === 'utc' ? 'UTC' : 'Local';
  const title = tz === 'utc'
    ? 'Timestamps shown in UTC — click to switch to local time'
    : 'Timestamps shown in local time — click to switch to UTC';
  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      aria-label={title}
      title={title}
      data-tz={tz}
    >
      <span className={styles.text}>{label}</span>
    </button>
  );
}
