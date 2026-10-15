import { getDigestJson, listDigestObjectsDeep } from './s3.ts';
import {
  digestDayKey,
  digestMonthFolder,
  digestMonthKey,
  normalizeDigest,
  parseDigestDayKey,
  type DigestDocument,
} from '../schema/Digest.ts';
import { rollUpMonth } from '../utils/digestModel.ts';

/**
 * Reading a period's digest out of the digest root.
 *
 * A day is one GET. A month is one GET, or at worst the ≤31 day objects folded
 * together while its roll-up is being caught up. Nothing here scales with how
 * many calls there were, which is the entire point of the digest root existing.
 *
 * ## The dashboard reads; it does not produce
 *
 * Whatever writes the digests — a queue-driven processor, a scheduled job, a
 * script somebody runs by hand — is outside this repository and is free to
 * change. The only coupling is the key layout and the document shape, both
 * stated in `schema/Digest.ts` and `docs/storage-layout.md`.
 *
 * So there is no path here that counts calls. An earlier design had one, for a
 * period nothing had digested yet, and it was a mistake twice over: it meant
 * two implementations of every figure with no way to keep them agreeing, and it
 * made the page that reports a slow system the slowest page to load. A period
 * with no digest reports exactly that, and the fix is upstream.
 */

export type DigestSource = 'stored' | 'rolled';

export interface DigestResult {
  /** The period's digest, or null when nothing has been written for it. */
  doc: DigestDocument | null;
  source: DigestSource | null;
}

async function readStored(
  key: string,
  period: 'day' | 'month',
  id: string,
): Promise<DigestDocument | undefined> {
  const raw = await getDigestJson(key);
  if (raw === undefined) return undefined;

  const doc = normalizeDigest(raw);
  if (!doc) {
    // A digest that exists and cannot be read is worth a line: it means
    // whatever writes them is writing something this dashboard does not
    // understand, which is a version mismatch and not an empty day.
    console.warn('[digest] %s is not a readable digest document', key);
    return undefined;
  }
  if (doc.period !== period || doc.id !== id) {
    console.warn('[digest] %s holds %s %s — filed under the wrong key', key, doc.period, doc.id);
    return undefined;
  }
  return doc;
}

export async function loadDayDigest(day: string): Promise<DigestResult> {
  const stored = await readStored(digestDayKey(day), 'day', day);
  return stored ? { doc: stored, source: 'stored' } : { doc: null, source: null };
}

export async function loadMonthDigest(month: string): Promise<DigestResult> {
  const stored = await readStored(digestMonthKey(month), 'month', month);
  if (stored) return { doc: stored, source: 'stored' };

  // A month's roll-up is written after its days, so there is a window — longer
  // after a backfill — where the days exist and the month does not. Folding
  // them costs at most 31 small GETs and reads nothing but digests.
  const rolled = await rollFromStoredDays(month);
  return rolled ? { doc: rolled, source: 'rolled' } : { doc: null, source: null };
}

/**
 * The month's day objects, folded. `undefined` when there are none.
 *
 * Undefined rather than an empty month, because "no day objects were written"
 * and "a month in which no calls happened" are different claims and this cannot
 * tell them apart. Saying the second when only the first is known is how a
 * dashboard reports an outage as a quiet month.
 */
async function rollFromStoredDays(month: string): Promise<DigestDocument | undefined> {
  const keys = (await listDigestObjectsDeep(digestMonthFolder(month)))
    .map((o) => o.key)
    // Only day objects. Anything else in the folder is somebody else's and must
    // not be read as a day — a month roll-up found in here, for instance, would
    // double every total if it were folded in as one.
    .filter((key) => parseDigestDayKey(key) !== null);

  if (keys.length === 0) return undefined;

  const docs = await Promise.all(
    keys.map(async (key) => {
      const raw = await getDigestJson(key);
      return raw === undefined ? null : normalizeDigest(raw);
    }),
  );

  const days = docs.filter((d): d is DigestDocument => d !== null && d.period === 'day');
  if (days.length === 0) return undefined;

  return rollUpMonth(days, month);
}
