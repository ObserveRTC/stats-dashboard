/**
 * Reading the deployment's storage configuration out of the environment.
 *
 *   node --experimental-strip-types scripts/storageConfig.test.ts
 *
 * These are deployment checks, not unit tests for their own sake. Two failures
 * here are the kind that only show up in production:
 *
 *   1. A value baked in at build time instead of read at run time, which makes
 *      one image serve a different bucket than it was told to.
 *   2. A configuration that is *correct* being reported as broken, which is
 *      worse than it sounds: `/api/health` drives the container healthcheck, so
 *      a false problem is a restart loop on a container that was working.
 */

import assert from 'node:assert/strict';
import {
  storageConfig,
  storageConfigReport,
  storageConfigProblems,
  storagePrefix,
  samplesPrefix,
  digestPrefix,
  toSampleKey,
  fromSampleKey,
  toDigestKey,
  fromDigestKey,
} from '../src/lib/s3.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const S3_KEYS = [
  'S3_PREFIX',
  'S3_SAMPLES_PREFIX',
  'S3_DIGEST_PREFIX',
  'S3_ENDPOINT',
  'S3_PUBLIC_ENDPOINT',
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_FORCE_PATH_STYLE',
  'S3_PRESIGN_TTL',
];

/** Run `fn` with exactly this environment for the S3 settings. */
function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved = Object.fromEntries(S3_KEYS.map((k) => [k, process.env[k]]));
  try {
    for (const key of S3_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) process.env[key] = value;
    }
    return fn();
  } finally {
    for (const key of S3_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key] as string;
    }
  }
}

console.log('read at run time, not baked in');

check('a changed environment is picked up on the next read', () => {
  // The reason storageConfig() is a function and not module-level constants:
  // module scope evaluates once, and during `next build` that once can be on
  // the build machine — which is how an image ends up serving the bucket it
  // was compiled next to rather than the one it was deployed with.
  const first = withEnv({ S3_BUCKET: 'staging-bucket' }, () => storageConfig().bucket);
  const second = withEnv({ S3_BUCKET: 'prod-bucket' }, () => storageConfig().bucket);
  assert.equal(first, 'staging-bucket');
  assert.equal(second, 'prod-bucket');
});

console.log('\ndefaults that suit the common deployments');

check('AWS S3: no endpoint is the SDK default, not an invented one', () => {
  const config = withEnv({ S3_BUCKET: 'b' }, storageConfig);
  assert.equal(config.endpoint, undefined, 'never default to somebody else’s host');
  assert.equal(config.publicEndpoint, undefined);
  assert.equal(config.region, 'us-east-1');
});

check('an empty string is treated as unset, not as an empty endpoint', () => {
  // The Dockerfile declares every variable with an empty default so they show
  // up in `docker inspect`. Those empties must read as "not configured".
  const config = withEnv({ S3_BUCKET: 'b', S3_ENDPOINT: '', S3_PUBLIC_ENDPOINT: '' }, storageConfig);
  assert.equal(config.endpoint, undefined);
  assert.equal(config.publicEndpoint, undefined);
});

check('path style defaults on, and only the literal "false" turns it off', () => {
  // Self-hosted gateways need it and fail confusingly without it, so the
  // default favours the case that breaks worst when wrong.
  assert.equal(withEnv({ S3_BUCKET: 'b' }, storageConfig).forcePathStyle, true);
  assert.equal(
    withEnv({ S3_BUCKET: 'b', S3_FORCE_PATH_STYLE: 'false' }, storageConfig).forcePathStyle,
    false,
  );
  assert.equal(
    withEnv({ S3_BUCKET: 'b', S3_FORCE_PATH_STYLE: 'true' }, storageConfig).forcePathStyle,
    true,
  );
});

check('a nonsense presign TTL falls back rather than signing forever or never', () => {
  const ttl = (value?: string) =>
    withEnv({ S3_BUCKET: 'b', S3_PRESIGN_TTL: value }, storageConfig).presignTtl;
  assert.equal(ttl(undefined), 900);
  assert.equal(ttl('60'), 60);
  assert.equal(ttl('0'), 900, 'zero would sign an already-expired URL');
  assert.equal(ttl('-1'), 900);
  assert.equal(ttl('banana'), 900);
});

console.log('\nwhat counts as broken');

