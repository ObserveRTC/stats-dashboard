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
 * `S3_PREFIX` scopes everything to one folder, for a bucket shared between
 * tenants (`<tenantFqdn>/…`). Listings and reads start inside it and keys are
 * relativized on the way out, so nothing downstream sees it. Empty — the
 * default — reads the whole bucket.
 *
 * Inside the tenant there are two roots this dashboard reads — samples and
 * digests — each with its own setting, because they have different lifetimes
 * and different writers. See the block above `samplesPrefix` for what lives
 * where.
 *
 * `S3_PROXY_STREAMS=true` turns the presigning off: the client `.jsonl` streams
 * are then read by this server and piped to the browser, which never talks to
 * storage at all. It costs this process the bytes it was avoiding — the reason
 * presigning is the default — and buys a deployment where storage needs no
 * public name and no credentials leave the cluster. That is the difference
 * between publishing an S3 endpoint to the internet for one dashboard and not.
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

/**
 * Normalize a configured prefix: no leading slash, one trailing slash, or empty.
 *
 * Normalized rather than validated: `acme.example.com`, `/acme.example.com` and
 * `acme.example.com/` all mean the same thing, and rejecting two of the three
 * would cost a deployment for no benefit.
 */
function normalizePrefix(raw: string | undefined): string {
  const cleaned = (raw ?? '').trim().replace(/^\/+|\/+$/g, '');
  return cleaned === '' ? '' : `${cleaned}/`;
}

/** The tenant prefix every key is scoped to. `''` when unset. */
export function storagePrefix(): string {
  return normalizePrefix(process.env.S3_PREFIX);
}

/**
 * The two roots this dashboard reads inside a tenant's folder.
 *
 *   <tenant>/<samples>/<roomId>/<callId>/<clientId>.jsonl
 *   <tenant>/<samples>/<roomId>/<callId>/call-summary[-<sfuId>].json
 *   <tenant>/<digests>/<YYYY-MM>/<YYYY-MM-DD>.json
 *   <tenant>/<digests>/<YYYY-MM>.json
 *
 * Two roots and not one because they answer different questions and are written
 * by different things:
 *
 *   **samples** — written continuously, during the call, by the observer. The
 *   truth, and the only place a client's timeline exists. Keyed by room, which
 *   is the right shape for opening a call you already know about and the wrong
 *   shape for anything that starts with a date: finding yesterday's calls by
 *   walking it is a full-bucket scan. Only the call page reads it.
 *
 *   **digests** — periods already added up, written by something outside this
 *   repository. This is what the homepage reads, and reading it is all this
 *   dashboard does with it: one GET answers "what happened today" however busy
 *   the day was.
 *
 * Separate prefixes rather than subfolders of one, because they have different
 * lifetimes: samples are deleted by a retention sweep while digests are kept
 * for ever and belong in a cheaper storage class. One prefix would make both of
 * those a path-matching exercise, and a lifecycle rule meant for samples would
 * reach into the digests.
 *
 * Whatever the bucket holds besides these two — a work queue, staging, an
 * archive — this dashboard neither reads nor needs to know about, which is why
 * it has settings for exactly these two and nothing else.
 *
 * Both are configurable, and `samples` defaults to `samples/` only because that
 * is where new deployments write. A bucket filled before the split has its
 * calls directly under the tenant, and sets `S3_SAMPLES_PREFIX=` to say so —
 * one empty setting instead of a migration. Probing for the layout was the
 * alternative and it is worse: an empty bucket is indistinguishable from a
 * bucket in the other layout, so the probe would guess, and guess wrong exactly
 * when a deployment is new and nobody can tell what went wrong yet.
 */
export function samplesPrefix(): string {
  return normalizePrefix(process.env.S3_SAMPLES_PREFIX ?? 'samples');
}

export function digestPrefix(): string {
  return normalizePrefix(process.env.S3_DIGEST_PREFIX ?? 'digests');
}

/** Where the sample space begins: `<tenant>/<samples>/`. */
function sampleRoot(): string {
  return `${storagePrefix()}${samplesPrefix()}`;
}

