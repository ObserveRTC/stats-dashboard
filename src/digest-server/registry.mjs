/**
 * The contract registry.
 *
 * Read straight from `digest-schema/` at the repo root — the one thing this
 * processor and the dashboard share, and now the one copy of it. There used to
 * be a checksummed `vendor/` copy here, with a sync script and a drift check,
 * for a single reason: a Docker build context cannot reach outside the
 * directory it is given, and the image was built from this folder. It is built
 * from the repo root now (`Dockerfile.digest`), so the contract is in context
 * and the copy is gone.
 *
 * This is still the only module that knows where the contract comes from. When
 * `@observertc/digest-schema` is published, the two lines below become an
 * import of that package and nothing else here changes.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT = resolve(HERE, '..', '..', 'digest-schema');

const read = (...parts) => JSON.parse(readFileSync(join(CONTRACT, ...parts), 'utf8'));

export const METRIC_REGISTRY = read('registry', 'metrics.v1.json');
export const HISTOGRAM_REGISTRY = read('registry', 'histograms.v1.json');
export const CAPABILITY_REGISTRY = read('registry', 'capabilities.v1.json');
export const CONSERVATIVE_V1_POLICY = read('registry', 'policies', 'conservative-v1.json');

/** Identity of the calculation that produced a digest, for `provenance`. */
export const PROCESSOR_VERSION = 'digest-server-demo-0.1.0';
export const POLICY_ID = CONSERVATIVE_V1_POLICY.policyId;

/** Metric ids grouped by the stat family they are extracted from. */
export const METRICS_BY_FAMILY = {
  inboundRtpAudio: [
    'audio.inbound.loss',
    'audio.inbound.jitter',
    'audio.inbound.bitrate',
    'audio.inbound.speechConcealment',
    'audio.inbound.jitterBufferDelay',
  ],
  inboundRtpVideo: [
    'video.inbound.loss',
    'video.inbound.jitter',
    'video.inbound.bitrate',
    'video.inbound.freezeShare',
    'video.inbound.decodeTime',
    'video.inbound.fps',
  ],
  outboundRtpAudio: ['audio.outbound.bitrate'],
  outboundRtpVideo: [
    'video.outbound.bitrate',
    'video.outbound.encodeTime',
    'video.outbound.cpuLimitedShare',
    'video.outbound.bandwidthLimitedShare',
  ],
  remoteInboundAudio: ['audio.outbound.remoteLoss', 'audio.outbound.rtcpRtt'],
  remoteInboundVideo: ['video.outbound.remoteLoss', 'video.outbound.rtcpRtt'],
  candidatePair: ['transport.iceRtt'],
  transportBytesOut: ['transport.rtpBytesSent'],
  transportBytesIn: ['transport.rtpBytesReceived'],
};

/** Every metric id this process can produce at all. */
export const ALL_METRIC_IDS = [...new Set(Object.values(METRICS_BY_FAMILY).flat())];

/**
 * Metric ids in the registry that this app does not implement.
 *
 * Empty today, and checked by a test rather than asserted in prose: a registry
 * entry with no extractor would otherwise be silently absent from every digest,
 * which is the difference between "this build cannot measure it" and "nobody
 * noticed it was missing".
 */
export function unimplementedMetricIds() {
  return METRIC_REGISTRY.metrics
    .map((m) => m.metricId)
    .filter((id) => !ALL_METRIC_IDS.includes(id));
}
