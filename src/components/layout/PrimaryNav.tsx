'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './PrimaryNav.module.css';

/**
 * The two places this dashboard goes.
 *
 * Overview answers "is anything wrong", from one saved summary per period.
 * Call Analytics answers "what happened in this call", by reading the sample
 * archive directly. They are different questions with different costs — one GET
 * against a folded summary versus walking a bucket — and keeping them as two
 * destinations is what stops the cheap question being gated behind the
 * expensive one.
 *
 * ## Why Overview is the landing page
 *
 * The question people arrive with is "is anything wrong right now", and
 * answering it used to require knowing which room to open before you could find
 * out. Room browsing is still one click away, and a room lookup sits on the
 * Overview itself for when you already know where you are going.
 */
const ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/calls', label: 'Call Analytics' },
] as const;

export function PrimaryNav() {
  const pathname = usePathname() ?? '/';

  /**
   * Which item is current.
   *
   * Overview is only current at exactly `/`. Everything else — a room, a call,
   * a client — is Call Analytics, because those pages are reached by drilling
   * down from it, and a reader who followed a link from Overview to a call has
   * arrived in Call Analytics whatever they clicked to get there.
   */
  const current = pathname === '/' ? '/' : '/calls';

  return (
    <nav className={styles.nav} aria-label="Primary">
      {ITEMS.map((item) => {
        const active = current === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? styles.itemActive : styles.item}
            // aria-current is what a screen reader announces as "current page".
            // The accent underline alone says it to sighted readers only.
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