/** Where the digest space begins: `<tenant>/<digests>/`. */
function digestRoot(): string {
  return `${storagePrefix()}${digestPrefix()}`;
}

/** `room/call/client.jsonl` -> `tenant/samples/room/call/client.jsonl`. */
export function toSampleKey(key: string): string {
  return `${sampleRoot()}${key}`;
}

/** The reverse, so nothing downstream sees either the tenant or the root. */
export function fromSampleKey(key: string): string {
  const root = sampleRoot();
  return root && key.startsWith(root) ? key.slice(root.length) : key;
}

/** `2026-10/2026-10-03.json` -> `tenant/digests/2026-10/2026-10-03.json`. */
export function toDigestKey(key: string): string {
  return `${digestRoot()}${key}`;
}

export function fromDigestKey(key: string): string {
  const root = digestRoot();
  return root && key.startsWith(root) ? key.slice(root.length) : key;
}

export interface StorageConfig {
  endpoint?: string;
  /** Key prefix every listing and read is scoped to. `''` means the bucket root. */
  prefix: string;
  /** The two roots inside it, relative to `prefix`. */
  samples: string;
  digests: string;
  /** Endpoint to sign browser-facing URLs against, when it differs. */
  publicEndpoint?: string;
  /** Stream client `.jsonl` through this server instead of presigning it. */
  proxyStreams: boolean;
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
    prefix: storagePrefix(),
    samples: samplesPrefix(),
    digests: digestPrefix(),
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || undefined,
    // Opt-in, and deliberately not inferred from a missing S3_PUBLIC_ENDPOINT:
    // the common case for an unset public endpoint is that the server and the
    // browser reach storage by the same name, where presigning is right.
    proxyStreams: process.env.S3_PROXY_STREAMS === 'true',
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

  // Two roots resolving to the same place is always a mistake, and a quiet
  // one: a digest would be listed as a sample room and read as a call summary,
  // which fails by showing nonsense rather than by erroring. Not fatal — the
  // sample side still works — so it is a warning, and `problems` is what the
  // container healthcheck fails on.
  if (config.samples === config.digests) {
    warnings.push(
      `S3_SAMPLES_PREFIX and S3_DIGEST_PREFIX both resolve to ` +
        `"${config.samples || '(the tenant root)'}" — the two spaces would be read as each other.`,
    );
  }

