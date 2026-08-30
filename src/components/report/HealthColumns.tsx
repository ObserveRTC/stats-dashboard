'use client';
import { formatBytes, formatDuration } from '../../utils/formatting.ts';
import type { IssueCategory, IssueSummary, SessionSummary } from '../../utils/sessionSummary.ts';
import styles from './HealthColumns.module.css';

/** Green below the warn threshold, amber up to danger, red past it. */
function colorize(value: number | null | undefined, thresholds: [number, number]): string {
  if (value == null) return 'var(--text-muted)';
  const [warnThresh, dangerThresh] = thresholds;
  if (value >= dangerThresh) return 'var(--danger)';
  if (value >= warnThresh) return 'var(--warning)';
  return 'var(--success)';
}

interface StatRow {
  label: string;
  /** Already-formatted value, or null to render an em dash. */
  value: string | null;
  unit?: string;
  color?: string;
  /** Hover explanation for the row. */
  title?: string;
}

const DASH = '\u2014';

/**
 * One themed group of related figures.
 *
 * Four of these sit side by side: where the client was (latency), what went
 * wrong (issues), how much moved (transmission), and how hard the machine
 * worked (CPU). Grouping them beats a flat grid of cards because the reading
 * is comparative — a p95 latency means little until you see the median next
 * to it.
 */
