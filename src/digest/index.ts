/**
 * The analytics digest contract, for anything that renders it.
 *
 * Types and registry metadata only — both safe in the browser. The validators
 * are **not** re-exported here on purpose: they are ~370KB of precompiled code
 * and belong on the server, which is the side that reads storage. Importing
 * `./server.ts` from a component would pull all of it into the client bundle,
 * and this barrel's job is to make that a deliberate act rather than an
 * accident.
 *
 * Source of truth: `digest-schema/`. Nothing in `src/digest/` is written
 * by hand — `npm run schema:generate` produces it and `npm run schema:check`
 * fails the build when it has drifted.
 */

export type {
  // Shared
  Capability,
  CapabilityMap,
  CapabilityState,
  Completeness,
  Coverage,
  Dimension,
  EvidenceRef,
  FindingCategory,
  FindingCount,
  Histogram,
  ImpairmentCategory,
  ImpairmentExposure,
  JoinAggregate,
  MetricAggregate,
  MetricId,
  MetricStatus,
  Provenance,
  ReadState,
  ResourceRef,
  Source,
  SourceKind,
  Subject,
  SubjectKind,
  TimeRange,
  // Documents
  CallDigest,
  PeriodDigest,
  CohortAggregate,
  PeriodBucket,
  RankedCall,
  // Detail
  ParticipantDigest,
  StreamDigest,
  PathDigest,
  TimelineRecord,
  Finding,
  // Read boundary
  Manifest,
  Page,
  CallSearchRow,
  CallSearchQuery,
  ReadResult,
} from './types.ts';

export {
  CAPABILITY_REGISTRY,
  CONSERVATIVE_V1_POLICY,
  HISTOGRAM_REGISTRY,
  METRIC_REGISTRY,
  REASON_CODES,
  histogramBucketLabels,
  histogramDefinition,
  metricDefinition,
  reasonLabel,
  type HistogramDefinition,
  type MetricDefinition,
} from './registry.ts';

/**
 * Presentation arithmetic the contract explicitly permits the UI to do.
 *
 * Exactly three things: formatting, dividing a numerator by a denominator, and
 * interpreting a histogram bucket. Everything else — deltas, impairment
 * classification, summary merging — is the producer's, and a helper here that
 * did any of it would be the beginning of a second implementation.
 */

import type { ImpairmentExposure, MetricAggregate } from './types.ts';
import { metricDefinition } from './registry.ts';

/**
 * A metric's value, or null when there is nothing to show.
 *
 * Null for an unavailable metric and null for a zero denominator — the contract
 * is explicit that a zero denominator yields an unavailable display value and
 * never a zero rate. "No packets were expected" is not "no packets were lost".
 */
export function metricValue(metric: MetricAggregate | undefined): number | null {
  if (!metric || metric.status === 'unavailable') return null;
  if (metric.numerator == null) return null;

  const definition = metricDefinition(metric.metricId);
  if (definition?.aggregation === 'sum') return metric.numerator;

  if (metric.denominator == null || metric.denominator === 0) return null;
  return metric.numerator / metric.denominator;
}

/**
 * The impaired share of assessed time, or null when nothing was assessed.
 *
 * The denominator is assessed time, never observed time: dividing by observed
 * time would quietly count unknown time as healthy, which is the single easiest
 * way to make a broken capture look like a good call.
 */
export function impairedShare(exposure: ImpairmentExposure | undefined): number | null {
  if (!exposure || exposure.assessedParticipantMs <= 0) return null;
  return exposure.impairedParticipantMs / exposure.assessedParticipantMs;
}

/** How much of the observed time nobody could judge. Null when none was observed. */
export function unknownShare(exposure: ImpairmentExposure | undefined): number | null {
  if (!exposure) return null;
  const observed =
    exposure.assessedParticipantMs + exposure.unknownParticipantMs;
  if (observed <= 0) return null;
  return exposure.unknownParticipantMs / observed;
}

/**
 * The bucket range a quantile falls in, as an index pair into the weights.
 *
 * Returns a *range*, not a number, because that is all a histogram supports.
 * The contract requires approximate quantiles to be displayed as bucket ranges
 * or clearly labelled approximations, and returning a single interpolated
 * figure here would make it impossible for a caller to honour that.
 */
export function quantileBucket(weights: readonly number[], quantile: number): number | null {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return null;

  const target = total * Math.min(Math.max(quantile, 0), 1);
  let running = 0;
  for (let i = 0; i < weights.length; i += 1) {
    running += weights[i] ?? 0;
    if (running >= target) return i;
  }
  return weights.length - 1;
}
