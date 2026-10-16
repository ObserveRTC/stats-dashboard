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
 * An absolute instant, UTC
 *
 * RFC 3339 with a `Z` offset. Server time, never client-reported wall clock: a browser with a skewed clock would otherwise move a call to the wrong day.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "instant".
 */
export type Instant = string;
/**
 * The UTC day a call is assigned to
 *
 * `YYYY-MM-DD`, from the UTC date of the call's START. A call that begins at 23:50Z and ends at 00:20Z belongs entirely to the day it started; it is not split. One rule, applied in storage, aggregation and on screen.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "reportingDay".
 */
export type ReportingDay = string;
/**
 * Why a stretch of a client's time could not be assessed. `stats-collection-gap` and `tab-hidden` come from built-in events; `before-first-sample` and `after-last-sample` are the edges of what was observed at all.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "gapReason".
 */
export type GapReason =
  | 'stats-collection-gap'
  | 'tab-hidden'
  | 'before-first-sample'
  | 'after-last-sample'
  | 'counter-reset';
/**
 * What this client session's evidence amounts to
 *
 * Disjoint by construction, and ordered: a session showing a user-experience symptom is `qoe-symptom` even if it also had a transport condition, because the symptom is the thing that happened to the person.
 *
 * `qos-only` is a transport or connectivity condition with no symptom evidence — worth surfacing, and NOT a claim that anyone noticed. `no-issue-within-coverage` is exactly that and not 'healthy': it is bounded by what could be assessed. `insufficient-evidence` is a session that could not be classified at all.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "classification".
 */
export type Classification =
  'qoe-symptom' | 'qos-only' | 'no-issue-within-coverage' | 'insufficient-evidence';
/**
 * The answer to a check
 *
 * `passed` — the rule ran against sufficient evidence and found no fault.
 * `failed` — the rule ran and found the fault.
 * `not-assessable` — the evidence the rule needs is absent, partial or reset. NEVER rendered as a pass, and never counted as healthy.
 * `not-applicable` — the subject cannot have this fault: no inbound video, no audio track, no outbound media.
 *
 * The distinction that matters most: a check resting only on "no issue fired", with no corroborating statistic, is `not-assessable`. An absent detector is not a healthy call.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "outcome".
 */
export type Outcome = 'passed' | 'failed' | 'not-assessable' | 'not-applicable';
/**
 * Mirrors IssueScope in src/schema/ClientIssueTypes.ts, so a finding's subject and the issue that evidences it describe the same thing.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "subjectKind".
 */
export type SubjectKind = 'client' | 'peer-connection' | 'inbound-track' | 'outbound-track';
/**
 * The unit of an observed value
 *
 * Closed on purpose. A value whose unit is not in this list cannot be formatted by the UI, and an unformatted number on a quality page is worse than an absent one. `none` is for a dimensionless count that is not a quantity, such as a state label's ordinal.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "unit".
 */
export type Unit =
  | 'count'
  | 'ms'
  | 's'
  | 'bps'
  | 'bytes'
  | 'fraction'
  | 'percent'
  | 'fps'
  | 'pixels'
  | 'dBov'
  | 'none';
/**
 * Which existing section of the client or call page an evidence link opens. The first four mirror IssueTimelineTarget; `samples` is the raw sample browser and `client` is the client page itself.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "evidenceTarget".
 */
export type EvidenceTarget =
  'consumer' | 'producer' | 'transport' | 'session' | 'samples' | 'client';
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "reportingMonth".
 */
export type ReportingMonth = string;
/**
 * Counts of how the client sessions answered. Deliberately counts and not a verdict: a call where one of eight clients froze is not simply 'failed', and collapsing it to one word is how a dashboard starts lying.
 */
export type CallLevelRollUpOneEntryPerCatalogueCheck = CallCheck[];

/**
 * Carrier for the generated types. Not a wire format — nothing ever serializes this object; it exists so every contract type is reachable from one root and therefore gets emitted.
 */
