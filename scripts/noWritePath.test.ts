/**
 * The dashboard has no write path, and this is what keeps that true.
 *
 *   node --experimental-strip-types scripts/noWritePath.test.ts
 *
 * ## Why a test rather than a convention
 *
 * The bound on what an anonymous visitor can do to the object store is not that
 * a route checks something. It is that the application contains no code that
 * writes. That property survives a bad default, a middleware ordering mistake
 * and a path-normalisation slip, in a way a gated route does not — and it is
 * the entire reason `dashboard.webrtc-observer.org` can be public and
 * unauthenticated over a bucket whose credential is MinIO's shared root pair.
 *
 * This file matters more than it used to, twice over. The writer was once a
 * separate npm package in a separate image, so `app/` could not reach it even
 * by accident. Then it became a folder in this repository. Now it is a folder
 * **inside `src/`** — `src/digest-server/` — a relative import away from every
 * component and every route handler. Nothing structural is left to stop that
 * import; this test is it.
 *
 * ## The rule, in one sentence
 *
 * `src/digest-server/` may write. Nothing outside it may reach it, and nothing
 * outside it may write by any other means either.
 *
 * Note what that is not: it is not "the processor is trusted and the dashboard
 * is not". They run as separate processes from separate images with separate
 * credentials and separate limits, and only one of them is reachable from the
 * internet. The folder boundary is where that difference is written down.
 *
 * ## The five checks
 *
 *  1. The file lists are not empty, so the rest cannot pass by vacuity.
 *  2. Nothing outside `src/digest-server/` imports anything inside it.
 *  3. Nothing outside `src/digest-server/` names a mutating S3 command.
 *  4. The writer really does write — otherwise 2 and 3 would start passing for
 *     the wrong reason the day somebody moves `publish.mjs`.
 *  5. The ~370KB of precompiled validators stay server-side: nothing a browser
 *     bundle can reach imports `digest/server` or `validators.mjs`.
 *
 * ## What this does not claim
 *
 * It reads source text; it is not a proof. A write reached through a computed
 * specifier, `eval`, or a dependency's own S3 client would pass. It catches the
 * realistic mistake — somebody wiring the writer into a route because it was
 * right there in `src/` — and that is what it is for.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CODE = /\.(ts|tsx|mts|mjs|js|jsx)$/;

/** The one directory in this repository allowed to write to object storage. */
const WRITER = 'src/digest-server';

const posix = (file: string) => relative(ROOT, file).replace(/\\/g, '/');

/** Every source file under `dir`, recursively. Build output is not source. */
function sourceFiles(dir: string): string[] {
  const skip = new Set(['node_modules', '.next', 'out', 'dist']);
  const found: string[] = [];

  const walk = (at: string) => {
    for (const entry of readdirSync(at)) {
      if (skip.has(entry) || entry.startsWith('.')) continue;
      const full = join(at, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (CODE.test(entry)) found.push(full);
    }
  };

  walk(join(ROOT, dir));
  return found;
}

/**
 * Every module specifier in a file: static imports, `export … from`, and
 * dynamic `import()`. Deliberately a regex and not the TypeScript compiler —
 * this test must run in a second with no build step, and the thing it is
 * looking for is an ordinary import written by someone being helpful.
 */
function specifiers(source: string): string[] {
  const found: string[] = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

/** The commands that change or remove an object. Reading is not in this list. */
const MUTATING_S3 = [
  'PutObjectCommand',
  'DeleteObjectCommand',
  'DeleteObjectsCommand',
  'CopyObjectCommand',
  'CreateMultipartUploadCommand',
  'UploadPartCommand',
  'CompleteMultipartUploadCommand',
  'PutBucketPolicyCommand',
  'CreateBucketCommand',
  'DeleteBucketCommand',
  'PutObjectTaggingCommand',
  'PutObjectAclCommand',
];

const ALL = [...sourceFiles('app'), ...sourceFiles('src')];
const WRITER_SOURCES = ALL.filter((f) => posix(f).startsWith(`${WRITER}/`));
const DASHBOARD_SOURCES = ALL.filter((f) => !posix(f).startsWith(`${WRITER}/`));

check('the file lists are populated, so the checks below mean something', () => {
  // A renamed folder or a path typo would otherwise make every check pass over
  // an empty list, which is the one way a guard like this fails silently.
  assert.ok(
    DASHBOARD_SOURCES.length > 50,
    `only ${DASHBOARD_SOURCES.length} dashboard files found under app/ and src/`,
  );
  assert.ok(
    WRITER_SOURCES.length > 5,
    `only ${WRITER_SOURCES.length} files found under ${WRITER}/ — has it moved?`,
  );
});

check(`nothing outside ${WRITER}/ imports it`, () => {
  const offenders: string[] = [];

  for (const file of DASHBOARD_SOURCES) {
    const here = dirname(file);
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      // Relative specifiers get resolved; `@/…` is this repo's own alias for
      // src/, so it can be rewritten to a path without resolving anything.
      const target = specifier.startsWith('.')
        ? posix(resolve(here, specifier))
        : specifier.startsWith('@/')
          ? `src/${specifier.slice(2)}`
          : null;

      if (target !== null && (target === WRITER || target.startsWith(`${WRITER}/`))) {
        offenders.push(`${posix(file)} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `${WRITER}/ is a separate application that happens to live in this tree. The\n` +
      'public app having no write path is what makes it safe to serve\n' +
      'unauthenticated over a bucket whose credential is not scoped. If a page\n' +
      'needs digests, read them from the analytics root; if something needs\n' +
      'processing triggered, call that app over the network as any other client\n' +
      'would:\n  ' +
      offenders.join('\n  '),
  );
});

check(`nothing outside ${WRITER}/ names a mutating S3 command`, () => {
  const offenders: string[] = [];

  for (const file of DASHBOARD_SOURCES) {
    const source = readFileSync(file, 'utf8');
    for (const command of MUTATING_S3) {
      if (source.includes(command)) offenders.push(`${posix(file)}: ${command}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'the dashboard lists and reads; it never writes. A deployment gives it a\n' +
      'credential on the assumption that no reachable code can change the bucket:\n  ' +
      offenders.join('\n  '),
  );
});

check('the writer does write, so the two checks above are not vacuous', () => {
  const writes = WRITER_SOURCES.filter((file) => {
    const source = readFileSync(file, 'utf8');
    return MUTATING_S3.some((command) => source.includes(command));
  });

  assert.ok(
    writes.length > 0,
    `no file under ${WRITER}/ names a mutating S3 command. Either the writer moved\n` +
      '— in which case this test is now guarding nothing and WRITER needs updating\n' +
      '— or it stopped writing, which is a much bigger surprise.',
  );
});

check('the precompiled validators stay out of the browser bundle', () => {
  // src/digest/server.ts imports ~370KB of generated validation code. Next
  // decides what reaches the browser by import graph, so a component importing
  // it would ship all of it to every visitor. Route handlers and other server
  // modules are where it belongs.
  const clientish = DASHBOARD_SOURCES.filter((file) => {
    const path = posix(file);
    return (
      path.startsWith('src/components/') ||
      path.startsWith('src/views/') ||
      path.startsWith('src/hooks/')
    );
  });

  const offenders: string[] = [];
  for (const file of clientish) {
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      if (/digest\/server|digest\/validators|validators\.mjs/.test(specifier)) {
        offenders.push(`${posix(file)} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'validation happens once, on the server, at the read boundary. A component\n' +
      'consumes the generated types and the registry, which are cheap metadata:\n  ' +
      offenders.join('\n  '),
  );
});

console.log(`\n${passed} checks passed`);
