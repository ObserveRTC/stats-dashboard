# digest-server

Reads ObserveRTC call archives, computes the analytics digest, writes it.

**A separate application that shares a repository.** It shares the checkout, the
lockfile and the version with the dashboard. It does not share a process, an
image, a Deployment or a memory limit with it, and there are no imports in
either direction — the dashboard cannot even reach this folder, which
`scripts/noWritePath.test.ts` enforces. Everything runs from the repo root:

```bash
npm install                    # once, for the whole repository
npm run test:digest-server  # this app's suite (also part of `npm test`)
npm run digest -- day 2026-10-15
npm run digest:serve           # http://0.0.0.0:8787
npm run docker:digest          # docker build -f Dockerfile.digest .
```

Note the build context: the repo **root**, not this folder. That is what let the
vendored contract copy go away — see [The contract](#the-contract).

**It is a demonstration, not a production ingestion pipeline.** It exists to show
that the processing is ordinary code and to give the dashboard real digests to
read. A real deployment puts a queue in front of it, runs many workers, and does
not process a call inside an HTTP request. None of that changes the arithmetic in
`src/metrics.mjs` — which is the part worth getting right, and the part this app
is here to show.

## Run it

```bash
export S3_BUCKET=my-bucket
export S3_ENDPOINT=http://localhost:9000      # omit for AWS S3
export S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
export S3_PREFIX=                              # tenant folder; blank = bucket root
export S3_SAMPLES_PREFIX=samples/              # read
export S3_ANALYTICS_PREFIX=analytics/v1/       # written

npm run digest:serve                           # http://0.0.0.0:8787
```

The same variables the dashboard uses for the first five, and now literally the
same `.env.local` in the same checkout, so the two cannot end up pointed at
different buckets by a typo in one of two files. `S3_ANALYTICS_PREFIX` is this
app's alone — it is the only thing that writes there.

### HTTP

```bash
curl -XPOST localhost:8787/process/call/demo-room/call-0001
curl -XPOST localhost:8787/process/call -d '{"roomId":"demo-room","callId":"call-0001"}'
curl -XPOST localhost:8787/process/day/2026-10-15
curl -XPOST localhost:8787/process/month/2026-10
curl localhost:8787/healthz
```

A call request processes and answers with the digest. That is wrong for
production — a long call will outlive a load balancer's timeout — and right
here, because you see exactly what was computed instead of a job id to poll.

### CLI

From the repo root, where `npm run digest` is `node src/digest-server/cli.mjs`:

```bash
npm run digest -- call demo-room call-0001
npm run digest -- day 2026-10-15
npm run digest -- month 2026-10
npm run digest -- backfill 2026-10-01 2026-10-31   # days in order, then months
```

Months go last: a month folded before its days exist reports a month that was
never that quiet.

The same path works inside the image, because it is built from the repo root and
keeps that layout:

```bash
kubectl -n webrtc-observer exec deploy/digest-server -- \
  node src/digest-server/cli.mjs day 2026-10-15
```

### From another service

`src/process.mjs` is the entry point and exports two plain async functions with
no HTTP in them, so a backend in the same runtime can import them rather than
calling this process over the network:

```js
import { processCall, processPeriod } from './src/digest-server/process.mjs';

const { digest, job } = await processCall({ roomId, callId });
await processPeriod({ period: 'day', id: '2026-10-15' });
```

**Not from the dashboard, though.** These two functions are the write path, and
`scripts/noWritePath.test.ts` fails the build if anything under `app/` or `src/`
imports this folder. A public, unauthenticated reader that *could* write, even
behind a flag, is a different thing from one that cannot — and the credential it
holds is the object store's shared root pair, not a key scoped to
`analytics/v1/`. If the dashboard ever needs to trigger processing, it should
call this app over the network like any other client of it.

## The contract

The digest contract lives at `../digest-schema/` — JSON Schema, the metric
registry, the histogram definitions, the calculation policies. That is the seam,
and the only thing this app and the dashboard share. `src/registry.mjs` reads it
directly, and is the only module that knows where it comes from; when
`@observertc/digest-schema` is published, those two lines become an import of
that package and nothing else here changes.

**There used to be a `vendor/digest-schema/` here**, a checksummed copy filled by
a sync script and verified by a `pretest` drift check — five pieces of machinery
for one reason: a Docker build context cannot reach outside the directory it is
given, and the image was built from this folder. Building it from the repo root
instead (`../Dockerfile.digest`) puts the contract in the context, so the copy,
the manifest, the sync script and the check are all deleted. The vendored
validators were byte-identical to the dashboard's generated ones when they went,
which is the answer to whether the copy had ever been worth its ceremony.

The test suite validates what this app writes using
`../src/digest/validators.mjs` — the same precompiled validators the
dashboard reads digests through. If what this writes does not pass, the
dashboard cannot read it, and there is now exactly one copy of the arbiter.

### The one other thing that was shared, and no longer is

`src/samplePatch.mjs` decodes the patch-encoded client `.jsonl`. The dashboard
decodes those too, in a Web Worker — and a Worker built from a Blob cannot
`import` anything, so its copy is necessarily inlined in a string. Sharing a
repository does not help: there is no arrangement in which one module serves
both.

Two implementations of one wire format is a real risk: both apps reading an
archive and reporting different numbers, with nothing on either screen to say
which is wrong. A wrongly-dropped field does not look like a bug — it looks like
a stat the platform does not publish, which both apps treat as normal.

The mitigation is a test, not a shared file. The dashboard's
`scripts/samplePatch.test.mjs` extracts its Worker's `applyPatch` and asserts it
agrees with this module across 17 cases, and it runs in `npm test` at the root —
both decoders now being in one checkout is what makes that cheap to keep.

## What it writes

```
<tenant>/analytics/v1/calls/<room>~<call>/manifest.json
<tenant>/analytics/v1/calls/<room>~<call>/revisions/<rev>/digest.json
<tenant>/analytics/v1/calls/<room>~<call>/revisions/<rev>/details/<resource>/<page>.json
<tenant>/analytics/v1/periods/day/<YYYY-MM-DD>/manifest.json
<tenant>/analytics/v1/periods/day/<YYYY-MM-DD>/revisions/<rev>/digest.json
<tenant>/analytics/v1/periods/month/<YYYY-MM>/...
<tenant>/analytics/v1/contributions/<day|month>/<id>/<room>~<call>.json
```

Details and the digest are written immutably first, then the manifest. A reader
following the manifest sees the old generation or the new one, never a
half-written one, and a failed run leaves the previous revision where it was.

The **contribution** objects are the one thing a naive processor leaves out, and
without them a month cannot be correct. A contribution is one call's clipped
share of one period, keyed by call id — so reprocessing *replaces* it, and a
month deduplicates by call identity instead of summing its days. A call spanning
three days has three day contributions and exactly one month contribution, which
is why `callsWithExposure` counts it once.

## Idempotency and concurrency

The revision id is derived from a hash of the input inventory plus the policy
identity, so **reprocessing unchanged inputs produces the same revision** and the
immutable writes are skipped. A late or corrected source changes the hash and
therefore the revision, which publishes a replacement without overwriting what a
reader may be paging.

Revision objects are written with `If-None-Match: *`: a retry that finds the key
already there stops rather than rewriting bytes someone may be streaming.

**The manifest PUT is last-writer-wins.** Two workers on the same call would both
publish complete, valid revisions and the later manifest would win — a correct
digest, possibly not the newer one. A production processor needs a conditional
write on the manifest's ETag or a lease. One writer is the documented operating
assumption here, and `If-None-Match` support differs between AWS S3 and
self-hosted gateways, so verify it against yours.

## What it deliberately does not claim

Every one of these is a case where guessing would produce a plausible number.

| Left unknown | Why |
|---|---|
| **Peak concurrency** | Needs membership intervals. Sample bounds say when a client was *observed*, not when a person joined. Taken from the summary when it has one, otherwise null. |
| **Connected participant time** | Needs explicit connection-state evidence over the whole call. Not a fallback to observed time. |
| **Publisher/subscriber links** | Needs verified signalling evidence. Equal SSRC is not evidence — SSRCs get reassigned, and a wrong join compares two different people's media. `topology` is unavailable. |
| **Relay, protocol, TURN server** | Needs candidate metadata this app does not join. `paths` is unavailable and the fields are null, not guessed. |
| **Join outcomes** | Needs a versioned application attempt feed. A peer connection is not a join attempt. |
| **Cohort breakdowns** | Attributing exposure to a dimension needs interval evidence of which value was held when. A whole-session attribution would be wrong for exactly the participants who moved between SFUs. |
| **Participant impairment time from audio or video** | See below. |
| **Observer scores** | v1 does not treat them as measured quality. A native default of 5 is a default. |

### The freeze restriction, which is the point of the policy

A nonzero cumulative freeze-duration delta says there was freeze *somewhere
inside* a sampling interval. It does not say when, or for how long. So video
contributes:

- a **measured stream metric** (`video.inbound.freezeShare`), and
- **unknown** participant time for that interval — not impaired, and not healthy.

The same restriction applies to reconstructing impairment duration from a
concealment ratio. Network and connectivity *do* classify participant time,
because their evidence has interval resolution: a loss ratio describes the whole
interval, and a connection state is a state.

This means a call can show real video trouble alongside a small impaired-time
figure. That is the honest answer, and the UI must show both rather than adding
them together.

## Metrics

All 23 registry metrics are implemented; the test suite fails if a registry entry
ever loses its extractor. The rules that matter:

- **Deltas once, at stat scope, using the stat's own timestamp** — a sample
  carries many stats read at different instants, so dividing one stat's bytes by
  another's elapsed time misreports bitrate.
- **A counter going backwards is a reset**, not negative traffic. The stat's
  series starts a new epoch and only the straddling interval is lost — and only
  for the metrics whose counter actually reset.
- **A gap over 10s contributes nothing** rather than an interpolation.
- **A missing counter is not zero.** The metric comes out `unavailable` with a
  reason, which is the honest answer for a platform that does not publish the
  field.
- **A stale remote report is skipped** — one receiver report must not be counted
  once per local sample.
- **Ratios are ratios of sums**, divided once at the end. Not a mean of
  per-interval ratios: a 2% interval carrying ten packets and a 0% interval
  carrying ten thousand are not equal evidence.
- **Seconds become milliseconds explicitly** at every site. The W3C stats carry
  jitter, RTT, decode time and freeze duration in seconds; a missing ×1000 looks
  like an impossibly good call.

## Tests

```bash
npm run test:digest-patch      # 15 checks: the patch decoder
npm run test:digest-server  # 38 checks: metrics, call and period digests
npm run digest:fixture         # regenerate the fixture archive
npm test                       # the whole repository, these included
```

No storage is involved: the suite builds digests from the fixture in memory and
validates them with the contract's own generated validators — if what this writes
does not pass the schema, the dashboard cannot read it. **Real object storage has
not been tested.** What that leaves unverified: conditional writes, the manifest
publish order under a real failure, pagination against a real listing, and
credential handling.

The fixture is two clients over 60 seconds, shaped to exercise what matters:

| | |
|---|---|
| `client-a` | clean audio and video, nominated pair at 30ms |
| `client-b` | 12% inbound loss and 600ms RTT for 10s, a video freeze, a byte-counter reset at 35s, and a 20-second gap |

So a correct processor reports network impairment for client-b, measured freeze
with *unknown* video participant time, one interval lost at the reset for the
byte metrics only, and nothing at all across the gap.

`ajv` is a devDependency of the root package, used only to run the contract's
validators in the test suite. Nothing in `src/` imports it, which is why
`npm ci --omit=dev` is enough for the image.

## Known issue in the shared wire format

The decoder **replaces an array value wholesale** rather than merging it element
by element, while the shape of the dashboard's original suggests positional
merging was intended. So either the encoder sends complete array elements and
both decoders are correct, or it sends positional diffs and both have been
dropping unchanged fields all along. **Worth checking against a production
archive.** The fixture sends complete elements, matching the decoder.

## Deploying it

The image is self-contained and runs as `node` (non-root), with the app's own
`/healthz` as the container healthcheck.

```bash
docker build -f Dockerfile.digest -t observertc/digest-server:local .   # from the repo root
docker run --rm -p 8787:8787 --env-file .env observertc/digest-server:local
```

One `package.json` means `npm ci --omit=dev` in that image also installs the
dashboard's runtime dependencies — Next, React, d3 — none of which this process
imports. The image is a few hundred MB larger than it needs to be, which is a
deliberate trade against a second dependency manifest without a lockfile; see
the comment at the top of `Dockerfile.digest`.

Operational notes:

- **No authentication.** Do not expose it. It is a worker for a private network
  or your own backend, which is where authentication and tenant checks belong.
  `S3_PREFIX` scopes everything to one tenant at deploy time.
- **It writes.** Unlike the dashboard, which only lists and reads, this needs a
  credential with write access under `S3_ANALYTICS_PREFIX`. Scoping it to that
  prefix is worth doing if the store supports per-prefix policies.
- **Synchronous processing.** One call per request, no job queue. Fine for a
  demo, wrong behind a load balancer.
- **Memory.** Clients are read one at a time, so memory scales with the largest
  single participant rather than with the call. A single client's `.jsonl` is
  still read whole — streaming that too is the next thing to fix for genuinely
  long calls.
- **Logs** are one JSON line per job with counts, duration and the output
  revision. No source contents, no credentials.
