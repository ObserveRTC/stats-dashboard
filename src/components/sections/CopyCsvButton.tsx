'use client';
import { useState, type MouseEvent } from 'react';
import styles from './CopyCsvButton.module.css';

export interface CopyCsvButtonProps {
  getText: () => string | null;
  title?: string;
  className?: string;
}

export function CopyCsvButton({
  getText,
  title = 'Copy compact CSV',
  className,
}: CopyCsvButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    const text = getText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${className ?? ''}`}
      onClick={handleClick}
      title={title}
    >
      {copied ? '✓' : 'CSV'}
    </button>
  );
}
