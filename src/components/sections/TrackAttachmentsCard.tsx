'use client';
import type { TrackAttachmentInfo } from '../../utils/clientAttachments.ts';
import { shortId } from '../../utils/formatting.ts';
import { InfoCard } from './InfoCard.tsx';
import { IdBadge } from './IdBadge.tsx';
import { AttachmentsCard } from './AttachmentsCard.tsx';
import { formatAttachmentValue } from './formatAttachmentValue.ts';
import styles from './AttachmentsCard.module.css';

const ID_ATTACHMENT_KEYS = new Set(['producerId', 'consumerId', 'transportId', 'peerConnectionId']);

export function TrackAttachmentsCard({
  entries,
  title = 'Track attachments',
}: {
  entries: TrackAttachmentInfo[];
  title?: string;
}) {
  if (entries.length === 0) return null;

  if (entries.length === 1) {
    const entry = entries[0]!;
    return <AttachmentsCard title={title} attachments={entry.attachments} />;
  }

  return (
    <InfoCard title={title}>
      {entries.map((entry) => (
        <div key={`${entry.peerConnectionId}:${entry.trackId}`} className={styles.trackBlock}>
          <div className={styles.trackHeader}>
            Track <IdBadge value={entry.trackId}>{shortId(entry.trackId)}</IdBadge>
            {entry.kind ? ` · ${entry.kind}` : ''}
          </div>
          {Object.entries(entry.attachments).map(([key, value]) => (
            <div key={key} className={styles.trackField}>
              <span className={styles.label}>{key}:</span>{' '}
              {typeof value === 'string' && ID_ATTACHMENT_KEYS.has(key) ? (
                <IdBadge value={value} />
              ) : (
                <span className={styles.value}>{formatAttachmentValue(value)}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </InfoCard>
  );
}
