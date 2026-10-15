/**
 * Publishing: immutable revision objects first, the manifest last.
 *
 *   <tenant>/analytics/v1/calls/<callKey>/manifest.json
 *   <tenant>/analytics/v1/calls/<callKey>/revisions/<revision>/digest.json
 *   <tenant>/analytics/v1/calls/<callKey>/revisions/<revision>/details/<resource>/<page>.json
 *   <tenant>/analytics/v1/periods/<day|month>/<id>/manifest.json
 *   <tenant>/analytics/v1/periods/<day|month>/<id>/revisions/<revision>/digest.json
 *   <tenant>/analytics/v1/contributions/<day|month>/<id>/<callKey>.json
 *
 * The ordering is the whole concurrency story. A reader following the manifest
 * either sees the old generation or the new one, never a half-written one, and
 * a failed run leaves the previous usable revision exactly where it was.
 *
 * ## What this demo does and does not guarantee
 *
 * Revision objects are written with `If-None-Match: *`, so a retry that finds
 * the key already there stops instead of rewriting bytes a reader may be
 * streaming. That makes a retry idempotent and cheap.
 *
 * The manifest PUT is **last-writer-wins**. Two workers processing the same
 * call at the same moment would both publish, and the later one's revision
 * sticks — both revisions are complete and valid, so the outcome is a correct
 * digest rather than a corrupt one, but it may not be the newer one. A
 * production processor should use a conditional write on the manifest's ETag
 * (`If-Match`) or a lease object. That is a deliberate omission here, not an
 * oversight: one writer is the documented operating assumption.
 *
 * Keys are built from ids only, never from display names, and every segment is
 * checked before use — a room id arriving over HTTP must not be able to write
 * outside its own prefix.
 */

import { analyticsKey, getJson, isAlreadyExists, putJson } from './storage.mjs';

/** Page size for detail resources. The contract's default. */
export const PAGE_SIZE = 100;

/**
 * Is this safe to put in a storage key?
 *
 * A security boundary, not tidiness: room and call ids arrive from HTTP, and a
 * segment allowed to contain `/` or `..` reads and writes outside its own
 * prefix — and outside the tenant, which is what a shared bucket relies on.
 */
export function isSafeSegment(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('..')
  );
}

const callRoot = (roomId, callId) => `calls/${encodeURIComponent(roomId)}~${encodeURIComponent(callId)}/`;
const periodRoot = (period, id) => `periods/${period}/${id}/`;

export async function publishCallDigest(digest, detail) {
  const { roomId, callId, revision } = digest;
  if (!isSafeSegment(roomId ?? '-') || !isSafeSegment(callId) || !isSafeSegment(revision)) {
    throw new Error('unsafe key segment');
  }

  const root = callRoot(roomId ?? '-', callId);
  const revRoot = `${root}revisions/${revision}/`;

  // Detail pages first, then the digest that references them, then the
  // manifest. A reader that reaches a digest can always reach its pages.
  const pages = {
    participants: detail.participants,
    streams: detail.streams,
    paths: detail.paths,
  };

  let written = 0;
  let skipped = 0;

  for (const [resource, items] of Object.entries(pages)) {
    const resourceId = `${callId}:${revision}:${resource}`;
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    for (let page = 0; page < pageCount; page += 1) {
      const slice = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      const body = {
        revision,
        items: slice,
        nextCursor: page + 1 < pageCount ? String(page + 1) : null,
      };
      const result = await putImmutable(
        analyticsKey(`${revRoot}details/${encodeURIComponent(resourceId)}/${page}.json`),
        body,
      );
      result ? (written += 1) : (skipped += 1);
    }
  }

  // The digest as stored carries no `_detail` — that is a carrier the builder
  // uses to hand the pages over, not part of the contract.
  const { _detail: _ignored, ...stored } = digest;
  (await putImmutable(analyticsKey(`${revRoot}digest.json`), stored)) ? (written += 1) : (skipped += 1);

  await putJson(analyticsKey(`${root}manifest.json`), {
    schemaVersion: 1,
    subject: { kind: 'call', id: callId },
    currentRevision: revision,
    digestKey: `${revRoot}digest.json`,
    provenance: digest.provenance,
    supersedes: (await getJson(analyticsKey(`${root}manifest.json`)))?.currentRevision ?? null,
  });

  return { written, skipped, revision };
}

/**
 * Write an immutable object, or report that it is already there.
 *
 * Returns false rather than throwing when the key exists: a retry reaching this
 * point means a previous run got here, which is success, not conflict.
 */
async function putImmutable(key, body) {
  try {
    await putJson(key, body, { ifNoneMatch: true });
    return true;
  } catch (err) {
    if (isAlreadyExists(err)) return false;
    throw err;
  }
}

/* ── contributions ─────────────────────────────────────── */

export function contributionKey(period, id, roomId, callId) {
  return analyticsKey(
    `contributions/${period}/${id}/${encodeURIComponent(roomId ?? '-')}~${encodeURIComponent(callId)}.json`,
  );
}

/**
 * Write one call's contribution to one period.
 *
 * Keyed by call id, so reprocessing **replaces** rather than appends. That is
 * the mechanism behind "updating an existing contribution never adds the same
 * call twice", and it is why this one object is mutable while everything under
 * `revisions/` is not.
 */
export async function publishContribution(period, id, contribution) {
  await putJson(contributionKey(period, id, contribution.roomId, contribution.callId), contribution);
}

export async function publishPeriodDigest(digest) {
  const root = periodRoot(digest.period, digest.id);
  const revRoot = `${root}revisions/${digest.revision}/`;

  await putImmutable(analyticsKey(`${revRoot}digest.json`), digest);
  await putJson(analyticsKey(`${root}manifest.json`), {
    schemaVersion: 1,
    subject: { kind: digest.period, id: digest.id },
    currentRevision: digest.revision,
    digestKey: `${revRoot}digest.json`,
    provenance: digest.provenance,
    supersedes: (await getJson(analyticsKey(`${root}manifest.json`)))?.currentRevision ?? null,
  });

  return { revision: digest.revision };
}

export { analyticsKey };
