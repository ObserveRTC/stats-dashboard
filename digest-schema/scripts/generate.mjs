#!/usr/bin/env node
/**
 * Generate the TypeScript artifacts from the JSON Schema sources.
 *
 *   node digest-schema/scripts/generate.mjs          # write
 *   node digest-schema/scripts/generate.mjs --check  # verify, exit 1 on drift
 *
 * The JSON Schema in `digest-schema/schema/` is the single source of truth. This
 * emits two things into `src/digest/`:
 *
 *   types.ts       static types, for the compiler
 *   validators.mjs precompiled standalone validators, for runtime
 *
 * Standalone validators matter more than they look. The browser validates
 * digests on the way in — the shape is a storage contract with a producer
 * outside this repository, so trusting the envelope would turn a version
 * mismatch into a blank panel with no explanation. Compiling the validators
 * ahead of time means that check costs a few generated functions rather than
 * shipping a schema compiler to every visitor, and it is the same compiled code
 * the server runs, so the two cannot disagree about what is valid.
 *
 * `--check` is what CI runs. It regenerates into a temporary directory and
 * compares, so a hand-edited generated file or a schema change nobody
 * regenerated fails the build rather than drifting quietly.
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { compile } from 'json-schema-to-typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = resolve(HERE, '..');
const REPO = resolve(PACKAGE, '..');
const SCHEMA_DIR = join(PACKAGE, 'schema');
const OUT_DIR = join(REPO, 'src', 'digest');

/**
 * The documents that get a named validator.
 *
 * Only root documents and the detail record types — the shapes that actually
 * cross the read boundary. `common.json` is referenced by all of them and is
 * never validated on its own.
 */
const VALIDATED = [
  { key: 'CallDigest', schema: 'call-digest.json', pointer: '' },
  { key: 'PeriodSummary', schema: 'period-summary.json', pointer: '' },
  { key: 'ClientDigest', schema: 'call-digest.json', pointer: '#/$defs/clientDigest' },
  { key: 'ClientCheck', schema: 'call-digest.json', pointer: '#/$defs/clientCheck' },
];

/** Types generated from each schema file, including the shared $defs. */
const TYPED = ['common.json', 'call-digest.json', 'period-summary.json'];

async function loadSchemas() {
  const files = (await readdir(SCHEMA_DIR)).filter((f) => f.endsWith('.json')).sort();
  const out = new Map();
  for (const file of files) {
    out.set(file, JSON.parse(await readFile(join(SCHEMA_DIR, file), 'utf8')));
  }
  return out;
}

/**
 * One Ajv instance holding every schema, so cross-file `$ref` resolves.
 *
 * `strict: false` because the schemas use `description` on `$defs` members and
 * `if/then` beside `properties`, both of which Ajv's strict mode flags as
 * suspicious even though they are correct here. `allErrors` is off in the
 * compiled output: a validator that stops at the first error is what a read
 * path wants, and the conformance suite reports the first failure anyway.
 */
function newAjv(schemas, opts = {}) {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: false,
    validateFormats: false,
    ...opts,
  });
  // Added by $id, which is how the relative `$ref`s between files resolve.
  for (const schema of schemas.values()) ajv.addSchema(schema);
  return ajv;
}

/**
 * Strip documentation from a schema copy.
 *
 * `title`, `description` and `$comment` do not affect validation, but Ajv
 * embeds the whole schema in its generated code for error reporting — so every
 * paragraph of rationale in these files would ship to every visitor's browser.
 * The prose is why the schemas are readable and it belongs in the source and in
 * the generated types; it has no business in a validator.
 */
function stripDocs(node) {
  if (Array.isArray(node)) return node.map(stripDocs);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'title' || key === 'description' || key === '$comment') continue;
    out[key] = stripDocs(value);
  }
  return out;
}

async function generateValidators(schemas) {
  const lean = new Map([...schemas].map(([file, schema]) => [file, stripDocs(schema)]));
  const ajv = newAjv(lean, { code: { source: true, esm: true, lines: true } });

  const refs = {};
  for (const { key, schema, pointer } of VALIDATED) {
    const base = schemas.get(schema)?.$id;
    if (!base) throw new Error(`${schema} has no $id`);
    refs[`validate${key}`] = `${base}${pointer}`;
  }

  // One module exporting one validator per entry. Ajv emits the shared
  // subschemas once and the exports reference them, so the common types are not
  // duplicated eleven times.
  return toRealEsm(standaloneCode(ajv, refs));
}

