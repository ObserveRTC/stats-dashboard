/* eslint-disable */
/**
 * GENERATED FILE — do not edit.
 *
 * Source: digest-schema/registry/*.json
 * Regenerate: npm run schema:generate
 *
 * Safe in the browser: this is metadata, not validation code. The UI needs a
 * metric's unit to format it, its numerator and denominator to explain it, and
 * a histogram's bounds to read a bucket — none of which it may invent.
 */

export const METRIC_REGISTRY = {
  "registryVersion": "metrics-v1",
  "histogramRegistry": "histograms-v1",
  "description": "The initial metric registry. A metric's identity is its id, and its subject, direction, media and units are fixed here — the same id under a different subject never implies the same exposure, so aggregation combines identical ids at the same scope and nothing else.\n\nEvery duration in a stream- or transport-scoped metric is stream-time or transport-time. It is NOT participant-time and must be labelled accordingly: four streams measured for a minute are four stream-minutes and one participant-minute. Mixing them is how a dashboard reports more impaired time than the call lasted.\n\nCounters are differenced once, at stream or transport scope, before any aggregation. Differencing after aggregating sums unrelated counter runs; differencing twice turns a delta into noise.\n\n`min` and `max` retain the extrema of valid *interval values*, never of cumulative counters — the maximum of a monotonically increasing counter is just its last reading.",
  "conflictsWithContractProse": [
    {
      "about": "aggregation of jitterBufferDelay, decodeTime and encodeTime",
      "contractSays": "The prose states 'All delay and FPS metrics use duration-weighted-mean', but the per-metric rows for audio.inbound.jitterBufferDelay, video.inbound.decodeTime and video.outbound.encodeTime each specify a per-count denominator (emitted samples, decoded frames, encoded frames) and the jitterBufferDelay row says 'Ratio of sums' explicitly.",
      "resolvedAs": "ratio-of-sums, following the per-metric rows.",
      "why": "These three are cost-per-unit-of-work, not a level held over time. Weighting them by duration would divide a per-frame cost by milliseconds and produce a number with no meaning. The per-metric rows are specific and self-consistent; the blanket sentence is a generalisation that does not hold for them.",
      "status": "needs an explicit contract amendment — the prose and the table disagree and both implementations must not resolve it independently."
    }
  ],
  "metrics": [
    {
      "metricId": "audio.inbound.loss",
      "label": "Inbound audio packet loss",
      "subject": "stream",
      "media": "audio",
      "direction": "inbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of lost-packet deltas over valid intervals",
      "denominator": "sum of (lost + received) packet deltas over valid intervals",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "An all-loss interval is permitted and is real evidence, not a divide-by-zero to discard. A zero denominator — no packets expected at all — yields an unavailable value, never a zero loss rate."
    },
    {
      "metricId": "video.inbound.loss",
      "label": "Inbound video packet loss",
      "subject": "stream",
      "media": "video",
      "direction": "inbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of lost-packet deltas over valid intervals",
      "denominator": "sum of (lost + received) packet deltas over valid intervals",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "See audio.inbound.loss."
    },
    {
      "metricId": "audio.outbound.remoteLoss",
      "label": "Outbound audio loss reported by the receiver",
      "subject": "stream",
      "media": "audio",
      "direction": "outbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of receiver-reported lost-packet deltas from fresh remote reports",
      "denominator": "sum of receiver-reported expected-packet deltas from the same reports",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "Only fresh remote reports with supported counter evidence. The denominator must come from the receiver's own report — manufacturing it from the sender's packetsSent would divide one endpoint's count by another's and silently misreport loss whenever the two disagree. A remote report whose timestamp has not advanced is stale and contributes nothing; it is never carried into later intervals."
    },
    {
      "metricId": "video.outbound.remoteLoss",
      "label": "Outbound video loss reported by the receiver",
      "subject": "stream",
      "media": "video",
      "direction": "outbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of receiver-reported lost-packet deltas from fresh remote reports",
      "denominator": "sum of receiver-reported expected-packet deltas from the same reports",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "See audio.outbound.remoteLoss."
    },
    {
      "metricId": "audio.inbound.jitter",
      "label": "Inbound audio jitter",
      "subject": "stream",
      "media": "audio",
      "direction": "inbound",
      "unit": "ms",
      "aggregation": "duration-weighted-mean",
      "numerator": "sum of (jitter ms x supported interval duration ms)",
      "denominator": "sum of supported interval duration ms",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time",
      "notes": "A level held over an interval, so weighted by how long it was held. Fresh observations only."
    },
    {
      "metricId": "video.inbound.jitter",
      "label": "Inbound video jitter",
      "subject": "stream",
      "media": "video",
      "direction": "inbound",
      "unit": "ms",
      "aggregation": "duration-weighted-mean",
      "numerator": "sum of (jitter ms x supported interval duration ms)",
      "denominator": "sum of supported interval duration ms",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time"
    },
    {
      "metricId": "transport.iceRtt",
      "label": "ICE round-trip time on the selected path",
      "subject": "transport",
      "media": null,
      "direction": null,
      "unit": "ms",
      "aggregation": "duration-weighted-mean",
      "numerator": "sum of (ICE RTT ms x supported interval duration ms)",
      "denominator": "sum of supported interval duration ms",
      "histogram": "delay-ms-v1",
      "timeBasis": "transport-time",
      "notes": "Selected candidate pair only. Non-selected pairs are measured against paths no media took. Never pooled with RTCP RTT: they measure different paths by different mechanisms, and a chart that mixes them cannot be read."
    },
    {
      "metricId": "audio.outbound.rtcpRtt",
      "label": "Audio RTCP round-trip time",
      "subject": "stream",
      "media": "audio",
      "direction": "outbound",
      "unit": "ms",
      "aggregation": "duration-weighted-mean",
      "numerator": "sum of (RTCP RTT ms x supported interval duration ms)",
      "denominator": "sum of supported interval duration ms",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time",
      "notes": "Fresh RTCP evidence only. Kept separate from transport.iceRtt by design — see that metric's note."
    },
    {
      "metricId": "video.outbound.rtcpRtt",
      "label": "Video RTCP round-trip time",
      "subject": "stream",
      "media": "video",
      "direction": "outbound",
      "unit": "ms",
      "aggregation": "duration-weighted-mean",
      "numerator": "sum of (RTCP RTT ms x supported interval duration ms)",
      "denominator": "sum of supported interval duration ms",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time"
    },
    {
      "metricId": "audio.inbound.bitrate",
      "label": "Inbound audio bitrate",
      "subject": "stream",
      "media": "audio",
      "direction": "inbound",
      "unit": "bps",
      "aggregation": "ratio-of-sums",
      "numerator": "8000 x sum of RTP byte deltas",
      "denominator": "sum of interval duration ms",
      "histogram": "bitrate-bps-v1",
      "timeBasis": "stream-time",
      "notes": "Per stream or encoding. A rollup is the mean over stream-time and is NOT total call bandwidth: summing per-stream bitrates counts the same media once per subscriber, and simulcast encodings are alternatives rather than layers to add."
    },
    {
      "metricId": "video.inbound.bitrate",
      "label": "Inbound video bitrate",
      "subject": "stream",
      "media": "video",
      "direction": "inbound",
      "unit": "bps",
      "aggregation": "ratio-of-sums",
      "numerator": "8000 x sum of RTP byte deltas",
      "denominator": "sum of interval duration ms",
      "histogram": "bitrate-bps-v1",
      "timeBasis": "stream-time",
      "notes": "See audio.inbound.bitrate."
    },
    {
      "metricId": "audio.outbound.bitrate",
      "label": "Outbound audio bitrate",
      "subject": "stream",
      "media": "audio",
      "direction": "outbound",
      "unit": "bps",
      "aggregation": "ratio-of-sums",
      "numerator": "8000 x sum of RTP byte deltas",
      "denominator": "sum of interval duration ms",
      "histogram": "bitrate-bps-v1",
      "timeBasis": "stream-time"
    },
    {
      "metricId": "video.outbound.bitrate",
      "label": "Outbound video bitrate",
      "subject": "stream",
      "media": "video",
      "direction": "outbound",
      "unit": "bps",
      "aggregation": "ratio-of-sums",
      "numerator": "8000 x sum of RTP byte deltas",
      "denominator": "sum of interval duration ms",
      "histogram": "bitrate-bps-v1",
      "timeBasis": "stream-time"
    },
    {
      "metricId": "audio.inbound.speechConcealment",
      "label": "Inbound audio speech concealment",
      "subject": "stream",
      "media": "audio",
      "direction": "inbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of max(0, concealedSamples delta - silentConcealedSamples delta)",
      "denominator": "sum of receivedSamples deltas",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "Both counters must exist. A missing silentConcealedSamples is NOT assumed zero — silence concealment is not audible damage, and treating its absence as zero inflates concealment on every platform that does not report it. Without it the metric is unavailable. The max(0, ...) guards a reported silent delta exceeding the concealed delta rather than producing negative damage."
    },
    {
      "metricId": "audio.inbound.jitterBufferDelay",
      "label": "Inbound audio jitter buffer delay per emitted sample",
      "subject": "stream",
      "media": "audio",
      "direction": "inbound",
      "unit": "ms",
      "aggregation": "ratio-of-sums",
      "numerator": "1000 x sum of jitterBufferDelay deltas in seconds",
      "denominator": "sum of jitterBufferEmittedCount deltas",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time",
      "notes": "Cost per emitted sample, not a level held over time — see conflictsWithContractProse. Dividing by duration instead of by emitted count would yield a quantity with no interpretation."
    },
    {
      "metricId": "video.inbound.freezeShare",
      "label": "Inbound video freeze share",
      "subject": "stream",
      "media": "video",
      "direction": "inbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of freezeDuration deltas in ms",
      "denominator": "sum of eligible measured video stream ms",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "The browser's own freeze definition, not a reconstruction from event timing. This is stream-time freeze: a nonzero delta says there was freeze inside the sampling interval, NOT that the interval was impaired throughout, and it does not establish exact freeze boundaries. Converting it into participant impairment duration requires temporal evidence the policy does not have by default."
    },
    {
      "metricId": "video.inbound.decodeTime",
      "label": "Decode cost per frame",
      "subject": "stream",
      "media": "video",
      "direction": "inbound",
      "unit": "ms",
      "aggregation": "ratio-of-sums",
      "numerator": "1000 x sum of totalDecodeTime deltas in seconds",
      "denominator": "sum of framesDecoded deltas",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time",
      "notes": "Cost per decoded frame — see conflictsWithContractProse. Decoder cost, not host CPU utilisation."
    },
    {
      "metricId": "video.outbound.encodeTime",
      "label": "Encode cost per frame",
      "subject": "stream",
      "media": "video",
      "direction": "outbound",
      "unit": "ms",
      "aggregation": "ratio-of-sums",
      "numerator": "1000 x sum of totalEncodeTime deltas in seconds",
      "denominator": "sum of framesEncoded deltas",
      "histogram": "delay-ms-v1",
      "timeBasis": "stream-time",
      "notes": "Cost per encoded frame — see conflictsWithContractProse. Encoder cost, not host CPU utilisation."
    },
    {
      "metricId": "video.outbound.cpuLimitedShare",
      "label": "Share of limited time attributed to CPU",
      "subject": "stream",
      "media": "video",
      "direction": "outbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of CPU qualityLimitationDuration deltas in ms",
      "denominator": "sum of all qualityLimitationDuration deltas in ms",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "The denominator is limited time, not stream time: this answers 'when the encoder was limited, how often was CPU the reason', not 'what fraction of the call was CPU-bound'. Measured encoder limitation as the browser reports it — never host CPU usage, which these digests cannot see."
    },
    {
      "metricId": "video.outbound.bandwidthLimitedShare",
      "label": "Share of limited time attributed to bandwidth",
      "subject": "stream",
      "media": "video",
      "direction": "outbound",
      "unit": "ratio",
      "aggregation": "ratio-of-sums",
      "numerator": "sum of bandwidth qualityLimitationDuration deltas in ms",
      "denominator": "sum of all qualityLimitationDuration deltas in ms",
      "histogram": "ratio-v1",
      "timeBasis": "stream-time",
      "notes": "See video.outbound.cpuLimitedShare."
    },
    {
      "metricId": "video.inbound.fps",
      "label": "Inbound video frames per second",
      "subject": "stream",
      "media": "video",
      "direction": "inbound",
      "unit": "fps",
      "aggregation": "duration-weighted-mean",
      "numerator": "sum of (FPS x supported interval duration ms)",
      "denominator": "sum of supported interval duration ms",
      "histogram": "fps-v1",
      "timeBasis": "stream-time",
      "notes": "The browser's fresh FPS reading. Frame geometry — resolution and its changes — is timeline state, not a metric: a resolution is not a quantity to average."
    },
    {
      "metricId": "transport.rtpBytesSent",
      "label": "RTP bytes sent",
      "subject": "transport",
      "media": null,
      "direction": "outbound",
      "unit": "bytes",
      "aggregation": "sum",
      "numerator": "sum of unique RTP byte deltas for this direction",
      "denominator": null,
      "histogram": null,
      "timeBasis": "transport-time",
      "notes": "Named under `transport` for scope, but derived from the RTP stat families once per direction. The transport's own byte counters are NOT added on top — they cover the same bytes, and adding both double-counts every packet. These are not billable bytes: no header overhead model, no TURN relay amplification, no retransmission accounting beyond what the RTP counters already include."
    },
    {
      "metricId": "transport.rtpBytesReceived",
      "label": "RTP bytes received",
      "subject": "transport",
      "media": null,
      "direction": "inbound",
      "unit": "bytes",
      "aggregation": "sum",
      "numerator": "sum of unique RTP byte deltas for this direction",
      "denominator": null,
      "histogram": null,
      "timeBasis": "transport-time",
      "notes": "See transport.rtpBytesSent."
    }
  ]
} as const;

