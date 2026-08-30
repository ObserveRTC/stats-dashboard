'use client';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const text = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={styles[status]}>{text}</span>;
}
