/**
 * What happened to one ICE candidate, over the whole session.
 *
 * ## Why this is not just the candidate table
 *
 * The ICE candidates section reads the *latest* value of every candidate and
 * every pair, which answers "what did this client gather" and nothing else. It
 * cannot answer the question people actually bring to it — why did this call
 * connect the way it did, and what happened to the alternatives — because
 * every fact that would answer it is a change over time:
 *
 *   - a host candidate that was gathered and never paired with anything
 *   - a pair that reached `succeeded` and was never nominated
 *   - a relay pair nominated only after the direct pair failed
 *   - the pair that was selected, lost, and re-selected twenty seconds later
 *   - a candidate that stopped being reported halfway through, because an ICE
 *     restart threw the whole checklist away
 *
 * Every one of those is invisible in a snapshot and obvious in a sequence. So
 * this walks the samples in order and records the transitions, per candidate,
 * with the pair each one happened on.
 *
 * ## What counts as evidence
 *
 * Only what the browser reported. A candidate's story starts at the first
 * sample it appeared in — which is when it was *observed*, not necessarily when
 * it was gathered, since the first stats poll can be seconds after the fact —
 * and the labels say "first seen" rather than "gathered" for that reason.
 * Nothing is inferred about a candidate the browser stopped reporting except
 * that it stopped being reported.
 *
 * `nominated` and `selected` are deliberately separate. Nomination is the ICE
 * agent saying a pair is usable; selection is the transport actually using it,
 * read from `RTCIceTransport.selectedCandidatePairId`. They usually coincide
 * and the interesting cases are the ones where they do not.
 */

import type {
  ClientSample,
  IceCandidateStats,
  IceCandidatePairStats,
} from '../schema/ClientSample.ts';

export type CandidateRole = 'local' | 'remote' | 'unknown';

/** How a line reads: a success, a problem, or neither. */
export type StoryTone = 'neutral' | 'good' | 'warn' | 'bad';

export interface CandidateStoryEvent {
  at: number;
  /** Milliseconds since the peer connection's first sample. */
  offsetMs: number;
  kind:
    | 'first-seen'
    | 'paired'
    | 'pair-state'
    | 'nominated'
    | 'selected'
    | 'deselected'
    | 'traffic'
    | 'ice-restart'
    | 'candidate-error'
    | 'last-seen';
  title: string;
  detail?: string;
  /** The pair this happened on, when it is about one. */
  pairId?: string;
  tone: StoryTone;
}

export interface CandidatePairStory {
  pairId: string;
  /** The candidate at the other end, as `type address:port` when known. */
  peerLabel: string;
  peerType?: string;
  /** Checklist states in the order they were observed. */
  states: Array<{ at: number; state: string }>;
  finalState?: string;
  nominatedAt?: number;
  /** Stretches when the transport had this pair selected. `to` null = still. */
  selectedWindows: Array<{ from: number; to: number | null }>;
  bytesSent: number | null;
  bytesReceived: number | null;
  requestsSent: number | null;
  responsesReceived: number | null;
  /** Round-trip time over the pair's life, in ms. */
  rttMs: { min: number; max: number; last: number } | null;
  firstSeen: number;
  lastSeen: number;
}

export interface CandidateStory {
  pcId: string;
  candidateId: string;
  role: CandidateRole;
  candidateType?: string;
  /** One sentence: how this candidate's session ended up. */
  verdict: string;
  verdictTone: StoryTone;
  firstSeen: number;
  lastSeen: number;
  /** Total time any pair of this candidate was the transport's selected pair. */
  selectedMs: number;
  /** True when the browser stopped reporting it before the session ended. */
  disappeared: boolean;
  events: CandidateStoryEvent[];
  pairs: CandidatePairStory[];
}

/* ── helpers ───────────────────────────────────────────── */

