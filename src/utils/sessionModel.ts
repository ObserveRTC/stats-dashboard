/**
 * Pure session model builder — no React, no store access.
 *
 * Derives SFU/router-coloured client stints from:
 *   - routerSamples: server-side router snapshots (producers carry createdAt/closedAt)
 *   - callSession:   client list with optional joined/left times
 *   - panes:         loaded client stats (ClientSample[]) — used to infer which router each
 *                    client was on via outbound track producerId → router producer lookup
 */

import type { MediasoupRouterSample } from '../schema/MediasoupRouter.ts';
import type { CallSession, CallSummary } from '../api/types.ts';
import type { PaneEntry } from '../api/types.ts';

/* ── palette ───────────────────────────────────────────── */

const SFU_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#64748b', // slate
];

/* ── exported types ────────────────────────────────────── */

export interface SfuSummary {
  routerId: string;
  /** Human-friendly region label from router.attachments.region, or routerId slice */
  region: string;
  color: string;
  createdAt: number | null;
  closedAt: number | null;
  producerCount: number;
  consumerCount: number;
}

export interface ClientStint {
  routerId: string;
  region: string;
  color: string;
  /** epoch ms — null = unknown, use sessionStart as fallback */
  joined: number | null;
  /** epoch ms — null = ongoing, use sessionEnd as fallback */
  left: number | null;
}

export interface ClientStintSession {
  displayName?: string;
  stints: ClientStint[];
  /** true if client samples were loaded and stints were derived from them */
  fromPaneData: boolean;
}

export interface SessionModel {
  sfuSummaries: SfuSummary[];
  clientStintSessions: Map<string, ClientStintSession>;
  sessionStart: number;
  sessionEnd: number;
  _clientLabelMap: Map<string, string>;
}

/* ── helpers ───────────────────────────────────────────── */

function routerRegion(sample: MediasoupRouterSample): string {
  const att = sample.attachments as Record<string, unknown> | undefined;
  if (!att) return sample.routerId.slice(0, 10);
  if (typeof att.region === 'string' && att.region) return att.region;
  if (typeof att.sfuId === 'string' && att.sfuId) return att.sfuId.slice(0, 10);
  return sample.routerId.slice(0, 10);
}

/** Build Map<producerId, routerId> from all router samples */
function buildProducerRouterMap(routerSamples: Map<string, MediasoupRouterSample>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [routerId, sample] of routerSamples) {
    for (const p of sample.producers ?? []) {
      if (p.id) m.set(p.id, routerId);
    }
  }
  return m;
}

/**
 * Derive stints for a client whose samples are loaded.
 * Scans outbound RTP producerIds → look up which router → build a stint per router.
 */
function deriveStintsFromPane(
  statsData: readonly { timestamp: number; peerConnections?: Array<{
    outboundRtp?: Array<Record<string, unknown>>;
    outboundTracks?: Array<{ attachments?: Record<string, unknown> }>;
  }> }[],
  producerRouterMap: Map<string, string>,
  sfuMap: Map<string, SfuSummary>,
): ClientStint[] {
  // Collect which router IDs appear and the time range for each
  const routerTimes = new Map<string, { minTs: number; maxTs: number }>();

  for (const sample of statsData) {
    const ts = sample.timestamp;
    for (const pc of sample.peerConnections ?? []) {
      // outbound RTP level
      for (const rtp of pc.outboundRtp ?? []) {
        const pid = rtp.producerId as string | undefined;
        if (pid) {
          const rid = producerRouterMap.get(pid);
          if (rid) {
            const entry = routerTimes.get(rid);
            if (!entry) routerTimes.set(rid, { minTs: ts, maxTs: ts });
            else { entry.minTs = Math.min(entry.minTs, ts); entry.maxTs = Math.max(entry.maxTs, ts); }
          }
        }
      }
      // track-level attachments
      for (const track of pc.outboundTracks ?? []) {
        const pid = track.attachments?.producerId as string | undefined;
        if (pid) {
          const rid = producerRouterMap.get(pid);
          if (rid) {
            const entry = routerTimes.get(rid);
            if (!entry) routerTimes.set(rid, { minTs: ts, maxTs: ts });
            else { entry.minTs = Math.min(entry.minTs, ts); entry.maxTs = Math.max(entry.maxTs, ts); }
          }
        }
      }
    }
  }

  if (routerTimes.size === 0) return [];

  return Array.from(routerTimes.entries())
    .sort((a, b) => a[1].minTs - b[1].minTs)
    .map(([rid, times]) => {
      const sfu = sfuMap.get(rid);
      return {
        routerId: rid,
        region: sfu?.region ?? rid.slice(0, 10),
        color: sfu?.color ?? '#6b7280',
        joined: times.minTs,
        left: times.maxTs,
      };
    });
}

/**
 * Build display labels per client, preferring resolved displayName (pane stats >
 * call-summary > API session name) and disambiguating duplicates as "Name (P2)".
 * Falls back to the existing callSession label when no name is known at all.
 */