function StatColumn({ title, rows }: { title: string; rows: StatRow[] }) {
  return (
    <div className={styles.statColumn}>
      <div className={styles.statColumnTitle}>{title}</div>
      <div className={styles.statRows}>
        {rows.map((row) => (
          <div key={row.label} className={styles.statRow} title={row.title}>
            <span className={styles.statRowLabel}>{row.label}</span>
            <span
              className={styles.statRowValue}
              style={{ color: row.value == null ? 'var(--text-muted)' : row.color }}
            >
              {row.value ?? DASH}
              {row.value != null && row.unit && <span className={styles.statUnit}>{row.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** List the distinct issue types behind a count, so the number is auditable. */
function issueTitle(category: IssueCategory, issues: IssueSummary): string {
  const types = issues.typesByCategory[category];
  if (types.length === 0) return `No ${category} issues reported by the client.`;
  return `${category} issues reported: ${types.join(', ')}`;
}

/** Format a number for a stat row, or null when there is nothing to show. */
function num(v: number | null | undefined, digits = 0): string | null {
  return v == null || !Number.isFinite(v) ? null : v.toFixed(digits);
}


/** A single headline figure, shown above the detail columns. */
function StatCard({
  label,
  value,
  unit,
  color,
  title,
}: {
  label: string;
  value: string | null;
  unit?: string;
  color?: string;
  title?: string;
}) {
  return (
    <div className={styles.statCard} title={title}>
      <div className={styles.statCardLabel}>{label}</div>
      <div
        className={styles.statCardValue}
        style={{ color: value == null ? 'var(--text-muted)' : color }}
      >
        {value ?? DASH}
        {value != null && unit && <span className={styles.statUnit}>{unit}</span>}
      </div>
    </div>
  );
}

/** kbps under 1000, Mbps above — keeps the card from reading as six digits. */
function bitrate(v: number | null): { value: string | null; unit: string } {
  if (v == null || !Number.isFinite(v)) return { value: null, unit: '' };
  return v >= 1000
    ? { value: (v / 1000).toFixed(1), unit: 'Mbps' }
    : { value: v.toFixed(0), unit: 'kbps' };
}

interface HealthColumnsProps {
  summary: SessionSummary;
  /** Optional context line rendered under the columns. */
  footer?: React.ReactNode;
}

/**
 * The four things worth knowing about a session at a glance, grouped rather
 * than laid out as a flat grid of cards: the reading is comparative, and a p95
 * latency means little until the median sits next to it.
 */
export function HealthColumns({ summary, footer }: HealthColumnsProps) {
  const send = bitrate(summary.transmission.avgOutboundKbps);
  const recv = bitrate(summary.transmission.avgInboundKbps);

  return (
    <>
      <div className={styles.cardRow}>
        <StatCard
          label="Avg RTT"
          value={num(summary.latency.average)}
          unit="ms"
          color={colorize(summary.latency.average, [150, 300])}
        />
        <StatCard
          label="Avg CPU"
          value={num(summary.cpu.average)}
          unit="%"
          color={colorize(summary.cpu.average, [60, 100])}
          title="Video encode + decode CPU, averaged. WebRTC reports no audio or process-wide CPU, so this covers the video pipeline only."
        />
        <StatCard
          label="Peak CPU"
          value={num(summary.cpu.max)}
          unit="%"
          color={colorize(summary.cpu.max, [80, 150])}
        />
        <StatCard label="Avg sending" value={send.value} unit={send.unit} />
        <StatCard label="Avg receiving" value={recv.value} unit={recv.unit} />
        <StatCard
          label="Packet loss"
          value={num(summary.transmission.lossRatePct, 2)}
          unit="%"
          color={colorize(summary.transmission.lossRatePct, [1, 5])}
        />
        <StatCard
          label="Issues"
          value={String(summary.issues.total)}
          color={summary.issues.total > 0 ? 'var(--warning)' : 'var(--success)'}
        />
        <StatCard
          label="Duration"
          value={summary.span.durationMs != null ? formatDuration(summary.span.durationMs) : null}
          title="Wall-clock span of this client's own samples — how long it was reporting, which is not necessarily how long the SFU believed it was present."
        />
        {/* Only for clients that report visibility. A missing card says "this
            client does not send the event"; a card reading 0% would say "the
            tab was never backgrounded", which is a different claim. */}
        {summary.visibility.reported && (
          <StatCard
            label="Backgrounded"
            value={
              summary.visibility.hiddenRatio != null
                ? (summary.visibility.hiddenRatio * 100).toFixed(0)
                : null
            }
            unit="%"
            color={
              summary.visibility.hiddenRatio != null && summary.visibility.hiddenRatio > 0.1
                ? 'var(--warning)'
                : 'var(--text)'
            }
            title={`The tab was in the background for ${formatDuration(summary.visibility.hiddenMs)} across ${summary.visibility.switches} switch${summary.visibility.switches === 1 ? '' : 'es'}. A browser throttles a backgrounded tab — timers slow, capture frame rate collapses and the encoder is starved — so readings from those stretches describe power saving rather than the call. They are shaded on every timeline.`}
          />
        )}
      </div>

      <div className={styles.statsGrid}>
        <StatColumn
          title="Latency"
          rows={[
            { label: 'Median', value: num(summary.latency.median), unit: 'ms', color: colorize(summary.latency.median, [150, 300]) },
            { label: 'Average', value: num(summary.latency.average), unit: 'ms', color: colorize(summary.latency.average, [150, 300]) },
            { label: 'p75', value: num(summary.latency.p75), unit: 'ms', color: colorize(summary.latency.p75, [150, 300]) },
            { label: 'p95', value: num(summary.latency.p95), unit: 'ms', color: colorize(summary.latency.p95, [300, 1000]),
              title: 'The slowest 5% of round trips. A p95 far above the median means the path was occasionally stalling, which is felt as stutter even when the average looks fine.' },
          ]}
        />

        <StatColumn
          title="Issues"
          rows={[
            { label: 'Audio', value: String(summary.issues.audio), color: summary.issues.audio > 0 ? 'var(--warning)' : 'var(--success)',
              title: issueTitle('audio', summary.issues) },
            { label: 'Video', value: String(summary.issues.video), color: summary.issues.video > 0 ? 'var(--warning)' : 'var(--success)',
              title: issueTitle('video', summary.issues) },
            { label: 'Network', value: String(summary.issues.network), color: summary.issues.network > 0 ? 'var(--warning)' : 'var(--success)',
              title: issueTitle('network', summary.issues) },
            { label: 'Other', value: String(summary.issues.other), color: summary.issues.other > 0 ? 'var(--text)' : 'var(--success)',
              title: issueTitle('other', summary.issues) },
          ]}
        />

        <StatColumn
          title="Transmission"
          rows={[
            { label: 'Sent', value: summary.transmission.bytesSent != null ? formatBytes(summary.transmission.bytesSent) : null },
            { label: 'Received', value: summary.transmission.bytesReceived != null ? formatBytes(summary.transmission.bytesReceived) : null },
            { label: 'Packets lost', value: summary.transmission.packetsLost > 0 ? summary.transmission.packetsLost.toLocaleString() : '0',
              unit: summary.transmission.lossRatePct != null ? ` (${summary.transmission.lossRatePct.toFixed(2)}%)` : '',
              color: colorize(summary.transmission.lossRatePct, [1, 5]) },
            { label: 'Avg inbound', value: num(summary.transmission.avgInboundKbps), unit: 'kbps' },
            { label: 'Avg outbound', value: num(summary.transmission.avgOutboundKbps), unit: 'kbps' },
          ]}
        />

        <StatColumn
          title="CPU"
          rows={[
            { label: 'Median video', value: num(summary.cpu.median), unit: '%', color: colorize(summary.cpu.median, [60, 100]) },
            { label: 'Max video', value: num(summary.cpu.max), unit: '%', color: colorize(summary.cpu.max, [80, 150]) },
            { label: 'p75 video', value: num(summary.cpu.p75), unit: '%', color: colorize(summary.cpu.p75, [60, 100]) },
            { label: 'p95 video', value: num(summary.cpu.p95), unit: '%', color: colorize(summary.cpu.p95, [80, 150]) },
            { label: 'CPU-limited', value: num(summary.cpu.cpuLimitedPct, 1), unit: '%', color: colorize(summary.cpu.cpuLimitedPct, [5, 20]),
              title: 'Share of send time the browser itself blamed on CPU. The rows above are derived from video encode and decode timers; this one is the browser\u2019s own verdict, so it covers the whole endpoint rather than just the video pipeline. WebRTC exposes no process-wide CPU figure, so this is the closest thing to an overall reading.' },
          ]}
        />
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  );
}