function tsOf(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Normalize the checklist state.
 *
 * The schema accepts two spellings the spec does not: `inprogress` (a real
 * browser variant) and `new`/`cancelled` (pre-2016 values). Folding the
 * spelling means a pair that changed nothing does not read as a transition.
 */
function normalizeState(state: string | undefined): string | undefined {
  if (!state) return undefined;
  return state === 'inprogress' ? 'in-progress' : state;
}

function candidateLabel(candidate: IceCandidateStats | undefined): string {
  if (!candidate) return 'unknown candidate';
  const where = [candidate.address, candidate.port].filter((p) => p != null).join(':');
  const parts = [candidate.candidateType, where || undefined, candidate.protocol];
  const label = parts.filter(Boolean).join(' ');
  return label || candidate.id;
}

/**
 * A candidate pair's cumulative counter.
 *
 * The last value, not the change across our observations. These counters start
 * at zero when the *pair* is created, so the final reading is already the
 * pair's lifetime total — and subtracting the first observation would quietly
 * discard whatever flowed before the first stats poll, which on a pair that
 * connected immediately is most of the handshake.
 */
function total(last: number | undefined): number | null {
  return typeof last === 'number' && Number.isFinite(last) && last >= 0 ? last : null;
}

/* ── per-peer-connection accumulation ──────────────────── */

interface PairAccumulator {
  pairId: string;
  localCandidateId?: string;
  remoteCandidateId?: string;
  states: Array<{ at: number; state: string }>;
  nominatedAt?: number;
  selectedWindows: Array<{ from: number; to: number | null }>;
  firstSeen: number;
  lastSeen: number;
  lastStats: IceCandidatePairStats;
  rtts: number[];
  lastRtt?: number;
  /** First moment bytes were seen to advance on this pair. */
  trafficAt?: number;
  lastBytes: number;
}

interface PcAccumulator {
  pcId: string;
  firstSampleAt: number;
  lastSampleAt: number;
  candidates: Map<string, { first: IceCandidateStats; last: IceCandidateStats; firstSeen: number; lastSeen: number }>;
  pairs: Map<string, PairAccumulator>;
  selectedPairId?: string;
  /** ICE restarts and candidate errors, to fold into the affected stories. */
  restarts: Array<{ at: number; outcome?: string; generation?: number }>;
  errors: Array<{ at: number; url?: string; address?: string; text?: string; code?: number }>;
}

function pcIdOf(pc: Record<string, unknown>): string {
  const id = pc.peerConnectionId;
  if (typeof id === 'string' && id) return id;
  return `pc-${pc.index ?? '?'}`;
}

function accumulate(samples: ClientSample[]): Map<string, PcAccumulator> {
  const pcs = new Map<string, PcAccumulator>();

  const ordered = [...samples].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  for (const sample of ordered) {
    const sampleAt = tsOf(sample.timestamp, 0);

    for (const pc of sample.peerConnections ?? []) {
      const pcId = pcIdOf(pc as unknown as Record<string, unknown>);
      let acc = pcs.get(pcId);
      if (!acc) {
        acc = {
          pcId,
          firstSampleAt: sampleAt,
          lastSampleAt: sampleAt,
          candidates: new Map(),
          pairs: new Map(),
          restarts: [],
          errors: [],
        };
        pcs.set(pcId, acc);
      }
      if (sampleAt > 0) {
        if (acc.firstSampleAt === 0 || sampleAt < acc.firstSampleAt) acc.firstSampleAt = sampleAt;
        if (sampleAt > acc.lastSampleAt) acc.lastSampleAt = sampleAt;
      }

      /* candidates */
      for (const candidate of pc.iceCandidates ?? []) {
        if (!candidate?.id) continue;
        const at = tsOf(candidate.timestamp, sampleAt);
        const seen = acc.candidates.get(candidate.id);
        if (!seen) {
          acc.candidates.set(candidate.id, {
            first: candidate,
            last: candidate,
            firstSeen: at,
            lastSeen: at,
          });
        } else {
          seen.last = candidate;
          seen.lastSeen = at;
        }
      }

      /* pairs */
      for (const pair of pc.iceCandidatePairs ?? []) {
        if (!pair?.id) continue;
        const at = tsOf(pair.timestamp, sampleAt);
        const state = normalizeState(pair.state);
        const bytes = (pair.bytesSent ?? 0) + (pair.bytesReceived ?? 0);

        let pa = acc.pairs.get(pair.id);
        if (!pa) {
          pa = {
            pairId: pair.id,
            localCandidateId: pair.localCandidateId,
            remoteCandidateId: pair.remoteCandidateId,
            states: state ? [{ at, state }] : [],
            selectedWindows: [],
            firstSeen: at,
            lastSeen: at,
            lastStats: pair,
            rtts: [],
            lastBytes: bytes,
          };
          if (pair.nominated) pa.nominatedAt = at;
          acc.pairs.set(pair.id, pa);
        } else {
          pa.lastSeen = at;
          pa.lastStats = pair;
          // Candidate ids can appear on a later sample than the pair itself.
          pa.localCandidateId ??= pair.localCandidateId;
          pa.remoteCandidateId ??= pair.remoteCandidateId;

          const previous = pa.states.length ? pa.states[pa.states.length - 1].state : undefined;
          if (state && state !== previous) pa.states.push({ at, state });
          if (pair.nominated && pa.nominatedAt == null) pa.nominatedAt = at;
          if (bytes > pa.lastBytes && pa.trafficAt == null) pa.trafficAt = at;
          pa.lastBytes = Math.max(pa.lastBytes, bytes);
        }

        if (typeof pair.currentRoundTripTime === 'number' && pair.currentRoundTripTime >= 0) {
          const ms = pair.currentRoundTripTime * 1000;
          pa.rtts.push(ms);
          pa.lastRtt = ms;
        }
      }

      /* which pair the transport is actually using */
      for (const transport of pc.iceTransports ?? []) {
        const selected = transport?.selectedCandidatePairId;
        const at = tsOf(transport?.timestamp, sampleAt);
        if (selected === acc.selectedPairId) continue;

        // Close the window on the pair we are leaving...
        if (acc.selectedPairId) {
          const previous = acc.pairs.get(acc.selectedPairId);
          const open = previous?.selectedWindows.find((w) => w.to === null);
          if (open) open.to = at;
        }
        // ...and open one on the pair we moved to.
        if (selected) {
          const next = acc.pairs.get(selected);
          if (next) next.selectedWindows.push({ from: at, to: null });
        }
        acc.selectedPairId = selected ?? undefined;
      }

      /* events that explain a candidate vanishing */
      for (const event of sample.clientEvents ?? []) {
        const at = tsOf(event.timestamp, sampleAt);
        const payload = readPayload(event.payload);
        if (event.type === 'ICE_RESTART') {
          if (payload.peerConnectionId != null && payload.peerConnectionId !== pcId) continue;
          acc.restarts.push({
            at,
            outcome: typeof payload.outcome === 'string' ? payload.outcome : undefined,
            generation: typeof payload.iceGeneration === 'number' ? payload.iceGeneration : undefined,
          });
        } else if (event.type === 'ICE_CANDIDATE_ERROR') {
          acc.errors.push({
            at,
            url: typeof payload.url === 'string' ? payload.url : undefined,
            address: typeof payload.address === 'string' ? payload.address : undefined,
            text: typeof payload.errorText === 'string' ? payload.errorText : undefined,
            code: typeof payload.errorCode === 'number' ? payload.errorCode : undefined,
          });
        }
      }
    }
  }

  return pcs;
}

/** Client event payloads are a JSON document on some vintages, an object on others. */
function readPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object') return payload as Record<string, unknown>;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

/* ── the story ─────────────────────────────────────────── */

const STATE_TONE: Record<string, StoryTone> = {
  succeeded: 'good',
  failed: 'bad',
  cancelled: 'warn',
  'in-progress': 'neutral',
  waiting: 'neutral',
  frozen: 'neutral',
  new: 'neutral',
};

function humanMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function verdictFor(
  pairs: CandidatePairStory[],
  selectedMs: number,
  selectedStretches: number,
  disappeared: boolean,
): { verdict: string; tone: StoryTone } {
  if (pairs.length === 0) {
    return {
      // The single most common thing a reader is trying to establish about a
      // candidate that is not the one in use.
      verdict: 'Never paired — no candidate pair was ever formed with it, so it was never a route.',
      tone: 'warn',
    };
  }

  if (selectedMs > 0) {
    const across =
      selectedStretches > 1
        ? ` across ${selectedStretches} stretches — the path was lost and re-selected`
        : '';
    const ending = disappeared ? ', and it stopped being reported before the session ended' : '';
    return {
      verdict: `Carried the connection for ${humanMs(selectedMs)}${across}${ending}.`,
      tone: selectedStretches > 1 ? 'warn' : 'good',
    };
  }

  if (pairs.some((p) => p.nominatedAt != null)) {
    return {
      verdict: 'Nominated but never selected — the agent judged it usable and the transport used another pair.',
      tone: 'warn',
    };
  }

  const finals = pairs.map((p) => p.finalState);
  if (finals.some((s) => s === 'succeeded')) {
    return {
      verdict: 'Connectivity checks succeeded, but it was never nominated — a viable backup route that was not needed.',
      tone: 'neutral',
    };
  }
  if (finals.length > 0 && finals.every((s) => s === 'failed')) {
    return {
      verdict: 'Every connectivity check on it failed — nothing got through on this route.',
      tone: 'bad',
    };
  }
  if (finals.some((s) => s === 'failed')) {
    return { verdict: 'Some checks failed, none succeeded.', tone: 'bad' };
  }
  return {
    verdict: 'Checks never completed — the pairs were still frozen, waiting or in progress when reporting stopped.',
    tone: 'warn',
  };
}

/**
 * Build one story per candidate, keyed by peer connection then candidate id.
 */
export function buildIceCandidateStories(
  samples: ClientSample[],
): Map<string, Map<string, CandidateStory>> {
  const out = new Map<string, Map<string, CandidateStory>>();

  for (const [pcId, acc] of accumulate(samples)) {
    const byCandidate = new Map<string, CandidateStory>();
    const pairsByCandidate = new Map<string, PairAccumulator[]>();

    for (const pair of acc.pairs.values()) {
      for (const candidateId of [pair.localCandidateId, pair.remoteCandidateId]) {
        if (!candidateId) continue;
        const list = pairsByCandidate.get(candidateId) ?? [];
        list.push(pair);
        pairsByCandidate.set(candidateId, list);
      }
    }

    for (const [candidateId, seen] of acc.candidates) {
      const isLocal = [...acc.pairs.values()].some((p) => p.localCandidateId === candidateId);
      const isRemote = [...acc.pairs.values()].some((p) => p.remoteCandidateId === candidateId);
      const role: CandidateRole = isLocal ? 'local' : isRemote ? 'remote' : 'unknown';

      const events: CandidateStoryEvent[] = [];
      const offsetOf = (at: number) => Math.max(0, at - acc.firstSampleAt);
      const push = (event: Omit<CandidateStoryEvent, 'offsetMs'>) =>
        events.push({ ...event, offsetMs: offsetOf(event.at) });

      push({
        at: seen.firstSeen,
        kind: 'first-seen',
        title: role === 'remote' ? 'Received from the remote peer' : 'First seen in stats',
        detail: candidateLabel(seen.first),
        tone: 'neutral',
      });

      const pairStories: CandidatePairStory[] = [];
      let selectedMs = 0;
      let selectedStretches = 0;

      for (const pair of pairsByCandidate.get(candidateId) ?? []) {
        const otherId =
          pair.localCandidateId === candidateId ? pair.remoteCandidateId : pair.localCandidateId;
        const other = otherId ? acc.candidates.get(otherId)?.last : undefined;
        const peerLabel = candidateLabel(other);

        const story: CandidatePairStory = {
          pairId: pair.pairId,
          peerLabel,
          peerType: other?.candidateType,
          states: pair.states,
          finalState: pair.states.length ? pair.states[pair.states.length - 1].state : undefined,
          nominatedAt: pair.nominatedAt,
          selectedWindows: pair.selectedWindows,
          bytesSent: total(pair.lastStats.bytesSent),
          bytesReceived: total(pair.lastStats.bytesReceived),
          requestsSent: total(pair.lastStats.requestsSent),
          responsesReceived: total(pair.lastStats.responsesReceived),
          rttMs: pair.rtts.length
            ? {
                min: Math.min(...pair.rtts),
                max: Math.max(...pair.rtts),
                last: pair.lastRtt ?? pair.rtts[pair.rtts.length - 1],
              }
            : null,
          firstSeen: pair.firstSeen,
          lastSeen: pair.lastSeen,
        };
        pairStories.push(story);

        push({
          at: pair.firstSeen,
          kind: 'paired',
          title: 'Paired',
          detail: `with ${peerLabel}`,
          pairId: pair.pairId,
          tone: 'neutral',
        });

        // The first state is part of "paired"; only the changes are news.
        for (const change of pair.states.slice(1)) {
          push({
            at: change.at,
            kind: 'pair-state',
            title: `Check ${change.state}`,
            detail: `on the pair with ${peerLabel}`,
            pairId: pair.pairId,
            tone: STATE_TONE[change.state] ?? 'neutral',
          });
        }

        if (pair.nominatedAt != null) {
          push({
            at: pair.nominatedAt,
            kind: 'nominated',
            title: 'Nominated',
            detail: `the pair with ${peerLabel} was judged usable`,
            pairId: pair.pairId,
            tone: 'good',
          });
        }

        for (const window of pair.selectedWindows) {
          selectedStretches += 1;
          const to = window.to ?? acc.lastSampleAt;
          selectedMs += Math.max(0, to - window.from);
          push({
            at: window.from,
            kind: 'selected',
            title: 'Selected by the transport',
            detail: `media started flowing over the pair with ${peerLabel}`,
            pairId: pair.pairId,
            tone: 'good',
          });
          if (window.to != null) {
            push({
              at: window.to,
              kind: 'deselected',
              title: 'No longer selected',
              detail: `after ${humanMs(window.to - window.from)} — the transport moved to another pair`,
              pairId: pair.pairId,
              tone: 'warn',
            });
          }
        }

        if (pair.trafficAt != null) {
          push({
            at: pair.trafficAt,
            kind: 'traffic',
            title: 'First bytes over the pair',
            detail: `with ${peerLabel}`,
            pairId: pair.pairId,
            tone: 'good',
          });
        }
      }

      for (const restart of acc.restarts) {
        if (restart.at < seen.firstSeen || restart.at > acc.lastSampleAt) continue;
        push({
          at: restart.at,
          kind: 'ice-restart',
          title: 'ICE restart on this peer connection',
          detail: [
            restart.outcome ? `outcome ${restart.outcome}` : null,
            restart.generation != null ? `generation ${restart.generation}` : null,
            'the checklist is rebuilt, so candidates and pairs are replaced',
          ]
            .filter(Boolean)
            .join(' · '),
          tone: 'warn',
        });
      }

      // Only errors that name this candidate's own server, so a TURN failure
      // does not get attached to every host candidate on the page.
      const url = seen.last.url;
      for (const error of acc.errors) {
        if (!url || error.url !== url) continue;
        push({
          at: error.at,
          kind: 'candidate-error',
          title: 'Candidate error from this server',
          detail: [error.code != null ? `${error.code}` : null, error.text, error.url]
            .filter(Boolean)
            .join(' · '),
          tone: 'bad',
        });
      }

      // Reporting stopping early is itself the finding — usually an ICE
      // restart, sometimes the candidate being pruned from the checklist.
      const disappeared = acc.lastSampleAt - seen.lastSeen > 0 && seen.lastSeen < acc.lastSampleAt;
      if (disappeared) {
        push({
          at: seen.lastSeen,
          kind: 'last-seen',
          title: 'Last reported',
          detail: `${humanMs(acc.lastSampleAt - seen.lastSeen)} before the last sample — the browser stopped reporting it`,
          tone: 'warn',
        });
      }

      events.sort((a, b) => a.at - b.at);

      const { verdict, tone } = verdictFor(pairStories, selectedMs, selectedStretches, disappeared);

      byCandidate.set(candidateId, {
        pcId,
        candidateId,
        role,
        candidateType: seen.last.candidateType,
        verdict,
        verdictTone: tone,
        firstSeen: seen.firstSeen,
        lastSeen: seen.lastSeen,
        selectedMs,
        disappeared,
        events,
        pairs: pairStories,
      });
    }

    out.set(pcId, byCandidate);
  }

  return out;
}