/**
 * Turn Ajv's leftover `require()` calls into real imports.
 *
 * Even with `esm: true`, Ajv's standalone output pulls its own runtime helpers
 * in with `require()` — currently just `ucs2length`, for the `maxLength` of a
 * string with astral characters. The result is a `.mjs` file containing both
 * `require` and top-level `await`, which Node refuses to load at all:
 * `ERR_AMBIGUOUS_MODULE_SYNTAX`. A bundler papers over it; `node` does not, and
 * the conformance suite runs under plain `node`.
 *
 * Each `const NAME = require("SPEC").PROP;` becomes a hoisted default import
 * plus a property read. The default import of a CommonJS module is its
 * `module.exports`, so `.PROP` still resolves — which is why the property is
 * preserved rather than assumed to be `default`.
 */
function toRealEsm(code) {
  const imports = [];
  let index = 0;

  const rewritten = code.replace(
    /const (\w+) = require\((["'][^"']+["'])\)(\.\w+)?;/g,
    (_match, name, spec, prop) => {
      const alias = `__ajvRuntime${index}`;
      index += 1;
      // ESM demands the file extension that `require` was happy to infer.
      const quote = spec.slice(0, 1);
      const bare = spec.slice(1, -1);
      const resolved = /\.(js|cjs|mjs|json)$/.test(bare) ? bare : `${bare}.js`;
      imports.push(`import ${alias} from ${quote}${resolved}${quote};`);
      return `const ${name} = ${alias}${prop ?? ''};`;
    },
  );

  if (imports.length === 0) return rewritten;

  // Imports are hoisted by the runtime anyway, but placing them at the top
  // keeps the file readable and makes a stray `require` obvious in a diff.
  const lines = rewritten.split('\n');
  const afterDirective = lines[0]?.startsWith('"use strict"') ? 1 : 0;
  lines.splice(afterDirective, 0, ...imports);
  return lines.join('\n');
}

/**
 * Bundle every schema's `$defs` into one document so each becomes a named,
 * exported type.
 *
 * Generating per file does not work: `call-digest.json` and `period-digest.json`
 * are the only files with a root object, while `common.json`, `detail.json` and
 * `read.json` carry everything in `$defs` with no root properties at all. A
 * generator pointed at those emits an empty interface, because nothing in the
 * document is reachable from its root.
 *
 * So: one in-memory bundle whose root references every type, with cross-file
 * `$ref`s rewritten to local pointers. The bundle exists only during generation
 * — the schema files stay separate on disk, because that is the form a producer
 * in another language consumes.
 */
function pascal(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Rewrite `other-file.json#/$defs/x` and `#/$defs/x` alike to `#/$defs/x`. */
function localizeRefs(node) {
  if (Array.isArray(node)) return node.map(localizeRefs);
  if (!node || typeof node !== 'object') return node;

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      const at = value.indexOf('#/$defs/');
      out.$ref = at === -1 ? value : value.slice(at);
      continue;
    }
    out[key] = localizeRefs(value);
  }
  return out;
}

/**
 * Name a `$defs` member after its key, keeping its prose.
 *
 * The generator names types from `title`, and these titles are sentences — "A
 * half-open interval [startAt, endAt)" would become an unusable type name. The
 * sentence moves to the front of `description`, where it is still read by
 * anyone hovering the type, and the key supplies the name.
 */
function nameFromKey(key, schema) {
  const { title, description, ...rest } = schema;
  const prose = [title, description].filter(Boolean).join('\n\n');
  return { title: pascal(key), ...(prose ? { description: prose } : {}), ...rest };
}

function buildBundle(schemas) {
  const defs = {};
  const seen = new Map();

  const add = (key, schema, fromFile) => {
    if (seen.has(key)) {
      throw new Error(
        `duplicate type name "${key}" in ${fromFile} and ${seen.get(key)} — ` +
          'a bundled $defs key must be unique across the contract',
      );
    }
    seen.set(key, fromFile);
    defs[key] = nameFromKey(key, localizeRefs(schema));
  };

  for (const [file, schema] of schemas) {
    for (const [key, member] of Object.entries(schema.$defs ?? {})) add(key, member, file);
  }

  // The two root documents, which have properties rather than $defs.
  for (const [key, file] of [
    ['callDigest', 'call-digest.json'],
    ['periodSummary', 'period-summary.json'],
  ]) {
    const { $schema: _s, $id: _i, $defs: _d, ...root } = schemas.get(file);
    add(key, root, file);
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://schemas.observertc.org/digest/v2/bundle.json',
    title: 'DigestContractV2',
    description:
      'Carrier for the generated types. Not a wire format — nothing ever serializes this object; ' +
      'it exists so every contract type is reachable from one root and therefore gets emitted.',
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(
      Object.keys(defs).map((key) => [key, { $ref: `#/$defs/${key}` }]),
    ),
    $defs: defs,
  };
}