export const HISTOGRAM_REGISTRY = {
  "registryVersion": "histograms-v1",
  "description": "Immutable histogram definitions. Bounds are display and aggregation choices, NOT quality thresholds — nothing here says 50 ms is good or 0.05 loss is bad. They apply to valid interval values, never to lifetime averages, and are weighted by eligible duration in milliseconds so a long quiet interval counts for more than a short one.\n\nBuckets are (-inf, b0], (b0, b1], ..., (bn, +inf), so weights.length === upperBounds.length + 1. Only identical definitionIds may be merged; two histograms with different bounds have no common refinement and combining them would invent data. Quantiles read off these are approximate bucket ranges, never point estimates, and the UI must label them as such.\n\nInputs outside the metric's legal domain are rejected before bucketing rather than clamped into an edge bucket: a loss ratio of 1.3 is a producer bug, and silently filing it under '<= 1' would hide it.",
  "weightUnit": "ms",
  "definitions": [
    {
      "definitionId": "ratio-v1",
      "appliesToUnit": "ratio",
      "legalDomain": {
        "minimum": 0,
        "maximum": 1
      },
      "rejects": [
        "negative",
        "nonfinite",
        "above-one"
      ],
      "upperBounds": [
        0,
        0.001,
        0.005,
        0.01,
        0.02,
        0.05,
        0.1,
        0.25,
        0.5,
        1
      ],
      "bucketCount": 11,
      "note": "The first bucket is exactly zero — a measured zero is valid evidence and deserves its own bucket rather than being lumped with 'almost zero'. The last bucket, above 1, can only be reached by a rejected value and should therefore always be empty."
    },
    {
      "definitionId": "delay-ms-v1",
      "appliesToUnit": "ms",
      "legalDomain": {
        "minimum": 0
      },
      "rejects": [
        "negative",
        "nonfinite"
      ],
      "upperBounds": [
        0,
        1,
        2,
        5,
        10,
        20,
        50,
        100,
        200,
        300,
        500,
        1000,
        2000
      ],
      "bucketCount": 14
    },
    {
      "definitionId": "bitrate-bps-v1",
      "appliesToUnit": "bps",
      "legalDomain": {
        "minimum": 0
      },
      "rejects": [
        "negative",
        "nonfinite"
      ],
      "upperBounds": [
        0,
        10000,
        25000,
        50000,
        100000,
        250000,
        500000,
        1000000,
        2500000,
        5000000,
        10000000,
        25000000
      ],
      "bucketCount": 13
    },
    {
      "definitionId": "fps-v1",
      "appliesToUnit": "fps",
      "legalDomain": {
        "minimum": 0
      },
      "rejects": [
        "negative",
        "nonfinite"
      ],
      "upperBounds": [
        0,
        1,
        5,
        10,
        15,
        24,
        30,
        60,
        90,
        120
      ],
      "bucketCount": 11
    }
  ]
} as const;

