/* eslint-disable */
/**
 * GENERATED FILE — do not edit.
 *
 * Source: digest-schema/schema/*.json
 * Regenerate: npm run schema:generate
 * Verify:     npm run schema:check
 *
 * The JSON Schema is the contract. Editing this file makes the two disagree,
 * and `schema:check` fails the build when they do.
 */

/**
 * UTC epoch milliseconds
 *
 * Integer, not a float: a fractional millisecond would make two timestamps incomparable for the interval arithmetic every metric depends on.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "epochMs".
 */
export type EpochMs = number;
/**
 * A duration in milliseconds
 *
 * Nonnegative. Fractional durations are allowed because a duration-weighted mean divides by one.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "durationMs".
 */
export type DurationMs = number;
/**
 * A nonnegative integer count
 *
 * Bounded by Number.MAX_SAFE_INTEGER per the contract's number rule: beyond it a JSON number no longer round-trips, so the producer must mark the measurement unavailable with a warning rather than round silently.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "count".
 */
export type Count = number;
/**
 * A count, or null for unknown. Never zero and never -1 as a sentinel.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "nullableCount".
 */
export type NullableCount = Count | null;
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "nullableDurationMs".
 */
export type NullableDurationMs = DurationMs | null;
/**
 * A finite JSON number. JSON has no NaN or Infinity literal, so `type: number` already excludes them; this exists to say so at the point of use.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "finiteNumber".
 */
export type FiniteNumber = number;
/**
 * A fraction from 0 to 1
 *
 * Never 0-100. The UI may format as a percentage; the wire value is always the fraction.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "ratio".
 */
export type Ratio = number;
/**
 * An opaque identifier
 *
 * Tenant-scoped and meaningless as text: no consumer may derive semantics, ordering or a storage key from its characters. Length-bounded only to keep a malformed document from becoming a memory problem.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "opaqueId".
 */
export type OpaqueId = string;
/**
 * A stable machine reason code
 *
 * Looked up in the reason-code label map shipped with the contract. An unknown code stays visible through a readable fallback rather than being dropped, so the pattern is permissive by design: a producer may emit a code this registry version has never seen.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "reasonCode".
 */
export type ReasonCode = string;
/**
 * @maxItems 64
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "reasonCodes".
 */
export type ReasonCodes = ReasonCode[];
/**
 * How complete the sources behind a figure were
 *
 * Distinct from metric measurability and from call lifecycle. A complete source set can still yield an unavailable metric, and an open call can have complete sources so far.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "completeness".
 */
export type Completeness = 'complete' | 'partial' | 'unknown';
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "capabilityState".
 */
export type CapabilityState = 'available' | 'partial' | 'unavailable';
/**
 * A cohort dimension
 *
 * `region` means the declared application or deployment region, never a region inferred from an IP address.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "dimension".
 */
export type Dimension =
  | 'browser'
  | 'browserMajorVersion'
  | 'os'
  | 'appVersion'
  | 'sdkVersion'
  | 'producer'
  | 'region'
  | 'sfuId'
  | 'turnServer';
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "subjectKind".
 */
export type SubjectKind = 'call' | 'participant' | 'stream' | 'transport';
/**
 * @maxItems 256
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "evidenceRefs".
 */
export type EvidenceRefs = EvidenceRef[];
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "nullableResourceRef".
 */
export type NullableResourceRef = ResourceRef | null;
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "sourceKind".
 */
export type SourceKind =
  | 'client-samples'
  | 'observer-summary'
  | 'observer-events'
  | 'application-events'
  | 'router-samples';
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "metricStatus".
 */
export type MetricStatus = 'measured' | 'partial' | 'unavailable';
/**
 * One metric over one subject
 *
 * Identity is the metricId, whose subject, direction, media and units are fixed by the registry. The same metricId under a different subject never implies the same exposure, so aggregation only ever combines identical metricIds at the same scope.
 *
 * The `unavailable` branch is enforced below rather than left to prose: an unavailable metric with a numerator is the exact shape that turns 'nobody measured this' into a rendered zero.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "metricAggregate".
 */
export type MetricAggregate = MetricAggregate1;
/**
 * A metric registry id
 *
 * Must exist in the registry version the digest's policy pins. The pattern mirrors the registry's namespacing (`<media|transport>.<direction>.<name>`) without hard-coding the list, so an additive registry version does not invalidate this schema; the conformance suite checks membership.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "metricId".
 */
export type MetricId = string;
/**
 * @maxItems 512
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "metricAggregates".
 */
export type MetricAggregates = MetricAggregate[];
/**
 * An impairment category
 *
 * `any` is not a sum of the others: category durations overlap, so adding them double-counts. See the ImpairmentExposure description for how `any` is assembled.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "impairmentCategory".
 */
export type ImpairmentCategory = 'audio' | 'video' | 'network' | 'connectivity' | 'any';
/**
 * @maxItems 5
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "impairmentExposures".
 */
