import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';
import { TzInitializer } from '@/components/layout/TzInitializer';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { TimezoneToggle } from '@/components/layout/TimezoneToggle';
import { PrimaryNav } from '@/components/layout/PrimaryNav';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Banner } from '@/components/layout/Banner';
import { CompareFloatingButton } from '@/components/compare/CompareFloatingButton';
import { ChartCompareModal } from '@/components/compare/ChartCompareModal';
import styles from '@/App.module.css';

/**
 * Inter, vendored into this repository and served from this origin.
 *
 * Deliberately not `next/font/google` and not a `fonts.googleapis.com`
 * stylesheet. The stylesheet makes every viewer's browser call a third party on
 * page load, which an egress-restricted or air-gapped deployment blocks and
 * which an operator hosting this themselves did not sign up for. `next/font/
 * google` fixes that for the viewer but moves the call to `next build`, where it
 * is worse: the build container needs outbound access to Google at image build
 * time, and when it does not have it the font loader fails with
 * `Cannot read properties of null` and takes the whole image with it. That is
 * exactly how the 2026-10-16 deploy failed.
 *
 * So the face is a file in `src/fonts/`: one variable woff2, latin subset, from
 * @fontsource-variable/inter (SIL Open Font License, see src/fonts/LICENSE.txt).
 * No network at build time, no network at page load, and `npm ci` has one fewer
 * thing to be right about.
 *
 * `display: 'swap'` renders the fallback immediately rather than holding the
 * text blank while the face loads.
 */
const inter = localFont({
  src: '../src/fonts/inter-latin-wght-normal.woff2',
  // One file covering 100-900: a variable font is a single face whose weight is
  // an axis, so the four static weights this used to request are all in here.
  weight: '100 900',
  style: 'normal',
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
          <PrimaryNav />
          <Breadcrumbs />
          <Banner />
          {children}
        </div>
      </body>
    </html>
  );
}
