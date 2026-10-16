/**
 * The validation boundary. **Server only.**
 *
 * Everything that comes out of the digest root is validated here, once, on the
 * way in — and nowhere else. Digests are written by a separate process which
 * may be a different version of itself, may be mid-write, and may one day write
 * a schema version this build has never seen. Reading such a document field by
 * field mostly works, and "mostly" is the problem: a field whose meaning
 * changed renders as though it had not.
 *
 * ## Why this file is not importable from a component
 *
 * `validators.mjs` is ~155KB of precompiled validation code. Validating in the
 * browser would ship all of it to every visitor to re-check something this
 * server already checked. So the split is: the server validates and answers
 * with a `ReadResult`; the browser consumes the generated *types* and the check
 * catalogue, which are metadata and cheap.
 *
 * Next.js decides what reaches the browser by import graph, so this module must
 * only ever be imported from a route handler or another server module. It is
 * named `server.ts` to make an accidental import obvious in review,
 * `src/digest/index.ts` deliberately does not re-export it, and
 * `scripts/noWritePath.test.ts` fails the build if a component reaches it.
 *
 * ## Why the result is a state rather than a throw
 *
 * Each of these outcomes needs its own thing on screen, and an exception
 * flattens them all into "something went wrong". A digest that has not been
 * produced yet, one whose producer failed, one written by a newer schema and a
 * genuinely empty period call for four different messages, and only some of
 * them are worth a retry button.
 *
 * The state that matters most is `missing`. A call with no digest is the normal
 * case for every call recorded before this feature existed, and the page must
 * stay useful: existing summaries, charts, diagnostics and raw samples do not
 * depend on a digest. "Quality digest is missing" is a notice, not an error.
 */

import {
  validateCallDigest,
  validatePeriodSummary,
  type ValidationError,
  type Validator,
} from './validators.mjs';

import type { CallDigest, PeriodSummary } from './types.ts';

/** The schema major version this build implements. */
export const SUPPORTED_SCHEMA_VERSION = 2;

/**
 * Why a digest could not be shown.
 *
 * `missing` — nothing has been written for this call or period. Expected.
 * `invalid` — an object exists and is not a digest this build can trust.
 * `unsupported-version` — a digest written by a newer contract.
 * `failed` — the read itself failed: storage refused, timed out, or returned
 *   something that was not JSON.
 *
 * Deliberately no `empty`: a period with no calls is a *valid document* that
 * says so, and conflating it with an absent one is how a broken pipeline gets
 * reported as a quiet Tuesday.
 */
export type ReadFailure = 'missing' | 'invalid' | 'unsupported-version' | 'failed';

export type ReadResult<T> =
  | { state: 'ready'; value: T }
  | { state: ReadFailure; reason?: string };

/** Shape of a validator's error list, trimmed to something loggable. */
function describe(errors: ValidationError[] | null | undefined): string {
  if (!errors?.length) return 'no detail';
  return errors
    .slice(0, 3)
    .map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`)
    .join('; ');
}

/**
 * Read the declared schema version without trusting anything else.
 *
 * Done before validation on purpose. A v3 document will fail a v2 validator for
 * dozens of reasons, and reporting the first of them would send somebody
 * hunting a field name when the real answer is "upgrade the dashboard". So the
 * version is the first question asked, and the only one answered from an
 * unvalidated object.
 */
function declaredVersion(raw: unknown): number | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const provenance = (raw as { provenance?: unknown }).provenance;
  if (typeof provenance !== 'object' || provenance === null) return undefined;
  const version = (provenance as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === 'number' ? version : undefined;
}

function parse<T>(raw: unknown, validate: Validator<T>, what: string): ReadResult<T> {
  if (raw === undefined || raw === null) return { state: 'missing' };

  const version = declaredVersion(raw);
  if (version === undefined) {
    return { state: 'invalid', reason: `${what} declares no provenance.schemaVersion` };
  }
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    return {
      state: 'unsupported-version',
      reason: `${what} is schema v${version}; this build implements v${SUPPORTED_SCHEMA_VERSION}`,
    };
  }

  // The narrowing happens inside the positive branch, which is the only shape
  // TypeScript follows through a type predicate.
  if (validate(raw)) return { state: 'ready', value: raw };

  return { state: 'invalid', reason: `${what} failed validation: ${describe(validate.errors)}` };
}

export function parseCallDigest(raw: unknown): ReadResult<CallDigest> {
  return parse<CallDigest>(raw, validateCallDigest, 'call digest');
}

export function parsePeriodSummary(raw: unknown): ReadResult<PeriodSummary> {
  return parse<PeriodSummary>(raw, validatePeriodSummary, 'period summary');
}

/**
 * One client session out of a validated call digest.
 *
 * Not validated again: it came out of a document that already passed, and
 * re-validating a sub-object would be theatre. `undefined` means the digest
 * holds no entry for that client — which is a real case worth distinguishing
 * from a missing digest, because the call was assessed and this participant was
 * not.
 */
export function clientOf(digest: CallDigest, clientId: string) {
  return digest.clients.find((c) => c.clientId === clientId);
}