export type ImpairmentExposures =
  | []
  | [ImpairmentExposure]
  | [ImpairmentExposure, ImpairmentExposure]
  | [ImpairmentExposure, ImpairmentExposure, ImpairmentExposure]
  | [ImpairmentExposure, ImpairmentExposure, ImpairmentExposure, ImpairmentExposure]
  | [
      ImpairmentExposure,
      ImpairmentExposure,
      ImpairmentExposure,
      ImpairmentExposure,
      ImpairmentExposure
    ];
/**
 * A finding category
 *
 * An open vocabulary on purpose: existing client and observer detectors keep their own category names rather than being relabelled as digest rules, so the set cannot be closed here. The label map supplies display text and an unknown category falls back to its raw code.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "findingCategory".
 */
export type FindingCategory = string;
/**
 * @maxItems 128
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "findingCounts".
 */
export type FindingCounts = FindingCount[];
/**
 * The outcome of an authorized read
 *
 * `ready` with an empty digest is a verified empty period. `pending` is a job that has not produced one yet. The two must never render the same way.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "readState".
 */
export type ReadState =
  'ready' | 'pending' | 'not-found' | 'unsupported-version' | 'failed' | 'forbidden';
/**
 * An opaque identifier
 *
 * Tenant-scoped and meaningless as text: no consumer may derive semantics, ordering or a storage key from its characters. Length-bounded only to keep a malformed document from becoming a memory problem.
 */
export type OpaqueId1 = string;
/**
 * One direction of one track, or one simulcast encoding
 *
 * `epoch` is part of the stream's identity: a reused stat id after a reconnect is a different epoch and a different stream, which is what stops two unrelated counter runs being differenced into one impossible delta.
 *
 * `publisherStreamId` links a subscriber's inbound stream to the publisher's outbound stream, and stays null unless verified signalling or resolver evidence supports it. SFU tracks are never joined on equal SSRC alone — SSRCs are reassigned, and a wrong join silently compares two different people's media.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "streamDigest".
 */
export type StreamDigest = StreamDigest1;
/**
 * A measurement, state, event or gap over an interval
 *
 * The interval is the honest resolution of the observation, not a fabricated exact occurrence time. A sampled cumulative freeze counter tells you there was freeze time somewhere inside the interval; it does not tell you when the freeze started or stopped, and this record type refuses to pretend otherwise.
 *
 * `validity` carries why a measurement is or is not usable, so a chart can draw a gap instead of interpolating across one. `missing`, `stale`, `reset` and `gap` records are evidence about the absence, which is why they exist as records at all rather than as holes in the series.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "timelineRecord".
 */
export type TimelineRecord = {
  [k: string]: unknown;
} & TimelineRecord1;
/**
 * An opaque identifier
 *
 * Tenant-scoped and meaningless as text: no consumer may derive semantics, ordering or a storage key from its characters. Length-bounded only to keep a malformed document from becoming a memory problem.
 */
export type OpaqueId2 = string;
/**
 * UTC epoch milliseconds
 *
 * Integer, not a float: a fractional millisecond would make two timestamps incomparable for the interval arithmetic every metric depends on.
 */
export type EpochMs1 = number;
/**
 * An opaque identifier
 *
 * Tenant-scoped and meaningless as text: no consumer may derive semantics, ordering or a storage key from its characters. Length-bounded only to keep a malformed document from becoming a memory problem.
 */
export type OpaqueId3 = string;
/**
 * A duration in milliseconds
 *
 * Nonnegative. Fractional durations are allowed because a duration-weighted mean divides by one.
 */
export type DurationMs1 = number;
/**
 * The outcome of an authorized read
 *
 * Six states, each needing its own UI treatment. `ready` with an empty digest is a verified empty period; `pending` is a job that has not produced one. A stale but usable revision stays `ready` and carries a freshness warning instead of being downgraded — withholding usable figures because they are an hour old helps nobody.
 *
 * Offering retry on `failed` must not implicitly start processing: a read is a read.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "readResult".
 */
export type ReadResult = {
  [k: string]: unknown;
} & ReadResult1;
/**
 * An opaque identifier
 *
 * Tenant-scoped and meaningless as text: no consumer may derive semantics, ordering or a storage key from its characters. Length-bounded only to keep a malformed document from becoming a memory problem.
 */
export type OpaqueId4 = string;
/**
 * A count, or null for unknown. Never zero and never -1 as a sentinel.
 */
export type NullableCount1 = Count | null;
/**
 * A count, or null for unknown. Never zero and never -1 as a sentinel.
 */
export type NullableCount2 = Count | null;
/**
 * A duration in milliseconds
 *
 * Nonnegative. Fractional durations are allowed because a duration-weighted mean divides by one.
 */
