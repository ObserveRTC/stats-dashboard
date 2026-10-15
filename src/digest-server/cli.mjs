#!/usr/bin/env node
/**
 * The same two operations from a shell, for a one-off or a backfill.
 *
 *   node src/cli.mjs call <roomId> <callId>
 *   node src/cli.mjs day 2026-10-15
 *   node src/cli.mjs month 2026-10
 *   node src/cli.mjs backfill 2026-10-01 2026-10-31
 *
 * `backfill` walks days in order and then rolls the months it touched, which is
 * the order that matters: a month folded before its days exist reports a month
 * that was never that quiet.
 */

import { processCall, processPeriod } from './process.mjs';

const DAY_MS = 86_400_000;

function usage() {
  console.error(
    [
      'usage:',
      '  node src/cli.mjs call <roomId> <callId>',
      '  node src/cli.mjs day <YYYY-MM-DD>',
      '  node src/cli.mjs month <YYYY-MM>',
      '  node src/cli.mjs backfill <fromDay> <toDay>',
    ].join('\n'),
  );
  process.exit(2);
}

const [command, a, b] = process.argv.slice(2);

try {
  if (command === 'call') {
    if (!a || !b) usage();
    const { digest } = await processCall({ roomId: a, callId: b });
    console.log(summarize(digest));
  } else if (command === 'day' || command === 'month') {
    if (!a) usage();
    const { digest } = await processPeriod({ period: command, id: a });
    console.log(summarize(digest));
  } else if (command === 'backfill') {
    if (!a || !b) usage();
    const from = Date.parse(`${a}T00:00:00.000Z`);
    const to = Date.parse(`${b}T00:00:00.000Z`);
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) usage();

    const months = new Set();
    for (let at = from; at <= to; at += DAY_MS) {
      const day = new Date(at).toISOString().slice(0, 10);
      await processPeriod({ period: 'day', id: day });
      months.add(day.slice(0, 7));
    }
    // Months last: a month folded from its days needs the days to exist first.
    for (const month of [...months].sort()) {
      await processPeriod({ period: 'month', id: month });
    }
    console.log(`backfilled ${a}..${b} and ${months.size} month(s)`);
  } else {
    usage();
  }
} catch (err) {
  console.error(err?.message ?? err);
  process.exit(1);
}

/** The few numbers worth seeing on a terminal, not the whole document. */
function summarize(digest) {
  if (digest.kind === 'call-digest') {
    const any = digest.impairments.find((e) => e.category === 'any');
    const measured = digest.metrics.filter((m) => m.status !== 'unavailable').length;
    return [
      `call ${digest.callId}  revision ${digest.revision}`,
      `  lifecycle   ${digest.lifecycle}  coverage ${digest.coverage.completeness}`,
      `  clients     ${digest.usage.participantSessions ?? '—'}`,
      `  observed    ${Math.round(digest.usage.observedParticipantMs / 1000)}s participant time`,
      `  metrics     ${measured} measured, ${digest.metrics.length - measured} unavailable`,
      `  impairment  ${any ? `${Math.round(any.impairedParticipantMs / 1000)}s impaired of ${Math.round(any.assessedParticipantMs / 1000)}s assessed, ${Math.round(any.unknownParticipantMs / 1000)}s unknown` : '—'}`,
      `  streams     ${digest.streamDetails?.records ?? 0}`,
    ].join('\n');
  }
  return [
    `${digest.period} ${digest.id}  revision ${digest.revision}`,
    `  completeness ${digest.completeness}`,
    `  calls        ${digest.totals.callsStarted} started, ${digest.totals.callsWithExposure} with exposure`,
    `  participants ${digest.totals.participantSessionsStarted} sessions, busiest call ${digest.totals.largestCallPeakParticipants ?? '—'}`,
    `  observed     ${Math.round(digest.totals.observedParticipantMs / 1000)}s participant time`,
    `  worst calls  ${digest.worstCalls.length}`,
  ].join('\n');
}
