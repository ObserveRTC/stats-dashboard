/**
 * Shared helpers for converting time-series arrays to MiniChart data format.
 */

export interface MiniChartDataPoint {
  timestamp: Date;
  value: number;
}

export function toMiniChartData<T extends { timestamp: Date | number }>(
  values: T[],
  field: keyof T,
): MiniChartDataPoint[] {
  return values
    .map((v) => ({
      timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp as number),
      value: typeof v[field] === 'number' ? (v[field] as number) : NaN,
    }))
    .filter((d) => Number.isFinite(d.value));
}

/** Returns true if the series has at least 2 non-zero values. */
export function hasEnoughData(data: MiniChartDataPoint[]): boolean {
  return data.filter((d) => d.value !== 0).length >= 2;
}

/**
 * Extract the first non-empty `attachments` record from a time-series values array.
 * The raw stats object is spread into each value, so attachments live at the top level
 * even though they are not in the typed interface.
 */
export function extractValuesAttachments(
  values: unknown[],
): Record<string, unknown> | null {
  for (const v of values) {
    const a = (v as Record<string, unknown>)['attachments'];
    if (a && typeof a === 'object' && !Array.isArray(a)) {
      const rec = a as Record<string, unknown>;
      if (Object.keys(rec).some((k) => rec[k] != null)) return rec;
    }
  }
  return null;
}
