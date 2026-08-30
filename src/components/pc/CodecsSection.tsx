'use client';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { extractCodecs } from '../../utils/pcSampleExtractor.ts';
import { shortId } from '../../utils/formatting.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './pc.module.css';

interface CodecsSectionProps {
  samples: ClientSample[];
  /** Nest under a caller-supplied section instead of owning the top level. */
  embedded?: boolean;
}

export function CodecsSection({ samples, embedded }: CodecsSectionProps) {
  const items = extractCodecs(samples);
  if (items.size === 0) return null;

  const entries = Array.from(items.entries());
  // Detect multi-PC
  const pcIds = new Set(entries.map(([, item]) => item.pcId));
  const multiPc = pcIds.size > 1;

  return (
    <CollapsibleSection
      title="Codecs"
      id={embedded ? undefined : 'codecs'}
      help="client/codecs"
      count={entries.length}
      defaultOpen={false}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>MIME Type</th>
            <th className={styles.th}>Payload Type</th>
            <th className={styles.th}>Clock Rate</th>
            <th className={styles.th}>Channels</th>
            <th className={styles.th}>SDP Params</th>
            {multiPc && <th className={styles.th}>PC</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, item]) => {
            const { meta, pcId } = item;
            return (
              <tr key={key} className={styles.tr}>
                <td className={styles.td}>{meta.mimeType}</td>
                <td className={styles.td}>{meta.payloadType ?? '—'}</td>
                <td className={styles.td}>{meta.clockRate != null ? `${meta.clockRate} Hz` : '—'}</td>
                <td className={styles.td}>{meta.channels ?? '—'}</td>
                <td className={styles.td}>{meta.sdpFmtpLine ?? '—'}</td>
                {multiPc && <td className={styles.td}><IdBadge value={pcId}>{shortId(pcId)}</IdBadge></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </CollapsibleSection>
  );
}
