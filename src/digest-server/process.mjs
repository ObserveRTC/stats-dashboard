/**
 * The two callable operations: process one call, and roll up one period.
 *
 * Plain async functions with no HTTP in them, so the REST server and the CLI
 * are both thin wrappers and a backend can import these directly instead of
 * going over the network to its own process.
 */

import { buildCallDigest, buildInventory, inventoryRevision } from './callDigest.mjs';
import { decodePatchedJsonl } from './samplePatch.mjs';
import {
  buildContribution,
  buildPeriodDigest,
  dayId,
  monthId,
} from './periodDigest.mjs';
import {
  contributionKey,
  isSafeSegment,
  publishCallDigest,
  publishContribution,
  publishPeriodDigest,
} from './publish.mjs';
import { analyticsKey, config, getJson, getText, listKeys, sampleKey } from './storage.mjs';
import { PROCESSOR_VERSION } from './registry.mjs';

/** A short, content-derived revision id. Deterministic: a retry reuses it. */
const revisionFrom = (sourceRevision) => sourceRevision.slice(0, 16);

/**
 * Process one call.
 *
 * Reads every `.jsonl` in the call folder plus any `call-summary*.json`, builds
 * the digest, writes the detail pages and the digest immutably, switches the
 * manifest, then writes the call's contribution to its day and month.
 *
 * Idempotent: the revision is derived from the input inventory, so reprocessing
 * unchanged inputs produces the same revision and the immutable writes are
 * skipped. A late or corrected source changes the inventory hash and therefore
 * the revision, which is how a replacement gets published without overwriting
 * what a reader may be paging.
 */
export async function processCall({ roomId, callId }) {
  if (!isSafeSegment(roomId) || !isSafeSegment(callId)) {
    throw Object.assign(new Error('roomId and callId must be plain path segments'), { status: 400 });
  }

  const started = Date.now();
  const prefix = `${roomId}/${callId}/`;
  const objects = await listKeys(sampleKey(prefix));

  if (objects.length === 0) {
    throw Object.assign(new Error(`no archive at ${prefix}`), { status: 404 });
  }

  const relative = (key) => key.slice(sampleKey(prefix).length);
  const clientObjects = objects.filter((o) => relative(o.key).endsWith('.jsonl'));
  const summaryObjects = objects.filter((o) => /call-summary.*\.json$/.test(relative(o.key)));

  const sources = buildInventory([
    ...clientObjects.map((o) => ({ ...o, kind: 'client-samples', relativeKey: relative(o.key) })),
    ...summaryObjects.map((o) => ({ ...o, kind: 'observer-summary', relativeKey: relative(o.key) })),
  ]);

  const sourceRevision = await inventoryRevision(sources);
  const revision = revisionFrom(sourceRevision);

  // Read clients one at a time rather than all at once: a webinar archive is
  // tens of megabytes per client, and holding every client's decoded samples
  // would make memory scale with the call rather than with one participant.
  const clients = [];
  let rejectedRecords = 0;

  for (const obj of clientObjects) {
    const name = relative(obj.key);
    const clientId = name.replace(/\.jsonl$/, '');
    const text = await getText(obj.key);
    if (!text) {
      rejectedRecords += 1;
      continue;
    }
    try {
      const samples = decodePatchedJsonl(text)
        .filter((s) => typeof s?.timestamp === 'number')
        .sort((a, b) => a.timestamp - b.timestamp);
      if (samples.length > 0) {
        clients.push({ clientId, instanceId: `${clientId}#0`, samples });
      }
    } catch (err) {
      // A malformed patch stops that client's decode. The rest of the call is
      // still worth reporting, with the loss counted rather than hidden.
      console.warn(JSON.stringify({ event: 'client.decode-failed', clientId, error: err.message }));
      rejectedRecords += 1;
    }
  }

  let summary = null;
  for (const obj of summaryObjects) {
    const raw = await getJson(obj.key);
    if (!raw) continue;
    const a = raw.attachments ?? {};
    summary = {
      peak: raw.clients?.peak ?? null,
      clientCount: raw.clients?.joined ?? raw.clients?.clientIds?.length ?? null,
      durationInMs: raw.durationInMs ?? null,
      roomId: a.roomId ?? raw.roomId ?? null,
    };
    break;
  }

  const digest = buildCallDigest({
    tenantId: config.tenant || 'default',
    roomId,
    callId,
    revision,
    sourceRevision,
    sources,
    clients,
    summary,
  });

  if (rejectedRecords > 0) {
    digest.coverage.rejectedRecords = rejectedRecords;
    digest.coverage.completeness = 'partial';
    digest.coverage.warnings = [...new Set([...digest.coverage.warnings, 'source.unreadable'])];
  }

  const published = await publishCallDigest(digest, digest._detail);

  // Contribution to the day, then the month. A call with no known range
  // contributes to neither — it cannot be clipped to a period it cannot be
  // placed in, and guessing a day would file it under one it did not happen in.
  const periods = [];
  if (digest.range) {
    const day = dayId(digest.range.startAt);
    const contribution = buildContribution(digest, 'day');
    if (contribution) {
      await publishContribution('day', day, contribution);
      await publishContribution('month', monthId(digest.range.startAt), contribution);
      periods.push({ day, month: monthId(digest.range.startAt) });
    }
  }

  const job = {
    event: 'call.processed',
    roomId,
    callId,
    revision,
    sources: sources.length,
    clients: clients.length,
    rejectedRecords,
    streams: digest._detail.streams.length,
    durationMs: Date.now() - started,
    objectsWritten: published.written,
    objectsAlreadyPresent: published.skipped,
    periods,
  };
  console.log(JSON.stringify(job));

  return { digest: stripCarrier(digest), job };
}