export const CAPABILITY_REGISTRY = {
  "registryVersion": "capabilities-v1",
  "description": "The capability keys a call digest must carry, and what each one asserts. Kept as data so the producer, the UI and the conformance suite read one list rather than three.\n\nA capability reflects measured evidence and producer support — not whether a schema field exists. A field present and null because nothing was measured is `unavailable`, not `available`. This is the mechanism that keeps a missing section from rendering as a healthy one.",
  "requiredCallDigestKeys": [
    "usage",
    "joinOutcomes",
    "audio",
    "video",
    "network",
    "connectivity",
    "paths",
    "topology",
    "cohorts",
    "scores"
  ],
  "keys": {
    "usage": "Participant sessions, peak concurrency, observed and connected participant time. Partial when membership intervals are known for only some participants.",
    "joinOutcomes": "Application join attempts and their outcomes. Unavailable without a versioned attempt adapter — a peer connection is not a join attempt.",
    "audio": "Inbound audio quality evaluation: loss, jitter, concealment, jitter buffer delay.",
    "video": "Inbound and outbound video quality evaluation: loss, freeze, FPS, encode and decode cost, encoder limitation.",
    "network": "Transport-level loss and round-trip time on the selected path.",
    "connectivity": "Connection-state evidence: whether disconnection and failure can be observed at all.",
    "paths": "Selected ICE path reconstruction — relay, protocol, and the server actually serving each interval. Unavailable where the producer's retained on-change metadata cannot establish it.",
    "topology": "Publisher-to-subscriber relationships. Unavailable unless verified signalling or resolver evidence supports the links; equal SSRC alone never establishes one.",
    "cohorts": "Dimension attribution for this call's participants.",
    "scores": "Observer summary score metadata. Explicitly NOT a measured quality metric in v1: a native producer's default score of 5 is a default, not a healthy measurement, and scores are never fed into fleet means or percentiles."
  },
  "scoresNote": "v1 requires no overall score. Existing Observer score min/max/median may be surfaced as clearly labelled source-summary metadata through a future additive section. They may not enter any aggregate on any screen."
} as const;

