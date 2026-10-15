/**
 * Object storage, for reading archives and publishing analytics.
 *
 * The same environment variables the dashboard uses, so one `.env` configures
 * both and neither can end up pointed at a different bucket than the other.
 *
 * Two roots, and this process is the only thing that writes to the second:
 *
 *   <tenant>/<samples>/<roomId>/<callId>/...            read
 *   <tenant>/analytics/v1/...                           written here
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
  analytics: normalizePrefix(process.env.S3_ANALYTICS_PREFIX ?? 'analytics/v1'),
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
export const analyticsKey = (key) => `${config.tenant}${config.analytics}${key}`;

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

export async function getJson(absoluteKey) {
  const text = await getText(absoluteKey);
  if (text === undefined || text.trim() === '') return undefined;
  try {
    return JSON.parse(text);
  } catch (err) {
    // A half-written object is a real event — a worker killed mid-PUT — and
    // must not be mistaken for absence by a caller that would then overwrite it.
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
        keys.push({ key: obj.Key, size: obj.Size ?? 0, etag: obj.ETag ?? null });
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export async function putJson(absoluteKey, value, { ifNoneMatch = false } = {}) {
  await s3().send(
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: absoluteKey,
      Body: JSON.stringify(value),
      ContentType: 'application/json',
      // Used on immutable revision objects: a retry that finds the key already
      // there means a previous run published it, which is the idempotency win —
      // the retry stops instead of rewriting bytes somebody may be reading.
      // Supported by AWS S3 and recent MinIO; see the README's concurrency note
      // for what happens where it is not.
      ...(ifNoneMatch ? { IfNoneMatch: '*' } : {}),
    }),
  );
}

export function isAlreadyExists(err) {
  return err?.name === 'PreconditionFailed' || err?.$metadata?.httpStatusCode === 412;
}
