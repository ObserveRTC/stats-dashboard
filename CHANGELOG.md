# Changelog

Notable changes, newest first. The version in `package.json` is what
`.github/workflows/release.yml` tags when somebody runs it, and the section here
matching it becomes that release's notes — so a version bump without a section
fails CI on the pull request rather than at the moment of the release.

Versions follow [semantic versioning](https://semver.org). One `package.json`
covers both images this repository builds, the dashboard and the digest
processor, so there is one version here. `digest-schema/` keeps its own, because
its version is the analytics contract's and may only change when a field's
meaning does.

## 1.0.0 — 2026-10-15

First public release, under Apache-2.0.

### The call investigator

The part of the dashboard that is complete and the reason for the 1.0.0: open a
room, pick a call, and read what actually happened to each participant.

- Rooms, calls and clients from an S3-compatible bucket, with no index to build
  and nothing to install beside it
- Per-client timelines — inbound and outbound streams, transports, data
  channels, tracks, codecs — aligned on one time axis
- Quality scores with a **reason breakdown**: which detector fired, when, and
  how many points it actually cost, rather than a number with no provenance
- ICE candidate stories: click a candidate and read its history — paired,
  nominated, disconnected — instead of inferring it from a table
- Issue lanes, transport timelines, producer/consumer comparison, mediasoup
  router topology
- Multi-SFU calls merged from their per-SFU summaries, with `mergedFields`
  naming what could not be merged rather than approximating it
- Metric series to the clipboard or CSV
- 49 in-app help topics: every card and chart says what it measures, which
  direction is good, and which reading looks like a finding and is not

### Deployment

- Multi-architecture image, `observertc/stats-dashboard` — `linux/amd64` and
  `linux/arm64`, each built natively rather than under emulation
- **Everything is read from the environment at runtime**, so one image runs
  against any bucket; a changed value needs a restart, not a rebuild
- Works with AWS S3, MinIO, Cloudflare R2 and Backblaze B2
- `S3_PROXY_STREAMS=true` streams client recordings through the server instead
  of presigning them, so object storage needs no public name and no credential
  leaves the cluster
- `S3_PREFIX` scopes a deployment to one tenant of a shared bucket
- `/api/health` separates fatal misconfiguration from warnings, so a correct
  deployment that takes its credentials from an instance role does not fail its
  own healthcheck in a restart loop
- No CORS to configure, no public bucket, no telemetry, no font or CDN fetch —
  deployable on an egress-restricted network

### Sample support

- client-monitor-js **4.9.0**, sample schema **3.7.0**
- Earlier schemas still read: `scoreReasons` as a string (≤3.2), as a
  `string[]` (3.3–3.5) and as `Record<reason, points>` (≥3.6)
- `IceTransportStats` on 3.7.0 emits static members only on change, and absence
  is read as *unchanged* rather than as unknown

### The analytics digest contract — new

`digest-schema/` is a versioned contract for day, month and per-call analytics
digests, shared by this dashboard and anything that writes them.

- JSON Schema (draft 2020-12) as the single source of truth, with TypeScript
  types and precompiled validators generated from it — `npm run schema:check`
  fails the build when they drift
- A metric registry of 23 metrics fixing each one's subject, units, numerator
  and denominator; four immutable histogram definitions
- `conservative-v1`, a named calculation policy with no hidden defaults: gap
  limits, freshness rules, lifecycle precedence, deduplication identity,
  impairment triggers and cohort attribution all stated
- Language-neutral by design, so a producer need not be TypeScript

### The digest processor — new, preview

`src/digest-server/` reads call archives and writes contract-conformant digests.
A separate application, not a feature of the dashboard: its own image
(`Dockerfile.digest`), its own entrypoint, its own Deployment and its own memory
limit. It shares the checkout, the lockfile and the version, and nothing else —
the dashboard still contains no code that writes, which is what makes it safe to
serve unauthenticated over a bucket. `scripts/noWritePath.test.ts` fails the
build if anything reachable from `app/` grows a write path, so that stays a
property of the code rather than of a configuration flag.

- REST (`POST /process/call/:roomId/:callId`) and a CLI with backfill
- All 23 registry metrics, with deltas taken once at stat scope from each stat's
  own timestamp
- Idempotent: the revision is derived from a hash of the input inventory, so
  reprocessing unchanged inputs is a no-op and a late source publishes a
  replacement rather than overwriting what a reader is paging
- Immutable revisions published before the manifest switches, so a reader never
  sees a half-written generation

### Known limitations

- **The analytics UI is not wired to this contract yet.** The homepage digest
  panel reads an earlier, simpler layout; the processor writes the
  `analytics/v1/` manifest-and-revision layout. Digests produced by the
  processor are therefore not yet readable in the dashboard. The call
  investigator above is unaffected — it reads the sample archive directly.
- **No authentication.** Anyone who can reach a deployment can read every
  sample under `S3_PREFIX`. Put it behind whatever your deployment already uses
  for this; the application has no notion of a user.
- **The processor is a demonstration**, not an ingestion pipeline: synchronous
  processing, one writer assumed, and the manifest publish is
  last-writer-wins. It is here to show the processing is ordinary code and to
  produce real digests to develop against.
- **One wire-format question is open.** The patch-encoded sample decoder
  replaces an array value wholesale rather than merging it element by element,
  in both the dashboard's Worker and the processor — a test pins the two
  together. Whether that matches the encoder is worth confirming against a
  production archive.
- Participant impairment duration is deliberately left unknown where the
  evidence cannot bound it — a sampled cumulative freeze counter locates freeze
  *within* an interval without saying when. Stream metrics and findings are
  still reported; see `conservative-v1`.