export const REASON_CODES = {
  "registryVersion": "reason-codes-v1",
  "description": "Stable machine codes with display labels. A code the UI does not know must stay VISIBLE through a readable fallback — rendered from its own text — rather than being dropped or shown as 'unknown error'. A producer is free to emit a code this version has never seen; that is why the schema's pattern is permissive and why consumers must implement the fallback.\n\nThe fallback: replace separators with spaces and show the code verbatim beside it, so an operator can grep the producer for it.",
  "fallback": {
    "strategy": "humanize-and-show-raw",
    "example": {
      "code": "source.summary-truncated",
      "label": "source summary truncated (source.summary-truncated)"
    }
  },
  "codes": {
    "source.missing": "No source of this kind was found",
    "source.unreadable": "A source could not be read",
    "source.invalid-json": "A source was not valid JSON",
    "source.truncated": "A source was cut short",
    "source.summary-truncated": "The Observer summary was missing sections",
    "source.summary-only": "Only a summary was available; no client samples",
    "source.late-arrival": "A source arrived after this generation was computed",
    "source.replaced": "A source was replaced by a corrected version",
    "source.conflicting-authority": "Two authoritative sources disagreed",
    "source.duplicate-sfu-observation": "The same observation arrived from more than one SFU",
    "coverage.gap-exceeds-max-interval": "A sampling gap exceeded the maximum supported interval",
    "coverage.cadence-unknown": "Expected sampling cadence could not be established",
    "coverage.expected-sources-unknown": "How many sources to expect could not be established",
    "coverage.partial-population": "Some calls or participants have unknown start times",
    "coverage.child-period-missing": "A child period was not evaluated",
    "metric.counter-missing": "A required counter was absent",
    "metric.counter-reset": "A counter reset or was corrected",
    "metric.denominator-zero": "The denominator was zero, so no rate can be reported",
    "metric.remote-report-stale": "The remote report's timestamp had not advanced",
    "metric.no-valid-intervals": "No interval met the policy's validity rules",
    "metric.out-of-domain": "An observation fell outside the metric's legal range and was rejected",
    "metric.overflow": "A total exceeded the safe integer range",
    "metric.not-supported-by-producer": "This producer does not report the required fields",
    "eligibility.track-muted": "The track was muted",
    "eligibility.track-disabled": "The track was disabled",
    "eligibility.track-ended": "The track had ended",
    "eligibility.track-paused": "The track was intentionally paused",
    "eligibility.context-unknown": "Track context was unknown, so eligibility could not be decided",
    "temporal.resolution-insufficient": "Evidence localises this only to a sampling interval",
    "temporal.clock-uncertainty-exceeded": "Clock uncertainty was too large to correlate clients",
    "temporal.clock-uncertainty-unbounded": "Clock uncertainty could not be bounded",
    "identity.unverified": "Identity could not be verified, so records were not merged",
    "identity.epoch-reused": "A stat ID was reused after a reconnect",
    "topology.relationship-unverified": "No verified evidence links publisher and subscriber",
    "path.on-change-metadata-insufficient": "Retained on-change metadata cannot establish the selected path",
    "cohort.interval-ambiguous": "The serving path was ambiguous, so exposure went to the unknown cohort",
    "joins.adapter-missing": "No versioned application attempt feed is configured",
    "joins.attempt-unassigned": "The attempt is not yet associated with a call",
    "lifecycle.open": "The call is still open, so figures are provisional",
    "lifecycle.evidence-missing": "No lifecycle evidence of sufficient authority was found",
    "read.pending": "Processing has not produced this digest yet",
    "read.not-found": "Nothing has been written for this subject",
    "read.unsupported-version": "The stored document uses a schema version this dashboard does not support",
    "read.failed": "The read failed",
    "read.forbidden": "Not authorized for this tenant or resource",
    "read.cursor-expired": "The cursor was issued against a revision that is no longer served",
    "read.cursor-mismatch": "The cursor does not match the requested filters",
    "read.revision-superseded": "A newer revision was published while this one was being read",
    "read.stale-revision": "The served revision is usable but known to lag",
    "policy.capability-disabled": "This category is disabled by policy",
    "policy.inputs-unavailable": "The policy's required inputs are not available"
  }
} as const;

