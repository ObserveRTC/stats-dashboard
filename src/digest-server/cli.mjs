#!/usr/bin/env node
/**
 * The operations from a shell, for a one-off, a backfill or a rebuild.
 *
 *   node src/digest-server/cli.mjs call <roomId> <callId>
 *   node src/digest-server/cli.mjs day 2026-10-15
 *   node src/digest-server/cli.mjs month 2026-10
 *   node src/digest-server/cli.mjs rebuild 2026-10-01 2026-10-31
 *
 * From the repository root the npm script is shorter and is what the README
 * uses: `npm run digest -- day 2026-10-15`.
 *
 * `rebuild` walks days in order and then rolls the months it touched. That
 * order matters: a month reads day summaries, so folding it first reports a
 * month that was never that quiet. `backfill` is accepted as an alias, since it
 * is the word the old CLI used and is probably in somebody's shell history.
 */

import { processCall, processDay, processMonth, rebuild } from './process.mjs';
import { CHECK_IDS, checkDefinition } from './registry.mjs';

function usage() {
  console.error(
    [
      'usage:',
      '  node src/digest-server/cli.mjs call <roomId> <callId>',
      '  node src/digest-server/cli.mjs day <YYYY-MM-DD>',
      '  node src/digest-server/cli.mjs month <YYYY-MM>',
      '  node src/digest-server/cli.mjs rebuild <fromDay> <toDay>',
      '',
      'All dates are UTC. A call belongs to the UTC day it started.',
    ].join('\n'),
  );
  process.exit(2);
}

const [command, a, b] = process.argv.slice(2);

try {
  if (command === 'call') {
    if (!a || !b) usage();
    const { digest } = await processCall({ roomId: a, callId: b });
    console.log(describeCall(digest));
  } else if (command === 'day') {
    if (!a) usage();
    console.log(describePeriod((await processDay(a)).summary));
  } else if (command === 'month') {
    if (!a) usage();
    console.log(describePeriod((await processMonth(a)).summary));
  } else if (command === 'rebuild' || command === 'backfill') {
    if (!a || !b) usage();
    const { jobs } = await rebuild({ from: a, to: b });
    const days = jobs.filter((j) => j.operation === 'day');
    const months = jobs.filter((j) => j.operation === 'month');
    console.log(
      `rebuilt ${days.length} day(s) and ${months.length} month(s)\n` +
        `  calls      ${days.reduce((t, j) => t + j.calls, 0)}\n` +
        `  incomplete ${jobs.filter((j) => !j.complete).length} of ${jobs.length}`,
    );
  } else {
    usage();
  }
} catch (err) {
  console.error(err?.message ?? err);
  process.exit(1);
}

const SYM = { passed: '✓', failed: '✕', 'not-assessable': '?', 'not-applicable': '—' };

/**
 * The few things worth seeing on a terminal.
 *
 * Failures first and in full, because that is what somebody running this by
 * hand is looking for; then the counts that say how much was answerable at all,
 * because a digest of mostly-unassessable checks is a different result from a
 * clean one and the difference must not need reading the JSON to notice.
 */
function describeCall(digest) {
  const lines = [
    `call ${digest.call.roomId}/${digest.call.callId}  day ${digest.call.reportingDay}`,
    `  rules       ${digest.provenance.rulesVersion}`,
    `  clients     ${digest.coverage.clientsAssessed} assessed of ${digest.coverage.clientsObserved} observed`,
    `  coverage    ${digest.coverage.assessedSeconds}s assessed, ${digest.coverage.unassessedSeconds}s not`,
  ];

  const failed = digest.checks.filter((c) => c.counts.failed > 0);
  if (failed.length === 0) {
    lines.push('  findings    none');
  } else {
    lines.push(`  findings    ${failed.length} check(s) failed for at least one client`);
    for (const roll of failed) {
      lines.push(
        `    ${SYM.failed} ${checkDefinition(roll.id).question}` +
          `  [${roll.counts.failed}/${roll.counts.evaluated}` +
          (roll.failedSeconds !== undefined ? `, ${roll.failedSeconds}s` : '') +
          ']',
      );
    }
  }

  const unassessable = digest.checks.filter((c) => c.counts.notAssessable > 0).length;
  lines.push(`  unassessed  ${unassessable} of ${CHECK_IDS.length} checks could not be answered for someone`);
  for (const l of digest.coverage.limitations ?? []) lines.push(`  limitation  ${l}`);
  return lines.join('\n');
}

function describePeriod(summary) {
  const lines = [
    `${summary.period.kind} ${summary.period.id} (${summary.period.timezone})` +
      (summary.period.provisional ? '  PROVISIONAL' : ''),
    `  sources     ${summary.sources.read} of ${summary.sources.found} ${summary.sources.kind} read` +
      (summary.sources.complete ? '' : '  INCOMPLETE'),
  ];

  if (summary.sources.failures?.length) {
    for (const f of summary.sources.failures.slice(0, 5)) {
      lines.push(`    ! ${f.id}: ${f.reason}${f.detail ? ` (${f.detail})` : ''}`);
    }
  }
  if (summary.sources.missingDays?.length) {
    lines.push(`    ${summary.sources.missingDays.length} day(s) never processed: ${summary.sources.missingDays.slice(0, 6).join(', ')}${summary.sources.missingDays.length > 6 ? ' …' : ''}`);
  }

  lines.push(
    `  totals      ${summary.totals.calls} calls, ${summary.totals.clientSessions} client sessions ` +
      `(${summary.totals.clientSessionsAssessed} assessed)`,
  );

  const c = summary.classification ?? {};
  lines.push(
    `  sessions    ${c.qoeSymptom ?? 0} with a symptom, ${c.qosOnly ?? 0} transport-only, ` +
      `${c.noIssueWithinCoverage ?? 0} clean within coverage, ${c.insufficientEvidence ?? 0} insufficient evidence`,
  );

  const failed = (summary.checks ?? []).filter((k) => k.counts.failed > 0);
  if (failed.length === 0) {
    lines.push('  findings    none');
  } else {
    for (const roll of failed.sort((x, y) => y.counts.failed - x.counts.failed).slice(0, 8)) {
      lines.push(
        `    ${SYM.failed} ${checkDefinition(roll.id).question}` +
          `  [${roll.counts.failed}/${roll.counts.evaluated} sessions, ${roll.callsAffected} call(s)]`,
      );
    }
  }
  return lines.join('\n');
}
