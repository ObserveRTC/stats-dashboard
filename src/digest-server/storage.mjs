/**
 * Object storage, for reading archives and publishing digests.
 *
 * The same environment variables the dashboard uses, so one `.env` configures
 * both and neither can end up pointed at a different bucket — or, as happened
 * once, at a different *prefix*, which is quieter and worse.
 *
 * Two roots, and this process is the only thing that writes to the second:
 *
 *   <tenant>/<samples>/<roomId>/<callId>/...                read
 *   <tenant>/<digests>/calls/<callId>.json                  written here
 *   <tenant>/<digests>/daily-summaries/<yyyy-mm-dd>.json    written here
 *   <tenant>/<digests>/monthly-summaries/<yyyy-mm>.json     written here
 *
 * ## On atomicity
 *
 * The contract requires that a reader never observe partial JSON. That is free
 * here and worth stating so nobody adds machinery for it: an S3 PutObject is
 * atomic per object. A reader sees the previous object or the new one, never a
 * splice of the two, and a worker killed mid-upload leaves the previous object
 * untouched. There is no temp-key-and-rename step because there is nothing a
 * rename would fix — and S3 has no rename anyway, only another copy.
 *
 * What is NOT atomic is a set of objects. A day summary and the call digests it
 * was built from can disagree for as long as it takes to rewrite the summary,
 * which is why the summary records what it read (`sources`) rather than
 * implying it read everything.
 */

import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function normalizePrefix(raw) {
  const cleaned = String(raw ?? '').trim().replace(/^\/+|\/+$/g, '');
  return cleaned === '' ? '' : `${cleaned}/`;
}

export const config = {
  bucket: process.env.S3_BUCKET ?? '',
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  tenant: normalizePrefix(process.env.S3_PREFIX),
  samples: normalizePrefix(process.env.S3_SAMPLES_PREFIX ?? 'samples'),
  // Same variable and same default as the dashboard's S3_DIGEST_PREFIX. The two
  // MUST agree: this writes where that reads, and nothing fails loudly when
  // they diverge — the dashboard simply shows an empty day for ever.
  digests: normalizePrefix(process.env.S3_DIGEST_PREFIX ?? 'digests'),
  hasCredentials: Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
};

let client;

export function s3() {
  if (client) return client;
  client = new S3Client({
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    // Omitted entirely when unset so the SDK's own chain still works — an
    // instance role on AWS sets neither variable, and passing empty strings
    // would defeat it.
    ...(config.hasCredentials
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
  return client;
}

export function requireBucket() {
  if (!config.bucket) throw new Error('S3_BUCKET is not set');
  return config.bucket;
}

export const sampleKey = (key) => `${config.tenant}${config.samples}${key}`;
export const digestKey = (key) => `${config.tenant}${config.digests}${key}`;

/**
 * A path segment that cannot escape its prefix or collide with a delimiter.
 *
 * Room and call ids reach this process from an HTTP path, so this is a boundary
 * and not a formality. A segment with a slash in it would write outside the
 * digest root; one with `..` would be interpreted by some gateways.
 */
export function isSafeSegment(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    !value.includes('/') &&
    !value.includes('\\') &&
    value !== '.' &&
    value !== '..' &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export const callDigestKey = (callId) => digestKey(`calls/${callId}.json`);
export const daySummaryKey = (day) => digestKey(`daily-summaries/${day}.json`);
export const monthSummaryKey = (month) => digestKey(`monthly-summaries/${month}.json`);

/** The prefix the daily runner lists. */
export const callDigestPrefix = () => digestKey('calls/');

function isNotFound(err) {
  return (
    err?.name === 'NoSuchKey' ||
    err?.name === 'NotFound' ||
    err?.$metadata?.httpStatusCode === 404
  );
}

/** One object as text, or undefined when it is not there. */
export async function getText(absoluteKey) {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: requireBucket(), Key: absoluteKey }));
    return (await res.Body?.transformToString()) ?? undefined;
  } catch (err) {
    if (isNotFound(err)) return undefined;
    throw err;
  }
}

/**
 * One object as JSON.
 *
 * `undefined` for absent. An object that exists and does not parse THROWS,
 * rather than reading as absent: a caller that treated the two alike would
 * overwrite a corrupt digest without anybody learning it had been corrupt.
 */
export async function getJson(absoluteKey) {
  const text = await getText(absoluteKey);
  if (text === undefined || text.trim() === '') return undefined;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${absoluteKey} is not valid JSON: ${err.message}`);
  }
}

/** Every key under a prefix, paginated. */
export async function listKeys(absolutePrefix) {
  const keys = [];
  let token;
  do {
    const res = await s3().send(
      new ListObjectsV2Command({
        Bucket: requireBucket(),
        Prefix: absolutePrefix,
        ContinuationToken: token,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Key !== absolutePrefix) {
        keys.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          etag: obj.ETag ?? null,
          lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
        });
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/**
 * Write one digest.
 *
 * Deliberately an unconditional overwrite, which is the opposite of what v1
 * did. v1 wrote immutable revisions with `IfNoneMatch: '*'` and switched a
 * manifest; v2 has one object per call and reprocessing is meant to REPLACE it.
 * A conditional write would make a rebuild a no-op, and rebuilding after a rule
 * change is a thing the contract promises.
 *
 * Pretty-printed on purpose. These objects are read by people with `aws s3 cp`
 * and jq as often as by the dashboard, they compress well, and a digest is
 * kilobytes.
 */
export async function putJson(absoluteKey, value) {
  await s3().send(
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: absoluteKey,
      Body: `${JSON.stringify(value, null, 2)}\n`,
      ContentType: 'application/json',
      CacheControl: 'no-cache',
    }),
  );
}
