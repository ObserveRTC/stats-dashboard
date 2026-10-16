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
  PeriodSummary,
  ClientDigest,
  ClientCheck,
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
export declare const validatePeriodSummary: Validator<PeriodSummary>;
export declare const validateClientDigest: Validator<ClientDigest>;
export declare const validateClientCheck: Validator<ClientCheck>;
