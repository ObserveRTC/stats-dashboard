'use client';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { extractAllAttachments } from '../../utils/extractAttachments.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './AttachmentsSection.module.css';

interface AttachmentsSectionProps {
  clientStats: ClientSample[] | null | undefined;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

export function AttachmentsSection({ clientStats }: AttachmentsSectionProps) {
  const groups = extractAllAttachments(clientStats);
  if (groups.length === 0) return null;

  const totalKeys = groups.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <CollapsibleSection title="Attachments" id="attachments"
      help="client/attachments" count={totalKeys} defaultOpen={false}>
      <div className={styles.groups}>
        {groups.map((group, gi) => (
          <div key={gi} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupName}>{group.source}</span>
              {group.sourceId && (
                <IdBadge value={group.sourceId} />
              )}
            </div>
            <table className={styles.table}>
              <tbody>
                {group.entries.map(({ key, value }) => (
                  <tr key={key} className={styles.row}>
                    <td className={styles.key}>{key}</td>
                    <td className={styles.value}>
                      {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                        ? <span>{formatValue(value)}</span>
                        : <code className={styles.json}>{JSON.stringify(value, null, 2)}</code>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
