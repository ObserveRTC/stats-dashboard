'use client';
import { Fragment, useMemo, useState } from 'react';
import type { ClientSample, IceCandidateStats, IceCandidatePairStats } from '../../schema/ClientSample.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { buildIceCandidateStories, type CandidateStory } from '../../utils/iceCandidateStory.ts';
import { CandidateStoryPanel } from './CandidateStoryPanel.tsx';
import styles from './pc.module.css';
import storyStyles from './CandidateStoryPanel.module.css';

interface IceCandidatesSectionProps {
  samples: ClientSample[];
  multiPc: boolean;
}

/* ── collect data per PC ────────────────────────────────── */

interface CandidateRow {
  id: string;
  role: 'local' | 'remote' | 'unknown';
  candidateType?: string;
  address?: string;
  port?: number;
  protocol?: string;
  relayProtocol?: string;
  url?: string;
  relatedAddress?: string;
  relatedPort?: number;
  priority?: number;
  tcpType?: string;
  usedInPair: boolean; // referenced by at least one candidate pair
}

interface PcGroup {
  pcId: string;
  candidates: CandidateRow[];
  pairs: IceCandidatePairStats[];
}

function collectGroups(samples: ClientSample[]): PcGroup[] {
  // accumulate latest-seen candidate & pair per (pcId, candidateId)
  const pcCandidates = new Map<string, Map<string, IceCandidateStats>>();
  const pcPairs      = new Map<string, Map<string, IceCandidatePairStats>>();

  for (const sample of samples) {
    for (const pc of sample.peerConnections ?? []) {
      const pcId = pc.peerConnectionId ?? `pc-${(pc as Record<string,unknown>).index ?? '?'}`;

      if (!pcCandidates.has(pcId)) pcCandidates.set(pcId, new Map());
      if (!pcPairs.has(pcId))      pcPairs.set(pcId, new Map());

      for (const c of pc.iceCandidates ?? []) {
        if (c.id) pcCandidates.get(pcId)!.set(c.id, c);
      }
      for (const p of pc.iceCandidatePairs ?? []) {
        if (p.id) pcPairs.get(pcId)!.set(p.id, p);
      }
    }
  }

  const groups: PcGroup[] = [];
  for (const [pcId, candMap] of pcCandidates) {
    const pairs = Array.from(pcPairs.get(pcId)?.values() ?? []);

    // build role map from pairs
    const localIds  = new Set(pairs.map(p => p.localCandidateId).filter(Boolean) as string[]);
    const remoteIds = new Set(pairs.map(p => p.remoteCandidateId).filter(Boolean) as string[]);

    const candidates: CandidateRow[] = Array.from(candMap.values()).map(c => ({
      id:             c.id,
      role:           localIds.has(c.id) ? 'local' : remoteIds.has(c.id) ? 'remote' : 'unknown',
      candidateType:  c.candidateType,
      address:        c.address,
      port:           c.port,
      protocol:       c.protocol,
      relayProtocol:  c.relayProtocol,
      url:            c.url,
      relatedAddress: c.relatedAddress,
      relatedPort:    c.relatedPort,
      priority:       c.priority,
      tcpType:        c.tcpType,
      usedInPair:     localIds.has(c.id) || remoteIds.has(c.id),
    }));

    // sort: local first, then remote, then unknown; within role sort by priority desc
    candidates.sort((a, b) => {
      const roleOrder = { local: 0, remote: 1, unknown: 2 };
      const ro = roleOrder[a.role] - roleOrder[b.role];
      if (ro !== 0) return ro;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

    groups.push({ pcId, candidates, pairs });
  }

  return groups;
}

/* ── badge helpers ──────────────────────────────────────── */

function TypeBadge({ type }: { type?: string }) {
  if (!type) return <span className={`${styles.typeBadge} ${styles.typeOther}`}>—</span>;
  const cls =
    type === 'host'  ? styles.typeHost :
    type === 'srflx' ? styles.typeSrflx :
    type === 'relay' ? styles.typeRelay :
    styles.typeOther;
  return <span className={`${styles.typeBadge} ${cls}`}>{type}</span>;
}

function RoleBadge({ role }: { role: 'local' | 'remote' | 'unknown' }) {
  const color =
    role === 'local'   ? '#10b981' :
    role === 'remote'  ? '#3b82f6' :
    '#6b7280';
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.1rem 0.45rem',
      borderRadius: 10,
      fontSize: '0.6rem',
      fontWeight: 600,
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      whiteSpace: 'nowrap',
    }}>
      {role}
    </span>
  );
}

/* ── per-PC candidate table ─────────────────────────────── */

/**
 * The candidates, each row opening onto that candidate's own story.
 *
 * The table alone is a snapshot — what was gathered, and its address. Whether
 * a candidate was ever paired, whether its checks passed, whether it was
 * nominated, whether it actually carried the call and when it stopped being
 * reported are all changes over time, and none of them fit in a cell. So the
 * row is a disclosure control and the sequence lives underneath it.
 */
