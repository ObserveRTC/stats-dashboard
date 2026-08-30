'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Breadcrumbs.module.css';

const LABELS = ['roomId', 'callId', 'clientId'] as const;

function formatSegment(value: string): string {
  return value;
}

export function Breadcrumbs() {
  const pathname = usePathname() ?? '';
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  const crumbs = [
    { label: 'Home', title: 'home', to: '/' },
    ...segments.map((seg, i) => ({
      label: formatSegment(decodeURIComponent(seg)),
      title: LABELS[i] ?? `level ${i}`,
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