export type DurationMs2 = number;
/**
 * Requires explicit connection-state evidence. Null when there is none — not a fallback to observed time.
 */
export type NullableDurationMs1 = DurationMs | null;
/**
 * Period digest, version 1
 *
 * One UTC day or month: counts, exposure, distributions, cohort breakdowns, per-bucket activity and a ranked worst-call list.
 *
 * The arithmetic rules here are the substance of the contract, because every one of them has a plausible wrong answer. Additive exposure and numerator/denominator fields sum across periods. `callsWithExposure` and `largestCallPeakParticipants` do not — the first must be deduplicated by call identity across the days of a month, the second is a maximum. `findingCounts[].activeAtEnd` is a boundary evaluation and is not additive either. No average of averages, medians or percentiles anywhere.
 *
 * A month therefore cannot be produced from anonymous daily totals. It needs a persisted per-call contribution index to deduplicate membership, replace late outcomes and evaluate boundary state. That index is the producer's business and is never a UI payload.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "periodDigest".
 */
export type PeriodDigest = PeriodDigest1;
/**
 * A nonnegative integer count
 *
 * Bounded by Number.MAX_SAFE_INTEGER per the contract's number rule: beyond it a JSON number no longer round-trips, so the producer must mark the measurement unavailable with a warning rather than round silently.
 */
export type Count1 = number;
/**
 * A nonnegative integer count
 *
 * Bounded by Number.MAX_SAFE_INTEGER per the contract's number rule: beyond it a JSON number no longer round-trips, so the producer must mark the measurement unavailable with a warning rather than round silently.
 */
export type Count2 = number;
/**
 * A nonnegative integer count
 *
 * Bounded by Number.MAX_SAFE_INTEGER per the contract's number rule: beyond it a JSON number no longer round-trips, so the producer must mark the measurement unavailable with a warning rather than round silently.
 */
export type Count3 = number;
/**
 * A duration in milliseconds
 *
 * Nonnegative. Fractional durations are allowed because a duration-weighted mean divides by one.
 */
export type DurationMs3 = number;
/**
 * A duration in milliseconds
 *
 * Nonnegative. Fractional durations are allowed because a duration-weighted mean divides by one.
 */
export type DurationMs4 = number;
/**
 * A count, or null for unknown. Never zero and never -1 as a sentinel.
 */
export type NullableCount3 = Count | null;
/**
 * Assigned by raise time and deduplicated by stable finding identity.
 *
 * @maxItems 128
 */
export type FindingCounts1 = FindingCount[];
/**
 * An opaque identifier
 *
 * Tenant-scoped and meaningless as text: no consumer may derive semantics, ordering or a storage key from its characters. Length-bounded only to keep a malformed document from becoming a memory problem.
 */
export type OpaqueId5 = string;

/**
 * Carrier for the generated types. Not a wire format — nothing ever serializes this object; it exists so every contract type is reachable from one root and therefore gets emitted.
 */
export interface DigestContractV1 {
  epochMs?: EpochMs;
  durationMs?: DurationMs;
  count?: Count;
  nullableCount?: NullableCount;
  nullableDurationMs?: NullableDurationMs;
  finiteNumber?: FiniteNumber;
  ratio?: Ratio;
  opaqueId?: OpaqueId;
  reasonCode?: ReasonCode;
  reasonCodes?: ReasonCodes;
  timeRange?: TimeRange;
  completeness?: Completeness;
  capabilityState?: CapabilityState;
  capability?: Capability;
  capabilityMap?: CapabilityMap;
  dimension?: Dimension;
  subjectKind?: SubjectKind;
  subject?: Subject;
  evidenceRef?: EvidenceRef;
  evidenceRefs?: EvidenceRefs;
  resourceRef?: ResourceRef;
  nullableResourceRef?: NullableResourceRef;
  provenance?: Provenance;
  sourceKind?: SourceKind;
  source?: Source;
  coverage?: Coverage;
  histogram?: Histogram;
  metricStatus?: MetricStatus;
  metricAggregate?: MetricAggregate;
  metricId?: MetricId;
  metricAggregates?: MetricAggregates;
  impairmentCategory?: ImpairmentCategory;
  impairmentExposure?: ImpairmentExposure;
  impairmentExposures?: ImpairmentExposures;
  joinAggregate?: JoinAggregate;
  findingCount?: FindingCount;
  findingCounts?: FindingCounts;
  findingCategory?: FindingCategory;
  readState?: ReadState;
  participantDigest?: ParticipantDigest;
  streamDigest?: StreamDigest;
  pathDigest?: PathDigest;
  timelineRecord?: TimelineRecord;
  finding?: Finding;
  cohortAggregate?: CohortAggregate;
  periodBucket?: PeriodBucket;
  rankedCall?: RankedCall;
  manifest?: Manifest;
  page?: Page;
  pageLimits?: PageLimits;
  callSearchRow?: CallSearchRow;
  callSearchQuery?: CallSearchQuery;
  readResult?: ReadResult;
  callDigest?: CallDigest;
  periodDigest?: PeriodDigest;
}
/**
 * A half-open interval [startAt, endAt)
 *
 * Half-open so adjacent intervals tile without double-counting the shared instant — which is what keeps a union of observation intervals from over-reporting exposure. An event may use startAt === endAt and adds no duration.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "timeRange".
 */