const stripCarrier = (digest) => {
  const { _detail: _ignored, ...rest } = digest;
  return rest;
};

/**
 * Roll up one period from the contributions written at call time.
 *
 * Deduplicated by call id on the way in, which is what makes a month honest:
 * a call spanning three days has three day contributions and exactly one month
 * contribution, so `callsWithExposure` counts it once.
 */
export async function processPeriod({ period, id }) {
  if (period !== 'day' && period !== 'month') {
    throw Object.assign(new Error('period must be day or month'), { status: 400 });
  }
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(id) || !isRealPeriod(period, id)) {
    throw Object.assign(new Error(`${id} is not a valid ${period}`), { status: 400 });
  }

  const started = Date.now();
  const prefix = analyticsKey(`contributions/${period}/${id}/`);
  const keys = await listKeys(prefix);

  const byCallId = new Map();
  let failed = 0;

  for (const obj of keys) {
    const contribution = await getJson(obj.key).catch(() => undefined);
    if (!contribution?.callId) {
      failed += 1;
      continue;
    }
    // Keyed by call id: a reprocessed call replaces its entry instead of
    // appearing twice.
    byCallId.set(contribution.callId, contribution);
  }

  const contributions = [...byCallId.values()];
  const sourceRevision = await contributionsRevision(contributions);
  const revision = revisionFrom(sourceRevision);

  const digest = buildPeriodDigest({
    tenantId: config.tenant || 'default',
    period,
    id,
    revision,
    sourceRevision,
    contributions,
    coverage: {
      indexedCalls: keys.length,
      readableCallDigests: contributions.length,
      pendingCallDigests: 0,
      failedCallDigests: failed,
      unknownCallDigests: 0,
      // This demo evaluates whatever contributions exist in one pass, so every
      // child period it can see was evaluated. A processor that walked hours or
      // days independently would report the ones it could not reach.
      expectedChildPeriods: period === 'day' ? 24 : new Date(Date.UTC(...id.split('-').map(Number), 0)).getUTCDate(),
      includedChildPeriods: period === 'day' ? 24 : new Date(Date.UTC(...id.split('-').map(Number), 0)).getUTCDate(),
    },
  });

  await publishPeriodDigest(digest);

  const job = {
    event: 'period.processed',
    period,
    id,
    revision,
    indexedCalls: keys.length,
    readable: contributions.length,
    failed,
    durationMs: Date.now() - started,
  };
  console.log(JSON.stringify(job));

  return { digest, job };
}

function isRealPeriod(period, id) {
  if (period === 'day') {
    const parsed = new Date(`${id}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === id;
  }
  const parsed = new Date(`${id}-01T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === id;
}

async function contributionsRevision(contributions) {
  const { createHash } = await import('node:crypto');
  const canonical = JSON.stringify({
    processorVersion: PROCESSOR_VERSION,
    calls: contributions
      .map((c) => [c.callId, c.digestRevision])
      .sort((a, b) => a[0].localeCompare(b[0])),
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export { contributionKey };