check('no bucket is fatal — there is nothing to serve', () => {
  const { problems } = withEnv({}, storageConfigReport);
  assert.ok(problems.some((p) => p.includes('S3_BUCKET')));
});

check('an endpoint without a scheme is fatal, and says what it got', () => {
  // `S3_ENDPOINT=minio:9000` is the single most common way to get this wrong,
  // and the SDK's own error for it is unhelpful.
  const { problems } = withEnv({ S3_BUCKET: 'b', S3_ENDPOINT: 'minio:9000' }, storageConfigReport);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /S3_ENDPOINT/);
  assert.match(problems[0], /minio:9000/);
});

check('a bad public endpoint is caught too', () => {
  const { problems } = withEnv(
    { S3_BUCKET: 'b', S3_PUBLIC_ENDPOINT: 'localhost:9000' },
    storageConfigReport,
  );
  assert.ok(problems.some((p) => p.includes('S3_PUBLIC_ENDPOINT')));
});

console.log('\nwhat must NOT count as broken');

check('an instance-role deployment is healthy, not misconfigured', () => {
  // The bug this exists for: a correct ECS/EKS deployment sets neither key,
  // because the SDK takes them from the task role. Reporting that as a problem
  // made /api/health answer 503 for ever, and the container healthcheck read
  // that as "restart" — in a loop, on a container that was serving fine.
  withEnv({ S3_BUCKET: 'b' }, () => {
    const { problems, warnings } = storageConfigReport();
    assert.deepEqual(problems, [], 'missing keys must not be fatal');
    assert.equal(warnings.length, 1, 'but it is still worth saying out loud');
    assert.match(warnings[0], /credential chain/);
    // The convenience export must agree with the report, or a caller reading
    // one and a healthcheck reading the other disagree about whether to serve.
    assert.deepEqual(storageConfigProblems(), problems);
  });
});

check('a fully configured deployment reports nothing at all', () => {
  const report = withEnv(
    {
      S3_BUCKET: 'observertc',
      S3_ENDPOINT: 'http://minio:9000',
      S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
    },
    storageConfigReport,
  );
  assert.deepEqual(report.problems, []);
  assert.deepEqual(report.warnings, []);
});

check('one credential without the other is not treated as having credentials', () => {
  // Half a key pair is a typo, and passing it to the SDK produces a signature
  // error rather than the credential-chain fallback the operator expected.
  const config = withEnv({ S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'key' }, storageConfig);
  assert.equal(config.hasCredentials, false);
});

console.log('\nnothing leaks');

check('the config carries no secret values, only whether they exist', () => {
  const config = withEnv(
    { S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'AKIAEXAMPLE', S3_SECRET_ACCESS_KEY: 'topsecret' },
    storageConfig,
  );
  assert.equal(config.hasCredentials, true);
  const serialized = JSON.stringify(config);
  assert.ok(!serialized.includes('AKIAEXAMPLE'), 'access key id must not be in the config object');
  assert.ok(!serialized.includes('topsecret'), 'secret must not be in the config object');
});

console.log('\nthe tenant prefix');

check('unset means the bucket root, exactly as before', () => {
  withEnv({ S3_BUCKET: 'b', S3_SAMPLES_PREFIX: '' }, () => {
    assert.equal(storagePrefix(), '');
    assert.equal(toSampleKey('room/call/c.jsonl'), 'room/call/c.jsonl');
    assert.equal(fromSampleKey('room/call/c.jsonl'), 'room/call/c.jsonl');
  });
});

check('every spelling an operator reasonably writes means the same thing', () => {
  for (const spelling of ['acme.example.com', '/acme.example.com', 'acme.example.com/', ' /acme.example.com// ']) {
    withEnv({ S3_BUCKET: 'b', S3_PREFIX: spelling }, () => {
      assert.equal(storagePrefix(), 'acme.example.com/', `"${spelling}" normalized wrong`);
    });
  }
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: '///' }, () => assert.equal(storagePrefix(), ''));
});

check('a key that is not under the prefix is left alone rather than mangled', () => {
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: 'tenant-a/', S3_SAMPLES_PREFIX: '' }, () => {
    assert.equal(fromSampleKey('tenant-b/room/call/c.jsonl'), 'tenant-b/room/call/c.jsonl');
  });
});

