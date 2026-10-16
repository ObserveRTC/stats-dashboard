/**
 * The three callable operations: process one call, one day, one month.
 *
 * Plain async functions with no HTTP in them, so the REST server and the CLI
 * are both thin wrappers and a backend in the same runtime can import these
 * rather than calling this process over the network.
 *
 * ## Idempotency, and why there is no revision machinery
 *
 * v1 derived an immutable revision id from a hash of the input inventory and
 * switched a manifest to publish it. v2 writes one object per call and
 * overwrites it. The guarantee that matters — reprocessing is safe — now comes
 * from the digest being a pure function of its inputs rather than from a
 * conditional write, and the thing that guarantee buys, a rebuild after a rule
 * change, actively requires the overwrite that v1's `IfNoneMatch` forbade.
 *
 * `provenance.generatedAt` is the one field that moves on a reprocess. It is
 * metadata about the run, not about the call, and nothing aggregates it.
 *
 * ## Failure is data
 *
 * A source that cannot be read is recorded in the output rather than aborting
 * the run: one unreadable call digest must not cost a day its other seventeen.
 * Every failure carries a reason the operator can act on — missing, unparseable,
 * schema-invalid, or a version this build does not implement.
 */

import { buildCallDigest, reportingDayOf } from './callDigest.mjs';
import { buildDaySummary, buildMonthSummary, daysInMonth, monthOfDay } from './periodSummary.mjs';
import { decodePatchedJsonl } from './samplePatch.mjs';
import { SCHEMA_VERSION } from './registry.mjs';
import {
  callDigestKey,
  callDigestPrefix,
  daySummaryKey,
  getJson,
  getText,
  isSafeSegment,
  listKeys,
  monthSummaryKey,
  putJson,
  sampleKey,
} from './storage.mjs';

const log = (event, fields) => console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }));

/**
 * Read and vet one saved document.
 *
 * Returns `{ ok: true, value }` or `{ ok: false, reason }`. The reasons are the
 * contract's `sourceFailure` vocabulary, because an operator needs to know
 * which of these four happened: nothing was written, something unparseable was
 * written, something structurally wrong was written, or something newer than
 * this build was written. Only the last is fixed by upgrading.
 */
async function readDocument(key, expectKind) {
  let raw;
  try {
    raw = await getJson(key);
  } catch (err) {
    return { ok: false, reason: 'invalid-json', detail: err.message };
  }
  if (raw === undefined) return { ok: false, reason: 'not-found' };

  const version = raw?.provenance?.schemaVersion;
  if (typeof version !== 'number') return { ok: false, reason: 'schema-invalid', detail: 'no provenance.schemaVersion' };
  if (version !== SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-schema-version', detail: `v${version}` };
  }
  if (expectKind === 'call' && !raw.call?.callId) {
    return { ok: false, reason: 'schema-invalid', detail: 'no call.callId' };
  }
  if (expectKind === 'period' && !raw.period?.id) {
    return { ok: false, reason: 'schema-invalid', detail: 'no period.id' };
  }
  return { ok: true, value: raw };
}

/**
 * Process one call: read its archive, build the digest, write it.
 *
 * Returns `{ digest, job }`. The job is the operational record — what was read,
 * how long it took, where it went — and is logged as one JSON line.
 */
