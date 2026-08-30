'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getHelpTopic } from '../../help/helpTopics.ts';
import styles from './InfoIcon.module.css';

const GAP = 8;

interface Position {
  top: number;
  left: number;
}

/**
 * The small `i` beside a card, chart or section title that explains what the
 * thing is, why anyone should care, and how to read it.
 *
 * ## Why a popover and not a `title` attribute
 *
 * The dashboard reports on WebRTC internals, and most of what it shows is
 * meaningless to a reader who has not worked with them: a "score" of 3.2, a
 * "consumer", a p95 loss figure. The native `title` tooltip cannot carry that
 * — it is one unformatted line, appears after a delay, cannot be read by
 * keyboard, and vanishes the moment the pointer moves, so it cannot hold text
 * anybody would actually read, let alone select or scroll.
 *
 * So: hovering peeks, clicking pins. A pinned panel keeps the pointer events,
 * which is what lets someone scroll a long explanation or copy a term out of
 * it; an unpinned peek passes them through, so it never blocks the control it
 * is describing.
 *
 * Rendered into `document.body` through a portal and positioned with fixed
 * coordinates, because these icons live inside tables and scroll containers
 * whose `overflow` would otherwise clip the panel to a sliver.
 *
 * An id with no entry in the registry renders nothing at all. A help affordance
 * that opens onto "no description available" is worse than its absence — it
 * spends a click to say nothing — and it makes the missing entry visible in
 * review rather than shipping as a stub.
 */
export function InfoIcon({
  topic,
  label,
  className,
}: {
  /** Key into the help registry. Unknown ids render nothing. */
  topic: string;
  /** Overrides the accessible name, which defaults to the topic's title. */
  label?: string;
  className?: string;
}) {
  const entry = getHelpTopic(topic);
  const popId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const button = buttonRef.current;
    const pop = popRef.current;
    if (!button || !pop) return;

    const anchor = button.getBoundingClientRect();
    const box = pop.getBoundingClientRect();

    // Below the icon by default; above it when there is no room below and
    // there is above, so a control near the bottom of the window still shows
    // its whole explanation.
    const below = anchor.bottom + GAP;
    const fitsBelow = below + box.height <= window.innerHeight - GAP;
    const top = fitsBelow ? below : Math.max(GAP, anchor.top - GAP - box.height);

    // Left-aligned to the icon, pulled back inside the viewport at the right
    // edge — which is where these icons usually are, in a card header.
    const left = Math.min(
      Math.max(GAP, anchor.left),
      Math.max(GAP, window.innerWidth - box.width - GAP),
    );

    setPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    // `true` so a scroll inside any ancestor container moves the panel with
    // its icon rather than leaving it floating over unrelated content.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, place]);

  const close = useCallback(() => {
    setOpen(false);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [pinned, close]);

  if (!entry) return null;

  const name = label ?? `What is ${entry.title}?`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.button} ${className ?? ''}`}
        aria-label={name}
        aria-expanded={open}
        aria-describedby={open ? popId : undefined}
        onClick={(e) => {
          // These icons sit inside clickable rows and section headers.
          e.stopPropagation();
          e.preventDefault();
          if (pinned) close();
          else {
            setPinned(true);
            setOpen(true);
          }
        }}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => {
          if (!pinned) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
      >
        i
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={popRef}
            id={popId}
            role="tooltip"
            className={`${styles.pop} ${pinned ? '' : styles.popPeek}`}
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              // Hidden until measured, so it never flashes in the corner.
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            <p className={styles.title}>{entry.title}</p>

            <span className={styles.label}>What it is</span>
            <p className={styles.body}>{entry.what}</p>

            <span className={styles.label}>Why it matters</span>
            <p className={styles.body}>{entry.why}</p>

            {entry.howToRead && (
              <>
                <span className={styles.label}>How to read it</span>
                <p className={styles.body}>{entry.howToRead}</p>
              </>
            )}

            {entry.watchOut && (
              <>
                <span className={styles.label}>Watch out</span>
                <p className={styles.watchOut}>{entry.watchOut}</p>
              </>
            )}

            {!pinned && <p className={styles.hint}>Click the icon to keep this open.</p>}
          </div>,
          document.body,
        )}
    </>
  );
}
