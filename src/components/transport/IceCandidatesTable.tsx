'use client';
import { useState } from 'react';
import { formatBytes, shortId } from '../../utils/formatting.ts';
import { IdBadge } from '../sections/IdBadge.tsx';
import styles from './IceCandidatesTable.module.css';

interface TransportTuple {
  localIp: string;
  localPort: number;
  remoteIp: string;
  remotePort: number;
  protocol: string;
}

interface IceCandidatesTableProps {
  candidates: unknown[];
  pairs: unknown[];
  tuple?: TransportTuple;
}

function toRecord(v: unknown): Record<string, unknown> {
  return (v != null && typeof v === 'object' ? v : {}) as Record<string, unknown>;
}

const STATE_PRIORITY: Record<string, number> = {
  succeeded: 0,
  'in-progress': 1,
  waiting: 2,
  frozen: 3,
  failed: 4,
};

function pairSortKey(pair: Record<string, unknown>): number {
  const nominated = pair.nominated ? 0 : 1;
  const state = STATE_PRIORITY[String(pair.state ?? '')] ?? 3;
  const bytes = -((Number(pair.bytesSent) || 0) + (Number(pair.bytesReceived) || 0));
  return nominated * 1e12 + state * 1e9 + bytes;
}

function candidateLabel(cand: Record<string, unknown> | null): string {
  if (!cand) return '?';
  const type = String(cand.candidateType ?? cand.type ?? '?');
  const proto = String(cand.protocol ?? cand.transport ?? '');
  const addr = String(cand.address ?? cand.ip ?? cand.ipAddress ?? '');
  const port = String(cand.port ?? '');
  const parts = [`${type} ${proto} ${addr}${port ? ':' + port : ''}`];
  const relayProto = cand.relayProtocol ?? cand.localRelayProtocol ?? cand.turnProtocol;
  if (relayProto) parts.push(`via ${String(relayProto)}`);
  const url = cand.url ?? cand.relayUrl ?? cand.turnUrl ?? cand.serverUrl;
  if (url) parts.push(`(${String(url)})`);
  return parts.join(' ').trim();
}

function candidateDetail(cand: Record<string, unknown> | null): string[] {
  if (!cand) return [];
  const lines: string[] = [];
  const net = String(cand.networkType ?? '');
  if (net) lines.push(`Network: ${net}`);
  const pri = cand.priority;
  if (pri != null) lines.push(`Priority: ${Number(pri).toLocaleString()}`);
  return lines;
}

/**
 * Fill in missing candidate fields from the pair object.
 * Candidate pair stats often carry localAddress/remoteAddress etc.
 * that the standalone candidate entry is missing.
 */
function enrichCandidate(
  candMap: Map<string, Record<string, unknown>>,
  pair: Record<string, unknown>,
  side: 'local' | 'remote',
) {
  const idKey = side === 'local' ? 'localCandidateId' : 'remoteCandidateId';
  const candId = String(pair[idKey] ?? '');
  if (!candId) return;

  let cand = candMap.get(candId);
  if (!cand) {
    cand = { id: candId };
    candMap.set(candId, cand);
  }

  const prefix = side === 'local' ? 'local' : 'remote';
  const fillFrom = (candField: string, ...pairFields: string[]) => {
    if (cand![candField] != null && String(cand![candField]) !== '') return;
    for (const pf of pairFields) {
      if (pair[pf] != null && String(pair[pf]) !== '') {
        cand![candField] = pair[pf];
        return;
      }
    }
  };

  fillFrom('address', `${prefix}Address`, `${prefix}Ip`, `${prefix}Addr`);
  fillFrom('port', `${prefix}Port`);
  fillFrom('protocol', `${prefix}Protocol`);
  fillFrom('candidateType', `${prefix}CandidateType`);
  fillFrom('networkType', `${prefix}NetworkType`);
  fillFrom('relayProtocol', `${prefix}RelayProtocol`);
  if (side === 'local') {
    fillFrom('url', 'url', 'relayUrl', 'turnUrl', 'serverUrl');
  }
}