export interface TimeRange {
  startAt: EpochMs;
  endAt: EpochMs;
}
/**
 * Whether a section could be produced, and why not
 *
 * Reflects measured evidence and producer support, not the mere existence of a schema field. `reasons` is required even when available, where it is empty — an unavailable capability with no reason is the failure this shape exists to prevent.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "capability".
 */
export interface Capability {
  state: CapabilityState;
  reasons: ReasonCodes;
}
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "capabilityMap".
 */
export interface CapabilityMap {
  [k: string]: Capability;
}
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "subject".
 */
export interface Subject {
  kind: SubjectKind;
  id: OpaqueId;
}
/**
 * A pointer to an authorized logical source record
 *
 * Never a credential and never a presigned URL. `sourceId` joins to a Source in the digest; the rest narrows to a record, a stat and an instant where those are known. Resolving one into a raw-evidence view goes through server authorization.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "evidenceRef".
 */
export interface EvidenceRef {
  sourceId: OpaqueId;
  at: EpochMs | null;
  recordId: OpaqueId | null;
  statId: OpaqueId | null;
}
/**
 * A pointer to a paginated detail resource
 *
 * `records` is the total the producer wrote, so a reader can show a count without paging to the end. A null ResourceRef on a digest means the detail is unavailable; a present ref with records 0 means it was evaluated and is empty.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "resourceRef".
 */
export interface ResourceRef {
  resourceId: OpaqueId;
  records: Count;
}
/**
 * Which code and configuration produced a figure
 *
 * `processorVersion` and `policyId` identify immutable calculation code and configuration; figures from incompatible policies may not be combined. `sourceRevision` hashes the canonical input manifest together with policy identity, so it changes when a late record arrives or a source is corrected.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "provenance".
 */
export interface Provenance {
  processorVersion: OpaqueId;
  policyId: OpaqueId;
  sourceRevision: OpaqueId;
  generatedAt: EpochMs;
}
/**
 * One input the digest was built from
 *
 * `revision` is an immutable version id or content hash, never a mutable path on its own — that is what makes a retry deterministic and a late arrival detectable.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "source".
 */
export interface Source {
  sourceId: OpaqueId;
  kind: SourceKind;
  logicalKey: OpaqueId;
  revision: OpaqueId;
}
/**
 * How much of the expected input was actually read
 *
 * `gapDurationMs` is the union of missing time per participant instance, summed across participants — not a sum across every stream, which would multiply the same missing minute by the number of tracks. It is null when expected cadence or exposure cannot be established, which is not the same as zero.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "coverage".
 */
export interface Coverage {
  completeness: Completeness;
  expectedSources: NullableCount;
  processedSources: Count;
  rejectedRecords: Count;
  duplicateRecords: Count;
  gapDurationMs: NullableDurationMs;
  truncated: boolean;
  warnings: ReasonCodes;
}
/**
 * Duration weights over an immutable bucket definition
 *
 * `weights[i]` is milliseconds of eligible time whose interval value fell in bucket i. The bucket edges live in the definition, not here, so a stored histogram cannot drift from the bounds it was built with. weights.length must equal upperBounds.length + 1 for the named definition — a cross-document rule the conformance suite checks.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "histogram".
 */
export interface Histogram {
  definitionId: OpaqueId;
  /**
   * @minItems 2
   * @maxItems 64
   */
  weights: [DurationMs, DurationMs, ...DurationMs[]];
}
export interface MetricAggregate1 {
  metricId: MetricId;
  status: MetricStatus;
  unavailableReasons: ReasonCodes;
  validIntervals: Count;
  eligibleDurationMs: NullableDurationMs;
  measuredDurationMs: DurationMs;
  numerator: FiniteNumber | null;
  denominator: FiniteNumber | null;
  min: FiniteNumber | null;
  max: FiniteNumber | null;
  distribution: Histogram | null;
}
/**
 * Assessed, impaired and unknown participant time for one category
 *
 * Assessed time is the union of intervals where the policy could evaluate the category. Impaired is the union of positive classifications inside assessed time. Unknown is eligible observed participant time outside assessed time — so impaired + unknown does not have to equal observed time, and assessed is the denominator the UI must divide by.
 *
 * For `any`: impaired is the union of known positive categories; assessed is that positive union plus the intervals where every applicable enabled category could be evaluated and none was impaired. A known positive therefore stays affected even when another category is unknown.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "impairmentExposure".
 */
