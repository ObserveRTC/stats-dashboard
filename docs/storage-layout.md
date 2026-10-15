# Storage layout

What this dashboard reads out of the bucket, and the shape it expects to find.

It reads two roots and writes nothing:

```
<tenant>/<samples>/<roomId>/<callId>/<clientId>.jsonl
<tenant>/<samples>/<roomId>/<callId>/call-summary.json
<tenant>/<samples>/<roomId>/<callId>/call-summary-<sfuId>.json
<tenant>/<digests>/<YYYY-MM>/<YYYY-MM-DD>.json
<tenant>/<digests>/<YYYY-MM>.json
```

| Root | Setting | Default |
|---|---|---|
| `<tenant>` | `S3_PREFIX` | blank — the bucket root |
| `<samples>` | `S3_SAMPLES_PREFIX` | `samples/` |
| `<digests>` | `S3_DIGEST_PREFIX` | `digests/` |

Whatever else the bucket holds — a work queue, staging, archives, another
tenant — the dashboard neither reads nor needs to know about. It has settings
for exactly these two roots and nothing else, which is also the whole surface
anything writing into this bucket has to match.

Two roots rather than one because they have different lifetimes: samples are
deleted by a retention sweep while digests are kept and belong in a cheaper
storage class. With one prefix both of those become path-matching exercises, and
a lifecycle rule meant for samples reaches into the digests. Pointing both at
the same place is a misconfiguration and `GET /api/health` warns about it;
that endpoint also echoes both resolved roots, which is the quickest way to tell
"reading the wrong folder" from "nothing has been written".

A bucket filled before the split has its calls directly under the tenant: set
`S3_SAMPLES_PREFIX=` (empty) and nothing has to move.

Every date below is **UTC**, and a call belongs to the period it **started** in.
A call running 23:50 → 00:30 is wholly the earlier day's.

---

## samples — the truth

See `src/schema/ClientSample.ts` and `src/schema/CallSummary.ts`. One `.jsonl`
per client, patch-encoded, plus one `call-summary.json` per SFU that saw the
call. Only the call page reads this root.

It is keyed by room, which is the right shape for opening a call you already
know about and the wrong shape for anything that starts with a date — answering
"what happened on the 3rd" from it means scanning the bucket. Hence the digests.

## digests — periods already added up

```
<tenant>/<digests>/2026-10/2026-10-03.json   one day
<tenant>/<digests>/2026-10.json              one month
```

**The dashboard reads these and does not produce them.** Whatever writes them is
outside this repository and free to change; the only coupling is the key layout
above and the document shape below. One GET answers "what happened today"
however busy the day was, and nothing on the page scales with the number of
calls.

The month's roll-up sits *beside* the month folder rather than inside it, so
listing `2026-10/` contains days and nothing else — a reader iterating a month
never has to recognise and skip a differently-shaped object among them. The day
is spelled in full inside the folder (`2026-10/2026-10-03.json`, not
`2026-10/03.json`) so a key is unambiguous in a log line or a bucket browser.

Nothing has to exist. A period with no digest reports exactly that and the page
says so; the dashboard will not go and count calls instead.

### The document

```json
{
  "version": 1,
  "period": "day",
  "id": "2026-10-03",
  "generatedAt": 1790000000000,
  "totals": {
    "calls": 2,
    "joins": 5,
    "busiestCall": 3,
    "issues": 1,
    "turnClients": 0,
    "callTimeMs": 600000,
    "score": 4.2,
    "scoreWeight": 80
  },
  "buckets": [0, 0, 0, "…24 entries, UTC hours…"],
  "calls": [
    {
      "callId": "3f2a8c91-…",
      "roomId": "chess",
      "startedAt": 1790000000000,
      "durationMs": 600000,
      "clients": 2,
      "peak": 2,
      "issues": 1,
      "turnClients": 0,
      "score": 4.2,
      "scoreSamples": 80,
      "sfuIds": ["s1"]
    }
  ],
  "worst": []
}
```

Read by `normalizeDigest` in `src/schema/Digest.ts`, which is the authority —
`scripts/digestSchema.test.ts` is its executable form.

| Field | Meaning |
|---|---|
| `version` | `1`. A document of another version is refused outright, not read field by field |
| `period` | `"day"` or `"month"` |
| `id` | `YYYY-MM-DD` for a day, `YYYY-MM` for a month. Must match the key it is filed under |
| `generatedAt` | When it was computed, epoch ms. Shown on the page, because nothing here is live |
| `buckets` | Calls per bucket — 24 UTC hours for a day, one per day of the month for a month. Padded and truncated to the period's length on read |
| `calls` | A day's rows. **Omitted on a month** — a month's worth of rows is unbounded and nobody reads a thousand of them |
| `worst` | The lowest-scoring calls of the period, worst first. The "look here first" list |

A row's `roomId` is what the dashboard builds the call's URL from, so a row
without one is listed but not clickable. `callId` is the row's identity.

### The rules the figures have to follow

These are not validated on read — they cannot be — so they are the part worth
getting right in whatever writes them. Each one is a way to produce a plausible
number nobody can tell is wrong.

- **Counts add.** `calls`, `joins`, `issues`, `turnClients`, `callTimeMs`.
  `callTimeMs` is every call's duration summed — not wall-clock time, since
  calls overlap.
- **Peaks do not add.** Two calls that each peaked at four participants were not
  eight people at once unless they overlapped, and nothing records whether they
  did. `totals.busiestCall` is therefore the largest *single call's* peak, and a
  month takes the **maximum** of its days. `null` means nobody counted, which is
  not zero — the page prints no figure rather than a zero.
- **`score` is weighted, not averaged.** By `scoreSamples` across calls, and by
  `scoreWeight` across days: `Σ(score × weight) / Σ(weight)`. `scoreWeight` is
  in the document precisely so a month can be rolled from its days without
  re-reading a call, which is what the dashboard does when a month's roll-up is
  missing (see below). An un-weighted mean of daily means cannot be corrected
  back into this.
- **An unscored call or day is excluded, never zero.** Zero would drag a good
  period down for the sin of containing something nothing could score. `score:
  null` with `scoreWeight: 0` is how that is said.
- **Nothing presentational.** No labels, no colours, no formatted strings, no
  tooltip copy. Storage is append-only in practice, so a label written in
  October is still there next year and changing a word would mean rewriting
  every digest ever made. `digestView` in `src/utils/digestModel.ts` builds all
  of that at render time.

A row's `peak` is per call rather than only per period because a maximum cannot
be recomputed from a maximum once one of the rows behind it changes — which
matters to anything that updates a day incrementally.

---

## How the dashboard reads a period

`GET /api/digest?day=YYYY-MM-DD` or `?month=YYYY-MM`, defaulting to today. It
returns `doc` — null when nothing has been written — and `source`.

| `source` | How | Cost |
|---|---|---|
| `stored` | the object in the bucket | 1 GET |
| `rolled` | a month folded from its day objects | ≤31 GETs |
| `null` | nothing written for the period | 1 GET |

`rolled` is the one place the dashboard still adds anything up, and it only ever
reads digests: a month's roll-up is written after its days, so there is a window
— longer after a backfill — where the days exist and the month does not, and
folding them keeps the month view alive through it. `rollUpMonth` in
`src/utils/digestModel.ts` is the same arithmetic described above.

There is no path that counts calls. An earlier design had one, for a period
nothing had digested yet, and it was a mistake twice over: two implementations
of every figure with no way to keep them agreeing, and it made the page that
reports a slow system the slowest page to load.