/**
 * The policy the fixtures are built against.
 *
 * Shipped so the UI can name the policy behind a figure and describe how a
 * category was decided. A digest produced under a different `policyId` is
 * described by *that* policy, which the server fetches by id — this constant is
 * the one the fixtures use, not an assumption about production.
 */
export const CONSERVATIVE_V1_POLICY = {
  "policyId": "conservative-v1",
  "status": "proposed",
  "description": "The initial input and impairment policy, for development and fixture interoperability. It is NOT an empirically validated quality model: the thresholds below are starting points, not findings, and must be confirmed or revised against real telemetry before production. Every change takes a new policyId and updated fixtures, because figures computed under different policies may not be combined.\n\nThere are no hidden defaults. Anything this file does not state, the processor may not assume.",
  "sampling": {
    "maxSupportedIntervalMs": 10000,
    "notes": "An interval longer than this contributes no interpolated measurement. The gap is recorded as a gap — a 40-second hole is not four 10-second intervals of whatever was last seen. Repeated identical timestamps add no exposure, so a duplicated sample cannot inflate measured duration."
  },
  "freshness": {
    "remoteReportsRequireAdvancedTimestamp": true,
    "notes": "A remote (receiver-side) report whose timestamp has not advanced is stale and contributes nothing. It is never carried forward into later intervals as if still true — which is the difference between 'RTT was 400 ms for ten minutes' and 'RTT was measured once, ten minutes ago'."
  },
  "clockSkew": {
    "crossClientCorrection": "none",
    "maxUncertaintyMs": 1000,
    "notes": "No cross-client clock correction is invented. Cross-client temporal correlation is rejected when measured clock uncertainty exceeds 1000 ms or cannot be bounded at all, because correlating two participants' timelines through unknown skew manufactures causality that may not exist."
  },
  "lifecyclePrecedence": [
    "application-events",
    "observer-verified",
    "sample-bounds"
  ],
  "lifecycleNotes": "Explicit application membership and outcome events win for application lifecycle; verified Observer lifecycle follows. Sample bounds establish observation only — first and last sample are when we were watching, not when the person joined and left. Conflicting authoritative sources produce partial coverage and a conflict warning rather than a silent pick.",
  "eligibility": {
    "ineligibleTrackStates": [
      "muted",
      "disabled",
      "ended",
      "paused"
    ],
    "missingContextIsRecorded": true,
    "networkMetricsVisibleWhileMuted": true,
    "notes": "A knowingly muted, disabled, ended or intentionally paused track is ineligible for impairment evaluation: absence of media is not failure of media. Missing context is recorded rather than assumed either way — lack of media alone never proves a fault. Network metrics that were successfully measured stay visible while a media track is muted, because the connection is still being observed."
  },
  "impairmentTriggers": {
    "evaluation": "per-interval-classification",
    "hysteresisMs": 0,
    "recoveryDelayMs": 0,
    "categories": {
      "audio": {
        "requires": [
          "audio.inbound.speechConcealment"
        ],
        "trigger": "speech concealment ratio > 0.05"
      },
      "video": {
        "requires": [
          "video.inbound.freezeShare"
        ],
        "trigger": "browser freeze duration delta > 0",
        "temporalCaveat": "A nonzero cumulative freeze delta is a video impairment observation for that sampling interval. It does NOT classify the whole interval as impaired participant time: without exact temporal support it contributes measured stream freeze time plus an uncertain observation, and participant impairment duration for that evidence remains unknown. The same restriction applies to reconstructing impairment duration from concealment ratios."
      },
      "network": {
        "requires": [
          "audio.inbound.loss",
          "video.inbound.loss",
          "audio.outbound.rtcpRtt",
          "video.outbound.rtcpRtt",
          "transport.iceRtt"
        ],
        "trigger": "inbound loss > 0.05, or RTCP/ICE RTT > 400 ms",
        "notes": "Any one of the required inputs being measurable is enough to evaluate the category for that interval; each metric is judged on its own evidence."
      },
      "connectivity": {
        "requires": [
          "connection-state"
        ],
        "trigger": "connection state explicitly disconnected or failed"
      }
    },
    "notes": "Interval classifications, not persistent inferred episodes. A valid negative interval ends the classification immediately: there is no hysteresis and no hidden recovery delay, so the digest never claims impairment it did not measure. Each category needs its own valid inputs — a category whose inputs are missing is unknown for that interval, not healthy.\n\nFindings emitted by existing client or observer detectors keep their own lifecycle and policy. They are not relabelled as these digest rules, and their `origin` and `algorithmId` say so."
  },
  "exposureAccounting": {
    "assessed": "union of intervals where the category could be evaluated",
    "impaired": "union of positive classifications within assessed time",
    "unknown": "eligible observed participant time outside assessed time",
    "anyCategory": "impaired is the union of known positive categories; assessed is that positive union plus intervals where every applicable enabled category could be evaluated and none was impaired",
    "notes": "A known positive stays affected even when another category is unknown — that is the point of assembling `any` as a union rather than an intersection. Category durations overlap and must never be added together. Disabled or non-applicable categories are declared in capabilities.\n\nThis deliberately leaves some participant impairment duration unknown even where stream degradation is measured. That is the honest answer, and the UI must still show the stream metrics and the findings rather than hiding a measured problem because its duration cannot be bounded."
  },
  "deduplication": {
    "multiSfu": {
      "requires": [
        "verified-identity",
        "matching-record-timestamps"
      ],
      "onOverlappingDisagreement": "retain source evidence, select by committed deterministic source precedence, mark coverage partial and conflicting",
      "neverAdd": true,
      "notes": "Multi-SFU observations of the same client are never added. Two SFUs reporting the same participant is one participant seen twice, and summing them doubles every count that participant contributed."
    },
    "sourcePrecedence": [
      "observer-summary",
      "client-samples",
      "router-samples"
    ],
    "precedenceNotes": "Deterministic so that a retry picks the same winner. Stated here rather than left to arrival order, because arrival order is not reproducible."
  },
  "cohortAttribution": {
    "regionMeaning": "declared application or deployment region",
    "neverInferred": [
      "region-from-ip"
    ],
    "multiValued": {
      "sfuId": "assigned by verified serving path for each interval",
      "turnServer": "assigned by verified serving path for each interval",
      "ambiguousIntervals": "unknown cohort"
    },
    "notes": "Time-varying dimensions split their exposure across the values actually held, so a participant who moved between two SFUs contributes to both without duplicating their participant time. Ambiguous intervals go to the unknown cohort rather than being guessed or dropped."
  },
  "joinAttempts": {
    "requires": "a versioned application attempt adapter",
    "adapterFields": [
      "attemptId",
      "tenantId",
      "callId",
      "clientId",
      "startedAt",
      "outcomeAt",
      "outcome",
      "reasonCode"
    ],
    "associationOptional": [
      "callId",
      "clientId"
    ],
    "unassignedAttempts": "counted in the tenant-level attempt index and in period joins, but never in call counts",
    "neverInvent": "a synthetic successful call for an attempt with no call",
    "successKpi": "succeeded / (succeeded + failed)",
    "notes": "A peer connection is not a join attempt. Without this adapter the join capability is unavailable, and the UI shows it as unavailable rather than as zero failures."
  },
  "optionalInputs": {
    "applicationContext": "optional input, never an inferred fact",
    "sfuFeedback": "optional input, never an inferred fact"
  },
  "unavailableCapabilityRule": "If a definition in this policy cannot be supported by the fields actually available, the corresponding capability is marked unavailable with a reason. Unavailable evidence produces unavailable output — never a default, never a zero."
} as const;

