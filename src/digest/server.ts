/**
 * The validation boundary. **Server only.**
 *
 * Everything that comes out of the analytics root is validated here, once, on
 * the way in — and nowhere else. The digests are written by a producer outside
 * this repository, which may be a different version of itself, may be mid-PUT,
 * and may one day write a schema version this build has never seen. Reading
 * such a document field by field mostly works, and "mostly" is the problem: a
 * field whose meaning changed renders as though it had not.
 *
 * ## Why this file is not importable from a component
 *
 * `validators.mjs` is ~370KB of precompiled validation code. Validating in the
 * browser would ship all of it to every visitor to re-check something this
 * server already checked. So the split is: the server validates and answers
 * with a `ReadResult`; the browser consumes the generated *types* and the
 * registry, which are metadata and cheap.
 *
 * Next.js decides what reaches the browser by import graph, so this module must
 * only ever be imported from a route handler or another server module. It is
 * named `server.ts` to make an accidental import obvious in review, and
 * `src/digest/index.ts` deliberately does not re-export it.
 *
 * ## Why the result is a state rather than a throw
 *
 * Each of these outcomes needs its own thing on screen, and an exception
 * flattens them all into "something went wrong". A pending job, a verified
 * empty period, a version mismatch and a failed read call for four different
 * messages and only one of them is worth a retry button.
 */

import {
  validateCallDigest,
  validateFinding,
  validateManifest,
  validateParticipantDigest,
  validatePathDigest,
  validatePeriodDigest,
  validateStreamDigest,
  validateTimelineRecord,
  type ValidationError,
  type Validator,
} from './validators.mjs';

import type {
  CallDigest,
  Finding,
  Manifest,
  ParticipantDigest,
  PathDigest,
  PeriodDigest,
  ReadState,
  StreamDigest,
  TimelineRecord,
} from './types.ts';

/** The schema major version this build implements. */
export const SUPPORTED_SCHEMA_VERSION = 1;

export type ParseOutcome<T> =
  | { state: 'ready'; document: T }
  | { state: 'not-found'; reasons: string[] }
  | { state: 'unsupported-version'; schemaVersion: number; reasons: string[] }
  | { state: 'failed'; reasons: string[]; errors?: ValidationError[] };

/**
 * The version check happens before validation, on purpose.
 *
 * A version-2 document will fail a version-1 schema in a dozen confusing ways,
 * and reporting those as validation errors tells an operator the producer is
 * broken when in fact it is newer. Reading the version first turns that into
 * one accurate sentence.
 */
function readVersion(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === 'number' && Number.isFinite(version) ? version : null;
}

function parseVersioned<T>(
  raw: unknown,
  validate: Validator<T>,
  label: string,
): ParseOutcome<T> {
  if (raw === undefined || raw === null) {
    return { state: 'not-found', reasons: ['read.not-found'] };
  }

  const version = readVersion(raw);
  if (version === null) {
    return { state: 'failed', reasons: ['read.failed'] };
  }
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    return {
      state: 'unsupported-version',
      schemaVersion: version,
      reasons: ['read.unsupported-version'],
    };
  }

  if (validate(raw)) return { state: 'ready', document: raw };

  {
    const errors = validate.errors ?? [];
    // Logged here rather than only returned, because the response deliberately
    // does not carry schema paths to the browser: a validation trace names
    // internal structure, and the operator who needs it reads the container
    // log. The UI gets a state and a reason code.
    console.error(
      '[digest] %s failed validation: %s',
      label,
      errors
        .slice(0, 5)
        .map((e: ValidationError) => `${e.instancePath || '/'} ${e.message ?? e.keyword}`)
        .join('; '),
    );
    return { state: 'failed', reasons: ['read.failed'], errors };
  }
}

export function parseCallDigest(raw: unknown): ParseOutcome<CallDigest> {
  return parseVersioned(raw, validateCallDigest, 'call digest');
}

export function parsePeriodDigest(raw: unknown): ParseOutcome<PeriodDigest> {
  return parseVersioned(raw, validatePeriodDigest, 'period digest');
}

export function parseManifest(raw: unknown): ParseOutcome<Manifest> {
  return parseVersioned(raw, validateManifest, 'manifest');
}

/**
 * Validate one page of detail records.
 *
 * Per record rather than per page, so one malformed row does not discard a
 * page of good ones. The rejected count comes back with the records: a page
 * that silently returned 19 of 20 rows would make a participant disappear with
 * nothing to explain it.
 */
export type DetailKind = 'participants' | 'streams' | 'paths' | 'timeline' | 'findings';

const DETAIL_VALIDATORS = {
  participants: validateParticipantDigest as Validator<unknown>,
  streams: validateStreamDigest as Validator<unknown>,
  paths: validatePathDigest as Validator<unknown>,
  timeline: validateTimelineRecord as Validator<unknown>,
  findings: validateFinding as Validator<unknown>,
} satisfies Record<DetailKind, Validator<unknown>>;

export interface DetailPage<T> {
  items: T[];
  rejected: number;
}

export function parseDetailItems(kind: 'participants', items: unknown[]): DetailPage<ParticipantDigest>;
export function parseDetailItems(kind: 'streams', items: unknown[]): DetailPage<StreamDigest>;
export function parseDetailItems(kind: 'paths', items: unknown[]): DetailPage<PathDigest>;
export function parseDetailItems(kind: 'timeline', items: unknown[]): DetailPage<TimelineRecord>;
export function parseDetailItems(kind: 'findings', items: unknown[]): DetailPage<Finding>;
export function parseDetailItems(kind: DetailKind, items: unknown[]): DetailPage<unknown> {
  const validate = DETAIL_VALIDATORS[kind];
  const kept: unknown[] = [];
  let rejected = 0;

  for (const item of items) {
    if (validate(item)) kept.push(item);
    else rejected += 1;
  }

  if (rejected > 0) {
    console.warn('[digest] %d of %d %s records failed validation', rejected, items.length, kind);
  }

  return { items: kept, rejected };
}

/** Map a parse outcome onto the contract's read states, for an API response. */
export function toReadState(outcome: ParseOutcome<unknown>): ReadState {
  return outcome.state;
}