async function generateTypes(schemas) {
  const banner =
    '/* eslint-disable */\n' +
    '/**\n' +
    ' * GENERATED FILE — do not edit.\n' +
    ' *\n' +
    ' * Source: digest-schema/schema/*.json\n' +
    ' * Regenerate: npm run schema:generate\n' +
    ' * Verify:     npm run schema:check\n' +
    ' *\n' +
    ' * The JSON Schema is the contract. Editing this file makes the two disagree,\n' +
    ' * and `schema:check` fails the build when they do.\n' +
    ' */\n\n';

  const ts = await compile(buildBundle(schemas), 'DigestContractV1', {
    bannerComment: '',
    additionalProperties: false,
    declareExternallyReferenced: true,
    enableConstEnums: false,
    unreachableDefinitions: true,
    style: { singleQuote: true, printWidth: 100 },
  });

  return banner + ts;
}

/**
 * Declarations for the generated validator module.
 *
 * Ajv's standalone output is plain JavaScript with no types of its own, and the
 * list of validators it exports is `VALIDATED` above — so the declarations are
 * generated from the same list rather than hand-maintained beside it, which is
 * how the two drift.
 *
 * Each validator is declared as a type guard over its document type. That is
 * what makes the server's parse functions honest: a `true` return narrows the
 * value, so nothing downstream has to cast.
 */
function generateValidatorDeclarations() {
  const lines = [
    '/* eslint-disable */',
    '/**',
    ' * GENERATED FILE — do not edit. Source: digest-schema/schema/*.json',
    ' * Regenerate: npm run schema:generate',
    ' *',
    ' * SERVER ONLY. This module is ~380KB of precompiled validation code and must',
    ' * never reach the browser bundle: the storage contract is validated where',
    ' * storage is read, which is the server. Import it from route handlers and',
    ' * server modules only — `src/digest/server.ts` is the one place that',
    ' * does, and the browser imports types and the registry instead.',
    ' */',
    '',
    "import type {",
  ];

  for (const { key } of VALIDATED) lines.push(`  ${key},`);
  lines.push("} from './types.ts';", '');
  lines.push('/** Ajv attaches the failure list to the function itself after a false return. */');
  lines.push('export interface ValidationError {');
  lines.push('  instancePath: string;');
  lines.push('  schemaPath: string;');
  lines.push('  keyword: string;');
  lines.push('  message?: string;');
  lines.push('  params?: Record<string, unknown>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface Validator<T> {');
  lines.push('  (value: unknown): value is T;');
  lines.push('  errors?: ValidationError[] | null;');
  lines.push('}');
  lines.push('');

  for (const { key } of VALIDATED) {
    lines.push(`export declare const validate${key}: Validator<${key}>;`);
  }
  return lines.join('\n') + '\n';
}

/**
 * The registry, inlined as typed constants.
 *
 * Inlined rather than imported as JSON because the browser genuinely needs it:
 * a metric's unit decides how the UI formats it, its numerator and denominator
 * decide what the tooltip says, and a histogram's bounds are the only way to
 * interpret a bucket. Shipping it as a module avoids a `resolveJsonModule`
 * dependency and gives the values real types instead of `any`.
 *
 * It is small — four files of metadata — and it is the one part of the contract
 * that must be identical in the producer and on screen, which is exactly why it
 * is generated from the same source rather than retyped.
 */