console.log('\nsamples and digests are the two roots inside one tenant');

check('the defaults put both under the tenant', () => {
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: 'acme.example.com' }, () => {
    assert.equal(samplesPrefix(), 'samples/');
    assert.equal(digestPrefix(), 'digests/');
    assert.equal(
      toSampleKey('daily/call-1/c.jsonl'),
      'acme.example.com/samples/daily/call-1/c.jsonl',
    );
    assert.equal(
      toDigestKey('2026-10/2026-10-03.json'),
      'acme.example.com/digests/2026-10/2026-10-03.json',
    );
  });
});

check('each space relativizes back to what the app asked for', () => {
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: 'tenant' }, () => {
    const sample = toSampleKey('daily/call-1/c.jsonl');
    assert.equal(fromSampleKey(sample), 'daily/call-1/c.jsonl');
    const digest = toDigestKey('2026-10.json');
    assert.equal(fromDigestKey(digest), '2026-10.json');
  });
});

check('a root is relativized by its own root and not by the other', () => {
  // The reason these are two functions and not one with a root argument: a
  // digest key run through `fromSampleKey` comes back with the digest root
  // still on it, which then reads as a room called "digests".
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: 'tenant' }, () => {
    const digest = toDigestKey('2026-10/2026-10-03.json');
    assert.equal(fromSampleKey(digest), 'tenant/digests/2026-10/2026-10-03.json');
  });
});

check('a bucket filled before the split sets one empty setting, not a migration', () => {
  // The whole backward-compatibility story: S3_SAMPLES_PREFIX='' says the calls
  // sit directly under the tenant. Probing for the layout was the alternative,
  // and an empty bucket is indistinguishable from a bucket in the other
  // layout — so the probe would guess, and guess wrong exactly when the
  // deployment is new and nobody can yet tell what went wrong.
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: 'tenant', S3_SAMPLES_PREFIX: '' }, () => {
    assert.equal(samplesPrefix(), '');
    assert.equal(toSampleKey('daily/call-1/c.jsonl'), 'tenant/daily/call-1/c.jsonl');
    // Digests still have their own root, so a legacy bucket can gain them
    // without moving a single sample.
    assert.equal(toDigestKey('2026-10/'), 'tenant/digests/2026-10/');
  });
});

check('the two spaces do not collide by default', () => {
  // A sample key and a digest key must never resolve to the same object, or a
  // digest would be listed as a room on a bucket where both roots are blank.
  withEnv({ S3_BUCKET: 'b' }, () => {
    assert.notEqual(samplesPrefix(), digestPrefix());
  });
});

check('both roots pointing at the same place is reported, not silently accepted', () => {
  // Quiet failure otherwise: a digest would be listed as a sample room and read
  // as a call summary, which fails by showing nonsense. A warning rather than a
  // problem — the sample side still works, and `problems` drives the container
  // healthcheck.
  withEnv({ S3_BUCKET: 'b', S3_DIGEST_PREFIX: 'samples' }, () => {
    const { problems, warnings } = storageConfigReport();
    assert.deepEqual(problems, []);
    assert.ok(
      warnings.some((w) => w.includes('S3_SAMPLES_PREFIX') && w.includes('S3_DIGEST_PREFIX')),
      `expected a collision warning, got: ${warnings.join(' | ')}`,
    );
  });
});

check('both roots blank is the same collision, named as the tenant root', () => {
  withEnv({ S3_BUCKET: 'b', S3_SAMPLES_PREFIX: '', S3_DIGEST_PREFIX: '' }, () => {
    const { problems, warnings } = storageConfigReport();
    assert.deepEqual(problems, []);
    // The message has to be readable when the colliding value is the empty
    // string, which is how a legacy bucket with no digests yet is configured.
    assert.equal(warnings.filter((w) => w.includes('the tenant root')).length, 1);
  });
});

check('the resolved roots are on the config, so a log line can name them', () => {
  withEnv({ S3_BUCKET: 'b', S3_PREFIX: 'tenant', S3_DIGEST_PREFIX: 'd' }, () => {
    const config = storageConfig();
    assert.equal(config.prefix, 'tenant/');
    assert.equal(config.samples, 'samples/');
    assert.equal(config.digests, 'd/');
  });
});

console.log(`\n${passed} checks passed`);
