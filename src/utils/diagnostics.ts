/**
 * Call diagnostics — the checks behind the dashboard's Diagnostics panel.
 *
 * Every check is computed from the mediasoup router samples the call route
 * already loads; nothing here is mocked and nothing calls the network. Each
 * returns a status plus a one-line detail naming the specific entity at
 * fault, so a failure points somewhere rather than just going red.
 */

import type { MediasoupRouterSample } from '../schema/MediasoupRouter.ts';
import type {
  MediasoupConsumerSample,
  MediasoupProducerSample,
  MediasoupTransportSample,
} from '../schema/MediasoupRouter.ts';
import { shortId } from './formatting.ts';

export type DiagnosticStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warn' | 'skipped';

export interface DiagnosticResult {
  status: DiagnosticStatus;
  detail: string;
}

export interface DiagnosticContext {
  routerSamples: Map<string, MediasoupRouterSample>;
}

export interface DiagnosticDefinition {
  key: string;
  label: string;
  run: (ctx: DiagnosticContext) => DiagnosticResult;
}

/* ── shared helpers ────────────────────────────────────── */

function allProducers(ctx: DiagnosticContext): MediasoupProducerSample[] {
  return Array.from(ctx.routerSamples.values()).flatMap((r) => r.producers ?? []);
}

function allConsumers(ctx: DiagnosticContext): MediasoupConsumerSample[] {
  return Array.from(ctx.routerSamples.values()).flatMap((r) => r.consumers ?? []);
}

function allTransports(ctx: DiagnosticContext): MediasoupTransportSample[] {
  return Array.from(ctx.routerSamples.values()).flatMap(
    (r) => (r.transports ?? []) as MediasoupTransportSample[],
  );
}

/** Format a short list of offending IDs without letting the detail line run away. */
function idList(ids: string[], max = 3): string {
  const shown = ids.slice(0, max).map((id) => shortId(id));
  const rest = ids.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ');
}

function byTimestamp<T extends { timestamp: number }>(history: T[]): T[] {
  return [...history].sort((a, b) => a.timestamp - b.timestamp);
}

/* ── 1. producers are consumed ─────────────────────────── */

/**
 * Every producer that was alive should have had at least one consumer.
 * Piped producers keep the original producer's id on the remote router, so a
 * single flat producerId lookup covers cross-router consumption too.
 */
const producersConsumed: DiagnosticDefinition = {
  key: 'producersConsumed',
  label: 'Check whether all producers are consumed',
  run: (ctx) => {
    const producers = allProducers(ctx);
    if (producers.length === 0) {
      return { status: 'skipped', detail: 'No producers found in the router samples.' };
    }

    const consumedProducerIds = new Set(allConsumers(ctx).map((c) => c.producerId));
    const orphans = producers.filter((p) => !consumedProducerIds.has(p.id));

    if (orphans.length === 0) {
      return {
        status: 'pass',
        detail: `All ${producers.length} producers have at least one consumer.`,
      };
    }

    const kinds = orphans.map((p) => p.kind);
    const audio = kinds.filter((k) => k === 'audio').length;
    const video = kinds.filter((k) => k === 'video').length;
    const breakdown = [audio ? `${audio} audio` : '', video ? `${video} video` : '']
      .filter(Boolean)
      .join(', ');

    return {
      status: 'fail',
      detail: `${orphans.length} of ${producers.length} producers were never consumed (${breakdown}): ${idList(orphans.map((p) => p.id))}.`,
    };
  },
};

/* ── 2. ICE connectivity ───────────────────────────────── */

const ICE_CONNECTED_EVENTS = new Set([
  'icestate-changed-to-connected',
  'icestate-changed-to-completed',
]);

/**
 * WebRTC transports should reach ICE connected/completed and stay there. A
 * transport that never connected is a hard failure; one that ended
 * disconnected without being closed is a warning — it may simply have been
 * torn down as the client left.
 */
