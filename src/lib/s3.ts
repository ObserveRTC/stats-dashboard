import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Object storage, configured entirely from the environment.
 *
 * Every value here is read at *runtime*, not at build time, which is what makes
 * one container image runnable against any bucket: the same image points at a
 * developer's MinIO, a staging bucket and production by environment alone.
 *
 * Works with any S3-compatible storage — AWS S3, MinIO, Cloudflare R2,
 * Backblaze B2:
 *
 *   AWS S3        leave S3_ENDPOINT unset; S3_FORCE_PATH_STYLE=false
 *   MinIO         S3_ENDPOINT=http://minio:9000; S3_FORCE_PATH_STYLE=true
 *   Cloudflare R2 S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com;
 *                 S3_FORCE_PATH_STYLE=false
 *
 * Credentials are server-side only and never reach the browser: nothing here is
 * `NEXT_PUBLIC_`, and the browser talks to `/api/*` rather than to storage,
 * except for the presigned URLs this module mints.
 *
 * Those presigned URLs are why `S3_PUBLIC_ENDPOINT` exists. The server and the
 * browser do not always reach storage by the same name — inside a container
 * network it is `http://minio:9000`, from the user's machine it is
 * `http://localhost:9000`; in a VPC it is an internal endpoint while the
 * browser needs the public one. A URL is signed for a specific host, so it must
 * be signed against the host that will *follow* it. Set `S3_PUBLIC_ENDPOINT`
 * when the two differ; leave it unset when they are the same, which is the
 * common case.
 */

/** How long (seconds) a presigned GET URL stays valid. Default: 15 minutes. */
function presignTtl(): number {
  const raw = Number.parseInt(process.env.S3_PRESIGN_TTL ?? '900', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 900;
}

export interface StorageConfig {
  endpoint?: string;
  /** Endpoint to sign browser-facing URLs against, when it differs. */
  publicEndpoint?: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  presignTtl: number;
  hasCredentials: boolean;
}

/**
 * Read the environment.
 *
 * Deliberately a function rather than module-level constants: module scope runs
 * once when the bundle is first imported, which during `next build` can be at
 * *build* time. Baking a build machine's environment into the image is exactly
 * the bug that makes a container "work on my laptop" and serve empty lists in
 * production.
 */
export function storageConfig(): StorageConfig {
  return {
    endpoint: process.env.S3_ENDPOINT || undefined,
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || undefined,
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION || 'us-east-1',
    // Path style is what MinIO and most self-hosted gateways need; AWS and R2
    // want virtual-hosted style. Defaults to true because the self-hosted case
    // is the one that breaks confusingly when it is wrong.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    presignTtl: presignTtl(),
    hasCredentials: Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
  };
}

/**
 * What is wrong with the configuration, split by whether it is fatal.
 *
 * The split exists because the health endpoint drives a container healthcheck,
 * and conflating the two categories takes a working deployment down. Missing
 * `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` is the case in point: on AWS the
 * SDK picks up an instance or task role, so a correctly configured ECS or EKS
 * deployment sets neither variable — and reporting that as a problem made
 * `/api/health` answer 503 for ever, which an orchestrator reads as "kill and
 * restart this container", in a loop, on a container that was serving fine.
 *
 * So: `problems` is only what makes the app unable to work at all, and is what
 * a healthcheck may fail on. `warnings` is what is worth saying to whoever is
 * reading the health output — including the credential case, which is a real
 * misconfiguration outside AWS and a normal setup inside it, and which this
 * cannot tell apart.
 */
export interface StorageConfigReport {
  /** Fatal: the app cannot serve anything until these are fixed. */
  problems: string[];
  /** Worth knowing, but not a reason to refuse traffic. */
  warnings: string[];
}

export function storageConfigReport(config = storageConfig()): StorageConfigReport {
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!config.bucket) problems.push('S3_BUCKET is not set');

  if (config.endpoint && !/^https?:\/\//.test(config.endpoint)) {
    problems.push(`S3_ENDPOINT must start with http:// or https:// (got "${config.endpoint}")`);
  }
  if (config.publicEndpoint && !/^https?:\/\//.test(config.publicEndpoint)) {
    problems.push(
      `S3_PUBLIC_ENDPOINT must start with http:// or https:// (got "${config.publicEndpoint}")`,
    );
  }

  if (!config.hasCredentials) {
    warnings.push(
      'S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not set — falling back to the SDK credential ' +
        'chain (an instance or task role, or a mounted profile). Expected on AWS; a mistake anywhere else.',
    );
  }

  return { problems, warnings };
}

/**
 * Fatal configuration problems only.
 *
 * Kept as its own export because callers that just want "can this run" should
 * not have to know the report shape, and should not accidentally treat a
 * warning as fatal.
 */
