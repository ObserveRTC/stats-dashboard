import { OverviewPage } from '@/views/OverviewPage';

/**
 * The landing page is the Overview, not the room browser.
 *
 * It reads one saved summary and answers "is anything wrong in this period".
 * The room browser moved to /calls, where walking the sample archive is the
 * point rather than a cost paid on arrival.
 */
export default function Page() {
  return <OverviewPage />;
}
