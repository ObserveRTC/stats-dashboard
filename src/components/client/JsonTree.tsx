'use client';
import { useState } from 'react';
import styles from './JsonTree.module.css';

/* ── Value renderers ─────────────────────────────────────────────────── */

function Str({ v }: { v: string }) {
  return <span className={styles.string}>"{v}"</span>;
}
function Num({ v }: { v: number }) {
  return <span className={styles.number}>{v}</span>;
}
function Bool({ v }: { v: boolean }) {
  return <span className={styles.bool}>{String(v)}</span>;
}
function Null() {
  return <span className={styles.null}>null</span>;
}

function Primitive({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <Null />;
  if (typeof value === 'boolean') return <Bool v={value} />;
  if (typeof value === 'number') return <Num v={value} />;
  if (typeof value === 'string') return <Str v={value} />;
  return <span className={styles.null}>{String(value)}</span>;
}

/* ── Toggle chevron ──────────────────────────────────────────────────── */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <polyline points="3,2 9,6 3,10" />
    </svg>
  );
}

/* ── Collapsible node (object or array) ──────────────────────────────── */

interface NodeProps {
  label?: string;
  open: boolean;
  onToggle: () => void;
  open_bracket: string;
  close_bracket: string;
  count: number;
  children: React.ReactNode;
  isLast: boolean;
}

function Node({ label, open, onToggle, open_bracket, close_bracket, count, children, isLast }: NodeProps) {
  return (
    <div className={styles.node}>
      {/* Opening line */}
      <div className={styles.line} onClick={onToggle}>
        <button className={styles.toggleBtn} tabIndex={-1} aria-label="toggle">
          <Chevron open={open} />
        </button>
        {label !== undefined && (
          <><span className={styles.key}>&quot;{label}&quot;</span><span className={styles.punct}>: </span></>
        )}
        <span className={styles.bracket}>{open_bracket}</span>
        {!open && (
          <span className={styles.preview}>
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
        {!open && <span className={styles.bracket}>{close_bracket}</span>}
        {!open && !isLast && <span className={styles.punct}>,</span>}
      </div>

      {/* Children */}
      {open && (
        <div className={styles.children}>
          {children}
        </div>
      )}

      {/* Closing line */}
      {open && (
        <div className={styles.line}>
          <span className={styles.closeBracket}>{close_bracket}</span>
          {!isLast && <span className={styles.punct}>,</span>}
        </div>
      )}
    </div>
  );
}

/* ── Main recursive tree node ────────────────────────────────────────── */

interface TreeNodeProps {
  data: unknown;
  label?: string;
  defaultOpen?: boolean;
  isLast?: boolean;
}

export function JsonTree({ data, label, defaultOpen = false, isLast = true }: TreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Primitive leaf
  if (data === null || data === undefined || typeof data !== 'object') {
    return (
      <div className={styles.line}>
        {label !== undefined && (
          <><span className={styles.key}>&quot;{label}&quot;</span><span className={styles.punct}>: </span></>
        )}
        <Primitive value={data} />
        {!isLast && <span className={styles.punct}>,</span>}
      </div>
    );
  }

  // Array
  if (Array.isArray(data)) {
    return (
      <Node
        label={label}
        open={open}
        onToggle={() => setOpen(v => !v)}
        open_bracket="["
        close_bracket="]"
        count={data.length}
        isLast={isLast}
      >
        {data.map((item, i) => (
          <JsonTree key={i} data={item} label={String(i)} defaultOpen={false} isLast={i === data.length - 1} />
        ))}
      </Node>
    );
  }

  // Object
  const entries = Object.entries(data as Record<string, unknown>);
  return (
    <Node
      label={label}
      open={open}
      onToggle={() => setOpen(v => !v)}
      open_bracket="{"
      close_bracket="}"
      count={entries.length}
      isLast={isLast}
    >
      {entries.map(([k, v], i) => (
        <JsonTree key={k} data={v} label={k} defaultOpen={false} isLast={i === entries.length - 1} />
      ))}
    </Node>
  );
}