  // The tenant prefix repeating a root's own name, which is what a deployment
  // written before the roots were split looks like after an upgrade: S3_PREFIX
  // used to BE the sample root, so `S3_PREFIX=samples/` was correct then and
  // resolves to `samples/samples/` now. Nothing errors. The bucket is read at a
  // path nothing has ever written to, so every listing is empty and the
  // dashboard shows no rooms at all — while `?deep=1` still answers `ok`,
  // because an empty listing is a successful listing.
  //
  // This cost an afternoon, which is the only reason it is worth a check this
  // specific. A warning rather than a problem: `samples/samples/` is a legal
  // layout, just an unlikely one, and refusing traffic over a guess would turn
  // a cosmetic mistake into an outage.
  const tenantTail = config.prefix.replace(/\/$/, '').split('/').pop() ?? '';
  for (const [name, root] of [
    ['S3_SAMPLES_PREFIX', config.samples],
    ['S3_DIGEST_PREFIX', config.digests],
  ] as const) {
    const rootHead = root.replace(/\/$/, '').split('/')[0] ?? '';
    if (tenantTail && rootHead && tenantTail === rootHead) {
      warnings.push(
        `S3_PREFIX ends with "${tenantTail}/" and ${name} starts with it too, so that space ` +
          `resolves to "${config.prefix}${root}". If this deployment predates the split between ` +
          `the sample and digest roots, S3_PREFIX was the sample root then and should be the ` +
          `tenant folder now — set S3_PREFIX="" and ${name}="${tenantTail}/". Listings under a ` +
          `path nothing writes to come back empty rather than failing, so nothing else will say so.`,
      );
    }
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
 *
 * Takes and returns keys *relative to `S3_PREFIX`*, so a caller listing `''`
 * gets the rooms of its own tenant rather than a single folder named after it.
 */
export async function listObjectsDeep(prefix: string): Promise<ObjectEntry[]> {
  return listDeep(toSampleKey(prefix), fromSampleKey);
}

/**
 * The same, over the digest root: takes and returns keys relative to it.
 *
 * Its own function rather than a flag on `listObjectsDeep`, because the two
 * roots relativize differently and a boolean at the call site would not say
 * which space the caller meant — and reading a digest key as a sample key
 * silently returns nothing rather than failing.
 */
export async function listDigestObjectsDeep(prefix: string): Promise<ObjectEntry[]> {
  return listDeep(toDigestKey(prefix), fromDigestKey);
}

async function listDeep(
  absolutePrefix: string,
  relativize: (key: string) => string,
): Promise<ObjectEntry[]> {
  const results: ObjectEntry[] = [];
  let token: string | undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucketName(),
      Prefix: absolutePrefix,
      ContinuationToken: token,
    });
    const res = await s3Client().send(cmd);
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      const key = relativize(obj.Key);
      // A root can exist as a zero-byte folder marker, which relativizes to
      // nothing and is not an object anybody asked for.
      if (key === '') continue;
      results.push({ key, lastModified: obj.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return results;
}

/**
 * Read one small object as text, or `undefined` when it is not there.
 *
 * "Not there" is a first-class answer rather than an exception because every
 * caller of this has a sensible thing to do without the object: today's digest
 * does not exist until something has written it, and a call still running has
 * no summary. Making absence an exception would mean
 * every call site wrapping it in a try block whose catch cannot tell a missing
 * object from a broken bucket — which is the one distinction worth keeping.
 *
 * Anything else — no credentials, no such bucket, a refused connection —
 * throws, because those are not states a page should quietly render around.
 *
 * For the `.jsonl` streams use `getObjectStream`: this buffers, and a long
 * call's stream is tens of megabytes.
 */
async function getObjectText(absoluteKey: string): Promise<string | undefined> {
  try {
    const res = await s3Client().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: absoluteKey }),
    );
    return (await res.Body?.transformToString()) ?? undefined;
  } catch (err) {
    if (isNotFound(err)) return undefined;
    throw err;
  }
}

/**
 * Is this the SDK saying the object is not there?
 *
 * Checked three ways because the S3-compatible gateways disagree: AWS sends
 * `NoSuchKey`, some gateways send `NotFound` (that is what a HEAD-shaped 404
 * surfaces as), and a few only set the HTTP status. Missing any one of them
 * turns an empty day into a 500.
 */
function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
}

/** One JSON object from a root, parsed, or `undefined` when absent/unparseable. */
async function getJson(absoluteKey: string, label: string): Promise<unknown | undefined> {
  const text = await getObjectText(absoluteKey);
  if (text === undefined || text.trim() === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    // A half-written object is a real event — a job killed mid-PUT — and it
    // must not take down the page that reads it. Logged and treated as absent.
    console.warn('[storage] %s is not valid JSON: %s', label, (err as Error).message);
    return undefined;
  }
}

export function getSampleJson(key: string): Promise<unknown | undefined> {
  return getJson(toSampleKey(key), `samples/${key}`);
}

export function getDigestJson(key: string): Promise<unknown | undefined> {
  return getJson(toDigestKey(key), `digests/${key}`);
}

/**
 * List the immediate object keys + metadata under a prefix (single level, with delimiter).
 * e.g. prefix="roomA/call1/"  →  ["roomA/call1/client1.jsonl", ...]
 *
 * Relative to `S3_PREFIX`, like `listObjectsDeep`.
 */
export async function listObjects(prefix: string): Promise<ObjectEntry[]> {
  const cmd = new ListObjectsV2Command({
    Bucket: bucketName(),
    Prefix: toSampleKey(prefix),
    Delimiter: '/',
  });
  const res = await s3Client().send(cmd);
  return (res.Contents ?? [])
    .filter((o) => o.Key)
    .map((o) => ({ key: fromSampleKey(o.Key!), lastModified: o.LastModified }))
    .filter((o) => o.key !== '');
}