export interface DigestContractV2 {
  callIdentity?: CallIdentity;
  callCoverage?: CallCoverage;
  callCheck?: CallCheck;
  clientDigest?: ClientDigest;
  classification?: Classification;
  clientCheck?: ClientCheck;
  instant?: Instant;
  interval?: Interval1;
  reportingDay?: ReportingDay;
  reportingMonth?: ReportingMonth;
  unit?: Unit;
  observedValue?: ObservedValue;
  subjectKind?: SubjectKind;
  subject?: Subject;
  issueRef?: IssueRef;
  eventRef?: EventRef;
  evidenceTarget?: EvidenceTarget;
  evidenceRef?: EvidenceRef;
  gapReason?: GapReason;
  gap?: Gap;
  coverage?: Coverage;
  outcome?: Outcome;
  outcomeCounts?: OutcomeCounts;
  clientSessionRef?: ClientSessionRef;
  callRef?: CallRef;
  provenance?: Provenance;
  period?: Period;
  sources?: Sources;
  sourceFailure?: SourceFailure;
  totals?: Totals;
  periodCheck?: PeriodCheck;
  classificationCounts?: ClassificationCounts;
  trend?: Trend;
  trendBucket?: TrendBucket;
  affectedByCheck?: AffectedByCheck;
  callDigest?: CallDigest;
  periodSummary?: PeriodSummary;
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "callIdentity".
 */
export interface CallIdentity {
  callId: string;
  roomId: string;
  startedAt: Instant;
  endedAt: Instant;
  reportingDay: ReportingDay;
  /**
   * Every SFU that served the call, from the router reports. Context only — a multi-SFU call is still one call.
   */
  sfuIds?: string[];
}
/**
 * Call-level coverage
 *
 * Spelled out in full rather than composed from common.json#/$defs/coverage with allOf. That composition is the obvious move and it does not work: the shared definition seals itself with additionalProperties:false, so every call-level field added beside it is rejected by the inner schema. Listing the three second-fields twice is the cheaper mistake, and a test pins them against the client-level ones.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "callCoverage".
 */
export interface CallCoverage {
  observedSeconds: number;
  assessedSeconds: number;
  unassessedSeconds: number;
  gaps?: Gap[];
  /**
   * Client sessions with at least one sample.
   */
  clientsObserved: number;
  /**
   * Of those, the ones where at least one check reached passed or failed. The gap between this and clientsObserved is the honest unknown.
   */
  clientsAssessed: number;
  /**
   * Whether call-summary.json was readable. Without it the call's bounds and display names are inferred from samples, which is weaker.
   */
  callSummaryPresent: boolean;
  /**
   * Plain sentences naming what could not be assessed and why. Shown verbatim; the one place prose is stored, because a limitation is specific to one call and cannot be resolved from a registry.
   */
  limitations?: string[];
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "gap".
 */
export interface Gap {
  from: Instant;
  to: Instant;
  reason: GapReason;
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "callCheck".
 */
export interface CallCheck {
  /**
   * A key of the shipped check catalogue. The question text, section and order are resolved from there, not stored here.
   */
  id: string;
  counts: OutcomeCounts;
  /**
   * Assessed client-seconds inside a failing interval. Client duration, not call duration and not stream duration — the three differ and conflating them is how an 8-client call reports more impaired time than it lasted. Absent when the rule has no interval.
   */
  failedSeconds?: number | null;
}
/**
 * How a roll-up answered, with its denominator
 *
 * `evaluated` is the denominator and equals the sum of the four. It is stored rather than left to the reader because a reader that adds the four to get it will be wrong the day a fifth outcome exists.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "outcomeCounts".
 */
export interface OutcomeCounts {
  passed: number;
  failed: number;
  notAssessable: number;
  notApplicable: number;
  evaluated: number;
}
/**
 * One client session's checks
 *
 * `clientId` is unique within this call only. The addressable identity of this session is the call's `roomId` and `callId` plus this `clientId`.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "clientDigest".
 */
export interface ClientDigest {
  clientId: string;
  displayName?: string;
  coverage: Coverage;
  classification?: Classification;
  checks: ClientCheck[];
}
/**
 * How much of the time could be assessed at all
 *
 * Read before any count anywhere in the document. `assessedSeconds + unassessedSeconds` equals `observedSeconds`; time outside the observation window is not counted as either, because a client that joined late was not unassessable, it was absent.
 *
 * This object is the reason a quiet period and a broken pipeline cannot look alike.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "coverage".
 */
export interface Coverage {
  observedSeconds: number;
  assessedSeconds: number;
  unassessedSeconds: number;
  gaps?: Gap[];
}
/**
 * One question, answered for one client session
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "clientCheck".
 */
export interface ClientCheck {
  id: string;
  outcome: Outcome;
  subject?: Subject;
  /**
   * The rule as applied, in one line, with the threshold that was used. Stored per outcome rather than resolved from the catalogue because a rule can be parameterised and the reader needs the value that actually decided this answer.
   */
  rule?: string;
  /**
   * Required reading for `not-assessable`: what evidence was missing. 'no remote-inbound RTP report in 1309s of samples' is useful; 'unavailable' is not.
   */
  why?: string;
  observed?: ObservedValue[];
  interval?: Interval;
  /**
   * Built-in issues that evidence this outcome. A failing check normally has at least one; a check with issues but no statistic is still `not-assessable`, because a detector firing is a report, not a measurement.
   */
  issues?: IssueRef[];
  events?: EventRef[];
  /**
   * Where to look. Ordered most-specific first, so the UI's primary link is evidence[0].
   */
  evidence?: EvidenceRef[];
}
/**
 * What a per-client check was evaluated against
 *
 * A client-scoped check has no `id`. A track- or connection-scoped one carries the id the existing client page already keys its sections on, which is how an evidence link lands on the right row rather than the right page.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "subject".
 */
export interface Subject {
  kind: SubjectKind;
  id?: string;
  media?: 'audio' | 'video';
}
/**
 * One measured figure behind an outcome
 *
 * What the rule actually read. `value` may be null: a check can fail on the ABSENCE of a figure (no remote report, a counter that reset) and the UI must show that absence rather than a zero. `threshold` is present only when the rule compares against one, so a reader can see the margin rather than take the verdict on trust.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "observedValue".
 */
export interface ObservedValue {
  label: string;
  value: number | string | null;
  unit: Unit;
  threshold?: number | null;
}
/**
 * When the fault was observed. Absent on a pass, and absent where the rule is not interval-bounded.
 */
export interface Interval {
  from: Instant;
  to: Instant;
}
/**
 * A built-in issue that evidences an outcome
 *
 * `type` is a key of CLIENT_ISSUE_TYPES. Deliberately only the type, the instant and the payload: the label, category, severity, meaning, implication, remedy, chart and highlight fields all live in that registry and are resolved at render time.
 *
 * Only the 37 built-in types may appear. Observer-generated detector findings, application events and enriched metadata are out of scope for this contract, and a producer that emits one here has broken the scope boundary rather than extended the schema.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "issueRef".
 */
export interface IssueRef {
  type: string;
  at: Instant;
  payload?: {
    [k: string]: unknown;
  };
}
/**
 * A built-in client event that evidences an outcome
 *
 * `type` is a value of ClientEventTypes. Used mostly by continuity and coverage checks, where the evidence is a state change rather than a statistic.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "eventRef".
 */
export interface EventRef {
  type: string;
  at: Instant;
  payload?: {
    [k: string]: unknown;
  };
}
/**
 * Where the UI should navigate to inspect this
 *
 * The contract's answer to "show me". It names an existing section and, where one applies, the id to select, the chart to open (an IssueChartKind) and the interval to scroll to. It never describes a new view: a digest that asks for a chart the dashboard does not have is a digest the dashboard cannot honour, so the chart vocabulary is the one already shipped.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "evidenceRef".
 */
export interface EvidenceRef {
  target: EvidenceTarget;
  id?: string;
  chart?: string;
  interval?: Interval1;
}
/**
 * A closed time interval
 *
 * Both ends inclusive and both absolute. An interval is what makes a finding navigable — it is what the sample browser and the charts are scrolled to.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "interval".
 */
export interface Interval1 {
  from: Instant;
  to: Instant;
}
/**
 * One client session, addressable
 *
 * The full triple. `clientId` is unique within a call and not globally, so a client session IS `callId` + `clientId` — and `roomId` is here because the dashboard's URL is /{roomId}/{callId}/{clientId}. Without it a drilldown list would have to open every call digest just to build a link.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "clientSessionRef".
 */
export interface ClientSessionRef {
  roomId: string;
  callId: string;
  clientId: string;
  displayName?: string;
}
/**
 * One call, addressable
 *
 * `roomId` for the same reason as above: /{roomId}/{callId} is the route.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "callRef".
 */
export interface CallRef {
  roomId: string;
  callId: string;
  startedAt?: Instant;
  clientsFailed?: number;
}
/**
 * Which code produced this, and when
 *
 * `rulesVersion` is the one to read when two digests disagree about the same call. Bumping it means the same inputs may now answer differently; existing digests are NOT regenerated, they keep the answer their rules gave, and the UI says which rules produced what it is showing.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "provenance".
 */
export interface Provenance {
  schemaVersion: 2;
  rulesVersion: string;
  generatedAt: Instant;
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "period".
 */
export interface Period {
  kind: 'day' | 'month';
  /**
   * `YYYY-MM-DD` for a day, `YYYY-MM` for a month.
   */
  id: string;
  /**
   * UTC, always. Not configurable: a reporting day has to mean one thing across storage, aggregation and the page, and server-absolute time is the only definition that survives clients in other zones and a browser with a wrong clock.
   */
  timezone: 'UTC';
  /**
   * True while the period can still gain data — the current day, or the current month. A provisional summary is correct for what it has read and is expected to change, which is a different statement from incomplete.
   */
  provisional?: boolean;
}
/**
 * What this was built from, and what was missed
 *
 * The field that makes a partial period impossible to misread as an empty one. `complete` is false whenever anything was found and not read, or expected and not found.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "sources".
 */
export interface Sources {
  /**
   * `calls` for a day, `days` for a month.
   */
  kind: 'calls' | 'days';
  found: number;
  read: number;
  failed: number;
  complete: boolean;
  /**
   * Why each unread source was unread. Distinguishes a missing object, an invalid one, and one written by a schema version this build does not implement — three different operator actions.
   */
  failures?: SourceFailure[];
  /**
   * Months only: days in the month with no summary at all. A day that genuinely had no calls still gets a summary, so a day listed here is an unprocessed day, not a quiet one.
   */
  missingDays?: ReportingDay[];
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "sourceFailure".
 */
export interface SourceFailure {
  /**
   * The callId or the day id that could not be read.
   */
  id: string;
  reason:
    'not-found' | 'invalid-json' | 'schema-invalid' | 'unsupported-schema-version' | 'read-failed';
  detail?: string;
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "totals".
 */
export interface Totals {
  /**
   * Distinct callIds read. A union, so a rebuild cannot inflate it.
   */
  calls: number;
  /**
   * Distinct callId+clientId pairs.
   */
  clientSessions: number;
  clientSessionsAssessed: number;
  observedSeconds?: number;
  assessedSeconds?: number;
  unassessedSeconds?: number;
  /**
   * Summed call wall-clock duration. Kept separate from the client-second figures above on purpose: they are not comparable and a page that mixes them reports impaired time exceeding elapsed time.
   */
  callSeconds?: number;
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "periodCheck".
 */
export interface PeriodCheck {
  id: string;
  counts: OutcomeCounts1;
  /**
   * Distinct calls with at least one failing client session. A union over callId, never a sum of per-day values.
   */
  callsAffected?: number;
  /**
   * Summed assessed client-seconds inside failing intervals. Absent where the rule has no interval, and absent in a month if any contributing day lacked it — a partial sum would read as a smaller problem.
   */
  failedSeconds?: number | null;
}
/**
 * How a roll-up answered, with its denominator
 *
 * `evaluated` is the denominator and equals the sum of the four. It is stored rather than left to the reader because a reader that adds the four to get it will be wrong the day a fifth outcome exists.
 */
export interface OutcomeCounts1 {
  passed: number;
  failed: number;
  notAssessable: number;
  notApplicable: number;
  evaluated: number;
}
/**
 * Client sessions by what their evidence amounts to
 *
 * Disjoint. These four sum to `totals.clientSessions`, which is the only sum that is valid here — adding any subset to get 'affected clients' double-counts, because a session is classified once by its strongest evidence.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "classificationCounts".
 */
export interface ClassificationCounts {
  qoeSymptom: number;
  qosOnly: number;
  noIssueWithinCoverage: number;
  insufficientEvidence: number;
}
/**
 * Quality across the period
 *
 * Hour buckets for a day, day buckets for a month. Each bucket carries its own denominator so an hour with two sessions is not drawn as confidently as an hour with two hundred.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "trend".
 */
export interface Trend {
  bucket: 'hour' | 'day';
  buckets: TrendBucket[];
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "trendBucket".
 */
export interface TrendBucket {
  at: Instant;
  clientSessions: number;
  /**
   * Sessions with at least one failing check. Assigned to the bucket the session STARTED in, matching the call-to-day rule, so one session is counted once.
   */
  clientSessionsFailed: number;
  clientSessionsAssessed?: number;
}
/**
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "affectedByCheck".
 */
export interface AffectedByCheck {
  id: string;
  calls?: CallRef[];
  /**
   * The full roomId+callId+clientId triple, so the UI builds /{roomId}/{callId}/{clientId} without opening a single call digest.
   */
  clientSessions?: ClientSessionRef[];
  /**
   * True when the lists above were capped. A capped list is a navigation aid, not a count — read `counts` and `callsAffected` for the numbers.
   */
  truncated?: boolean;
}
/**
 * Call digest, version 2
 *
 * One completed call's quality checks, at call level and per client session, with the evidence needed to inspect each outcome.
 *
 * Stored at `digests/calls/{callId}.json`. `callId` alone is the key because it is a UUID and therefore globally unique; `roomId` is carried inside because the dashboard's route is /{roomId}/{callId} and a reader holding only a digest must still be able to link back.
 *
 * This one file serves both pages. The call page reads `checks` and `coverage`; a client page reads its own entry in `clients`. The roll-up in `checks` is computed from `clients[].checks` in the same pass, so the two cannot disagree — which is the whole reason there is no separate client digest.
 *
 * What is NOT here: no metric warehouse, no histograms, no scores. A check answers a question and points at the evidence; anything a reader wants beyond that is in the raw samples, which stay available.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "callDigest".
 */
export interface CallDigest {
  provenance: Provenance;
  call: CallIdentity;
  coverage: CallCoverage;
  checks: CallLevelRollUpOneEntryPerCatalogueCheck;
  clients: ClientDigest[];
}
/**
 * Period summary, version 2
 *
 * One reporting day or month, aggregated from saved digests. Stored at `digests/daily-summaries/{yyyy-mm-dd}.json` and `digests/monthly-summaries/{yyyy-mm}.json`.
 *
 * A day aggregates call digests; a month aggregates DAY SUMMARIES, not calls. That hierarchy is what keeps a month cheap, and it is also why `sources` has to say how complete it was: a month built from 28 of 31 days is not a quiet month.
 *
 * The aggregation rules this shape exists to enforce:
 *
 * - Every count names its denominator (`outcomeCounts.evaluated`). No bare rates are stored; the UI divides, and can therefore show the denominator beside the figure.
 * - Affected call and client counts are UNIONS over identity, so re-reading a source cannot double-count.
 * - A month sums numerators and denominators from its days. It never averages daily percentages, because a 2% day with 10 sessions and a 2% day with 10,000 are not equal evidence.
 * - Percentiles and distributions are not aggregated at all unless they are mergeable. Where a figure cannot be merged honestly the field is absent and the UI shows it unavailable.
 * - Classification buckets are disjoint and are never summed to get 'affected clients'.
 *
 * This interface was referenced by `DigestContractV2`'s JSON-Schema
 * via the `definition` "periodSummary".
 */
export interface PeriodSummary {
  provenance: Provenance;
  period: Period;
  sources: Sources;
  totals: Totals;
  checks: PeriodCheck[];
  classification?: ClassificationCounts;
  trend?: Trend;
  /**
   * Drilldown. For each check that anything failed, which calls and which client sessions to open.
   */
  affected?: AffectedByCheck[];
}
