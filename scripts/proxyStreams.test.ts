/**
 * Which way a client's `.jsonl` reaches the browser.
 *
 *   node --experimental-strip-types scripts/proxyStreams.test.ts
 *
 * Two delivery paths share one response shape: a presigned URL straight to
 * storage (the default) and a same-origin path served by this app
 * (`S3_PROXY_STREAMS=true`). Both are deployment behaviour rather than UI, so
 * the failures they cause are the quiet kind:
 *
 *   1. A deployment with no public storage name silently keeps presigning, and
 *      every call page hangs on a host the browser cannot resolve — while the
 *      room and call lists, which the server fetches itself, look perfectly fine.
 *   2. The `raw` route builds a storage key out of URL segments, so an id that
 *      is allowed to contain `..` or `/` reads outside its call folder — and
 *      outside `S3_PREFIX`, which is the boundary a shared bucket relies on.
 *
 * What is exercised is the decision, not the plumbing: both route handlers ask
 * the same three helpers below which ids are acceptable, what the object is
 * called and where to send the browser. A route module cannot be imported here —
 * `next/server` is not resolvable outside the bundler — and does not need to be.
 */

import assert from 'node:assert/strict';
import {
  clientStreamKey,
  clientStreamPath,
  isPlainKeySegment,
  presignGet,
  storageConfig,
} from '../src/lib/s3.ts';

let passed = 0;
function check(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve(fn()).then(() => {
    passed += 1;
    console.log(`  ok  ${name}`);
  });
}

const S3_KEYS = [
  'S3_PREFIX',
  'S3_ENDPOINT',
  'S3_PUBLIC_ENDPOINT',
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_FORCE_PATH_STYLE',
  'S3_PRESIGN_TTL',
  'S3_PROXY_STREAMS',
];

/** Run `fn` with exactly this environment for the S3 settings. */
async function withEnv<T>(env: Record<string, string | undefined>, fn: () => T | Promise<T>): Promise<T> {
  const saved = Object.fromEntries(S3_KEYS.map((k) => [k, process.env[k]]));
  try {
    for (const key of S3_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) process.env[key] = value;
    }
    return await fn();
  } finally {
    for (const key of S3_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key] as string;
    }
  }
}

/** What `GET /api/:roomId/:callId/:clientId` answers, without Next in the way. */
async function locateUrl(roomId: string, callId: string, clientId: string): Promise<string | undefined> {
  const key = clientStreamKey(roomId, callId, clientId);

  if (!key) return undefined;

  return storageConfig().proxyStreams ? clientStreamPath(roomId, callId, clientId) : presignGet(key);
}

console.log('\nthe flag');

await check('is off unless it is exactly "true", so a typo cannot half-enable it', async () => {
  for (const value of [undefined, '', 'false', 'True', 'yes', '1']) {
    await withEnv({ S3_BUCKET: 'b', S3_PROXY_STREAMS: value }, () => {
      assert.equal(storageConfig().proxyStreams, false, `S3_PROXY_STREAMS=${String(value)}`);
    });
  }
  await withEnv({ S3_BUCKET: 'b', S3_PROXY_STREAMS: 'true' }, () => {
    assert.equal(storageConfig().proxyStreams, true);
  });
});

await check('is read at request time, not when the module was first imported', async () => {
  // The bug this guards: one container image is meant to serve any deployment,
  // and a value captured at import time can be the *build* machine's.
  await withEnv({ S3_BUCKET: 'b', S3_PROXY_STREAMS: 'true' }, () =>
    assert.equal(storageConfig().proxyStreams, true),
  );
  await withEnv({ S3_BUCKET: 'b' }, () => assert.equal(storageConfig().proxyStreams, false));
});

console.log('\nwhere the browser is sent');

await check('proxying hands out a same-origin path, not a storage URL', async () => {
  await withEnv(
    { S3_BUCKET: 'b', S3_ENDPOINT: 'http://minio:9000', S3_PROXY_STREAMS: 'true' },
    async () => {
      const url = await locateUrl('the-leaky-cauldron', 'call-1', 'client-1');

      assert.equal(url, '/api/the-leaky-cauldron/call-1/client-1/raw');
      // Relative on purpose: the page's own origin is the one host a visitor is
      // known to reach, and it is what keeps storage off the internet.
      assert.ok(!url?.includes('minio'), 'must not name the internal endpoint');
      assert.ok(url?.startsWith('/'), 'must be same-origin');
    },
  );
});

await check('every segment is encoded, so an id cannot inject a path', () => {
  // The refusal below is what a request with these ids actually gets; the
  // encoding matters for the ones that are legal but awkward.
  assert.equal(clientStreamPath('room a', 'call-1', 'client?x=1'), '/api/room%20a/call-1/client%3Fx%3D1/raw');
  assert.equal(clientStreamPath('a/b', 'c', 'd'), '/api/a%2Fb/c/d/raw');
});

await check('without the flag it still presigns, against the public endpoint', async () => {
  await withEnv(
    {
      S3_BUCKET: 'b',
      S3_ENDPOINT: 'http://minio:9000',
      S3_PUBLIC_ENDPOINT: 'https://s3.example.org',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_PREFIX: 'samples/',
    },
    async () => {
      const url = await locateUrl('room', 'call-1', 'client-1');

      assert.ok(url?.startsWith('https://s3.example.org/'), `signed against the public host: ${url}`);
      // The prefix belongs in the key, and only in the key.
      assert.ok(url?.includes('samples/room/call-1/client-1.jsonl'), url);
      assert.ok(url?.includes('X-Amz-Signature='), 'presigned');
    },
  );
});

console.log('\nwhat is refused');

await check('a traversing or malformed segment yields no key at all', () => {
  const refused: [string, string, string][] = [
    ['..', 'call', 'client'],
    ['room', '..', 'client'],
    ['room', 'call', '../../other-tenant/room/call/client'],
    ['room', 'call', 'a/b'],
    ['room', 'call', 'a\\b'],
    ['room', 'call', ''],
    ['room', 'call', 'x'.repeat(201)],
  ];

  for (const [roomId, callId, clientId] of refused) {
    assert.equal(
      clientStreamKey(roomId, callId, clientId),
      undefined,
      `${roomId}/${callId}/${clientId} should be refused`,
    );
  }

  // Both routes answer on the key being undefined, which is why neither can be
  // the one that forgot to check: the presigning route returns 400 and the raw
  // route returns 400 before it asks storage anything.
  assert.equal(clientStreamKey('the-leaky-cauldron', 'call-1', 'client-1'), 'the-leaky-cauldron/call-1/client-1.jsonl');
  assert.ok(isPlainKeySegment('a.b-c_1'));
});

console.log(`\n${passed} checks passed`);
