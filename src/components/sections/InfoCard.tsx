'use client';
import type { ReactNode } from 'react';
import styles from './InfoCard.module.css';

interface InfoCardProps {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}

export function InfoCard({ title, badge, children }: InfoCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h5 className={styles.title}>{title}</h5>
        {badge}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