export interface ImpairmentExposure {
  category: ImpairmentCategory;
  assessedParticipantMs: DurationMs;
  impairedParticipantMs: DurationMs;
  unknownParticipantMs: DurationMs;
}
/**
 * Application join attempt outcomes
 *
 * Unavailable without a versioned application attempt feed; a peer connection is not a join attempt. When available the counts partition attempts exactly: succeeded + failed + canceled + pending + unknown = attempts, which the conformance suite checks because JSON Schema cannot.
 *
 * The default success KPI divides succeeded by (succeeded + failed); canceled, pending and unknown are shown beside it rather than folded in, since a cancelled attempt is not a failure of the service.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "joinAggregate".
 */
export interface JoinAggregate {
  status: CapabilityState;
  attempts: NullableCount;
  succeeded: NullableCount;
  failed: NullableCount;
  canceled: NullableCount;
  pending: NullableCount;
  unknown: NullableCount;
}
/**
 * Findings of one category over a period
 *
 * `raised` is additive by raise time; `activeAtEnd` is evaluated at the period boundary and is **not** additive — summing daily active-at-end counts into a month is the error this field's description exists to prevent.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "findingCount".
 */
export interface FindingCount {
  category: FindingCategory;
  raised: Count;
  activeAtEnd: Count;
  truncated: boolean;
}
/**
 * One client instance over one call
 *
 * A participant is a client instance, not a unique human: the same person rejoining is two participants, and the dashboard may never present these counts as people.
 *
 * `dimensions` holds only values that were invariant for this participant. A dimension that changed — the selected TURN server, the serving SFU, a mid-call app context — is omitted here and represented through interval evidence, so that its cohort exposure can be split across the values actually held. Putting a changing value here would attribute the whole session to whichever value happened to be last.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "participantDigest".
 */
export interface ParticipantDigest {
  participantId: OpaqueId;
  clientId: OpaqueId;
  instanceId: OpaqueId1;
  displayName: string | null;
  /**
   * Empty when membership intervals are unavailable — the capability map says why. Empty is not 'never present'.
   *
   * @maxItems 512
   */
  membership: TimeRange[];
  dimensions: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^.*$".
     */
    [k: string]: string | null;
  };
  capabilities: CapabilityMap;
  observedDurationMs: DurationMs;
  metrics: MetricAggregates;
  impairments: ImpairmentExposures;
  [k: string]: unknown;
}
export interface StreamDigest1 {
  streamId: OpaqueId;
  participantId: OpaqueId;
  peerConnectionId: OpaqueId;
  trackId: OpaqueId | null;
  /**
   * Set for a simulcast encoding. Encodings are separate streams: their bitrates are alternatives, not layers to add together.
   */
  encodingId: OpaqueId | null;
  direction: 'inbound' | 'outbound';
  mediaKind: 'audio' | 'video';
  epoch: OpaqueId;
  publisherStreamId: OpaqueId | null;
  /**
   * What justified the publisher link. Null exactly when `publisherStreamId` is null.
   */
  relationshipSource: ReasonCode | null;
  metrics: MetricAggregates;
  [k: string]: unknown;
}
/**
 * A selected ICE path over an interval
 *
 * One record per interval during which a transport's selected candidate pair held. A changed relay or protocol is a new record, not a mutated one, so cohort exposure can be attributed to the server actually serving at the time.
 *
 * `relayed`, `relayServer`, `protocol` and `relayProtocol` are null when the producer's retained on-change metadata cannot establish them. Absence of a change notification means unchanged only where the producer's semantics say so; otherwise it means unknown.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "pathDigest".
 */
export interface PathDigest {
  pathId: OpaqueId;
  participantId: OpaqueId;
  peerConnectionId: OpaqueId;
  transportId: OpaqueId;
  range: TimeRange;
  selectedCandidatePairId: OpaqueId | null;
  relayed: boolean | null;
  relayServer: string | null;
  protocol: string | null;
  relayProtocol: string | null;
  evidence: EvidenceRefs;
  [k: string]: unknown;
}
export interface TimelineRecord1 {
  recordId: OpaqueId;
  subject: Subject;
  range: TimeRange1;
  kind: 'measurement' | 'state' | 'event' | 'gap';
  metricId: MetricId | null;
  value: FiniteNumber | null;
  /**
   * Valid only on a measurement. Carried so a reader can interpret a bucket value and recompute the ratio the contract defines, rather than trusting a pre-divided number of unknown provenance.
   */
  numerator: FiniteNumber | null;
  denominator: FiniteNumber | null;
  state: string | null;
  validity: 'valid' | 'missing' | 'stale' | 'reset' | 'gap';
  evidence: EvidenceRefs;
  [k: string]: unknown;
}
/**
 * A half-open interval [startAt, endAt)
 *
 * Half-open so adjacent intervals tile without double-counting the shared instant — which is what keeps a union of observation intervals from over-reporting exposure. An event may use startAt === endAt and adds no duration.
 */