export type MetricDefinition = (typeof METRIC_REGISTRY)['metrics'][number];
export type HistogramDefinition = (typeof HISTOGRAM_REGISTRY)['definitions'][number];

const METRICS_BY_ID = new Map<string, MetricDefinition>(
  METRIC_REGISTRY.metrics.map((m) => [m.metricId, m]),
);

const HISTOGRAMS_BY_ID = new Map<string, HistogramDefinition>(
  HISTOGRAM_REGISTRY.definitions.map((d) => [d.definitionId, d]),
);

/** The definition for a metric id, or undefined when this version has none. */
export function metricDefinition(metricId: string): MetricDefinition | undefined {
  return METRICS_BY_ID.get(metricId);
}

export function histogramDefinition(definitionId: string): HistogramDefinition | undefined {
  return HISTOGRAMS_BY_ID.get(definitionId);
}

/**
 * A reason code's label, or a readable fallback.
 *
 * Never returns empty and never swallows the code: an unrecognised code is
 * humanized and shown with its raw form in brackets, so a reason a newer
 * producer emits stays visible and greppable instead of becoming "unknown
 * error". The contract requires this fallback of every consumer.
 */
export function reasonLabel(code: string): string {
  const known = (REASON_CODES.codes as Record<string, string | undefined>)[code];
  if (known) return known;
  const humanized = code.replace(/[-.]/g, ' ').trim();
  return humanized ? `${humanized} (${code})` : code;
}

/** Bucket edge labels for a histogram definition: (-inf, b0], (b0, b1], ..., (bn, +inf). */
export function histogramBucketLabels(
  definitionId: string,
  format: (value: number) => string = String,
): string[] | undefined {
  const definition = HISTOGRAMS_BY_ID.get(definitionId);
  if (!definition) return undefined;

  const bounds = definition.upperBounds as readonly number[];
  const labels = [`\u2264 ${format(bounds[0]!)}`];
  for (let i = 1; i < bounds.length; i += 1) {
    labels.push(`${format(bounds[i - 1]!)}\u2013${format(bounds[i]!)}`);
  }
  labels.push(`> ${format(bounds[bounds.length - 1]!)}`);
  return labels;
}
