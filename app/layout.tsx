import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';
import { TzInitializer } from '@/components/layout/TzInitializer';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { TimezoneToggle } from '@/components/layout/TimezoneToggle';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Banner } from '@/components/layout/Banner';
import { CompareFloatingButton } from '@/components/compare/CompareFloatingButton';
import { ChartCompareModal } from '@/components/compare/ChartCompareModal';
import styles from '@/App.module.css';

/**
 * Inter, downloaded at build time and served from this origin.
 *
 * Deliberately not a `fonts.googleapis.com` stylesheet import: that makes every
 * viewer's browser call a third party on page load, which an egress-restricted
 * or air-gapped deployment blocks and which an operator hosting this themselves
 * did not sign up for. `next/font` fetches the face during `next build` and
 * emits it as a static asset, so a running container needs no outbound network
 * at all beyond the object storage it is configured with.
 *
 * `display: 'swap'` renders the fallback immediately rather than holding the
 * text blank while the face loads.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'ObserveRTC Stats',
  description: 'WebRTC diagnostics dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeInitializer />
        <TzInitializer />
        <ThemeToggle />
        <TimezoneToggle />
        <CompareFloatingButton />
        <ChartCompareModal />
        <div className={styles.layout}>
          <Breadcrumbs />
          <Banner />
          {children}
        </div>
      </body>
    </html>
  );
}