const iceConnectivity: DiagnosticDefinition = {
  key: 'iceConnectivity',
  label: 'Check ICE connectivity',
  run: (ctx) => {
    const webrtc = allTransports(ctx).filter((t) => t.type === 'webrtc');
    if (webrtc.length === 0) {
      return { status: 'skipped', detail: 'No WebRTC transports found in the router samples.' };
    }

    const neverConnected: string[] = [];
    const droppedOut: string[] = [];

    for (const t of webrtc) {
      const iceEvents = byTimestamp(t.history ?? []).filter((e) =>
        e.type.startsWith('icestate-changed-to-'),
      );
      const reachedConnected =
        t.connectedAt != null || iceEvents.some((e) => ICE_CONNECTED_EVENTS.has(e.type));

      if (!reachedConnected) {
        neverConnected.push(t.id);
        continue;
      }

      const last = iceEvents[iceEvents.length - 1];
      if (last?.type === 'icestate-changed-to-disconnected' && t.closedAt == null) {
        droppedOut.push(t.id);
      }
    }

    if (neverConnected.length > 0) {
      return {
        status: 'fail',
        detail: `${neverConnected.length} of ${webrtc.length} WebRTC transports never reached ICE connected: ${idList(neverConnected)}.`,
      };
    }

    if (droppedOut.length > 0) {
      return {
        status: 'warn',
        detail: `All ${webrtc.length} transports connected, but ${droppedOut.length} ended disconnected without closing: ${idList(droppedOut)}.`,
      };
    }

    return {
      status: 'pass',
      detail: `ICE connected for all ${webrtc.length} WebRTC transports.`,
    };
  },
};

/* ── 3. consumer pause / resume ────────────────────────── */

/**
 * Walk each consumer's history and track the two independent pause flags
 * mediasoup exposes — the local one (`pause`/`resume`) and the producer-side
 * mirror (`producerPaused`/`producerResumed`). A consumer left locally paused
 * while its producer was running is the bug this check looks for: media stops
 * flowing and nothing ever restarts it.
 */
const consumerPauseResume: DiagnosticDefinition = {
  key: 'consumerPauseResume',
  label: 'Check whether consumers are paused and resumed correctly',
  run: (ctx) => {
    const consumers = allConsumers(ctx);
    if (consumers.length === 0) {
      return { status: 'skipped', detail: 'No consumers found in the router samples.' };
    }

    const producerClosedAt = new Map<string, number | undefined>();
    for (const p of allProducers(ctx)) producerClosedAt.set(p.id, p.closedAt);

    const stuckPaused: { id: string; since: number }[] = [];
    const producerStillPaused: string[] = [];

    for (const c of consumers) {
      if (c.closedAt != null) continue; // torn down; a lingering pause is moot

      let locallyPaused = false;
      let pausedSince = 0;
      let producerPaused = false;

      for (const e of byTimestamp(c.history ?? [])) {
        switch (e.type) {
          case 'pause':
            locallyPaused = true;
            pausedSince = e.timestamp;
            break;
          case 'resume':
            locallyPaused = false;
            break;
          case 'producerPaused':
            producerPaused = true;
            break;
          case 'producerResumed':
            producerPaused = false;
            break;
          default:
            break;
        }
      }

      const producerAlive = producerClosedAt.get(c.producerId) == null;
      if (locallyPaused && producerAlive) stuckPaused.push({ id: c.id, since: pausedSince });
      else if (producerPaused && producerAlive) producerStillPaused.push(c.id);
    }

    if (stuckPaused.length > 0) {
      const first = stuckPaused[0];
      const when = first.since ? ` (${new Date(first.since).toLocaleTimeString()})` : '';
      return {
        status: 'fail',
        detail: `${stuckPaused.length} consumer${stuckPaused.length === 1 ? '' : 's'} paused and never resumed while the producer was still active — ${shortId(first.id)}${when}${stuckPaused.length > 1 ? `, plus ${stuckPaused.length - 1} more` : ''}.`,
      };
    }

    if (producerStillPaused.length > 0) {
      return {
        status: 'warn',
        detail: `${producerStillPaused.length} consumer${producerStillPaused.length === 1 ? ' is' : 's are'} paused because the producer is paused: ${idList(producerStillPaused)}.`,
      };
    }

    return {
      status: 'pass',
      detail: `All ${consumers.length} consumers resumed correctly after every pause.`,
    };
  },
};

export const DIAGNOSTICS: DiagnosticDefinition[] = [
  producersConsumed,
  iceConnectivity,
  consumerPauseResume,
];

/** Human-readable status labels for the diagnostics panel. */
export const DIAGNOSTIC_STATUS_LABEL: Record<DiagnosticStatus, string> = {
  idle: 'Not run',
  running: 'Running…',
  pass: 'Pass',
  fail: 'Fail',
  warn: 'Warning',
  skipped: 'No data',
};
