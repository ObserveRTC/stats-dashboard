/**
 * A stats time series, as a CSV a spreadsheet will open honestly.
 *
 * Every metrics subsection — a consumer's inbound RTP, a producer's outbound
 * RTP, the remote-outbound view of either — is backed by the same shape: a list
 * of samples, each an object of fields, taken across the session. This flattens
 * that list, and the whole file is about the three ways such a conversion
 * silently loses or corrupts data:
 *
 *   1. **A field that appears late.** Browsers begin reporting some fields only
 *      once they have a value: `framesDecoded` before the first frame arrives,
 *      `qualityLimitationReason` before the encoder is under pressure. Reading
 *      the columns off the first row alone drops those from the export
 *      entirely — the file looks complete and is not. The header is the union
 *      of every key in every row.
 *   2. **Quoting.** A candidate address, a codec's `sdpFmtpLine` or an ICE URL
 *      can carry commas, quotes and newlines. RFC 4180 rules, applied to every
 *      value rather than to the ones that look risky.
 *   3. **Formula injection.** Text beginning `=`, `+` or `@` is executed as a
 *      formula by Excel and Sheets on open. Numbers are left exactly as they
 *      are — a leading `-` is a negative reading far more often than it is an
 *      attack — so only non-numeric text is defused.
 *
 * This is deliberately separate from `metricSeriesExport.ts`, which builds the
 * *compact* clipboard CSV: one column per charted metric, `t` in seconds, and a
 * title line above the header. That shape is for pasting a chart into a
 * message. This one is for analysis, so it carries every field the browser
 * reported and real timestamps, and its first line is the column header with
 * nothing above it — a title line would land in a spreadsheet as row 1 and push
 * every column name into the data.
 */

/** A single sample: one row of the export. */
export type CsvRow = Record<string, unknown>;

export interface ToCsvOptions {
  /**
   * Columns to place first, in this order, when present. The rest follow in
   * first-seen order, so the file opens on the fields a reader is looking for
   * without hiding any of the others.
   */
  leadingColumns?: string[];
  /**
   * Field holding an epoch-ms timestamp. When present, an ISO-8601 column is
   * inserted beside it: the raw number is what you sort and subtract on, the
   * ISO string is what you read.
   */
  timestampField?: string;
  /** Name for the derived ISO column. */
  isoColumnName?: string;
}

const DEFAULT_TIMESTAMP_FIELD = 'timestamp';
const DEFAULT_ISO_COLUMN = 'timestampIso';

/**
 * Every key in every row, in first-seen order.
 *
 * The union, not the first row's keys — see note 1 above. This is the single
 * most important function in the file.
 */
function collectColumns(rows: CsvRow[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }
  return columns;
}

/** Reorder so `leading` comes first, in the order given. */
function applyColumnOrder(columns: string[], leading: string[] | undefined): string[] {
  if (!leading?.length) return columns;
  const wanted = leading.filter((c) => columns.includes(c));
  const rest = columns.filter((c) => !wanted.includes(c));
  return [...wanted, ...rest];
}

/**
 * Render one value as text, before quoting.
 *
 * `null` and `undefined` both become empty rather than the strings "null" and
 * "undefined": a missing reading is missing, and a spreadsheet will not average
 * an empty cell into a column.
 */
function renderValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** True when a spreadsheet would execute the text rather than display it. */
function looksLikeFormula(text: string): boolean {
  return /^[=+@\t\r]/.test(text);
}

/** RFC 4180 quoting, plus the formula guard. */
export function escapeCsvValue(value: unknown): string {
  let text = renderValue(value);
  if (text === '') return '';

  // A leading apostrophe defuses it: spreadsheets strip it on display, and the
  // value stays readable in a plain-text diff.
  if (typeof value !== 'number' && looksLikeFormula(text)) text = `'${text}`;

  const mustQuote =
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text !== text.trim();

  return mustQuote ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Epoch ms, a `Date`, or an ISO string in — ISO string out.
 *
 * Anything unreadable yields an empty cell rather than "Invalid Date", which
 * would sort and filter as text among real timestamps.
 */
function toIso(value: unknown): string {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Date.parse(value)
          : NaN;
  if (!Number.isFinite(ms)) return '';
  try {
    return new Date(ms).toISOString();
  } catch {
    return '';
  }
}

/**
 * Serialize samples to CSV.
 *
 * Returns an empty string for no rows, so a caller can tell "nothing to export"
 * from "a file of headers with no data" and decline to offer the download at
 * all.
 *
 * Lines end `\r\n`, which RFC 4180 requires and Excel on Windows needs to keep
 * rows apart; every other reader accepts it.
 */
export function toCsv(rows: CsvRow[] | null | undefined, options: ToCsvOptions = {}): string {
  if (!rows?.length) return '';

  const timestampField = options.timestampField ?? DEFAULT_TIMESTAMP_FIELD;
  const isoColumnName = options.isoColumnName ?? DEFAULT_ISO_COLUMN;

  const raw = collectColumns(rows);
  if (raw.length === 0) return '';

  const hasTimestamp = raw.includes(timestampField);
  const columns = applyColumnOrder(
    raw,
    options.leadingColumns ?? (hasTimestamp ? [timestampField] : undefined),
  );

  // The ISO column rides immediately after the raw timestamp it describes.
  const header: string[] = [];
  for (const column of columns) {
    header.push(column);
    if (hasTimestamp && column === timestampField) header.push(isoColumnName);
  }

  const lines: string[] = [header.map(escapeCsvValue).join(',')];

  for (const row of rows) {
    const cells: string[] = [];
    for (const column of columns) {
      const value = row?.[column];
      cells.push(escapeCsvValue(value));
      if (hasTimestamp && column === timestampField) cells.push(escapeCsvValue(toIso(value)));
    }
    lines.push(cells.join(','));
  }

  return lines.join('\r\n');
}
