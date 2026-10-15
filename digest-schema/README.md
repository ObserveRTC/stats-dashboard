# digest-schema

The shared analytics digest contract, version 1. One source of truth for the
producer that writes digests and the dashboard that reads them.

```
digest-schema/
  contract/digest-contract.md      the contract document, verbatim
  schema/*.json                    JSON Schema (draft 2020-12) — the source of truth
  registry/                        metric, histogram, capability and reason-code data
  registry/policies/               named, immutable calculation policies
  fixtures/                        conformance fixtures shared by both implementations
  scripts/generate.mjs             the generator
  CHECKSUMS.txt                    SHA-256 of every schema and registry input
```

## Generated artifacts

```bash
npm run schema:generate   # write src/digest/
npm run schema:check      # verify; non-zero exit on drift (CI)
```

Four files land in `src/digest/`, none of them hand-written:

| File | Where it runs | Why |
|---|---|---|
| `types.ts` | anywhere | 84 exported types, one per contract shape |
| `registry.ts` | anywhere | metric units, histogram bounds, reason labels — the UI needs these to format and explain anything |
| `validators.mjs` | **server only** | ~370KB of precompiled validation |
| `validators.d.mts` | — | declarations, as type guards |

`validators.mjs` is deliberately not re-exported from `src/digest/index.ts`.
Validation happens where storage is read, which is the server; the browser gets
types and metadata. `src/digest/server.ts` is the only module that imports
the validators, and an accidental import from a component would be visible in review.

The checksums cover the **inputs** — the schemas and the registry — not the
generated output. "This artifact was generated from that contract" is the claim
worth being able to check; "nobody edited the output" is the weaker one, and
`schema:check` covers it by regenerating.

## Why JSON Schema rather than TypeScript or zod

The producer may not be TypeScript. A `zod` schema cannot be handed to a worker
written in anything else, and zod v3 has no faithful JSON Schema export, so
there would be nothing to give them. JSON Schema is the only form both sides can
consume, and the types and validators fall out of it by generation rather than by
someone keeping a second copy in step.

The `$id` values (`https://schemas.observertc.org/digest/v1/...`) are stable
identifiers, not endpoints. Nothing resolves over the network: Ajv resolves refs
by `$id` from the in-memory set, and the type generator resolves the same refs as
relative file paths. That is what keeps generation reproducible on a machine with
no egress.

## What is in the schemas, and what cannot be

Encoded as schema, so a malformed document fails at the boundary:

- an `unavailable` metric has null numerator, denominator, min, max and
  distribution, zero valid intervals, zero measured duration, and at least one
  reason — the shape that otherwise turns "nobody measured this" into a rendered
  zero
- a `measured` metric carries no unavailable reasons
- an `unavailable` join aggregate nulls every count
- `state` and `gap` timeline records carry no metric, value, numerator or
  denominator
- `relationshipSource` is non-null exactly when `publisherStreamId` is
- a day's `id` matches `YYYY-MM-DD` and has at most 24 buckets; a month's matches
  `YYYY-MM`
- a non-`ready` read result must carry reasons; `unsupported-version` must report
  the version it found

Rules that span two documents live in the conformance suite instead, because
JSON Schema cannot express them:

- `weights.length === upperBounds.length + 1` for the named histogram definition
- `succeeded + failed + canceled + pending + unknown === attempts`
- `readable + pending + failed + unknown === indexedCalls`
- every `metricId` exists in the registry version the policy pins
- a date that matches the pattern is a real date (`2026-02-31` is not)
- `callsWithExposure` deduplicated across the days of a month
- exposure clipped to the period

## Known contract defect

`registry/metrics.v1.json` carries a `conflictsWithContractProse` entry. The
contract prose says *"All delay and FPS metrics use `duration-weighted-mean`"*,
but three `ms` rows specify a per-count denominator:
`audio.inbound.jitterBufferDelay` (per emitted sample, and its row says "Ratio of
sums" outright), `video.inbound.decodeTime` (per decoded frame) and
`video.outbound.encodeTime` (per encoded frame).

Resolved here as `ratio-of-sums`, following the rows: these are cost per unit of
work, not a level held over time, and weighting a per-frame cost by milliseconds
produces a quantity with no interpretation. **This needs an explicit contract
amendment** — the producer and the dashboard must not resolve it independently,
which is exactly how two implementations end up disagreeing about a number
neither can defend.

## Changing the contract

A change to what a field *means* is a new major `schemaVersion` and a
coordinated producer and consumer change. Additive optional fields are allowed
within version 1; unknown fields are ignored by readers.

Any change: edit the JSON Schema or registry, run `npm run schema:generate`,
update the affected fixtures, and state the change in `contract/digest-contract.md`.
Editing a generated file instead makes the two disagree, and `schema:check`
fails the build when they do.