async function generateRegistry() {
  const dir = join(PACKAGE, 'registry');
  const read = async (p) => JSON.parse(await readFile(join(dir, p), 'utf8'));

  const catalogue = await read('checks.v2.json');
  const json = (value) => JSON.stringify(value, null, 2);

  return `/* eslint-disable */
/**
 * GENERATED FILE — do not edit.
 *
 * Source: digest-schema/registry/*.json
 * Regenerate: npm run schema:generate
 *
 * Safe in the browser: metadata, not validation code. This is the half of the
 * contract the UI needs in order to render a digest at all — a digest stores a
 * check's \`id\` and its outcome, and every word around it comes from here.
 *
 * The same reasoning as CLIENT_ISSUE_TYPES, applied one level up. An issue's
 * label, meaning and chart live in that registry; a check's question, section
 * and rule live in this one. Storage holds neither, so there is exactly one
 * place each sentence is written and no way for two copies to drift.
 */

export const CHECK_CATALOGUE = ${json(catalogue)} as const;

export type CheckSection = (typeof CHECK_CATALOGUE)['sections'][number];
export type CheckDefinition = (typeof CHECK_CATALOGUE)['checks'][number];

/** The catalogue version the rules were written against. */
export const CATALOGUE_VERSION = CHECK_CATALOGUE.catalogueVersion;

const CHECKS_BY_ID = new Map<string, CheckDefinition>(
  CHECK_CATALOGUE.checks.map((c) => [c.id, c]),
);

const SECTIONS_BY_ID = new Map<string, CheckSection>(
  CHECK_CATALOGUE.sections.map((s) => [s.id, s]),
);

/**
 * The definition for a check id, or undefined when this build has none.
 *
 * Undefined is a real case, not a bug: a digest written by a newer processor
 * may name a check this UI has never heard of. The caller shows it as an
 * unrecognised check with its raw id rather than hiding it — a check the reader
 * cannot name is still a check that failed.
 */
export function checkDefinition(id: string): CheckDefinition | undefined {
  return CHECKS_BY_ID.get(id);
}

export function checkSection(id: string): CheckSection | undefined {
  return SECTIONS_BY_ID.get(id);
}

/** Sections in display order. */
export function orderedSections(): CheckSection[] {
  return [...CHECK_CATALOGUE.sections].sort((a, b) => a.order - b.order);
}

/** A section's checks in display order. */
export function checksInSection(sectionId: string): CheckDefinition[] {
  return CHECK_CATALOGUE.checks
    .filter((c) => c.section === sectionId)
    .sort((a, b) => a.order - b.order);
}

/**
 * A check's question, or a readable fallback.
 *
 * Never returns empty and never swallows the id, for the same reason the v1
 * contract required it of reason codes: an unrecognised check must stay visible
 * and greppable instead of becoming "unknown".
 */
export function checkQuestion(id: string): string {
  return CHECKS_BY_ID.get(id)?.question ?? \`Unrecognised check (\${id})\`;
}

/**
 * Every built-in issue type the catalogue claims, to the check that claims it.
 *
 * Built eagerly so the processor can assert the inverse — that no built-in
 * issue type is unclaimed. An issue with no check would fire, be stored, and
 * never appear in any section.
 */
export const CHECK_BY_ISSUE_TYPE: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    CHECK_CATALOGUE.checks.flatMap((c) =>
      ((c as { issueTypes?: readonly string[] }).issueTypes ?? []).map((t) => [t, c.id]),
    ),
  ),
);
`;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * The checksum of the inputs, not the outputs.
 *
 * Hashing the schemas and the registry is what makes "this artifact was
 * generated from that contract" checkable. Hashing the generated files instead
 * would only prove they had not been edited since, which is the weaker claim.
 */
async function inputChecksums(schemas) {
  const lines = [];
  for (const [file, schema] of [...schemas].sort()) {
    lines.push(`${sha256(JSON.stringify(schema))}  schema/${file}`);
  }
  const registryDir = join(PACKAGE, 'registry');
  for (const file of await walk(registryDir)) {
    const rel = file.slice(PACKAGE.length + 1);
    lines.push(`${sha256(await readFile(file, 'utf8'))}  ${rel}`);
  }
  return lines.join('\n') + '\n';
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out.sort();
}

async function build() {
  const schemas = await loadSchemas();
  return {
    'types.ts': await generateTypes(schemas),
    'validators.mjs': await generateValidators(schemas),
    'validators.d.mts': generateValidatorDeclarations(),
    'registry.ts': await generateRegistry(),
    checksums: await inputChecksums(schemas),
  };
}

async function main() {
  const check = process.argv.includes('--check');
  const built = await build();

  const files = [
    [join(OUT_DIR, 'types.ts'), built['types.ts']],
    [join(OUT_DIR, 'validators.mjs'), built['validators.mjs']],
    [join(OUT_DIR, 'validators.d.mts'), built['validators.d.mts']],
    [join(OUT_DIR, 'registry.ts'), built['registry.ts']],
    [join(PACKAGE, 'CHECKSUMS.txt'), built.checksums],
  ];

  if (!check) {
    await mkdir(OUT_DIR, { recursive: true });
    for (const [path, content] of files) await writeFile(path, content, 'utf8');
    console.log(`generated ${files.length} files`);
    return;
  }

  let drift = 0;
  for (const [path, content] of files) {
    let existing = null;
    try {
      existing = await readFile(path, 'utf8');
    } catch {
      /* missing counts as drift */
    }
    if (existing !== content) {
      drift += 1;
      console.error(
        existing === null
          ? `missing:  ${path.slice(REPO.length + 1)}`
          : `stale:    ${path.slice(REPO.length + 1)}`,
      );
    }
  }

  if (drift > 0) {
    console.error(`\n${drift} generated artifact(s) do not match the schema. Run: npm run schema:generate`);
    process.exit(1);
  }
  console.log('generated artifacts match the schema');
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { build, rm };