function buildClientLabelMap(
  clientStintSessions: Map<string, ClientStintSession>,
  fallbackLabels?: Map<string, string>,
): Map<string, string> {
  const entries = Array.from(clientStintSessions.entries());
  const nameCount = new Map<string, number>();
  for (const [, s] of entries) {
    const dn = s.displayName ?? '';
    if (dn) nameCount.set(dn, (nameCount.get(dn) ?? 0) + 1);
  }

  const map = new Map<string, string>();
  let anonIdx = 0;
  for (const [clientId, s] of entries) {
    const dn = s.displayName ?? '';
    if (dn && nameCount.get(dn) === 1) {
      map.set(clientId, dn);
    } else if (dn) {
      anonIdx++;
      map.set(clientId, `${dn} (P${anonIdx})`);
    } else if (fallbackLabels?.has(clientId)) {
      map.set(clientId, fallbackLabels.get(clientId)!);
    } else {
      anonIdx++;
      map.set(clientId, `P${anonIdx}`);
    }
  }
  return map;
}

/* ── main builder ──────────────────────────────────────── */

export function buildSessionModel(
  routerSamples: Map<string, MediasoupRouterSample>,
  callSession: CallSession,
  panes: Map<string, PaneEntry>,
  callSummary?: CallSummary | null,
): SessionModel {
  const now = Date.now();

  // ── SFU summaries ──────────────────────────────────────
  const sfuSummaries: SfuSummary[] = [];
  const sfuMap = new Map<string, SfuSummary>();

  let idx = 0;
  for (const [routerId, sample] of routerSamples) {
    const summary: SfuSummary = {
      routerId,
      region: routerRegion(sample),
      color: SFU_PALETTE[idx % SFU_PALETTE.length],
      createdAt: typeof sample.createdAt === 'number' ? sample.createdAt : null,
      closedAt: typeof sample.closedAt === 'number' ? sample.closedAt : null,
      producerCount: sample.producers?.length ?? 0,
      consumerCount: sample.consumers?.length ?? 0,
    };
    sfuSummaries.push(summary);
    sfuMap.set(routerId, summary);
    idx++;
  }

  // ── session bounds ─────────────────────────────────────
  let sessionStart = callSession.callStart;
  let sessionEnd   = callSession.callEnd;

  // expand from router timing
  for (const [, sample] of routerSamples) {
    if (typeof sample.createdAt === 'number') sessionStart = Math.min(sessionStart, sample.createdAt);
    const end = typeof sample.closedAt === 'number' ? sample.closedAt : now;
    sessionEnd = Math.max(sessionEnd, end);
  }

  // any router without closedAt → call is ongoing
  const isOngoing = Array.from(routerSamples.values()).some(s => !s.closedAt);
  if (isOngoing) sessionEnd = Math.max(sessionEnd, now);

  if (!isFinite(sessionStart)) sessionStart = now - 60_000;
  if (!isFinite(sessionEnd) || sessionEnd <= sessionStart) sessionEnd = sessionStart + 60_000;

  // ── producer → router lookup ───────────────────────────
  const producerRouterMap = buildProducerRouterMap(routerSamples);

  // ── client sessions ───────────────────────────────
  const clientStintSessions = new Map<string, ClientStintSession>();

  for (const [clientId, cs] of callSession.clientSessions) {
    const pane = panes.get(clientId);
    let stints: ClientStint[] = [];
    let fromPaneData = false;

    if (pane?.statsData && pane.statsData.length > 0 && producerRouterMap.size > 0) {
      // derive stints from actual sample data
      stints = deriveStintsFromPane(
        pane.statsData as Parameters<typeof deriveStintsFromPane>[0],
        producerRouterMap,
        sfuMap,
      );
      fromPaneData = stints.length > 0;
    }

    if (!fromPaneData) {
      // fallback: single "unknown router" stint spanning joined → left
      // Use a neutral color; only rendered if joined/left are known or as full-span bar
      const j = cs.joined ?? null;
      const l = cs.left ?? null;
      if (j !== null || l !== null) {
        // only add if we have at least one timestamp anchor
        stints = [{
          routerId: '',
          region: '',
          color: '#6b7280',
          joined: j,
          left: l,
        }];
      }
    }

    const summaryName = callSummary?.clients?.[clientId]?.displayName;
    clientStintSessions.set(clientId, {
      displayName: pane?.displayName ?? summaryName ?? cs.displayName,
      stints,
      fromPaneData,
    });
  }

  // ── client label map ───────────────────────────────────
  // Rebuild labels so call-summary display names are reflected (the callSession
  // labels only know about pane/API names, not call-summary.json).
  const _clientLabelMap = buildClientLabelMap(clientStintSessions, callSession._clientLabelMap);

  return { sfuSummaries, clientStintSessions, sessionStart, sessionEnd, _clientLabelMap };
}