export function IceCandidatesTable({ candidates, pairs, tuple }: IceCandidatesTableProps) {
  const candidatesList = Array.isArray(candidates) ? candidates : [];
  const pairsList = Array.isArray(pairs) ? pairs : [];

  if (candidatesList.length === 0 && pairsList.length === 0) return null;

  const candMap = new Map<string, Record<string, unknown>>();
  for (const c of candidatesList) {
    const rec = toRecord(c);
    const id = String(rec.id ?? rec.candidateId ?? '');
    if (id) candMap.set(id, rec);
  }

  const sortedPairs = pairsList
    .map(toRecord)
    .sort((a, b) => pairSortKey(a) - pairSortKey(b));

  // Enrich candidates with fields from pairs (pairs often carry address/port/type
  // that the standalone candidate objects lack).
  for (const pair of sortedPairs) {
    enrichCandidate(candMap, pair, 'local');
    enrichCandidate(candMap, pair, 'remote');
  }

  // Last resort: use the server-side transport tuple to fill missing addresses
  // on the nominated/succeeded pair's candidates.
  if (tuple) {
    for (const pair of sortedPairs) {
      if (!pair.nominated && pair.state !== 'succeeded') continue;
      const localId = String(pair.localCandidateId ?? '');
      const remoteId = String(pair.remoteCandidateId ?? '');
      const localCand = localId ? candMap.get(localId) : undefined;
      const remoteCand = remoteId ? candMap.get(remoteId) : undefined;
      // The tuple's remoteIp:remotePort is the client's address as seen by the SFU
      if (localCand) {
        if (!localCand.address && !localCand.ip && !localCand.ipAddress) {
          localCand.address = tuple.remoteIp;
        }
        if (!localCand.port) {
          localCand.port = tuple.remotePort;
        }
        if (!localCand.protocol) {
          localCand.protocol = tuple.protocol;
        }
      }
      // The tuple's localIp:localPort is the SFU's address
      if (remoteCand) {
        if (!remoteCand.address && !remoteCand.ip && !remoteCand.ipAddress) {
          remoteCand.address = tuple.localIp;
        }
        if (!remoteCand.port) {
          remoteCand.port = tuple.localPort;
        }
        if (!remoteCand.protocol) {
          remoteCand.protocol = tuple.protocol;
        }
      }
    }
  }

  const nominated = sortedPairs.filter((p) => p.nominated);
  const rest = sortedPairs.filter((p) => !p.nominated);

  return (
    <div className={styles.wrapper}>
      {nominated.map((pair) => (
        <PairCard
          key={String(pair.id ?? pair.candidatePairId)}
          pair={pair}
          candMap={candMap}
          prominent
        />
      ))}
      {rest.length > 0 && (
        <OtherPairs pairs={rest} candMap={candMap} />
      )}
    </div>
  );
}

function PairCard({
  pair,
  candMap,
  prominent,
}: {
  pair: Record<string, unknown>;
  candMap: Map<string, Record<string, unknown>>;
  prominent?: boolean;
}) {
  const id = String(pair.id ?? pair.candidatePairId ?? '');
  const state = String(pair.state ?? '');
  const localCand = candMap.get(String(pair.localCandidateId ?? '')) ?? null;
  const remoteCand = candMap.get(String(pair.remoteCandidateId ?? '')) ?? null;
  const bytesSent = Number(pair.bytesSent) || 0;
  const bytesRecv = Number(pair.bytesReceived) || 0;
  const nominated = !!pair.nominated;

  return (
    <div className={`${styles.pairCard} ${prominent ? styles.pairCardProminent : ''}`}>
      <div className={styles.pairHeader}>
        <PairStateBadge state={state} />
        {nominated && <span className={styles.nominatedTag}>nominated</span>}
        <IdBadge value={id}>{shortId(id, 14)}</IdBadge>
        {(bytesSent > 0 || bytesRecv > 0) && (
          <span className={styles.pairBytes}>
            {formatBytes(bytesSent)} sent · {formatBytes(bytesRecv)} recv
          </span>
        )}
      </div>
      <div className={styles.pairBody}>
        <CandidateCard label="Local" cand={localCand} side="local" />
        <div className={styles.pairConnector}>
          <div className={styles.connectorLine} />
          <span className={styles.connectorArrow}>⇄</span>
          <div className={styles.connectorLine} />
        </div>
        <CandidateCard label="Remote" cand={remoteCand} side="remote" />
      </div>
    </div>
  );
}

