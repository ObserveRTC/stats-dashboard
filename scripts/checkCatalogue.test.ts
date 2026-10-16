/**
 * The check catalogue is complete and internally consistent.
 *
 *   node --experimental-strip-types scripts/checkCatalogue.test.ts
 *
 * ## The claim worth testing
 *
 * Every one of the built-in issue types in `src/schema/ClientIssueTypes.ts` is
 * claimed by exactly one check. That matters because of how the UI works: the
 * call and client pages render *sections of checks*, and an issue type no check
 * claims would be detected by the monitor, stored in the digest, and then
 * appear nowhere on either page. It would not error — it would be silently
 * invisible, which is the worst failure mode a quality tool has.
 *
 * It is also the claim most likely to rot. The monitor adds a detector, someone
 * regenerates the types, and nothing anywhere notices that no section displays
 * it. This test is what notices.
 *
 * The inverse matters too: a check claiming an issue type that does not exist
 * is a typo that silently weakens a rule, because the processor will look for
 * an issue that can never fire and the check will sit at `not-assessable`
 * forever.
 */

import assert from 'node:assert/strict';
import { CHECK_CATALOGUE, CHECK_BY_ISSUE_TYPE, orderedSections, checksInSection, checkQuestion }
  from '../src/digest/registry.ts';
import { CLIENT_ISSUE_TYPES, ISSUE_CATEGORY_ORDER } from '../src/schema/ClientIssueTypes.ts';
import { ClientEventTypes } from '../src/schema/ClientEventTypes.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const checks = CHECK_CATALOGUE.checks;
const builtInIssues = Object.keys(CLIENT_ISSUE_TYPES);
const builtInEvents = new Set<string>(Object.values(ClientEventTypes));

check('the catalogue is populated', () => {
  assert.ok(checks.length >= 15, `only ${checks.length} checks`);
  assert.ok(builtInIssues.length >= 30, `only ${builtInIssues.length} built-in issue types`);
});

check('every built-in issue type is claimed by exactly one check', () => {
  const claims = new Map<string, string[]>();
  for (const c of checks) {
    for (const t of (c as { issueTypes?: readonly string[] }).issueTypes ?? []) {
      (claims.get(t) ?? claims.set(t, []).get(t)!).push(c.id);
    }
  }

  const unclaimed = builtInIssues.filter((t) => !claims.has(t));
  assert.deepEqual(
    unclaimed,
    [],
    'these built-in issue types are claimed by no check, so the monitor can detect them,\n' +
      'the processor can store them, and neither page will ever show them:\n  ' +
      unclaimed.map((t) => `${t} (${CLIENT_ISSUE_TYPES[t]!.category})`).join('\n  '),
  );

  const doubled = [...claims].filter(([, ids]) => ids.length > 1);
  assert.deepEqual(
    doubled.map(([t, ids]) => `${t} -> ${ids.join(', ')}`),
    [],
    'an issue type claimed by two checks would be counted twice in a section roll-up',
  );
});

check('no check claims an issue type that does not exist', () => {
  const unknown = Object.keys(CHECK_BY_ISSUE_TYPE).filter((t) => !(t in CLIENT_ISSUE_TYPES));
  assert.deepEqual(
    unknown,
    [],
    'a check waiting on an issue type that can never fire sits at not-assessable for ever:\n  ' +
      unknown.join('\n  '),
  );
});

check('no check claims an event type that does not exist', () => {
  const unknown: string[] = [];
  for (const c of checks) {
    for (const e of (c as { eventTypes?: readonly string[] }).eventTypes ?? []) {
      if (!builtInEvents.has(e)) unknown.push(`${c.id} -> ${e}`);
    }
  }
  assert.deepEqual(unknown, [], unknown.join('\n  '));
});

check('every check belongs to a declared section, and every section has checks', () => {
  const sectionIds = new Set(CHECK_CATALOGUE.sections.map((s) => s.id));
  const orphans = checks.filter((c) => !sectionIds.has(c.section)).map((c) => c.id);
  assert.deepEqual(orphans, [], `checks in an undeclared section: ${orphans.join(', ')}`);

  const empty = [...sectionIds].filter((s) => checksInSection(s).length === 0);
  assert.deepEqual(empty, [], `sections that would render as an empty heading: ${empty.join(', ')}`);
});

check('ids, questions and orders are unique and usable', () => {
  const ids = checks.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate check id');

  for (const c of checks) {
    assert.ok(c.question.trim().endsWith('?'), `${c.id} is not phrased as a question: ${c.question}`);
    assert.ok(c.rule.length > 20, `${c.id} has no usable rule description`);
  }

  // Order is per section, so two checks may share a number across sections but
  // not within one — the UI sorts inside a section and a tie would render
  // nondeterministically.
  for (const s of orderedSections()) {
    const orders = checksInSection(s.id).map((c) => c.order);
    assert.equal(new Set(orders).size, orders.length, `duplicate order within ${s.id}`);
  }
});

check('an unrecognised check id is reported, not swallowed', () => {
  // A digest from a newer processor will name checks this build has never heard
  // of. It must stay visible with its raw id, for the same reason the v1
  // contract required that of reason codes.
  const text = checkQuestion('some.future.check');
  assert.ok(text.includes('some.future.check'), text);
  assert.ok(text.length > 'some.future.check'.length, 'the fallback says nothing beyond the id');
});

check('every issue category that has types is represented in the catalogue', () => {
  // Not the same claim as the first test. That one says no *type* is orphaned;
  // this says no whole *category* of the monitor's reporting is missing, which
  // would be a blind spot rather than a gap.
  //
  // Compared against the categories that actually HAVE types, not against
  // ISSUE_CATEGORY_ORDER: that enum carries `other`, which no built-in type
  // currently uses, and requiring the catalogue to cover an empty category is
  // a demand nothing can satisfy. The day a type lands in `other`, this starts
  // requiring a home for it — which is the behaviour wanted.
  const populated = new Set(Object.values(CLIENT_ISSUE_TYPES).map((t) => t.category));
  const covered = new Set(
    Object.keys(CHECK_BY_ISSUE_TYPE).map((t) => CLIENT_ISSUE_TYPES[t]!.category),
  );
  const missing = ISSUE_CATEGORY_ORDER.filter((c) => populated.has(c) && !covered.has(c));
  assert.deepEqual(missing, [], `no check reads any issue from: ${missing.join(', ')}`);
});

console.log(`\n${passed} checks passed`);
