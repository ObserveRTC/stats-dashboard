'use client';
import { useCallback, useState } from 'react';
import {
  DIAGNOSTICS,
  DIAGNOSTIC_STATUS_LABEL,
  type DiagnosticContext,
  type DiagnosticResult,
  type DiagnosticStatus,
} from '../../utils/diagnostics.ts';
import styles from './CallDashboard.module.css';
import { InfoIcon } from '../help/InfoIcon.tsx';

const TAG_CLASS: Record<DiagnosticStatus, string> = {
  idle: 'tag-neutral',
  running: 'tag-outline',
  pass: 'tag-accent',
  fail: 'tag-outline',
  warn: 'tag-outline',
  skipped: 'tag-neutral',
};

/** `fail` and `warn` share the outline tag, so colour carries the difference. */
const TAG_STYLE: Partial<Record<DiagnosticStatus, React.CSSProperties>> = {
  fail: { borderColor: 'var(--quality-poor)', color: 'var(--quality-poor)' },
  warn: { borderColor: 'var(--quality-fair)', color: 'var(--quality-fair)' },
};

/**
 * Runs the real checks in utils/diagnostics against the loaded router
 * samples. Each check is synchronous; the brief `running` state exists so a
 * re-run reads as an action rather than a silent no-op.
 */
export function DiagnosticsCard({ context }: { context: DiagnosticContext }) {
  const [results, setResults] = useState<Record<string, DiagnosticResult>>({});

  const run = useCallback(
    (key: string) => {
      const definition = DIAGNOSTICS.find((d) => d.key === key);
      if (!definition) return;

      setResults((prev) => ({ ...prev, [key]: { status: 'running', detail: '' } }));
      // Yield a frame so the running state paints before the check blocks.
      requestAnimationFrame(() => {
        let result: DiagnosticResult;
        try {
          result = definition.run(context);
        } catch (err) {
          result = {
            status: 'fail',
            detail: err instanceof Error ? err.message : 'The check could not be completed.',
          };
        }
        setResults((prev) => ({ ...prev, [key]: result }));
      });
    },
    [context],
  );

  const runAll = useCallback(() => {
    DIAGNOSTICS.forEach((d) => run(d.key));
  }, [run]);

  const hasRouters = context.routerSamples.size > 0;

  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className={styles.cardHead}>
        <div className="card-title">
        Diagnostics <InfoIcon topic="call/diagnostics" />
      </div>
        <button type="button" className="btn btn-ghost" onClick={runAll} disabled={!hasRouters}>
          Run all
        </button>
      </div>

      <div className={styles.diagList}>
        {DIAGNOSTICS.map((d) => {
          const result = results[d.key] ?? { status: 'idle' as const, detail: '' };
          return (
            <div key={d.key} className={styles.diagItem}>
              <div className={styles.diagRow}>
                <button
                  type="button"
                  className={`btn btn-secondary ${styles.diagButton}`}
                  onClick={() => run(d.key)}
                  disabled={result.status === 'running' || !hasRouters}
                >
                  {d.label}
                </button>
                <span
                  className={`tag ${TAG_CLASS[result.status]}`}
                  style={TAG_STYLE[result.status]}
                >
                  {DIAGNOSTIC_STATUS_LABEL[result.status]}
                </span>
              </div>
              {result.detail && <div className={styles.diagDetail}>{result.detail}</div>}
            </div>
          );
        })}
      </div>

      {!hasRouters && (
        <div className={styles.diagFooter}>
          Diagnostics need router samples, which this call has none of.
        </div>
      )}
    </div>
  );
}
