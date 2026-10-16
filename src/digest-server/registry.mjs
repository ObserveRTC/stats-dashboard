/**
 * The check catalogue, read straight from the contract.
 *
 * `digest-schema/registry/checks.v2.json` is the single source of truth for
 * which questions exist, which section each belongs to and which built-in issue
 * types it claims. The dashboard reads the same file through generated
 * TypeScript; this reads the JSON directly. Neither copies it.
 *
 * This is the only module here that knows where the contract comes from. When
 * `@observertc/digest-schema` is published, the three lines below become an
 * import of that package and nothing else in this app changes.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT = resolve(HERE, '..', '..', 'digest-schema');

const read = (...parts) => JSON.parse(readFileSync(join(CONTRACT, ...parts), 'utf8'));

export const CHECK_CATALOGUE = read('registry', 'checks.v2.json');

/**
 * The rules version written into every digest's provenance.
 *
 * Derived from the catalogue rather than declared here, because the catalogue
 * is what changes when a question or a rule changes. Bumping it means the same
 * inputs may now answer differently; existing digests are not regenerated and
 * keep the answer their rules gave.
 */
export const RULES_VERSION = CHECK_CATALOGUE.catalogueVersion;

export const SCHEMA_VERSION = 2;

export const SECTIONS = [...CHECK_CATALOGUE.sections].sort((a, b) => a.order - b.order);

export const CHECKS = [...CHECK_CATALOGUE.checks].sort(
  (a, b) =>
    (SECTIONS.findIndex((s) => s.id === a.section) - SECTIONS.findIndex((s) => s.id === b.section)) ||
    a.order - b.order,
);

export const CHECK_IDS = CHECKS.map((c) => c.id);

const BY_ID = new Map(CHECKS.map((c) => [c.id, c]));

export function checkDefinition(id) {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`no such check in the catalogue: ${id}`);
  return found;
}

/** issue type -> the one check that claims it. */
export const CHECK_BY_ISSUE_TYPE = Object.freeze(
  Object.fromEntries(CHECKS.flatMap((c) => (c.issueTypes ?? []).map((t) => [t, c.id]))),
);

/** check id -> the issue types it claims, as a Set for membership tests. */
export const ISSUE_TYPES_BY_CHECK = Object.freeze(
  Object.fromEntries(CHECKS.map((c) => [c.id, new Set(c.issueTypes ?? [])])),
);

export const EVENT_TYPES_BY_CHECK = Object.freeze(
  Object.fromEntries(CHECKS.map((c) => [c.id, new Set(c.eventTypes ?? [])])),
);

/**
 * Check ids the engine has no rule for.
 *
 * Exported so a test can assert it is empty. A catalogue entry with no rule
 * would be a question the UI renders a heading for and never answers — worse
 * than an absent check, because the reader assumes it was evaluated.
 */
export function checksWithoutRule(implemented) {
  return CHECK_IDS.filter((id) => !implemented.has(id));
}
