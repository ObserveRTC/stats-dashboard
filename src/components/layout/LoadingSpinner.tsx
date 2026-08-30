'use client';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  children: React.ReactNode;
}

export function LoadingSpinner({ children }: LoadingSpinnerProps) {
  return (
    <div className={styles.loading}>
      <span className="spinner" />
      {children}
    </div>
  );
}