export interface TimeRange1 {
  startAt: EpochMs;
  endAt: EpochMs;
}
/**
 * An observation or a hypothesis about a subject
 *
 * `certainty` is the field that must never be flattened in the UI: an observation is something a detector measured, a hypothesis is something a rule inferred, and presenting the second as the first is how a dashboard invents a root cause.
 *
 * `resolvedAt` stays null while unresolved, and an unresolved finding is **not** proof of continuous impairment up to the query end — exposure ends at `lastObservedAt`, the last assessed evidence. A detector whose inputs went away keeps its state; that state is not evidence that the problem continued.
 *
 * `origin` preserves where the judgement came from. Existing client and observer detectors keep their own lifecycle and policy rather than being relabelled as digest rules, which is why `algorithmId` is required on every finding.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "finding".
 */
export interface Finding {
  findingId: OpaqueId2;
  category: FindingCategory;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  subject: Subject;
  /**
   * @maxItems 1024
   */
  affectedParticipantIds: OpaqueId[];
  startedAt: EpochMs;
  resolvedAt: EpochMs | null;
  lastObservedAt: EpochMs1;
  origin: 'client-detector' | 'observer-detector' | 'digest-rule';
  certainty: 'observation' | 'hypothesis';
  /**
   * Null when the algorithm does not express one. A hypothesis without a confidence is still a hypothesis.
   */
  confidence: ('low' | 'medium' | 'high') | null;
  algorithmId: OpaqueId;
  evidence: EvidenceRefs;
  [k: string]: unknown;
}
/**
 * Exposure and metrics for one dimension value
 *
 * Exposure is assigned to the value held during each interval, so a dimension that changes mid-call splits its exposure across values rather than attributing all of it to the last one. Values of a single-valued dimension partition the eligible exposure; multi-valued SFU participation is assigned by an explicit path or ownership policy and must not duplicate overall participant time. Ambiguous intervals go to the null cohort.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "cohortAggregate".
 */
export interface CohortAggregate {
  dimension: Dimension;
  /**
   * Null is the unknown cohort — a real population, not an absence to drop.
   */
  value: string | null;
  observedParticipantMs: DurationMs;
  impairments: ImpairmentExposures;
  metrics: MetricAggregates;
}
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "periodBucket".
 */
export interface PeriodBucket {
  range: TimeRange;
  completeness: Completeness;
  callsStarted: Count;
  observedParticipantMs: DurationMs;
  impairments: ImpairmentExposures;
}
/**
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "rankedCall".
 */
export interface RankedCall {
  callId: OpaqueId;
  roomId: OpaqueId | null;
  digestRevision: OpaqueId3;
  startedAt: EpochMs | null;
  impairedParticipantMs: DurationMs;
  assessedParticipantMs: DurationMs1;
  completeness: Completeness;
}
/**
 * The pointer to a subject's current revision
 *
 * Written **last**: the producer writes immutable details and the digest, validates them, and only then publishes the manifest atomically. That ordering is the whole concurrency story — a reader either sees the old generation or the new one, never a half-written one, and a failed reprocess leaves the previous usable revision in place.
 *
 * The manifest is the only mutable object in the analytics tree. Everything it points at is immutable, which is what lets a reader pin a revision and page it safely while a new generation is being written beside it.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "manifest".
 */
export interface Manifest {
  schemaVersion: 1;
  subject: {
    kind: 'call' | 'day' | 'month';
    id: OpaqueId;
  };
  currentRevision: OpaqueId;
  /**
   * Where the current revision's digest lives, relative to the analytics root. A storage key, resolved server-side: it is never handed to a browser and no client-supplied value is ever substituted for it.
   */
  digestKey: string;
  provenance: Provenance;
  /**
   * The revision this one replaced, where known. Retention of old revisions is a separate policy that must respect active readers.
   */
  supersedes?: OpaqueId | null;
  [k: string]: unknown;
}
/**
 * One page of a detail or search resource
 *
 * `revision` is echoed so a reader can detect mid-read drift rather than discovering it as inconsistent numbers. `nextCursor: null` ends pagination — an empty `items` with a non-null cursor is legal and means 'keep asking', which is how a server that filters server-side avoids guessing a page size.
 *
 * Cursors are opaque and bind tenant, filters and revision together. A cursor replayed against different filters or a newer revision is rejected explicitly, never silently reinterpreted.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "page".
 */
export interface Page {
  revision: OpaqueId;
  /**
   * @maxItems 500
   */
  items: unknown[];
  nextCursor: string | null;
}
/**
 * Default and maximum page sizes, as data so both implementations agree. A server may return fewer than asked.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "pageLimits".
 */