function CandidateTable({
  candidates,
  stories,
}: {
  candidates: CandidateRow[];
  stories: Map<string, CandidateStory>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  if (!candidates.length) return <p className={styles.empty}>No candidates.</p>;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div style={{ overflowX: 'auto', marginBottom: '0.5rem' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} />
            <th className={styles.th}>Role</th>
            <th className={styles.th}>Type</th>
            <th className={styles.th}>Address</th>
            <th className={styles.th}>Port</th>
            <th className={styles.th}>Proto</th>
            <th className={styles.th}>Related address</th>
            <th className={styles.th}>URL / relay</th>
            <th className={styles.th}>Priority</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const relAddr = [c.relatedAddress, c.relatedPort].filter(Boolean).join(':') || '—';
            const urlRelay = c.url ?? c.relayProtocol ?? '—';
            const story = stories.get(c.id);
            const open = expanded.has(c.id);
            return (
              <Fragment key={c.id}>
                <tr
                  className={`${styles.tr} ${story ? storyStyles.clickableRow : ''}`}
                  title={story ? `${story.verdict}\n\nID: ${c.id}` : `ID: ${c.id}`}
                  onClick={story ? () => toggle(c.id) : undefined}
                >
                  <td className={`${styles.td} ${storyStyles.expandCell}`}>
                    {story && (
                      <button
                        type="button"
                        className={storyStyles.expandBtn}
                        aria-expanded={open}
                        aria-label={open ? 'Hide this candidate’s story' : 'Show this candidate’s story'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(c.id);
                        }}
                      >
                        <svg
                          className={open ? storyStyles.chevronOpen : storyStyles.chevron}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className={styles.td}><RoleBadge role={c.role} /></td>
                  <td className={styles.td}><TypeBadge type={c.candidateType} /></td>
                  <td className={styles.td} style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.68rem' }}>
                    {c.address ?? '—'}
                  </td>
                  <td className={styles.td} style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.68rem' }}>
                    {c.port ?? '—'}{c.tcpType ? ` (${c.tcpType})` : ''}
                  </td>
                  <td className={styles.td}>{c.protocol ?? '—'}</td>
                  <td className={styles.td} style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.68rem' }}>
                    {relAddr}
                  </td>
                  <td className={styles.td}>{urlRelay}</td>
                  <td className={styles.td} style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.65rem' }}>
                    {c.priority ?? '—'}
                  </td>
                </tr>
                {open && story && (
                  <tr>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <CandidateStoryPanel story={story} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── candidate pairs summary ────────────────────────────── */

function PairsSummary({ pairs }: { pairs: IceCandidatePairStats[] }) {
  const nominated = pairs.filter(p => p.nominated);
  if (!nominated.length && !pairs.length) return null;

  return (
    <div style={{ marginTop: '0.25rem', overflowX: 'auto' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
        Candidate Pairs{nominated.length ? ` · ${nominated.length} nominated` : ''}
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>State</th>
            <th className={styles.th}>Nominated</th>
            <th className={styles.th}>Local ID</th>
            <th className={styles.th}>Remote ID</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p, i) => (
            <tr key={p.id ?? i} className={styles.tr}>
              <td className={styles.td}>{p.state ?? '—'}</td>
              <td className={styles.td}>{p.nominated ? '✓' : '—'}</td>
              <td className={styles.td} title={p.localCandidateId ?? ''} style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.65rem' }}>
                {p.localCandidateId ? p.localCandidateId.slice(0, 14) + '…' : '—'}
              </td>
              <td className={styles.td} title={p.remoteCandidateId ?? ''} style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.65rem' }}>
                {p.remoteCandidateId ? p.remoteCandidateId.slice(0, 14) + '…' : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── main section ───────────────────────────────────────── */

const EMPTY_STORIES: Map<string, CandidateStory> = new Map();

export function IceCandidatesSection({ samples, multiPc }: IceCandidatesSectionProps) {
  const groups = useMemo(() => collectGroups(samples), [samples]);
  // The sequence behind every row, built once for the whole section: it walks
  // every sample, which is far too much work to repeat per expanded row.
  const stories = useMemo(() => buildIceCandidateStories(samples), [samples]);
  const totalCandidates = groups.reduce((n, g) => n + g.candidates.length, 0);
  if (totalCandidates === 0) return null;

  return (
    <CollapsibleSection
      title="ICE Candidates"
      id="ice-candidates"
      help="client/ice-candidates"
      count={totalCandidates}
      defaultOpen={false}
    >
      {groups.map((group, gi) => (
        <div key={group.pcId} style={{ padding: '0.5rem 1rem', borderTop: gi > 0 ? '1px solid var(--border-light)' : undefined }}>
          {multiPc && (
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', fontFamily: 'ui-monospace,monospace' }}>
              PC: {group.pcId}
            </div>
          )}
          <CandidateTable
            candidates={group.candidates}
            stories={stories.get(group.pcId) ?? EMPTY_STORIES}
          />
          <PairsSummary pairs={group.pairs} />
        </div>
      ))}
    </CollapsibleSection>
  );
}