/**
 * Is this URL segment one we are willing to build a storage key out of?
 *
 * A security boundary rather than a tidy-up: room, call and client ids arrive
 * from the URL, and a segment allowed to contain `/` or `..` reads outside its
 * call folder — and outside `S3_PREFIX`, which is what a shared bucket relies
 * on. An allowlist of shape, not a denylist of tricks.
 */
export function isPlainKeySegment(value: string): boolean {
  if (!value || value.length > 200) return false;
  return !(value.includes('/') || value.includes('\\') || value.includes('..'));
}

/**
 * The key of one client's stream, or `undefined` when a segment is not safe.
 *
 * Here rather than in the route handlers so the presigning path and the proxy
 * path cannot disagree about what a client's object is called, or about which
 * ids are acceptable.
 */
export function clientStreamKey(roomId: string, callId: string, clientId: string): string | undefined {
  if (![roomId, callId, clientId].every(isPlainKeySegment)) return undefined;

  return `${roomId}/${callId}/${clientId}.jsonl`;
}

/**
 * Where the browser fetches a client's stream from when `S3_PROXY_STREAMS` is on.
 *
 * Relative on purpose: the page's own origin is the one host a visitor is known
 * to reach, and keeping the fetch there is what lets storage have no public name
 * at all. Every segment is encoded, so an id cannot inject a path.
 */
export function clientStreamPath(roomId: string, callId: string, clientId: string): string {
  return `/api/${[roomId, callId, clientId].map(encodeURIComponent).join('/')}/raw`;
}

/** One object, as a stream this server can pipe straight to a response. */
export interface ObjectStream {
  body: ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  etag?: string;
}

/**
 * Read one object through this server, rather than handing out a URL for it.
 *
 * The counterpart to `presignGet`, for `S3_PROXY_STREAMS`. Returns a web stream
 * so a route handler can pass it to `new Response(...)` and never hold the whole
 * object in memory — a `.jsonl` for a long call is tens of megabytes, and
 * buffering it here would make a handful of readers a memory problem.
 *
 * `key` is relative to `S3_PREFIX`, like everything else in this module.
 * Throws whatever the SDK throws; a missing object is a `NoSuchKey`.
 */
export async function getObjectStream(key: string): Promise<ObjectStream> {
  const cmd = new GetObjectCommand({ Bucket: bucketName(), Key: toSampleKey(key) });
  const res = await s3Client().send(cmd);

  if (!res.Body) throw new Error(`object has no body [key: ${key}]`);

  return {
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType,
    contentLength: res.ContentLength,
    lastModified: res.LastModified,
    etag: res.ETag,
  };
}

/**
 * Generate a presigned GET URL for a private object.
 * The URL is valid for S3_PRESIGN_TTL seconds and requires no credentials from
 * the browser.
 *
 * `key` is relative to `S3_PREFIX`.
 */
export async function presignGet(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucketName(), Key: toSampleKey(key) });
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
    '[storage] endpoint=%s bucket=%s prefix=%s roots=%s|%s region=%s pathStyle=%s credentials=%s streams=%s%s%s',
    config.endpoint ?? '(aws default)',
    config.bucket || '(unset)',
    config.prefix || '(root)',
    config.samples || '(root)',
    config.digests || '(root)',
    config.region,
    config.forcePathStyle,
    config.hasCredentials ? 'env' : 'sdk-chain',
    // Which of the two delivery paths is live is the first thing to know when a
    // call page will not open, so it is on the line that gets pasted into an issue.
    config.proxyStreams ? 'proxied' : `presigned presignTtl=${config.presignTtl}s`,
    config.publicEndpoint ? ` publicEndpoint=${config.publicEndpoint}` : '',
    config.proxyStreams && config.publicEndpoint ? ' (publicEndpoint unused while proxying)' : '',
  );

  for (const problem of problems) {
    console.warn('[storage] %s', problem);
  }
}