export function storageConfigProblems(config = storageConfig()): string[] {
  return storageConfigReport(config).problems;
}

const clients = new Map<string, S3Client>();

/**
 * An S3 client for one endpoint, built on first use and reused after that.
 *
 * Cached by configuration rather than held in a single variable, so the
 * internal client and the presigning client coexist — and so a changed
 * environment in a long-lived dev process is picked up rather than ignored.
 */
function clientFor(endpoint: string | undefined): S3Client {
  const config = storageConfig();
  const key = JSON.stringify([endpoint, config.region, config.forcePathStyle]);
  const existing = clients.get(key);
  if (existing) return existing;

  const client = new S3Client({
    ...(endpoint ? { endpoint } : {}),
    region: config.region,
    // Omitted entirely when unset, so the SDK's own credential chain — an
    // instance role, a mounted profile — still works. Passing empty strings
    // would defeat it.
    ...(config.hasCredentials
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
          },
        }
      : {}),
    forcePathStyle: config.forcePathStyle,
  });
  clients.set(key, client);
  return client;
}

/** The client the server uses to read storage. */
export function s3Client(): S3Client {
  return clientFor(storageConfig().endpoint);
}

/**
 * The client used to sign URLs the *browser* will follow.
 *
 * Same credentials, different host when `S3_PUBLIC_ENDPOINT` is set — a
 * signature is bound to the host it was made for, so signing against the
 * server's internal endpoint would hand the browser a URL it cannot resolve,
 * or one whose signature does not match the host it does resolve.
 */
function presignClient(): S3Client {
  const config = storageConfig();
  return clientFor(config.publicEndpoint ?? config.endpoint);
}

/** The configured bucket, or throw a message that names what to set. */
export function bucketName(): string {
  const { bucket } = storageConfig();
  if (!bucket) {
    throw new Error(
      'S3_BUCKET is not set. The container needs S3_BUCKET, and normally ' +
        'S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY too — see .env.example.',
    );
  }
  return bucket;
}

export interface ObjectEntry {
  key: string;
  lastModified?: Date;
}

/**
 * List all objects under a prefix (no delimiter — recurses into subdirectories).
 * Handles S3 pagination automatically.
 * e.g. prefix="roomA/"  →  all .jsonl files in that room across all calls
 */
export async function listObjectsDeep(prefix: string): Promise<ObjectEntry[]> {
  const results: ObjectEntry[] = [];
  let token: string | undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucketName(),
      Prefix: prefix,
      ContinuationToken: token,
    });
    const res = await s3Client().send(cmd);
    for (const obj of res.Contents ?? []) {
      if (obj.Key) results.push({ key: obj.Key, lastModified: obj.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return results;
}

/**
 * List the immediate object keys + metadata under a prefix (single level, with delimiter).
 * e.g. prefix="roomA/call1/"  →  ["roomA/call1/client1.jsonl", ...]
 */
export async function listObjects(prefix: string): Promise<ObjectEntry[]> {
  const cmd = new ListObjectsV2Command({
    Bucket: bucketName(),
    Prefix: prefix,
    Delimiter: '/',
  });
  const res = await s3Client().send(cmd);
  return (res.Contents ?? [])
    .filter((o) => o.Key)
    .map((o) => ({ key: o.Key!, lastModified: o.LastModified }));
}

/**
 * Generate a presigned GET URL for a private object.
 * The URL is valid for S3_PRESIGN_TTL seconds and requires no credentials from
 * the browser.
 */
export async function presignGet(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucketName(), Key: key });
  return getSignedUrl(presignClient(), cmd, { expiresIn: storageConfig().presignTtl });
}


/**
 * Log the resolved storage configuration, once.
 *
 * A container that is misconfigured does not crash — it serves an empty room
 * list, which looks exactly like a bucket with nothing in it. One line at
 * startup naming the endpoint and bucket it actually resolved turns that
 * ten-minute puzzle into a glance at the logs.
 *
 * Credentials are never logged, only whether any were found.
 */
let announced = false;

export function announceStorageConfig(): void {
  if (announced) return;
  announced = true;

  const config = storageConfig();
  const problems = storageConfigProblems(config);

  console.info(
    '[storage] endpoint=%s bucket=%s region=%s pathStyle=%s credentials=%s presignTtl=%ss%s',
    config.endpoint ?? '(aws default)',
    config.bucket || '(unset)',
    config.region,
    config.forcePathStyle,
    config.hasCredentials ? 'env' : 'sdk-chain',
    config.presignTtl,
    config.publicEndpoint ? ` publicEndpoint=${config.publicEndpoint}` : '',
  );

  for (const problem of problems) {
    console.warn('[storage] %s', problem);
  }
}
