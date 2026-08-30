'use client';
import { useRef, type ReactNode } from 'react';
import { ScreenshotButton } from '../sections/ScreenshotButton.tsx';
import styles from './CompareModal.module.css';

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  headerExtra?: ReactNode;
  children?: ReactNode;
}

export function CompareModal({ open, onClose, title, headerExtra, children }: CompareModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>{title ?? 'Compare'}</span>
          <div className={styles.headerActions}>
            {headerExtra}
            <ScreenshotButton targetRef={bodyRef} className={styles.screenshotBtn} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={styles.close}
            >
              ✕
            </button>
          </div>
        </div>
        <div className={styles.body} ref={bodyRef}>{children}</div>
      </div>
    </div>
  );
}
