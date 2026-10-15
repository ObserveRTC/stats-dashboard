/**
 * Decoding a patch-encoded client `.jsonl`.
 *
 * The observer writes one client's samples as newline-delimited JSON where only
 * the **first** line is a whole sample. Every line after it is a patch against
 * the sample before it: a key present with a new value replaces it, a key whose
 * value is `null` is a deletion, and a key absent from the patch is unchanged.
 * That is what keeps a long call's archive small — a 90-minute capture is
 * mostly unchanged fields.
 *
 * ## Why this app has its own copy
 *
 * The dashboard decodes these too, in a Web Worker — and a Worker built from a
 * Blob cannot `import` anything, so its copy is necessarily inlined in a string.
 * There is no arrangement in which one module serves both.
 *
 * So there are two implementations of one wire format, which is a real risk:
 * the dashboard and this processor reading the same archive and reporting
 * different numbers, with nothing on either screen to say which is wrong. The
 * mitigation is a test rather than a shared file —
 * `scripts/samplePatch.test.ts` in the dashboard extracts its Worker's
 * `applyPatch` and asserts it agrees with this one, case by case. That test is
 * dev-time only and creates no runtime dependency in either direction.
 *
 * ## Behaviour, precisely
 *
 * - an object value merges recursively into the base object;
 * - **an array value replaces the base array wholesale** — not merged
 *   element by element;
 * - `null` deletes the key;
 * - anything else replaces.
 *
 * The array rule means a patch must carry *complete* array elements. A patch
 * holding only an element's changed fields would drop every field it omitted,
 * so the encoder has to re-send each stats object in full whenever any part of
 * it changes.
 *
 * ## An ambiguity worth resolving against a real archive
 *
 * The shape of the dashboard's original hints at an intent neither copy
 * implements. There is a positional branch for a patch that *is* an array, and
 * the base is spread as `[]` when it is an array — both of which only make
 * sense if arrays were meant to merge positionally. With the `!Array.isArray`
 * guard below, neither is reachable from a normal object patch.
 *
 * So either the encoder sends whole array elements and this is correct, or it
 * sends positional diffs and both decoders have been dropping unchanged fields
 * all along. The two cannot be distinguished without a real capture: a dropped
 * field reads as a stat the platform does not publish, which is a state this
 * system treats as normal.
 *
 * ## The delete sentinel is why `undefined` is not enough
 *
 * `null` means "remove this key", not "this key is null". A decoder that
 * assigned null instead of deleting would leave a field present-and-null where
 * the producer meant absent — and absent versus null is precisely the
 * distinction the analytics contract is built on, since a null count means
 * unknown while a missing stat means the stat was never reported.
 */

/**
 * Apply one patch to one base value.
 *
 * Transcribed from the decoder the dashboard's Worker ships, so the two agree
 * by construction rather than by coincidence.
 */
export function applyPatch(base, patch) {
  if (patch === null || typeof patch !== 'object') return patch;

  if (Array.isArray(patch)) {
    return patch.map((item, i) => applyPatch(Array.isArray(base) ? base[i] : undefined, item));
  }

  const result = Array.isArray(base) ? [] : { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
      continue;
    }
    const existing = base?.[key];
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof existing === 'object' &&
      existing !== null
    ) {
      result[key] = applyPatch(existing, value);
      continue;
    }
    result[key] = value;
  }

  return result;
}

/**
 * Decode a whole `.jsonl` into full samples, one per line.
 *
 * Returns a *new* object per sample rather than a view onto a mutating one, so
 * a caller can hold two consecutive samples and difference them. Sharing
 * structure here would make every delta zero, which looks like a quiet network
 * rather than a bug.
 *
 * A malformed line stops the decode: after a bad patch, every later sample is
 * built on a base that never existed, so continuing would produce plausible
 * numbers from a fiction. The error names the line, and the caller decides
 * whether a partial read is usable.
 */
export function decodePatchedJsonl(jsonl) {
  const lines = String(jsonl ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) return [];

  let current;
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    let parsed;
    try {
      parsed = JSON.parse(lines[i]);
    } catch (err) {
      throw new Error(`line ${i + 1} is not valid JSON: ${err.message}`);
    }

    current = i === 0 ? parsed : applyPatch(current, parsed);
    // Structured-clone rather than a reference, so differencing two samples
    // compares two states and not one object with itself.
    out.push(structuredClone(current));
  }

  return out;
}