export async function processCall({ roomId, callId }) {
  if (!isSafeSegment(roomId) || !isSafeSegment(callId)) {
    throw new Error('roomId and callId must be single safe path segments');
  }

  const started = Date.now();
  const prefix = `${roomId}/${callId}/`;
  const objects = await listKeys(sampleKey(prefix));
  if (objects.length === 0) {
    const err = new Error(`no archive under ${prefix}`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  const relative = (key) => key.slice(sampleKey(prefix).length);
  const clientObjects = objects.filter((o) => relative(o.key).endsWith('.jsonl'));
  const summaryObjects = objects.filter((o) => /call-summary.*\.json$/.test(relative(o.key)));

  // Context only. A router report or a call summary supplies bounds, names and
  // SFU identity; neither may contribute a finding.
  let summary;
  for (const obj of summaryObjects) {
    try {
      const candidate = await getJson(obj.key);
      summary = summary ? { ...summary, ...candidate } : candidate;
    } catch (err) {
      log('summary.unreadable', { key: obj.key, error: err.message });
    }
  }

  const clients = [];
  for (const obj of clientObjects) {
    const name = relative(obj.key);
    const clientId = name.replace(/\.jsonl$/, '');
    const text = await getText(obj.key);
    if (text === undefined) continue;
    let samples = [];
    try {
      samples = decodePatchedJsonl(text);
    } catch (err) {
      // A client whose stream will not decode is a limitation of this call, not
      // a reason to abandon the other participants.
      log('client.undecodable', { callId, clientId, error: err.message });
    }
    clients.push({
      clientId,
      displayName: summary?.attachments?.clients?.[clientId]?.displayName,
      samples,
    });
  }

  const digest = buildCallDigest({
    callId,
    roomId,
    clients,
    summary: summary ? { ...summary, sfuIds: summary.attachments?.sfuId ? [summary.attachments.sfuId] : summary.sfuIds } : undefined,
  });

  const key = callDigestKey(callId);
  await putJson(key, digest);

  const job = {
    operation: 'call',
    roomId,
    callId,
    reportingDay: digest.call.reportingDay,
    clients: clients.length,
    samples: clients.reduce((t, c) => t + c.samples.length, 0),
    checksFailed: digest.checks.filter((c) => c.counts.failed > 0).length,
    clientsAssessed: digest.coverage.clientsAssessed,
    key,
    durationMs: Date.now() - started,
  };
  log('call.processed', job);
  return { digest, job };
}

/**
 * Every call digest belonging to one reporting day.
 *
 * Lists the whole `digests/calls/` prefix and opens each object to read its
 * `call.reportingDay`. That is O(all calls ever processed) per run, which is the
 * documented cost of a flat layout with no index: fine on a demo bucket, and the
 * first thing to revisit if the bucket grows. The alternative — partitioning
 * call digests by day — would cost a deep link the ability to find a digest from
 * a callId alone, which the dashboard's routes depend on.
 */
async function callDigestsForDay(day) {
  const objects = await listKeys(callDigestPrefix());
  const read = [];
  const failures = [];
  let scanned = 0;

  for (const obj of objects) {
    if (!obj.key.endsWith('.json')) continue;
    scanned += 1;
    const result = await readDocument(obj.key, 'call');
    if (!result.ok) {
      // Only a failure for a digest we cannot classify. One that reads fine and
      // belongs to another day is not a failure of THIS day.
      failures.push({ id: obj.key.split('/').pop().replace(/\.json$/, ''), reason: result.reason, ...(result.detail ? { detail: result.detail } : {}) });
      continue;
    }
    if (result.value.call.reportingDay === day) read.push(result.value);
  }

  return { read, failures, scanned };
}

/** Process one reporting day. */
export async function processDay(day, { generatedAt = Date.now() } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`day must be YYYY-MM-DD, got ${day}`);
  const started = Date.now();

  const { read, failures, scanned } = await callDigestsForDay(day);
  const summary = buildDaySummary({
    day,
    read,
    failures,
    found: read.length + failures.length,
    generatedAt,
    // The current UTC day can still gain calls. Correct for what it has read,
    // and expected to change — which is a different statement from incomplete.
    provisional: day === reportingDayOf(generatedAt),
  });

  const key = daySummaryKey(day);
  await putJson(key, summary);

  const job = {
    operation: 'day',
    day,
    scanned,
    calls: summary.totals.calls,
    clientSessions: summary.totals.clientSessions,
    failed: failures.length,
    complete: summary.sources.complete,
    provisional: Boolean(summary.period.provisional),
    key,
    durationMs: Date.now() - started,
  };
  log('day.processed', job);
  return { summary, job };
}

/** Process one month from its day summaries. */
export async function processMonth(month, { generatedAt = Date.now() } = {}) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(`month must be YYYY-MM, got ${month}`);
  const started = Date.now();

  const read = [];
  const failures = [];
  for (const day of daysInMonth(month)) {
    const result = await readDocument(daySummaryKey(day), 'period');
    if (result.ok) read.push(result.value);
    // `not-found` is not a failure here: it is a day nobody has processed, and
    // `missingDays` is where the contract reports it. A day that EXISTS and
    // cannot be read is a different thing and belongs in `failures`.
    else if (result.reason !== 'not-found') {
      failures.push({ id: day, reason: result.reason, ...(result.detail ? { detail: result.detail } : {}) });
    }
  }

  const summary = buildMonthSummary({
    month,
    read,
    failures,
    generatedAt,
    provisional: month === new Date(generatedAt).toISOString().slice(0, 7),
  });

  const key = monthSummaryKey(month);
  await putJson(key, summary);

  const job = {
    operation: 'month',
    month,
    days: read.length,
    missingDays: summary.sources.missingDays?.length ?? 0,
    failed: failures.length,
    complete: summary.sources.complete,
    provisional: Boolean(summary.period.provisional),
    key,
    durationMs: Date.now() - started,
  };
  log('month.processed', job);
  return { summary, job };
}

/**
 * Period dispatch, kept for the HTTP and CLI wrappers.
 */
export async function processPeriod({ period, id }, options = {}) {
  if (period === 'day') return processDay(id, options);
  if (period === 'month') return processMonth(id, options);
  throw new Error(`period must be day or month, got ${period}`);
}

/**
 * Rebuild: reprocess a range of days and the months they touch.
 *
 * The explicit mechanism the contract requires, because missing-file detection
 * alone cannot handle a late call or a corrected digest — both leave the day
 * summary present and stale. Days first, then the months, because a month reads
 * day summaries and folding it first would report a month that was never that
 * quiet.
 */
export async function rebuild({ from, to }, options = {}) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('from and to must be YYYY-MM-DD');
  if (end < start) throw new Error('to is before from');

  const days = [];
  for (let at = start; at <= end; at += 86_400_000) days.push(new Date(at).toISOString().slice(0, 10));

  const jobs = [];
  for (const day of days) jobs.push((await processDay(day, options)).job);
  for (const month of [...new Set(days.map(monthOfDay))]) jobs.push((await processMonth(month, options)).job);

  log('rebuild.finished', { from, to, days: days.length, months: new Set(days.map(monthOfDay)).size });
  return { jobs };
}
