'use client';
import type { ReactNode } from 'react';
import styles from './InfoGrid.module.css';

interface InfoGridProps {
  children: ReactNode;
}

export function InfoGrid({ children }: InfoGridProps) {
  return <div className={styles.grid}>{children}</div>;
}
