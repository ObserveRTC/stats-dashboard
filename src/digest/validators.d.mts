/* eslint-disable */
/**
 * GENERATED FILE — do not edit. Source: digest-schema/schema/*.json
 * Regenerate: npm run schema:generate
 *
 * SERVER ONLY. This module is ~380KB of precompiled validation code and must
 * never reach the browser bundle: the storage contract is validated where
 * storage is read, which is the server. Import it from route handlers and
 * server modules only — `src/digest/server.ts` is the one place that
 * does, and the browser imports types and the registry instead.
 */

import type {
  CallDigest,
  PeriodDigest,
  Manifest,
  Page,
  CallSearchRow,
  ReadResult,
  ParticipantDigest,
  StreamDigest,
  PathDigest,
  TimelineRecord,
  Finding,
} from './types.ts';

/** Ajv attaches the failure list to the function itself after a false return. */
export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
  params?: Record<string, unknown>;
}

export interface Validator<T> {
  (value: unknown): value is T;
  errors?: ValidationError[] | null;
}

export declare const validateCallDigest: Validator<CallDigest>;
export declare const validatePeriodDigest: Validator<PeriodDigest>;
export declare const validateManifest: Validator<Manifest>;
export declare const validatePage: Validator<Page>;
export declare const validateCallSearchRow: Validator<CallSearchRow>;
export declare const validateReadResult: Validator<ReadResult>;
export declare const validateParticipantDigest: Validator<ParticipantDigest>;
export declare const validateStreamDigest: Validator<StreamDigest>;
export declare const validatePathDigest: Validator<PathDigest>;
export declare const validateTimelineRecord: Validator<TimelineRecord>;
export declare const validateFinding: Validator<Finding>;