export interface PageLimits {
  default: 100;
  maximum: 500;
}
/**
 * One row of a call search result
 *
 * Deliberately thin: enough to rank, judge completeness and navigate, and nothing that would tempt a reader to compute with it. `digestRevision` pins what the row was derived from, so following it cannot land on figures from a newer generation than the row.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "callSearchRow".
 */
export interface CallSearchRow {
  callId: OpaqueId;
  roomId: OpaqueId | null;
  digestRevision: OpaqueId;
  startedAt: EpochMs | null;
  endedAt: EpochMs | null;
  observedParticipantMs: DurationMs;
  impairment: ImpairmentExposure1;
  completeness: Completeness;
  [k: string]: unknown;
}
/**
 * Assessed, impaired and unknown participant time for one category
 *
 * Assessed time is the union of intervals where the policy could evaluate the category. Impaired is the union of positive classifications inside assessed time. Unknown is eligible observed participant time outside assessed time — so impaired + unknown does not have to equal observed time, and assessed is the denominator the UI must divide by.
 *
 * For `any`: impaired is the union of known positive categories; assessed is that positive union plus the intervals where every applicable enabled category could be evaluated and none was impaired. A known positive therefore stays affected even when another category is unknown.
 */
export interface ImpairmentExposure1 {
  category: ImpairmentCategory;
  assessedParticipantMs: DurationMs;
  impairedParticipantMs: DurationMs;
  unknownParticipantMs: DurationMs;
}
/**
 * The supported call-search filters
 *
 * Exactly the filters the contract names. The UI advertises which combinations are supported rather than offering every pairing and quietly dropping the ones the server cannot answer; combined cohort filters go through this query and are never inferred from marginal cohort totals.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "callSearchQuery".
 */
export interface CallSearchQuery {
  range?: TimeRange;
  callId?: OpaqueId;
  roomId?: OpaqueId;
  clientId?: OpaqueId;
  impairmentCategory?: ImpairmentCategory;
  /**
   * @maxItems 8
   */
  cohorts?:
    | []
    | [
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ]
    | [
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        },
        {
          dimension: Dimension;
          value: string | null;
        }
      ];
  completeness?: Completeness;
  /**
   * The filter that makes calls excluded from the worst-call ranking — those with no assessed evidence — discoverable rather than invisible.
   */
  missingDataOnly?: boolean;
  limit?: number;
  cursor?: string;
}
export interface ReadResult1 {
  state: ReadState;
  revision?: OpaqueId | null;
  /**
   * Present when the served revision is usable but known to lag. Separate from `state` on purpose.
   */
  staleness?: {
    generatedAt: EpochMs;
    reasons: ReasonCodes;
  };
  reasons?: ReasonCodes;
  schemaVersion?: number;
  document?: unknown;
}
/**
 * Call digest, version 1
 *
 * One call's identity, coverage, usage, metric aggregates, finding counts and references to paginated detail.
 *
 * This is a saved fact, not a view: everything in it was computed by the processor from archived sources, and a reader does no counter arithmetic to render it. The detail refs are the only way into per-participant, per-stream, per-path, timeline and finding data, and each is read against this digest's `revision` — a reader that pins one revision and pages another has spliced two generations together.
 *
 * This interface was referenced by `DigestContractV1`'s JSON-Schema
 * via the `definition` "callDigest".
 */
export interface CallDigest {
  kind: 'call-digest';
  /**
   * Major version. A reader that does not support this exact value must refuse the document rather than read it field by field — a field whose meaning changed would otherwise render as if it had not.
   */
  schemaVersion: 1;
  digestId: OpaqueId;
  tenantId: OpaqueId;
  callId: OpaqueId;
  /**
   * Null when the sources never carried one. A room id may be a UUID with no relationship to the call id, so nothing may be inferred from its text.
   */
  roomId: OpaqueId | null;
  revision: OpaqueId4;
  provenance: Provenance;
  /**
   * An open call is provisional even when every currently known file was processed: more samples may still arrive. `unknown` means no lifecycle evidence of sufficient authority was found.
   */
  lifecycle: 'open' | 'closed' | 'unknown';
  /**
   * The known call span — not the archive write time, and not a summary's finalization time. Null when lifecycle evidence cannot establish it. First and last observed samples may bound observed exposure but do not establish authoritative join or leave times.
   */
  range: TimeRange | null;
  coverage: Coverage;
  capabilities: CapabilityMap1;
  /**
   * The immutable input inventory this generation was built from. Its hash plus policy identity is `provenance.sourceRevision`, which is what makes a retry deterministic and a late arrival detectable.
   *
   * @maxItems 4096
   */
  sources: Source[];
  usage: {
    participantSessions: NullableCount1;
    peakConcurrentParticipants: NullableCount2;
    observedParticipantMs: DurationMs2;
    connectedParticipantMs: NullableDurationMs1;
    callDurationMs: NullableDurationMs;
  };
  joins: JoinAggregate;
  impairments: ImpairmentExposures;
  metrics: MetricAggregates;
  findingCounts: FindingCounts;
  participants: NullableResourceRef;
  streamDetails: NullableResourceRef;
  pathDetails: NullableResourceRef;
  timeline: NullableResourceRef;
  findings: NullableResourceRef;
  [k: string]: unknown;
}
/**
 * Must contain every key the contract requires (see registry/capabilities.v1.json, which both implementations and the conformance suite read). Additional keys are allowed.
 */
