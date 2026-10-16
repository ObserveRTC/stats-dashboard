import { HomePage } from '@/views/HomePage';

/**
 * Call Analytics: the room browser and the jump-to-room box.
 *
 * Reads the sample archive directly, so it can answer questions no digest
 * stores — at the cost of listing a bucket, which is why it is its own
 * destination and not the landing page.
 */
export default function Page() {
  return <HomePage />;
}
