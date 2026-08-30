'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { JsonTree } from '../client/JsonTree.tsx';
import { fetchCallObject } from '../../api/client.ts';
import { isCallSummaryName, sfuIdFromSummaryName } from '../../schema/CallSummary.ts';
import { formatBytes, shortId } from '../../utils/formatting.ts';
import styles from './CallObjectBrowser.module.css';

const ROUTER_PREFIX = 'mediasoup-router-';

interface CallObjectBrowserProps {
  roomId: string;
  callId: string;
  /** Exact object basenames from the call-folder listing. */
  objectNames: string[];
}

interface LoadedObject {
  status: 'loading' | 'ready' | 'error';
  data?: unknown;
  size?: number;
  error?: string;
}

/** What a file is, said in the list rather than left to the reader's eye. */
function describe(name: string): { label: string; kind: 'summary' | 'router'; detail: string } {
  if (isCallSummaryName(name)) {
    const sfuId = sfuIdFromSummaryName(name);
    return {
      label: 'Call summary',
      kind: 'summary',
      detail: sfuId ? `SFU ${shortId(sfuId, 14)}` : 'whole call',
    };
  }
  if (name.startsWith(ROUTER_PREFIX)) {
    const routerId = name.slice(ROUTER_PREFIX.length, -'.json'.length);
    return { label: 'Router sample', kind: 'router', detail: shortId(routerId, 14) };
  }
  return { label: name, kind: 'router', detail: '' };
}

/**
 * The call's raw objects, one file at a time.
 *
 * The dashboard above renders the *merged, normalized* view: every per-SFU
 * summary folded into one, every router sample indexed by what it contains.
 * That is the right default and it is also lossy — a field the merge dropped, a
 * summary that failed to parse, an attachment nothing reads yet — so this
 * answers the other question: what did *this file* actually say.
 *
 * It mirrors the client page's Sample Browser, with the difference that a
 * client's samples all live in one `.jsonl` already in memory, while these are
 * separate objects in storage. So they are fetched per file on first click and
 * kept, rather than pulled down with the page: a call across several SFUs can
 * hold a dozen router samples, and most visits open none of them.
 */
export function CallObjectBrowser({ roomId, callId, objectNames }: CallObjectBrowserProps) {
  // A set, not a single selection: comparing two summaries or two routers means
  // reading them side by side, and a browser that closes one file to open the
  // next makes that impossible.
  const [openNames, setOpenNames] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<Record<string, LoadedObject>>({});
  // One controller per file, so closing or reopening one never cancels
  // another's in-flight read.
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    // A different call: nothing already fetched applies to it.
    setOpenNames(new Set());
    setLoaded({});
  }, [roomId, callId]);

  useEffect(() => {
    const controllers = abortRef.current;
    return () => {
      for (const ac of controllers.values()) ac.abort();
      controllers.clear();
    };
  }, []);

  /**
   * Fetch one object, once.
   *
   * Reads the cache through the state setter rather than through a `loaded`
   * dependency: with several files opening in quick succession, a callback
   * closed over a stale `loaded` would refetch a file already on its way.
   */
  const ensureLoaded = useCallback(
    (name: string) => {
      let alreadyKnown = false;
      setLoaded((prev) => {
        if (prev[name]) {
          alreadyKnown = true;
          return prev;
        }
        return { ...prev, [name]: { status: 'loading' } };
      });
      if (alreadyKnown) return;

      const ac = new AbortController();
      abortRef.current.set(name, ac);

      void fetchCallObject(roomId, callId, name, ac.signal)
        .then((res) => {
          if (ac.signal.aborted) return;
          setLoaded((prev) => ({
            ...prev,
            [name]: res.success
              ? { status: 'ready', data: res.data, size: res.size }
              : { status: 'error', error: res.error ?? 'Could not read this object.' },
          }));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setLoaded((prev) => ({
            ...prev,
            [name]: { status: 'error', error: 'Could not read this object.' },
          }));
        })
        .finally(() => {
          abortRef.current.delete(name);
        });
    },
    [roomId, callId],
  );

  const toggle = useCallback(
    (name: string) => {
      setOpenNames((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
      // Fetched on the way open and kept on the way closed: reopening a file
      // should be instant, and the bytes are already paid for.
      ensureLoaded(name);
    },
    [ensureLoaded],
  );

  const openAll = useCallback(() => {
    setOpenNames(new Set(objectNames));
    for (const name of objectNames) ensureLoaded(name);
  }, [objectNames, ensureLoaded]);

  const closeAll = useCallback(() => setOpenNames(new Set()), []);

  const groups = useMemo(() => {
    const summaries = objectNames.filter((n) => isCallSummaryName(n));
    const routers = objectNames.filter((n) => !isCallSummaryName(n));
    return { summaries, routers };
  }, [objectNames]);

  if (objectNames.length === 0) return null;

  const renderRow = (name: string) => {
    const { label, kind, detail } = describe(name);
    const entry = loaded[name];
    const isOpen = openNames.has(name);

    return (
      <li key={name} className={styles.item}>
        <button
          type="button"
          className={`${styles.file} ${isOpen ? styles.fileOpen : ''}`}
          onClick={() => toggle(name)}
          aria-expanded={isOpen}
        >
          <svg
            className={isOpen ? styles.chevronOpen : styles.chevron}
            viewBox="0 0 20 20"
            fill="currentColor"
            width="12"
            height="12"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          <code className={styles.filename}>{name}</code>
          <span className={`${styles.tag} ${kind === 'summary' ? styles.tagSummary : styles.tagRouter}`}>
            {label}
          </span>
          {detail && <span className={styles.detail}>{detail}</span>}
          {entry?.status === 'ready' && entry.size != null && (
            <span className={styles.size}>{formatBytes(entry.size)}</span>
          )}
          {entry?.status === 'loading' && <span className={styles.size}>loading…</span>}
        </button>

        {isOpen && (
          <div className={styles.jsonPanel}>
            {entry?.status === 'ready' ? (
              <div className={styles.jsonBody}>
                <JsonTree data={entry.data} defaultOpen isLast />
              </div>
            ) : entry?.status === 'error' ? (
              <p className={styles.error}>{entry.error}</p>
            ) : (
              <p className={styles.loading}>Reading {name}…</p>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <CollapsibleSection
      title="Samples Browser"
      id="call-samples"
      help="call/samples-browser"
      count={objectNames.length}
      defaultOpen={false}
    >
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          The call folder as written: every call summary and router sample, before the dashboard
          merged and indexed them. Open as many files as you like — they stay open, so two
          summaries or two routers can be read side by side.
        </p>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.action}
            onClick={openAll}
            disabled={openNames.size === objectNames.length}
            // Named for what it costs: every unread file is fetched.
            title={`Open all ${objectNames.length} files`}
          >
            Open all
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={closeAll}
            disabled={openNames.size === 0}
            title="Collapse every open file"
          >
            Close all
          </button>
        </div>
      </div>

      {groups.summaries.length > 0 && (
        <>
          <h5 className={styles.groupTitle}>
            Call summaries
            <span className={styles.groupCount}>{groups.summaries.length}</span>
          </h5>
          <ul className={styles.list}>{groups.summaries.map(renderRow)}</ul>
        </>
      )}

      {groups.routers.length > 0 && (
        <>
          <h5 className={styles.groupTitle}>
            Router samples
            <span className={styles.groupCount}>{groups.routers.length}</span>
          </h5>
          <ul className={styles.list}>{groups.routers.map(renderRow)}</ul>
        </>
      )}
    </CollapsibleSection>
  );
}