export interface CapabilityMap1 {
  [k: string]: Capability;
}
export interface PeriodDigest1 {
  kind: 'period-digest';
  schemaVersion: 1;
  tenantId: OpaqueId;
  period: 'day' | 'month';
  /**
   * `YYYY-MM-DD` for a day, `YYYY-MM` for a month, UTC. Validated against `period` below, and round-tripped through a real date by the conformance suite — `2026-02-31` matches the pattern and is not a day.
   */
  id: string;
  range: TimeRange2;
  revision: OpaqueId;
  provenance: Provenance;
  completeness: Completeness;
  /**
   * Classifies every indexed candidate call. readable + pending + failed + unknown must equal indexedCalls, which the conformance suite checks. A readable digest may itself be partial, so these counts say nothing about measurement quality.
   *
   * Child periods are the month's expected and included UTC days, or a day's 24 expected hours and the hours whose input inventory was successfully evaluated. A successfully evaluated empty bucket is a verified zero; an unevaluated one must never be presented as verified absence of traffic.
   */
  coverage: {
    indexedCalls: Count;
    readableCallDigests: Count;
    pendingCallDigests: Count;
    failedCallDigests: Count;
    unknownCallDigests: Count;
    expectedChildPeriods: Count;
    includedChildPeriods: Count;
  };
  totals: {
    callsStarted: Count1;
    callsWithExposure: Count2;
    participantSessionsStarted: Count3;
    observedParticipantMs: DurationMs3;
    connectedParticipantMs: NullableDurationMs;
    callExposureMs: DurationMs4;
    largestCallPeakParticipants: NullableCount3;
  };
  joins: JoinAggregate1;
  impairments: ImpairmentExposures;
  metrics: MetricAggregates;
  findingCounts: FindingCounts1;
  /**
   * Marginal totals per dimension value. Null is the unknown cohort and is never discarded. Dimensions may not be cross-combined from these margins — a combined filter requires the server's call/participant contribution query, and the UI advertises which combinations are supported.
   *
   * @maxItems 2048
   */
  cohorts: CohortAggregate[];
  /**
   * A day's 24 UTC hours, or a month's UTC days. Unavailable buckets keep their own completeness so a chart can draw a gap rather than interpolate through it.
   *
   * @maxItems 31
   */
  buckets: PeriodBucket[];
  /**
   * At most 20, ordered by impaired participant milliseconds descending, then impairment share descending, then call id ascending. Exposure clipped to this period, using all-category union exposure rather than a sum of categories. Calls with no assessed evidence are excluded and stay discoverable through missing-data filters. A period with no observed impairment has an empty ranking, and the UI must not substitute a ranking of its own.
   *
   * @maxItems 20
   */
  worstCalls:
    | []
    | [RankedCall]
    | [RankedCall, RankedCall]
    | [RankedCall, RankedCall, RankedCall]
    | [RankedCall, RankedCall, RankedCall, RankedCall]
    | [RankedCall, RankedCall, RankedCall, RankedCall, RankedCall]
    | [RankedCall, RankedCall, RankedCall, RankedCall, RankedCall, RankedCall]
    | [RankedCall, RankedCall, RankedCall, RankedCall, RankedCall, RankedCall, RankedCall]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ]
    | [
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall,
        RankedCall
      ];
  callSearchResourceId: OpaqueId5;
  [k: string]: unknown;
}
/**
 * A half-open interval [startAt, endAt)
 *
 * Half-open so adjacent intervals tile without double-counting the shared instant — which is what keeps a union of observation intervals from over-reporting exposure. An event may use startAt === endAt and adds no duration.
 */
export interface TimeRange2 {
  startAt: EpochMs;
  endAt: EpochMs;
}
/**
 * Application join attempt outcomes
 *
 * Unavailable without a versioned application attempt feed; a peer connection is not a join attempt. When available the counts partition attempts exactly: succeeded + failed + canceled + pending + unknown = attempts, which the conformance suite checks because JSON Schema cannot.
 *
 * The default success KPI divides succeeded by (succeeded + failed); canceled, pending and unknown are shown beside it rather than folded in, since a cancelled attempt is not a failure of the service.
 */
export interface JoinAggregate1 {
  status: CapabilityState;
  attempts: NullableCount;
  succeeded: NullableCount;
  failed: NullableCount;
  canceled: NullableCount;
  pending: NullableCount;
  unknown: NullableCount;
}
