'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Breadcrumbs.module.css';

const LABELS = ['roomId', 'callId', 'clientId'] as const;

/**
 * Shorten an opaque id, leave a readable name alone.
 *
 * A room id is not necessarily a name. Deployments that turn on
 * `<uuid>/<uuid>/` — two identical 36-character segments side by side, which
 * is unreadable and, worse, looks like a bug. Anything that long with no
 * spaces is an id rather than a name, so it is trimmed for display; the full
 * value stays in the link and in the tooltip.
 */
function formatSegment(value: string): string {
  const opaque = value.length > 20 && !value.includes(' ');
  return opaque ? `${value.slice(0, 8)}…` : value;
}

export function Breadcrumbs() {
  const pathname = usePathname() ?? '';
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  const crumbs = [
    { label: 'Home', title: 'home', to: '/' },
    ...segments.map((seg, i) => ({
      label: formatSegment(decodeURIComponent(seg)),
      // The tooltip carries the whole value, so a shortened crumb is still
      // copyable and identifiable.
      title: `${LABELS[i] ?? `level ${i}`}: ${decodeURIComponent(seg)}`,
      to: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  // Only show breadcrumbs when we're deeper than home
  if (segments.length < 1) return null;

  return (
    <nav className={styles.nav} aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.to} className={styles.item}>
            {i > 0 && <span className={styles.sep}>/</span>}
            {isLast ? (
              <span className={styles.current} title={crumb.title}>{crumb.label}</span>
            ) : (
              <Link href={crumb.to} className={styles.link} title={crumb.title}>
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
