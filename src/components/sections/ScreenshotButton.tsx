'use client';
import { useCallback, useState, type RefObject } from 'react';
import { captureToClipboard } from '../../utils/screenshot.ts';
import styles from './ScreenshotButton.module.css';

interface ScreenshotButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  className?: string;
  /** Inject extra DOM (e.g. state captions) into the capture root; cleanup after capture. */
  beforeCapture?: (root: HTMLElement) => (() => void) | void;
}

export function ScreenshotButton({ targetRef, className, beforeCapture }: ScreenshotButtonProps) {
  const [done, setDone] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = targetRef.current;
      if (!el) return;
      const cleanup = beforeCapture?.(el);
      captureToClipboard(el)
        .then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
        .catch((err) => console.warn('[Screenshot] Failed to capture:', err))
        .finally(() => cleanup?.());
    },
    [targetRef, beforeCapture],
  );

  return (
    <button
      className={`${styles.btn} ${done ? styles.btnDone : ''} ${className ?? ''}`}
      onClick={handleClick}
      title={done ? 'Copied to clipboard' : 'Copy screenshot to clipboard'}
    >
      {done ? (
        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
          <path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
