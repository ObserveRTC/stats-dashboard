'use client';
import { useCallback, useState, type MouseEvent } from 'react';
import { toCsv, type CsvRow, type ToCsvOptions } from '../../utils/csvExport.ts';
import styles from './CopyMetricsCsvButton.module.css';

export interface CopyMetricsCsvButtonProps {
  /**
   * The subsection's samples, gathered on click rather than on render — an
   * export is rare and a series can run to thousands of rows, so nothing is
   * serialized until someone asks for it.
   */
  getRows: () => CsvRow[] | null | undefined;
  title?: string;
  className?: string;
  csvOptions?: ToCsvOptions;
}

/**
 * Copy a subsection's whole time series to the clipboard as CSV.
 *
 * The third icon on a subsection header, beside the screenshot and the
 * permalink, and distinct from both in what it carries: the screenshot is the
 * picture, this is the numbers behind it.
 *
 * Distinct from `CopyCsvButton` too. That one copies the *charted* metrics in a
 * compact shape — one column per chart, `t` in seconds, a title line on top —
 * for pasting into a message. This one copies every field the browser reported
 * with real timestamps, and its first line is the column header with nothing
 * above it, so it lands in a spreadsheet as a table rather than as text needing
 * a cleanup pass.
 */
export function CopyMetricsCsvButton({
  getRows,
  title = 'Copy this subsection to the clipboard as CSV',
  className,
  csvOptions,
}: CopyMetricsCsvButtonProps) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');

  const handleClick = useCallback(
    (e: MouseEvent) => {
      // The header is a toggle; without this, exporting collapses the section.
      e.stopPropagation();
      const csv = toCsv(getRows() ?? [], csvOptions);
      if (!csv) return;
      navigator.clipboard
        .writeText(csv)
        .then(() => setState('done'))
        // Clipboard access can be refused outright (an insecure origin, a
        // denied permission). Saying so beats a button that looks inert.
        .catch(() => setState('failed'))
        .finally(() => setTimeout(() => setState('idle'), 1800));
    },
    [getRows, csvOptions],
  );

  return (
    <button
      type="button"
      className={`${styles.btn} ${state === 'done' ? styles.btnDone : ''} ${
        state === 'failed' ? styles.btnFailed : ''
      } ${className ?? ''}`}
      onClick={handleClick}
      title={state === 'failed' ? 'Could not reach the clipboard' : title}
      aria-label={title}
    >
      {state === 'done' ? (
        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" aria-hidden="true">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" aria-hidden="true">
          {/* A grid on a clipboard: rows and columns, headed for the clipboard. */}
          <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v1H4.5A1.5 1.5 0 003 6.5v10A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5v-10A1.5 1.5 0 0015.5 5H15V4a2 2 0 00-2-2H7zm6.5 4.5h2v10h-11v-10h2V8a1 1 0 001 1h5a1 1 0 001-1V6.5zM7 4h6v1.5H7V4z" clipRule="evenodd" />
          <path d="M6 11h3v1.5H6V11zm5 0h3v1.5h-3V11zm-5 3h3v1.5H6V14zm5 0h3v1.5h-3V14z" />
        </svg>
      )}
    </button>
  );
}
