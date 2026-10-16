/**
 * The digest contract, for anything that renders it.
 *
 * Types and check-catalogue metadata only — both safe in the browser. The
 * validators are **not** re-exported here on purpose: they are ~155KB of
 * precompiled code and belong on the server, which is the side that reads
 * storage. Importing `./server.ts` from a component would pull all of it into
 * the client bundle, and this barrel's job is to make that a deliberate act
 * rather than an accident of autocomplete.
 *
 * ## How a digest becomes words on a page
 *
 * A stored check is an id and an outcome. Everything a reader sees around it is
 * resolved here at render time:
 *
 *   check id      -> `checkDefinition(id)`  question, section, rule, order
 *   section id    -> `checkSection(id)`     label and order
 *   issue type    -> `CLIENT_ISSUE_TYPES`   label, meaning, implication, chart
 *
 * That last one is not in this module and should not be: `src/schema/
 * ClientIssueTypes.ts` already owns it and the client page already uses it. The
 * digest references built-in issue types by name precisely so the two pages
 * describe the same issue the same way.
 */

export type {
  CallDigest,
  ClientDigest,
  ClientCheck,
  PeriodSummary,
} from './types.ts';

export {
  CHECK_CATALOGUE,
  CATALOGUE_VERSION,
  CHECK_BY_ISSUE_TYPE,
  checkDefinition,
  checkSection,
  checkQuestion,
  checksInSection,
  orderedSections,
  type CheckDefinition,
  type CheckSection,
} from './registry.ts';

/** The four answers a check can give. Mirrors `common.json#/$defs/outcome`. */
export type CheckOutcome = 'passed' | 'failed' | 'not-assessable' | 'not-applicable';

/**
 * Display order for outcomes, worst first.
 *
 * `not-assessable` sorts above `passed` deliberately. A reader scanning a list
 * needs to see what could not be answered before what was answered well —
 * ranking it below a pass is how an unassessable call reads as a healthy one.
 */
export const OUTCOME_ORDER: readonly CheckOutcome[] = [
  'failed',
  'not-assessable',
  'passed',
  'not-applicable',
] as const;

export const OUTCOME_LABELS: Readonly<Record<CheckOutcome, string>> = Object.freeze({
  failed: 'Failed',
  'not-assessable': 'Not assessable',
  passed: 'Passed',
  'not-applicable': 'Not applicable',
});

/**
 * The glyph beside each outcome, from the agreed sketch.
 *
 * Paired with the label, never alone: colour and a symbol are not a status for
 * a screen reader, and `?` on its own does not say "we could not tell".
 */
export const OUTCOME_SYMBOLS: Readonly<Record<CheckOutcome, string>> = Object.freeze({
  passed: '✓',
  failed: '✕',
  'not-assessable': '?',
  'not-applicable': '—',
});

/**
 * Whether an outcome is a finding a person should act on.
 *
 * Only `failed`. Named as a function rather than left to each call site because
 * "is this a problem" is asked in a dozen places and the one wrong answer —
 * treating `not-assessable` as fine — must not be reachable by accident.
 */
export function isFinding(outcome: CheckOutcome): boolean {
  return outcome === 'failed';
}

/**
 * Whether an outcome represents evidence at all.
 *
 * `passed` and `failed` rest on evidence; the other two do not. Use this for
 * any denominator: a coverage figure that counts unassessable sessions as
 * assessed is the specific lie this contract is built to prevent.
 */
export function isAssessed(outcome: CheckOutcome): boolean {
  return outcome === 'passed' || outcome === 'failed';
}