function CandidateCard({
  label,
  cand,
  side,
}: {
  label: string;
  cand: Record<string, unknown> | null;
  side: 'local' | 'remote';
}) {
  const main = cand ? candidateLabel(cand) : 'Unknown';
  const details = candidateDetail(cand);
  const id = cand ? String(cand.id ?? cand.candidateId ?? '') : '';
  const meta = [id ? shortId(id, 12) : '', ...details].filter(Boolean).join(' · ');

  return (
    <div className={`${styles.candidateCard} ${side === 'local' ? styles.candidateLocal : styles.candidateRemote}`}>
      <div className={styles.candidateTopRow}>
        <span className={styles.candidateLabel}>{label}</span>
        <span className={styles.candidateMain}>{main}</span>
      </div>
      {meta && <div className={styles.candidateMeta}>{meta}</div>}
    </div>
  );
}

function OtherPairs({
  pairs,
  candMap,
}: {
  pairs: Record<string, unknown>[];
  candMap: Map<string, Record<string, unknown>>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group by state
  const byState = new Map<string, Record<string, unknown>[]>();
  for (const p of pairs) {
    const state = String(p.state ?? 'unknown');
    if (!byState.has(state)) byState.set(state, []);
    byState.get(state)!.push(p);
  }

  return (
    <details className={styles.otherPairs}>
      <summary className={styles.otherSummary}>
        Other pairs
        <span className={styles.tableCount}>{pairs.length}</span>
      </summary>
      <div className={styles.otherContent}>
        {[...byState.entries()].map(([state, statePairs]) => (
          <div key={state} className={styles.stateGroup}>
            <div className={styles.stateGroupHeader}>
              <PairStateBadge state={state} />
              <span className={styles.stateGroupCount}>{statePairs.length}</span>
            </div>
            <div className={styles.compactList}>
              {statePairs.map((pair) => {
                const id = String(pair.id ?? pair.candidatePairId ?? '');
                const localCand = candMap.get(String(pair.localCandidateId ?? '')) ?? null;
                const remoteCand = candMap.get(String(pair.remoteCandidateId ?? '')) ?? null;
                const isExpanded = expanded === id;
                return (
                  <div key={id} className={styles.compactPair}>
                    <button
                      className={styles.compactRow}
                      onClick={() => setExpanded(isExpanded ? null : id)}
                    >
                      <span className={styles.compactLocal}>{candidateLabel(localCand)}</span>
                      <span className={styles.compactArrow}>→</span>
                      <span className={styles.compactRemote}>{candidateLabel(remoteCand)}</span>
                      <span className={styles.compactMeta}>
                        {formatBytes(Number(pair.bytesSent) || 0)} / {formatBytes(Number(pair.bytesReceived) || 0)}
                      </span>
                      <svg className={`${styles.compactChevron} ${isExpanded ? styles.compactChevronOpen : ''}`} viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className={styles.compactDetail}>
                        <div className={styles.pairBody}>
                          <CandidateCard label="Local" cand={localCand} side="local" />
                          <div className={styles.pairConnector}>
                            <div className={styles.connectorLine} />
                            <span className={styles.connectorArrow}>⇄</span>
                            <div className={styles.connectorLine} />
                          </div>
                          <CandidateCard label="Remote" cand={remoteCand} side="remote" />
                        </div>
                        <div className={styles.compactPairId}>Pair: <IdBadge value={id} /></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function PairStateBadge({ state }: { state: string }) {
  const cls =
    state === 'succeeded' ? styles.stateSucceeded :
    state === 'failed' ? styles.stateFailed :
    state === 'in-progress' ? styles.stateProgress :
    styles.stateDefault;
  return <span className={`${styles.stateBadge} ${cls}`}>{state}</span>;
}
