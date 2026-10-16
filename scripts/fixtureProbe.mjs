/**
 * Build a digest from the checked-in fixture and validate it against the
 * contract's own generated validators.
 *
 * Not a test — a probe, so the output is readable while the rules are being
 * written. `test/callDigest.test.mjs` is the assertion suite.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePatchedJsonl } from '../src/digest-server/samplePatch.mjs';
import { buildCallDigest } from '../src/digest-server/callDigest.mjs';
import { checkDefinition } from '../src/digest-server/registry.mjs';
import { validateCallDigest } from '../src/digest/validators.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CALL = resolve(HERE, '..', 'src', 'digest-server', 'fixtures', 'tiny-call', 'demo-room', 'call-0001');

const files = readdirSync(CALL);
const summaryFile = files.find((f) => f.startsWith('call-summary'));
const summary = summaryFile ? JSON.parse(readFileSync(join(CALL, summaryFile), 'utf8')) : undefined;

const clients = files
  .filter((f) => f.endsWith('.jsonl'))
  .sort()
  .map((f) => ({
    clientId: f.replace(/\.jsonl$/, ''),
    displayName: f.replace(/\.jsonl$/, '').replace('client-', 'Client ').toUpperCase(),
    samples: decodePatchedJsonl(readFileSync(join(CALL, f), 'utf8')),
  }));

console.log(`fixture: ${clients.length} clients, ${clients.map((c) => c.samples.length).join(' + ')} samples`);
console.log(`summary: ${summary ? 'present' : 'ABSENT'}\n`);

const digest = buildCallDigest({
  callId: 'call-0001',
  roomId: 'demo-room',
  clients,
  summary,
  generatedAt: Date.parse('2026-10-16T12:00:00.000Z'),
});

const ok = validateCallDigest(digest);
console.log(`schema: ${ok ? 'VALID' : 'INVALID'}`);
if (!ok) {
  for (const e of (validateCallDigest.errors ?? []).slice(0, 12)) {
    console.log(`  ${e.instancePath || '/'} ${e.message}`);
  }
  process.exitCode = 1;
}

console.log(`\ncall: ${digest.call.roomId}/${digest.call.callId}  day ${digest.call.reportingDay}`);
console.log(`      ${digest.call.startedAt} -> ${digest.call.endedAt}`);
console.log(
  `coverage: ${digest.coverage.clientsAssessed}/${digest.coverage.clientsObserved} clients assessed, ` +
    `${digest.coverage.assessedSeconds}s assessed, ${digest.coverage.unassessedSeconds}s not`,
);
for (const l of digest.coverage.limitations ?? []) console.log(`  limitation: ${l}`);

const SYM = { passed: '✓', failed: '✕', 'not-assessable': '?', 'not-applicable': '—' };

for (const client of digest.clients) {
  console.log(`\n${client.displayName ?? client.clientId}  [${client.classification}]`);
  let section = '';
  for (const check of client.checks) {
    const def = checkDefinition(check.id);
    if (def.section !== section) {
      section = def.section;
      console.log(`  ${section}`);
    }
    const observed = (check.observed ?? [])
      .map((o) => `${o.label} ${o.value}${o.unit === 'none' ? '' : ' ' + o.unit}${o.threshold !== undefined ? ` (>${o.threshold})` : ''}`)
      .join(', ');
    console.log(`    ${SYM[check.outcome]} ${def.question}`);
    if (observed) console.log(`        ${observed}`);
    if (check.why) console.log(`        why: ${check.why}`);
    if (check.issues?.length) console.log(`        issues: ${check.issues.map((i) => i.type).join(', ')}`);
  }
}

console.log('\nroll-up (passed/failed/unassessable/n-a of evaluated):');
for (const roll of digest.checks) {
  const c = roll.counts;
  console.log(
    `  ${roll.id.padEnd(34)} ${c.passed}/${c.failed}/${c.notAssessable}/${c.notApplicable} of ${c.evaluated}` +
      (roll.failedSeconds !== undefined ? `   ${roll.failedSeconds}s failing` : ''),
  );
}

console.log(`\ndigest size: ${JSON.stringify(digest).length} bytes`);
