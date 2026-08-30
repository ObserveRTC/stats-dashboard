'use client';
import { InfoCard } from './InfoCard.tsx';
import styles from './AttachmentsCard.module.css';

interface AttachmentsCardProps {
  attachments: Record<string, unknown> | null | undefined;
  title?: string;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/**
 * Renders a single InfoCard with key → value rows for a set of attachments.
 * Returns null when there are no non-empty entries.
 */
export function AttachmentsCard({ attachments, title = 'Attachments' }: AttachmentsCardProps) {
  if (!attachments) return null;

  const entries = Object.entries(attachments)
    .filter(([, v]) => v != null && v !== '')
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) return null;

  return (
    <InfoCard title={title}>
      {entries.map(([key, value]) => (
        <div key={key} className={styles.row}>
          <span className={styles.key}>{key}</span>
          <span className={styles.value}>{formatValue(value)}</span>
        </div>
      ))}
    </InfoCard>
  );
}
