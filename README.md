# ObserveRTC Stats

A WebRTC diagnostics dashboard for browsing and inspecting `ClientSample` data collected by [observer-js](https://github.com/ObserveRTC/observer-js).

Built with **Next.js 15**, **React 19**, **TypeScript**, **Zustand**, and **D3**.

---

## Overview

Stats files are stored in an S3-compatible object store (AWS S3, MinIO, Cloudflare R2, …) using the path layout:

```
<bucket>/<roomId>/<callId>/<clientId>.jsonl
```

The dashboard lets you navigate `roomId → callId → clientId` and inspect per-client WebRTC stats: quality timelines, ICE candidates, transport state, inbound/outbound RTP, and more.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure storage

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

See [Storage configuration](#storage-configuration) below.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Storage configuration

Everything the app needs is read from the environment **at runtime**. Copy
`.env.example` to `.env.local` for development, or pass the same variables to
the container — one image runs against any bucket.

| Variable | Required | Description |
|---|---|---|
| `S3_BUCKET` | ✓ | Bucket holding the `<roomId>/<callId>/…` folders |
| `S3_ENDPOINT` | self-hosted / R2 | Full URL of the S3-compatible endpoint. Omit for AWS S3, which the SDK resolves from the region. |
| `S3_REGION` | | Defaults to `us-east-1`. MinIO ignores it; R2 wants `auto`. |
| `S3_ACCESS_KEY_ID` | | Omit both keys to use the SDK's credential chain — an EC2/ECS role, a mounted `~/.aws` profile |
| `S3_SECRET_ACCESS_KEY` | | Server-side only. Never sent to the browser, never `NEXT_PUBLIC_`. |
| `S3_FORCE_PATH_STYLE` | | `true` (default) for MinIO and most self-hosted gateways; `false` for AWS S3 and R2 |
| `S3_PUBLIC_ENDPOINT` | when it differs | Endpoint to sign **browser-facing** URLs against — see below |
| `S3_PRESIGN_TTL` | | Presigned URL lifetime in seconds. Default `900` |
| `PORT` / `HOSTNAME` | | Default `3000` / `0.0.0.0` |
| `NEXT_PUBLIC_API_BASE_URL` | | Build-time only. Blank (same origin) is right for almost every deployment. |

**There is no CORS to configure and no public bucket.** The browser never talks
to storage on its own: it calls `/api/*`, and the one thing it fetches directly
is a **presigned** URL the server mints per request. A private bucket with no
CORS policy and no anonymous access works exactly as it should.

That is also why `S3_PUBLIC_ENDPOINT` exists. A presigned URL is followed by the
browser, and a signature is bound to the host it was made for — so when the
server and the browser reach storage by different names, the URL has to be
signed against the one the *browser* will use. Set it when they differ, leave it
unset when they do not:

| Situation | `S3_ENDPOINT` | `S3_PUBLIC_ENDPOINT` |
|---|---|---|
| Everything on one host | `http://localhost:9000` | *(unset)* |
| App in Docker, MinIO beside it | `http://minio:9000` | `http://localhost:9000` |
| Internal VPC endpoint, public bucket URL | `https://s3.internal` | `https://files.example.com` |
| AWS S3 or R2 | *(unset)* / R2 endpoint | *(unset)* |

### Provider examples

**MinIO (local / self-hosted)**
```env
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=observertc
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

**AWS S3**
```env
S3_BUCKET=my-observertc-bucket
S3_REGION=eu-west-1
S3_FORCE_PATH_STYLE=false
# Keys omitted: the SDK picks up the instance or task role.
```

**Cloudflare R2**
```env
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_BUCKET=observertc
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=false
```

### Checking it

The server logs the resolved configuration once at startup — endpoint, bucket,
region, whether credentials were found — and never the credentials themselves.
`GET /api/health` reports the same thing plus whatever is missing, and
`GET /api/health?deep=1` lists one key to prove storage actually answers.

The health response separates `problems` from `warnings`, and only `problems`
produce a 503:

- **`problems`** are fatal — no `S3_BUCKET`, or an endpoint without a scheme.
  Nothing can be served until they are fixed, so a healthcheck should fail here.
- **`warnings`** are worth reading but are not a reason to refuse traffic. The
  one that matters: `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` being unset is
  a **correct** configuration on AWS, where the SDK takes credentials from an
  instance or task role — so it must not fail the healthcheck, or a working
  ECS/EKS deployment ends up in a restart loop.

If the dashboard comes up with an empty room list, it says so in a banner rather
than leaving you to guess: a misconfigured bucket and an empty bucket look
identical otherwise.

### Outbound network

A running container talks to exactly one thing: the object storage you point it
at. No analytics, no CDN, no font host, no telemetry — `NEXT_TELEMETRY_DISABLED`
is set in the image, and Inter is compiled in by `next/font` rather than fetched
from Google at page load, so browsers loading the dashboard do not call a third
party either. That makes it deployable on an egress-restricted or air-gapped
network without a proxy allowlist.

The *build* does need the network, for the npm registry and for the font
`next/font` downloads and inlines. Build once where there is network — CI, or
the published image — and run it anywhere.

### Publishing

`.github/workflows/docker-release.yml` pushes to Docker Hub on every commit to
the default branch and on every `v*` tag. It needs two repository secrets:
`DOCKERHUB_USERNAME`, and `DOCKERHUB_TOKEN` — an access token from Docker Hub →
Account settings → Personal access tokens, scoped Read & Write. A token rather
than the account password, because it can be revoked on its own.

Each architecture is built natively and in parallel — amd64 on `ubuntu-latest`,
arm64 on `ubuntu-24.04-arm` — and a final job stitches the two digests into one
multi-architecture tag. The alternative, one job cross-building under QEMU, runs
this Dockerfile's typecheck, test suite and Next.js build emulated at roughly a
fifth of native speed, which is most of an hour and close to the runner's memory
limit. The arm64 runner label is free for public repositories; on a private one,
swap it for `ubuntu-latest` plus `docker/setup-qemu-action` and accept the wait.

---

## API routes

The Next.js server handles object listing via the S3 API (credentials stay server-side). The browser fetches stat files directly from storage.

```
GET /api/:roomId                            list callIds in a room
GET /api/:roomId/:callId                    list clientIds, routerIds *and sfuIds* in a call
GET /api/:roomId/:callId/:clientId          return direct storage URL for the .jsonl file
GET /api/:roomId/:callId/call-summary       every call summary in the folder, merged
GET /api/:roomId/:callId/object/:name       one call-folder object, raw
GET /api/:roomId/:callId/router/:routerId   mediasoup router sample
```

Everything for a call lives in one folder:

```
<roomId>/<callId>/<clientId>.jsonl                 per-client ClientSample stream
<roomId>/<callId>/call-summary-<sfuId>.json        one per SFU the call ran on
<roomId>/<callId>/call-summary.json                single-SFU calls, and older writers
<roomId>/<callId>/mediasoup-router-<routerId>.json one per router
```

`GET /api/:roomId/:callId` reports the router ids it finds in that listing, so
the SFU view works even when the summaries are missing, still being written, or
do not name every router. It reports `sfuIds` from the same listing, so the
number of SFUs is known before a single summary is parsed — including one whose
contents turn out to be unreadable.

### The call summary, or summaries

A call can be spread across several SFUs, and the observer sits on each one. Each
observer writes a summary of the part it saw, named after itself:
`call-summary-<sfuId>.json`. **No single object is the call.** The API route
lists the folder, reads every `call-summary*` object in it, and merges them with
`mergeCallSummaries`; a folder holding only the un-suffixed `call-summary.json`
is simply a merge of one, so nothing had to change for single-SFU deployments.

Merging is not summing, and the policy is where the correctness lives:

| Field | Across SFUs |
|---|---|
| `clients`, `routerIds`, `clientsUsedTurn`, `sfus` | union |
| `startedAt` / `endedAt` | outer bound; duration recomputed from it |
| `numberOfClientIssues`, `scores.samples` | sum |
| `scores.min` / `max` | outer bound |
| `scores.mean` | recovered, weighted by each part's sample count |
| a client seen by two SFUs | the **worse** reading wins — a client that was fine on one leg and bad on another was not fine |
| `pipeLinks` | unioned on the *unordered* router pair — both ends report the same link |
| `scores.median` | **dropped.** A median of medians is not a median |
| `clientCounts.peak` | largest single-SFU peak, reported as the lower bound it is |

What could not be merged is named in `summary.unmergeable`, and the Call Summary
section says "not available across SFUs" rather than showing a number that would
be wrong. `summary.sources` records every object that went in — SFU id, client
and router counts, span — so a reader can always tell a merged summary from a
single-SFU one, and `summary.missingSources` counts parts that were present but
unreadable. One bad part never loses the rest of the call.

Two smaller consequences worth knowing: the participant count reads the merged
`clients` map rather than `clientCounts.joined`, because a client that used two
SFUs is counted by each observer; and the SFU→router topology falls back to each
router's `attachments.sfuId` when no summary ships an `sfus` block — the merge
synthesises one from each part's own routers when it knows which SFU wrote it.

### Inside one summary

The observer writes most of what the dashboard needs inside `attachments`, and
uses the top-level `clients` for *counts* rather than a per-client map:

```json
{
  "callId": "08d5…",
  "attachments": {
    "roomId": "chess",
    "clients": { "bbf4…": { "displayName": "Guest" } },
    "routerIds": ["16b4…"],
    "numberOfClientIssues": 10,
    "clientsUsedTurn": []
  },
  "clients": { "clientIds": ["bbf4…"], "peak": 2, "joined": 2, "left": 2 },
  "scores": { "samples": 44, "min": 0, "max": 4.35, "median": 3.75 },
  "startedAt": 1787297239302, "endedAt": 1787297353772,
  "durationInMs": 114470, "closedAt": 1787297713811
}
```

`normalizeCallSummary` (in `src/schema/CallSummary.ts`, applied by the API route
before merging) flattens this into the shape every component reads, and still
accepts a summary whose fields sit at the top level. It also reads
`attachments.sfuId` — the observer naming itself — which wins over the SFU id in
the filename. The call dashboard reads the
aggregates it supplies — median quality with its range, issue count, TURN users,
peak participants — instead of leaving those cards blank.

---

## Running it in a container

The published image is [`observertc/stats-dashboard`](https://hub.docker.com/r/observertc/stats-dashboard)
on Docker Hub, built for `linux/amd64` and `linux/arm64`:

```bash
docker run --rm -p 3000:3000 --env-file .env.local observertc/stats-dashboard
```

Tags: `latest` follows the default branch; a release tag `vX.Y.Z` publishes
`X.Y.Z`, `X.Y` and (from 1.0 onward) `X`; every build also gets a short-SHA tag,
which is the one to pin in a deployment you want to be able to roll back
precisely.

Or build it yourself:

```bash
docker build -t observertc-stats .
docker run --rm -p 3000:3000 --env-file .env.local observertc-stats
```

Or the whole stack, dashboard plus a MinIO bucket to point it at:

```bash
docker compose up --build     # dashboard :3000, MinIO console :9001
```

**Everything is configured from the environment at runtime**, so one image runs
against any S3-compatible storage — a developer's MinIO, staging and production
differ by environment alone. `.env.example` documents every variable.

| Variable | Purpose |
|---|---|
| `S3_BUCKET` | **Required.** Bucket holding the call folders |
| `S3_ENDPOINT` | Storage endpoint. Omit for AWS S3 |
| `S3_PUBLIC_ENDPOINT` | Endpoint to sign browser-facing URLs against, when it differs |
| `S3_REGION` | Defaults to `us-east-1`; MinIO and R2 ignore it |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Omit to use the SDK's credential chain (an instance role, a mounted profile) |
| `S3_FORCE_PATH_STYLE` | `true` for MinIO and most self-hosted gateways, `false` for AWS and R2 |
| `S3_PRESIGN_TTL` | Presigned URL lifetime in seconds. Default 900 |
| `PORT` / `HOSTNAME` | Default `3000` / `0.0.0.0` |

Three things about this are worth knowing before deploying it.

**Storage config is read on first use, not at module load.** Module scope runs
when the bundle is first imported, which during `next build` can be at *build*
time — baking the build machine's environment into the image is exactly the bug
that makes a container work locally and serve empty lists in production. Every
route handler is also `force-dynamic`: a handler with no dynamic segment can
otherwise be prerendered at build time, freezing an empty room list into the
image.

**`S3_PUBLIC_ENDPOINT` exists because a presigned URL is followed by the
browser.** The server reads storage itself, but it also mints URLs the browser
fetches directly — and a signature is bound to the host it was made for. Inside
a container network storage is `http://minio:9000`; from the user's machine it
is `http://localhost:9000`. Signing against the server's own endpoint hands the
browser a host it cannot resolve. Set this when the two names differ, leave it
unset when they do not.

**`NEXT_PUBLIC_API_BASE_URL` is the one setting that is not runtime-configurable.**
`NEXT_PUBLIC_*` values are inlined into the browser bundle at build time, so
changing it needs a rebuild (`--build-arg`). Its default — empty, meaning the
same origin as the page — is what almost every deployment wants, which is why it
is the default rather than something to configure.

### Health

`GET /api/health` reports the storage configuration (never the credentials) and
what is missing from it. `GET /api/health?deep=1` also lists one key from the
bucket, turning "the settings look right" into "storage actually answered".

The deep check is opt-in because it costs a request: point a **liveness** probe
at the plain endpoint and a **readiness** probe at the deep one. The container's
own `HEALTHCHECK` uses the shallow one — a container should not be restarted
because storage had a bad minute.

This endpoint exists for one specific failure: a misconfigured bucket does not
crash the app, it serves an empty room list that looks exactly like a bucket with
nothing in it. The health endpoint says which it is.

### Image

Multi-stage, Next.js `standalone` output, running as a non-root user. The
standalone bundle traces what the server actually imports rather than shipping
`node_modules` whole — the AWS SDK alone would otherwise dominate the image.
`npm run typecheck && npm test` run inside the build, so a broken build never
becomes an image; both are offline, reading fixtures rather than the network.

`.github/workflows/docker-release.yml` builds and pushes to GHCR for
`linux/amd64` and `linux/arm64` on every push to the default branch and every
`v*` tag. No credentials are passed as build arguments.

---

## Data flow

```
Browser                    Next.js (server)            S3 / MinIO
  │                              │                          │
  ├─ GET /api/:roomId ───────────► ListObjectsV2            │
  │  ◄── [callId, ...] ──────────│◄─────────────────────────│
  │                              │                          │
  ├─ GET /api/:roomId/:callId ───► ListObjectsV2            │
  │  ◄── [clientId, ...] ────────│◄─────────────────────────│
  │                              │                          │
  ├─ GET /api/…/:clientId ───────► returns a presigned URL  │
  │                              │                          │
  └─ GET <presigned>/….jsonl ────────────────────────────────►
       (direct fetch, no server hop — the signature is the
        only credential, so the bucket stays private)
```

---

## Project structure

```
app/
├── layout.tsx                             root layout (theme, breadcrumbs, banner)
├── page.tsx                               home — enter Room ID
├── [roomId]/page.tsx                      call list for a room
├── [roomId]/[callId]/page.tsx             client list for a call
├── [roomId]/[callId]/[clientId]/page.tsx  per-client stats report
└── api/
    ├── [roomId]/route.ts
    ├── [roomId]/[callId]/route.ts
    └── [roomId]/[callId]/[clientId]/route.ts

src/
├── views/        page components (all client components)
├── components/   UI — charts, layout, sections, transport, producer, consumer, sfu, …
├── stores/       Zustand state (call list, call session, panes, theme, timezone)
├── hooks/        React hooks (stats worker, event bus, geo IP)
├── utils/
│   ├── routerServerData.ts  router sample → per-client SFU view (see below)
│   ├── clientTracks.ts      media tracks → their producer / consumer
│   ├── dataChannelJoin.ts   data channels → their dataProducer / dataConsumer
│   ├── callContext.ts       shared loader for client list + summary + routers
│   ├── clientPaneLoader.ts  fetch one client's stats into the pane store
│   ├── unmatchedRtp.ts      client RTP with no matching router object
│   └── …                    stats processing, quality timelines, chart helpers
├── schema/       ClientSample + MediasoupRouter TypeScript types
├── api/          fetch helpers used by the browser (client.ts, types.ts)
└── lib/
    └── s3.ts     S3 client + ListObjectsV2 helpers (server-side only)
```

---

## The SFU view (router → client mapping)

A call stores two independent things:

```
<bucket>/<roomId>/<callId>/<clientId>.jsonl              ClientSample stream (browser side)
<bucket>/<roomId>/<callId>/mediasoup-router-<id>.json    MediasoupRouterSample (SFU side)
```

The router sample is **call-wide**: it lists every transport, producer, consumer,
dataProducer and dataConsumer the router created, with no notion of which browser
they belong to. `src/utils/routerServerData.ts` bridges the gap — given the call's
router samples and one client's processed stats, it works out which router objects
belong to that client and reshapes them into a flat per-client `ClientServerData`.

### Attribution

Three signals, in descending order of confidence. Every returned object records
which one claimed it, in `matchedBy`:

| Signal | Meaning |
|---|---|
| `attachment` | The router object carries an explicit client id in its `attachments` (`clientId`, `participantId`, `peerId`, `userId`). The SFU said so directly. |
| `rtp` | The client's own stats identify the object: the outbound RTP names the `producerId` **or carries an SSRC listed in `producer.ssrcs`**, or the inbound RTP names the `consumerId` **or the `producerId` it is receiving**. |
| `transport` | The object sits on a transport already attributed to this client. Inferred — this is what surfaces producers that never carried a packet. |
| `inferred` | Deduced from the call's shape. See below. |

The SSRC join matters because tagging tracks with producer ids is optional: an
SSRC is unique within a call and appears on both sides regardless, so a call
where the application tags nothing still maps.

**Topology deduction.** A client never consumes its own producers. So a
transport whose consumers all pull from producers this client *is* receiving —
and none that it produces — can only be this client's receive transport. This
runs only when nothing else identified a single consumer, and only when exactly
one transport qualifies; an ambiguous call is left unmapped rather than guessed
at, and the mapping card reports the gap. Objects matched this way are marked
`inferred` and shown with a dashed outline, because a deduction is not a fact.

The **SFU mapping** card at the top of the client report shows the split, so the
sections below it can be read with the right amount of trust. Its *Mapping gaps*
panel lists the asymmetries, which is usually where the bug is:

- router producers/consumers with no matching client RTP (created but never used)
- client producer/consumer ids no router sample contains (missing or wrong router)

### What the client report renders from it

**Producers and consumers replace the flat RTP lists.** The report used to show
an "Outbound RTP" and an "Inbound RTP" section — one entry per SSRC, with no
notion of what each stream was for. With router samples loaded, every stream is
reached instead through the producer or consumer that owns it, on that object's
own lifecycle. The per-SSRC sections remain only as a fallback for calls with no
router sample at all; anything the SFU view cannot account for surfaces under
*Unmatched RTP* rather than disappearing.

| Section | Source |
|---|---|
| Transports | SFU transports (ICE/DTLS/SCTP history, tuple, connectedAt) with the peer connection's quality score, falling back to per-peer-connection sections when nothing maps |
| Producers | Overview timeline + per-producer charts joined to the client's outbound RTP **and its outbound track** |
| Consumers | Overview timeline + per-consumer charts joined to inbound RTP **and its inbound track**, filterable, with compare-to-producer |
| Data Channels | SFU dataProducers / dataConsumers paired with the browser's own channel counters |
| Client Context | Browser and OS, media devices, requested vs applied constraints, negotiated codecs |
| Client Issues | Issues the client reported as raise → resolution intervals on a shared time axis; hover for the payload, the duration and why it cleared |
| Audio Glitch Metrics | Frames that reached the decoder but never made it to the speaker, from the client's extension stats |
| Unmatched RTP | Client RTP streams that map to no router object |
| Media overview | Combined send/receive stream timeline |

### One object, one place

The client and the SFU each describe the same media, and the report used to show
the two descriptions in different sections. They are now joined at the object
they share:

| Client-side data | Joined to | On |
|---|---|---|
| `outboundTracks[]` | its producer | `attachments.producerId` |
| `inboundTracks[]` | its consumer | `attachments.consumerId` |
| `dataChannels[]` | its dataProducer / dataConsumer | `attachments.dataProducerId` / `dataConsumerId`, else a label unique to both sides |

So a producer's section carries its own track id, quality score and the reasons
behind it, next to the RTP charts for the same media. Anything that cannot be
placed — an untagged track, or one whose SFU object is missing — lands in
*Unassociated Tracks* rather than disappearing, and an empty section there is
the healthy outcome.

The client report opens with tabs over the client as a whole:

| Tab | What it holds |
|---|---|
| Overall health | Eight headline cards, then the four detail columns — latency, issues, transmission, CPU — and the session's shape (peer connections, stream counts, ICE pairs) |
| Quality score | `ClientSample.score` over the session, with its `scoreReasons` on hover. The latest value shows on the tab itself |
| SFU mapping | What the router samples resolved to for this client, and where the two sides disagree |
| Transmission | Total send and receive bitrate, and active stream count, over the session |
| CPU usage | Video encode/decode timeline, and the browser's own CPU-limitation series |
| Client attachments | Whatever the application attached to the sample root |

Overall health leads because its cards answer "was this call fine" at a glance;
the score chart sits second, where the *shape* of the score is one click away
and its latest value is already on the tab. These are alternatives rather than a
sequence, which is why they are tabs — stacked as sections they pushed the
interesting ones below the fold. Panels mount on first visit and stay mounted,
so returning to a tab does not re-run its d3 layout.

Then the sections, in reading order: Client Context, Media Overview, Transports,
Producers, Consumers, Data Channels, Unmatched RTP, recordings and tracks, Audio
Glitch Metrics, and finally **Client Issues** immediately above the **Sample
Browser** — the raw material, last.

### The transport timeline

A mediasoup WebRTC transport runs three independent state machines — ICE, DTLS
and SCTP — and the router sample records every transition of each. A single
connected/not-connected bar throws almost all of that away: it cannot show DTLS
still connecting while ICE has completed, or SCTP failing on an otherwise
healthy transport, which is the shape most connection bugs have.

`TransportStateTimeline` gives each machine its own lane on one clock, adds the
client's own view of the path (relayed or direct, from the selected candidate
pair) as a fourth, and marks tuple changes across all of them — the selected
pair moving mid-call is a fact about the whole transport, not about one state
machine. `utils/transportTimeline.ts` builds the model, so the lanes are
testable without rendering.

Three things the model asserts that a naive read of the history does not:

**Which machines a transport even has.** `MediasoupTransportSample` is a union
discriminated on `type`, and the event vocabulary differs per flavour:

| Type | State machines | Tuple events |
|---|---|---|
| `webrtc` | ICE, DTLS, SCTP | `iceselectedtuple-changed` |
| `plain` | SCTP | `tuple-changed`, `rtcptuple-changed` |
| `pipe` | SCTP | — |
| `direct` | none | — |

Lanes come from that table, not from which events happen to be present. Drawing
an empty ICE lane for a pipe transport reads as "ICE never connected" when the
truth is that a pipe transport has no ICE; a direct transport renders no
timeline at all. The flavour is shown as a tag in the header so a missing lane
never reads as a missing measurement. A sample written before `type` existed is
read from its events — the vocabularies do not overlap.

**The state before the first transition.** Every history entry is a change *to*
a state, so a lane built from events alone starts blank and only begins at the
first change. mediasoup starts each machine at `new`, so that opening stretch is
drawn as `new` and flagged `initial`, with the hover saying "starting state — no
transition recorded before this" rather than passing an inference off as an
observation. The payoff is the case that matters most: a WebRTC transport that
never transitioned now shows all three machines stuck at `new` instead of an
empty chart reading "no data".

**The transitions themselves.** A state change *is* the boundary between two
episodes, so nothing is drawn across the lane to mark it — a rule through every
change restated what the colours already said while cutting the episodes into
fragments. Each transition is still emitted with `from`, `to` and how long the
previous state held; that detail moved into the episode's own hover, which is
what a reader points at anyway. Hovering an episode lights up **only that
episode** — full opacity and an outline, nothing dimmed elsewhere — and gives
the state, its span, `connected → completed`, and how long the previous state
held. Point events pin into their own component's row rather than onto a rail
above everything, so a busy connection no longer grows a picket fence over the
episodes the pins were meant to annotate.

`connectedAt` — the universal milestone the observer derives per flavour, since
mediasoup has no single "connected" event — is marked across every lane.

**Where the clock starts.** The earlier of the SFU's `createdAt` and the
browser's `PEER_CONNECTION_OPENED`. Neither end reliably precedes the other — it
depends on the signalling flow — so taking the minimum is what keeps the setup
phase whole instead of clipping whichever end moved first. The call-wide
`fallbackStart` is a last resort only, never folded in alongside them: it would
stretch a transport created 30s in back to the call's opening. An event recorded
before that origin still moves it earlier, because clipping a real event to make
the chart start where we would like it to is worse than starting early.

**Both ends of the same negotiation.** The SFU and the browser are two peers of
one transport, and each only ever reports its own half. The client's events for
this peer connection become lanes of their own beneath the SFU's, on the same
clock:

There is **one connection** being established, and ICE, DTLS and SCTP are
**components** of it rather than separate subjects. That is the organising idea:
**one row per component**, ordered the way a handshake proceeds.

A component can be described by several state machines at once — ICE by the
browser's `iceConnectionState`, its `iceGatheringState` and the SFU's `IceState`
— and they run concurrently, so a single row can only ever show one at a time.
What it shows is the *most recent news* about that component: each episode runs
from one change to the next change of any machine in the component, and names
which machine and which end it came from. That is the honest reading of one row
per component, and it is why the hover carries the machine name rather than
leaving it to the row label. `ICE path` stays a row of its own — it is not a
state machine but which candidate pair was carrying media, derived from stats,
and interleaving it would let a relay switch displace an ICE state that was
still true.

| Component | Reported by the browser | Reported by the SFU |
|---|---|---|
| `Connection` | `RTCPeerConnection.connectionState` | the derived `connectedAt` |
| `Signaling` | `RTCPeerConnection.signalingState` | — |
| `ICE` | `iceConnectionState`, `iceGatheringState`, the selected path | mediasoup `IceState`, tuple changes |
| `DTLS` | — | mediasoup `DtlsState` |
| `SCTP` | data channel open / closed / error | mediasoup `SctpState` |

Each row names the exact attribute it tracks in its hover, so nothing rests on a
label, and the **SFU rows are labelled by mediasoup's enums rather than the W3C
ones** because they are not the same sets:

| Enum | States |
|---|---|
| `RTCIceConnectionState` (browser) | new · checking · connected · completed · disconnected · failed · closed |
| mediasoup `IceState` (SFU) | new · connected · completed · disconnected · closed |
| `RTCSctpTransportState` (W3C) | connecting · connected · closed |
| mediasoup `SctpState` (SFU) | new · connecting · connected · failed · closed |

mediasoup's ICE has no `checking` and no `failed`; its SCTP adds `new` and
`failed` to W3C's three. Promising the W3C vocabulary on an SFU row would
advertise states it can never show, and hide that a browser `checking` has no
SFU counterpart to compare against.

Two more distinctions the naming keeps straight: `complete` is the ICE
*gathering* terminal state while `completed` belongs to the ICE *connection*
state, and signalling is the one machine that starts at `stable` rather than
`new`. The two ends are tagged **SFU** and **browser** — not "client", since
what is contrasted is one `RTCPeerConnection` against the SFU's transport.

**Point events file under the component they concern**, not into an
undifferentiated events bucket: a data channel opening is SCTP evidence, an ICE
path change is ICE, `Negotiation needed` is signalling. Neither end reports SCTP
state from the browser, so data channel events are the *only* browser-side
evidence that the association came up.

**The state a peer connection opened in is often reported rather than inferred.**
`PEER_CONNECTION_OPENED` carries `iceConnectionState`, `iceGatheringState` and
`signalingState`, and when it does the opening stretch is a fact and is not
flagged with the inferred-state asterisk. The spec default is used only when the
event carried nothing.

The SFU's ICE and the browser's ICE stay separate lanes rather than one merged
claim — the gap between them *is* the diagnosis. The browser declaring ICE
`failed` while the SFU still reads `connected`, a renegotiation the SFU never
saw the result of, a DTLS handshake starting long after the client thought it
had a path: none of that is visible in either half alone.

Point events — `PC opened` / `closed`, `Negotiation needed`, `ICE candidate
error`, `ICE restart`, `ICE path changed`, `Slow connection setup` — become
markers. **`ICE_CANDIDATE` is deliberately excluded**: a connection gathers
dozens, and a timeline peppered with them buries the handful of events that
explain anything.

Three rules keep the client lanes honest: a machine the samples never reported
gets no lane at all (a lane of pure spec-default state would claim knowledge the
samples do not carry); an event naming a different `peerConnectionId` is not
this transport's; and a client re-announcing the state it is already in is not a
change. The W3C starting states (`new`, and `stable` for signalling) are marked
`initial` exactly like mediasoup's.

**The same events as a list.** Opening a transport gives a **State changes**
table under the timeline, built from the same model: wall-clock time to the
millisecond, offset from the first event, which end reported it, the component,
`from → to`, and the event's payload as labelled fields. Both
ends interleave in that one list, tagged SFU or client.

Two reading aids there. **The state left behind keeps its own colour**, so one
machine's path can be followed down the column by colour alone — each row's
`from` is the previous row's `to`, and painting both makes that chain visible
instead of leaving every prior state grey. And **each row carries a light wash
of its machine's colour**, by machine rather than by state: the state colours
already carry meaning in the `from → to` column, and washing the row with them
too would say the same thing twice while losing the grouping the eye needs when
four machines interleave. A dot repeats the machine's colour, since an 8% tint is
easy to lose on a bright display.

The payload renders as labelled chips rather than one run-on string, and drops
`peerConnectionId` (identical on every row of one transport) and the state field
(already the `to` column), so what remains is what differs. Several client
payloads carry **a JSON document inside a string** — the ICE path's `to` and
`from`, a simulcast layer snapshot, a track's `settings` — and those are parsed
and flattened one level into `to.kind`, `to.pairId` and so on: an escaped blob
in a table cell is unreadable, and the fields inside it are the whole reason the
event is interesting.

**A checkbox per component** sits above the table, each with its row count, so a
DTLS question is not read through the whole handshake. Hiding `ICE` hides the
SFU's view and the browser's together, since they answer one question. The list
is built from the rows themselves — no checkbox for a component this connection
never exercised — and
the component tracks which channels are *hidden* rather than which are visible,
so a channel appearing later (a client reconnecting and reporting a machine it
had not before) arrives shown instead of silently filtered out. The offset
column keeps measuring from the transport's first event rather than the first
visible row: hiding a channel must not renumber the ones left behind and turn a
four-second gap into zero. The chart is the right way to see *when* things
happened and what overlapped; it is the wrong way to read exact values, because
getting them off it means hovering every notch in turn and remembering what the
last one said. Milliseconds matter here — a DTLS handshake that took 40ms and
one that took 400ms round to the same second. States inferred rather than
recorded are marked with an asterisk and explained in a footnote.

One honesty note on tuple changes: the generated history entry carries only a
type and a timestamp. Some producers inline the new tuple, and the marker shows
it when they do; otherwise the sample's `tuple` is the *latest* value rather
than the value at that moment, and the hover labels it as such.

It degrades in both directions: a transport with only client stats still gets
its Path lane, and one with only a router sample still gets its state lanes.

### Issue lanes on the timelines

Each object's own timeline — inside a producer, a consumer, or a transport
section — carries a lane of the client issues belonging to *that* object.
Hovering a bar gives the issue's detail. The lane is drawn whenever the section
tracks issues at all, empty or not: an object with no issues is worth stating,
and a row that appears only sometimes reads as a missing feature rather than as
good news.

The overview timelines above those sections deliberately do not: they exist to
compare many streams against one clock, and per-row issue lanes both double
their height and put the detail where there is no room to read it. Open the
stream to see its issues.

Client detectors name a **`trackId`**, never an SFU producer or consumer id —
the browser does not know those. So connecting an issue to an object goes
through that object's track ids, collected three ways so a client that tags
nothing still resolves:

| Object | Routes to its track ids |
|---|---|
| Producer | track attachments naming it · outbound RTP naming it · **outbound RTP whose SSRC is in `producer.ssrcs`** |
| Consumer | track attachments naming it · inbound RTP naming it · **inbound RTP naming the producer the consumer consumes** |

A matched RTP stream contributes both its `trackIdentifier` and its stream key,
because `statsProcessor` keys every stream by `trackIdentifier || id || …` — so
the key *is* a track id whenever the browser reported one. The synthesised
`…_ssrc_N` form is not, and is skipped.

The bold routes are the ones that work without any tagging, and they are the
same joins the router mapping uses. Without them a deployment that does not tag
its tracks gets empty lanes everywhere, which is exactly what happened first
time round.

Which *kind* of object an issue may land on is decided by `ClientIssueTypes`:
each type has a category, each category a timeline target. So an ICE issue
carrying a `trackId` is never drawn on a producer, and `congestion` /
`cpulimitation` — which describe the client as a whole — stay off object
timelines entirely. A type the table does not know has no meaningful category,
so for those the payload's own ids decide instead of dropping them.

### The issue lifecycle

client-monitor **4.6.0** put the whole lifecycle on the wire. A stateful issue
now arrives as *two* entries sharing a `key`: the raise, and a companion
`<type>-resolved` whose payload carries `raisedAt` (equal to the raise's
timestamp — the secondary join), the `comment` explaining why it cleared, and
`durationInMs`. **A resolution is the client saying the problem went away.** It
is the end of an episode, never an episode of its own.

`clientIssueEpisodes` pairs them into intervals, and everything that counts,
routes or draws an issue reads the episode rather than the wire entry:

- the **Client Issues** section draws a bar from raise to resolution, with a
  green cap where the client closed it, and a dot for an issue that was reported
  once or never closed — its count is episodes, not entries
- the per-object **issue lanes** (producer, consumer, transport) span the same
  interval, dashed while an episode is still open
- the **Overall health** issue counts skip resolution entries outright

Only the raise payload describes the fault: 4.6.0 flattens into the resolution
only what was explicitly passed to it, never a repeat of the raise, so the two
payloads are shown side by side rather than merged.

Two subtleties worth knowing. Issues still active at `close()` are auto-resolved
into the final sample, so *still open* in a 4.6.0 stream means the capture was
cut short, not that the issue never ended. And an unresolved raise is only
treated as still open when the client sent resolutions for something, somewhere
in the session — a client that never sends them is on an older client-monitor,
or has `sendResolvedIssuesToServer` off, and assuming otherwise would draw a bar
to the end of the session for what was a momentary report.

The `-resolved` rule has exactly one definition, `isResolvedIssueType` in
`schema/ClientIssueTypes.ts`; every lookup normalizes the suffix before reading
the type table, so a resolution is never mistaken for an unknown issue type.

### Copying a subsection's numbers

Every metrics subsection header carries three icons: a screenshot, a permalink
(when the section has an id), and a **CSV copy** that puts that subsection's
whole time series on the clipboard, ready to paste into a spreadsheet.

There are two CSV shapes in the codebase and they are not interchangeable:

| | `metricSeriesExport.ts` (`CopyCsvButton`) | `csvExport.ts` (`CopyMetricsCsvButton`) |
|---|---|---|
| Columns | one per charted metric | every field the browser reported |
| Time | `t`, seconds from the first sample | raw epoch ms plus an ISO column |
| First line | a title line | the column header |
| For | pasting a chart into a message | analysis in a spreadsheet |

`toCsv` exists because three things silently ruin this conversion:

- **A field that appears late.** Browsers begin reporting some fields only once
  they have a value — `framesDecoded` before the first frame arrives,
  `qualityLimitationReason` before the encoder is under pressure. The header is
  the **union of every key in every row**, never the first row's keys, or the
  copy looks complete while missing columns.
- **Quoting.** Candidate URLs and `sdpFmtpLine` carry commas and quotes; RFC
  4180 rules are applied to every value.
- **Formula injection.** Text beginning `=`, `+` or `@` is executed by Excel and
  Sheets on paste, so non-numeric text is defused with a leading apostrophe.
  Numbers are left alone — a leading `-` is a negative reading far more often
  than an attack, and blanket-escaping would mangle every one of them.

Rows are gathered on click, not on render: a series runs to thousands of rows
and most subsections are never exported. A producer's simulcast layers each copy
separately, which is what makes comparing rids in a spreadsheet possible instead
of handing over one interleaved blob.

### Router detail on the call page

The dashboard answers "how was the call"; a collapsible section per router
answers "what was this router actually doing". Opening one gives the router's
own record: its ids and lifetime, what it held, a lane per producer, consumer,
data producer and data consumer, and the full ICE / DTLS / SCTP timeline for
each of its transports — the same component lanes the per-client report draws,
minus the browser's half, since from the router's side there is no peer
connection to read against.

Every entity here is a *simple* state machine — one state at a time, changed by
named events — unlike a transport, which runs three concurrently. So each entity
is one lane and its episodes are contiguous, built from `createdAt`, `closedAt`
and its `history`:

| Kind | States |
|---|---|
| Producer | active · paused · degraded |
| Consumer | active · paused · **producer paused** · degraded · stopped |
| Data producer / consumer | one lifetime bar — they carry no history, and that is the whole truth about them |

**A consumer has two ways to fall silent and they mean different things**: it was
paused locally, or the producer it consumes was paused. Keeping `paused` and
`producer paused` apart is the point of the lane — a room full of `producer
paused` at one instant is a publisher problem, not four subscriber problems.
`degraded` is a colour rather than a stop, because a degraded producer is still
producing.

These sections are deliberately **unattributed**. The per-client report maps
these objects to the participants that owned them; here they are the SFU's own
account, which is the view you want when the question is about the router rather
than about a person. The adapter that feeds a router transport into the shared
timeline sets `matchedBy: 'inferred'` rather than implying a match that was
never made.

### The call page's samples browser

The call dashboard renders the *merged, normalized* view: every per-SFU summary
folded into one, every router sample indexed by what it holds. That is the right
default and it is also lossy — a field the merge dropped, a summary that failed
to parse, an attachment nothing reads yet. So a collapsible **Samples Browser**
sits at the bottom of the page listing the call folder as written, by filename,
with each file's JSON one click away. It answers the other question: not "what
was this call", but "what did *this file* actually say".

Any number of files can be open at once — comparing two summaries or two
routers means reading them side by side, and a browser that closed one file to
open the next would make that impossible. **Open all** / **Close all** handle
the whole folder.

It mirrors the participant page's Sample Browser with one difference that
drives the design: a client's samples are one `.jsonl` already in memory, while
these are separate objects in storage. A call across several SFUs can hold a
dozen router samples and most visits open none of them, so files are fetched on
first click and kept afterwards — reopening is instant, and the bytes are
already paid for. Each file gets its own `AbortController`, so closing one never
cancels another's in-flight read.

Filenames come from the call-folder listing (`objectNames`), never rebuilt from
router and SFU ids — only the listing knows whether the folder holds a bare
`call-summary.json`, a per-SFU set, or both.

`GET /api/:roomId/:callId/object/:name` serves them. The name arrives from a
URL, so the route validates it as a **security boundary**: no path separators or
`..`, and the basename must be a call summary or a router sample. Client
`.jsonl` streams are excluded deliberately — they are large and already served
through their own presigned URL.

### Tab visibility

client-monitor **4.7.0** reports `TAB_VISIBILITY_CHANGED` with a payload of
`{ visible: boolean }`. The flag is the state the tab moved **to**, not the
state it was in, so a backgrounded stretch runs from a `visible: false` event to
the next `visible: true` — read the other way round, every span inverts.

This matters more than a browser event usually would. **A backgrounded tab is
throttled**: timers slow, `requestAnimationFrame` stops, capture frame rate
collapses, the encoder is starved, and stats collection itself misses its
schedule. A great many alarming readings — a bitrate cliff, frozen video, a CPU
spike on return — are the tab being in the background.

`utils/tabVisibility.ts` turns the toggles into intervals, and
`visibilitySegments` fills the gaps between them so a lane can say what the tab
was doing at *every* moment rather than only when it was hidden. It is drawn in
two places, and nowhere else:

- **The producer, consumer and transport timelines** each get a `Tab` lane under
  their own rows, pastel light blue while the tab was in the foreground and grey
  while it was not. It sits last because it qualifies the lanes above it rather
  than reporting on the object — a stall above a grey stretch usually needs no
  further explanation, and one above a blue stretch does.
- **Client Context** gets a `Tab focus` strip of its own, green and grey, with
  the total and the switch count above it. There the state is the subject, not
  the context: it answers whether the person was actually looking at the call,
  which is a fact about the client, like the browser it ran on.

Two inferences, both stated rather than hidden:

- **The state before the first event** is the opposite of what that event
  reports, so a session whose first event is `visible: true` opened with the tab
  already backgrounded, and the span is drawn from the session start.
- **A span the client never closed** is drawn to the session end and marked
  `openEnded` — "still hidden when the capture stopped" is not the same claim as
  "came back at this moment".

Nothing is inferred from stats. A client that does not send the event gets
`reported: false`, no lane at all — not an all-active one — and the
**Backgrounded** card is absent
rather than reading 0% — an absent card says "this client does not report it",
where 0% would say "the tab was never backgrounded".

The spans reach the timelines through a React context provided by `ClientPage`,
deliberately not a store: the compare modal renders from the app layout, outside
any client's subtree, so a chart pinned from a *different* client falls back to
no lane instead of showing the current client's tab state. A wrong lane is worse
than none — it would explain away a real fault on someone else's timeline.

### The Overall health tab

A row of headline cards — avg RTT, avg and peak CPU, avg sending and receiving
bitrate, packet loss, issue count, duration — over four columns of detail. The
cards are the glance; the columns are the follow-up, grouped rather than flat
because the reading is comparative and a p95 latency means little until the
median sits next to it. `utils/sessionSummary.ts` computes all of it, so the
numbers are testable without rendering anything.

Duration is measured from the client's own samples — how long it was reporting,
which is not necessarily how long the SFU believed it was present.

| Column | Rows |
|---|---|
| Latency | median, average, p75, p95 round-trip time |
| Issues | audio, video, network, other |
| Transmission | bytes sent, bytes received, packets lost (with loss rate), avg inbound and outbound bitrate |
| CPU | median, max, p75, p95 video CPU, and CPU-limited share |

**Issue categories match observer-js.** The matchers are lifted from its
`IssueConclusion` family table, so the dashboard and the observer agree on what
an audio issue is. Its five families collapse into four: congestion and
connectivity are both *network*, and endpoint capacity joins anything
unrecognised in *other* — client detectors are extensible and applications add
their own types, so `other` is a real bucket. A `-resolved` entry is the closing
half of an issue already counted, so it is skipped rather than double-counted.

**On "overall CPU".** WebRTC exposes encode and decode timers for video only —
there is no audio CPU metric and no process-wide figure anywhere in the sample
schema. The first four CPU rows are therefore video encode + decode summed per
instant. The fifth, *CPU-limited*, is the share of send time the browser itself
attributed to `qualityLimitationReason: 'cpu'` — its own verdict on whether the
machine was the bottleneck, which does cover the whole endpoint. That is the
closest honest reading of overall CPU the data allows.

### Score reasons by sample

client-monitor **4.7.0** stopped shipping the aggregated reasons on the client
entry. Before it, one inbound track pixelating produced `pixelated-video` twice
in a single sample — once on the track that was pixelating and again on the
client — which read as though the client itself were degrading. Worse, the
client score is a *smoothed weighted aggregate*, not `5 − sum(reasons)`, so a
recovered client score of ~5 could sit beside an inherited `high-packetloss` and
look like a stale reason when it was really a scope error.

Now every entity ships only what it is responsible for, and the client subtracts
nothing of its own — so `ClientSample.scoreReasons` is empty by design and **the
client-level view has to be rebuilt** by re-aggregating the components of the
same sample. `utils/sampleScoreReasons.ts` does that, grouping by exact
timestamp (every score in one sample is stamped with that sample's time, so no
tolerance window is needed). Once you are re-aggregating anyway, keeping the
attribution is free — so a reason is never pooled, always shown next to the peer
connection or track that raised it.

Two views share one selection:

- **Hovering the score chart** lists that sample's reasons grouped by the
  component that raised them, with the points each cost.
- **Score reasons by sample**, below the chart, lists **every** sample with the
  components that raised a reason, each one's own score, the reason's meaning
  and its points. Clicking a point on the chart parks the browser on that
  sample; picking a row moves the chart's marker.

Every sample is listed, quiet ones included, because the list is driven by
clicking the chart: drop the quiet samples and the correspondence breaks, so a
click on a clean stretch would land on some *other* moment's reasons while the
marker said otherwise. A row saying "no reasons" is also an answer — it is how
you confirm a dip in the client score had nothing underneath it. Quiet rows are
dimmed, and an opt-in **only with reasons** checkbox narrows a long clean
session for reading (with it on, a chart click can only reach the nearest listed
sample, which is why it is off by default).

**Each reason links to the section that raised it.** A peer connection links to
its transport, a track to the consumer that renders it or the producer that
sends it — a track has no section of its own. The dashboard's collapsible
sections open and scroll on a matching hash, so the link is the id itself, and
it saves hunting that id through three collapsed sections. A track that was
never matched to a consumer or producer stays unlinked rather than pointing
somewhere wrong.

The browser repeats the caveat that made the old duplication dangerous: a
recovered client score beside a live reason is a component still degraded, not a
stale entry.

`scoreReasons` on the client entry is still read rather than assumed empty: if a
client-level penalty is ever added it lands there like any other component's and
appears without a code change.

### Why this score

Under the Quality score tab, a collapsible **Why this score** box accounts for
the number: how much of the session sat below the good band, how many penalty
reasons were recorded, which one dominated and what it means, and where the
trouble was concentrated (network path / audio / video received / video sent).

The reference table in `schema/ScoreReasons.ts` is transcribed from
`DefaultScoreCalculator`'s own documentation — every reason key, the entities
that raise it, what it proves, where to look next, and the maximum it can
subtract from that entity's 5.0.

Schema 3.6.0 put the magnitudes on the wire, and the box uses them: reasons are
ranked by the points they actually subtracted, the table shows total, average
and peak cost per reason, and the group bar is weighted by cost rather than by
count. The narrative separates the client's own score line — the arithmetic
behind the average being explained — from the per-PC and per-track lines, which
are scores of their own.

**Samples written before 3.6.0 carry reason keys without magnitudes**, and
nothing here invents a number for them. In that case `measured` is false, the
points columns disappear, and reasons are ranked by how often they fired, with
ties broken by how much each is *capable* of subtracting — so a rare
`frozen-video` (up to −2.0) outranks an equally rare `high-volatile-bitrate`
(−1.0). A window that mixes vintages counts every occurrence, sums points only
from the ticks that reported them, and states the shortfall in the narrative.

A key the table does not know is still counted and shown, labelled by its key
rather than given an invented description — custom and newer calculators define
their own.

### Scores and their reasons

observer-js computes a 1–5 score for the client, each peer connection and each
track, and writes `scoreReasons` beside it. The score says something went wrong;
the reasons say what — so they are never shown apart. Hovering a point on any
score chart (session, transport, or track) lists the reasons recorded for that
sample, and the latest score appears as a badge on the transport, producer and
consumer headers.

From schema 3.6.0 each reason arrives with the points it subtracted, so those
hovers read `frozen-video −1.5` rather than the bare key, and **Why this score**
ranks reasons by what they actually cost. Older samples name the reason without
a magnitude; those render bare and the ranking falls back to how often each
fired. Nothing invents a number for them — a reason with no magnitude on the
wire shows `—`, never `−0.0`.

### Schema versions in one bucket

`src/schema/ClientSample.ts` tracks the generated schema in observer-js (now
3.6.0), but the dashboard reads `.jsonl` files written by every producer version
that ever ran. Two fields changed shape, and the local copy is deliberately
widened to accept every vintage, with `clientSampleParse.ts` normalizing on
read:

| Field | ≤ 3.2 | 3.3 – 3.5 | ≥ 3.6 |
|---|---|---|---|
| `scoreReasons` | a single string | `string[]` of reason keys | `Record<reasonKey, pointsSubtracted>` |
| `payload` (events, issues, meta, extension stats) | a JSON string | an object | an object |

`toReasonList` collapses all three to a key list — ordered by points descending
where the wire had them — and `toReasonMap` returns the magnitudes, or
`undefined` when the sample never carried any. That `undefined` is load-bearing:
`ScoreSample.penalties` is absent rather than zeroed for pre-3.6 samples, so a
window that mixes vintages counts every occurrence but sums points only from the
ticks that reported them, and the explanation box says how many did not.

3.6.0 also narrowed `payload` values to `boolean | string | number`; the local
copy keeps `unknown`, because stored samples carry nested objects in payloads.

Two fields the generated schema has since dropped are also kept, because stored
samples still carry them: `OutboundRtpStats.trackIdentifier` and
`PeerConnectionSample.extensionStats`. Preserve all of the above when
re-syncing the schema from observer-js — the file's header comment says so too.

Every stream section shares one time domain — widened to the call bounds from
`call-summary.json` when it has them — so a mute on one producer can be read
against what every other stream was doing at that instant.

### Consumer ↔ producer compare

A consumer's `producerId` points at a producer owned by a *different* client. The
SFU does not always tag producers with an owner, so `callStore.producerOwners`
accumulates `producerId → clientId` as clients are opened, and the compare action
falls back to walking the other clients in the call until one of them claims the
producer. Each client checked is cached, so the walk gets shorter over a session.

### Tests

```bash
npm test                        # every suite, no network needed
npm run test:router-mapping     # synthetic fixtures: attribution, ranking, deduction
npm run test:fixture            # a real captured call in scripts/fixtures/
npm run test:joins              # track and data-channel joins, score reasons
npm run test:issue-lanes        # which issue lands on which producer / consumer / transport
npm run test:transport-timeline # ICE / DTLS / SCTP lanes from router + client history
npm run test:score-explanation  # the "Why this score" account, both wire vintages
npm run test:call-summary       # merging per-SFU call summaries into one
npm run test:tab-visibility     # backgrounded stretches from the visibility event
npm run test:csv                # the subsection CSV: column union, quoting, injection
npm run test:sample-reasons     # re-aggregating score reasons from their components
npm run test:router-entities    # producer / consumer lanes from a router sample
npm run test:call-dashboard     # the call page's model: loaded clients, facts, quality chart
npm run test:worker-requests    # reply correlation for the shared stats worker
npm run test:ice-candidate-story# what happened to one ICE candidate, over time
npm run test:storage-config     # the deployment's storage settings, and what counts as broken
```

`scripts/fixtures/` holds an unmodified `call-summary.json` and
`mediasoup-router-<id>.json` from a two-client call whose router tags nothing
with a client id — the case where every mapping has to be earned.

---

## Scripts

```bash
npm run dev                 # start dev server → http://localhost:3000
npm run build               # production build
npm run start               # start production server
npm run typecheck           # TypeScript type check without emitting
npm run test:router-mapping # self-test for the router → client mapper
```

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

```
Copyright 2026 ObserveRTC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

The published container image carries the same licence in its OCI metadata
(`org.opencontainers.image.licenses`) and ships `LICENSE` and `NOTICE` at
`/app`, so a copy travels with any redistribution of the image.
