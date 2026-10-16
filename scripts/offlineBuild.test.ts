/**
 * `next build` must not need the network.
 *
 *   node --experimental-strip-types scripts/offlineBuild.test.ts
 *
 * ## Why this exists
 *
 * On 2026-10-16 the dashboard image failed to build on the deployment node.
 * Typecheck passed, 480-odd checks passed, and then:
 *
 *   TypeError: Cannot read properties of null (reading '1')
 *     at next/font/.../google/loader.js
 *
 * That is `next/font/google` receiving nothing from fonts.googleapis.com and
 * reading a null regex match. The build container had no route to Google, so
 * `npm run build` — and with it the whole image — died on a webfont. The UI
 * commit it was carrying was fine; it simply never shipped, and `deploy.sh`
 * stopped before the rollout, leaving the previous image serving. That failure
 * is indistinguishable, from the outside, from "the deploy did nothing".
 *
 * The face is now a file in `src/fonts/`, loaded by `next/font/local`. This
 * test is what stops the convenient one-line import from coming back, because
 * nothing else would notice: `next/font/google` works perfectly on any machine
 * with egress, which includes every machine anyone develops on.
 *
 * ## The rule
 *
 * No source file imports a `next/font/google` face, and the local face it
 * imports instead is actually present, actually a woff2, and actually reaches
 * the Docker build context.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
const root = resolve(dirname(THIS_FILE), '..');

/** Every .ts/.tsx/.mjs/.js under the app's own source roots. */
function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|mjs|js)$/.test(entry)) out.push(full);
    }
  };
  for (const dir of ['app', 'src', 'scripts']) walk(join(root, dir));
  return out;
}

const FILES = sources();

check('the file list is not empty, so the rest cannot pass by vacuity', () => {
  assert.ok(FILES.length > 50, `only found ${FILES.length} source files`);
});

check('nothing imports a font from next/font/google', () => {
  // An import, not a mention: this file and the layout's own comment both have
  // to be able to name the thing they forbid.
  const IMPORTS_GOOGLE_FONT = /(?:from|require\()\s*['"]next\/font\/google['"]/;

  const offenders = FILES.filter((f) => f !== THIS_FILE)
    .filter((f) => IMPORTS_GOOGLE_FONT.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(root.length + 1));

  assert.deepEqual(
    offenders,
    [],
    'next/font/google downloads the face during `next build`, so the image\n' +
      'build needs outbound access to Google and fails without it. Vendor the\n' +
      'woff2 into src/fonts/ and use next/font/local instead:\n  ' +
      offenders.join('\n  '),
  );
});

check('the layout loads its face with next/font/local', () => {
  const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
  assert.match(layout, /from 'next\/font\/local'/);
  assert.match(layout, /src: '\.\.\/src\/fonts\/[^']+\.woff2'/);
});

check('the vendored face exists and is a real woff2', () => {
  const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
  const named = /src: '\.\.\/(src\/fonts\/[^']+\.woff2)'/.exec(layout);
  assert.ok(named, 'app/layout.tsx names no font file');

  const file = join(root, named[1]);
  // The magic number, not just the extension: a woff2 that is really an HTML
  // error page would be the exact mistake a vendored binary invites.
  const head = readFileSync(file).subarray(0, 4).toString('latin1');
  assert.equal(head, 'wOF2', `${named[1]} is not a woff2 (starts with ${JSON.stringify(head)})`);
});

check('no .dockerignore rule strips the face out of the build context', () => {
  // The build stage runs `next build`, so a .dockerignore rule that excluded
  // the font would reproduce the original failure with a different error — and
  // only on the node, never locally.
  //
  // This test runs in two places and .dockerignore exists in only one of them:
  // it ignores itself, so the copy of the tree inside the image does not have
  // it. That is not a gap. Inside the image, the check above — the file is
  // there and starts with `wOF2` — IS the context check, and a stronger one
  // than reading rules: it observes the filtered tree directly rather than
  // predicting what the filter will do. So the rule reading happens where the
  // rules are, and says which of the two it did.
  const dockerignore = join(root, '.dockerignore');
  if (!existsSync(dockerignore)) {
    // Belt and braces. `Dockerfile*` is ignored too, so the real checkout has
    // both files and the filtered tree has neither. A checkout missing only
    // .dockerignore is somebody having deleted it, and this branch must not
    // excuse that.
    assert.ok(
      !existsSync(join(root, 'Dockerfile')),
      'there is a Dockerfile but no .dockerignore, so this is the checkout with\n' +
        'its ignore file missing rather than the filtered tree inside the image',
    );
    console.log('        (no .dockerignore: running inside the filtered context, already proven above)');
    return;
  }

  const ignore = readFileSync(dockerignore, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const excluded = ignore.filter((rule) => /woff|fonts|^src$/.test(rule));
  assert.deepEqual(excluded, [], `.dockerignore would strip the font: ${excluded.join(', ')}`);
});

check('the licence ships with the face', () => {
  // SIL OFL: redistributing the binary means redistributing its licence, and
  // the file is in the image because src/ is in the build context.
  const licence = readFileSync(join(root, 'src/fonts/LICENSE.txt'), 'utf8');
  assert.match(licence, /SIL OPEN FONT LICENSE/i);
});

console.log(`\n${passed} checks passed`);
