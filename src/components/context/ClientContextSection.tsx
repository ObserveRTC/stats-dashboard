'use client';
import { useMemo } from 'react';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { extractCodecs } from '../../utils/pcSampleExtractor.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { DeviceDetails } from '../report/DeviceDetails.tsx';
import { MediaConstraintsSection } from '../report/MediaConstraintsSection.tsx';
import { CodecsSection } from '../pc/CodecsSection.tsx';
import { TabFocusTimeline } from './TabFocusTimeline.tsx';
import { cachedTabVisibility } from '../../utils/tabVisibility.ts';
import styles from './ClientContextSection.module.css';

interface ClientMeta {
  userAgent: string | null;
  constraints: unknown;
  devices: unknown[];
}

interface ClientContextSectionProps {
  /** Output of `extractClientMeta` — browser, supported constraints, devices. */
  clientMeta: ClientMeta | null;
  samples: ClientSample[] | null | undefined;
  /** Call bounds, so the tab strip spans the session and not just the events. */
  sessionStart?: number;
  sessionEnd?: number;
}

/**
 * Everything about the client itself rather than about the media it carried:
 * the browser and OS it ran on, the devices it could see, what it asked the
 * browser for versus what it got, and the codecs it negotiated.
 *
 * These used to be three separate top-level sections (Device Details, Media
 * Constraints, Codecs), which scattered one question — "what was this client
 * working with?" — across the page.
 */
export function ClientContextSection({
  clientMeta,
  samples,
  sessionStart,
  sessionEnd,
}: ClientContextSectionProps) {
  const hasDeviceInfo =
    !!clientMeta &&
    (!!clientMeta.userAgent ||
      (clientMeta.constraints != null && Object.keys(clientMeta.constraints as object).length > 0) ||
      clientMeta.devices.length > 0);

  const codecCount = useMemo(() => (samples?.length ? extractCodecs(samples).size : 0), [samples]);
  const hasSamples = !!samples?.length;

  // Whether the person was actually looking at the call is a fact about the
  // client, which is what this section is for.
  const visibility = useMemo(
    () => cachedTabVisibility(samples, { sessionStart, sessionEnd }),
    [samples, sessionStart, sessionEnd],
  );
  const spanStart = sessionStart ?? (samples?.[0]?.timestamp as number | undefined);
  const spanEnd = sessionEnd ?? (samples?.[samples.length - 1]?.timestamp as number | undefined);

  if (!hasDeviceInfo && !hasSamples) return null;

  return (
    <CollapsibleSection title="Client Context" id="client-context"
      help="client/context" defaultOpen={false}>
      <p className={styles.hint}>
        What this client was running on, what it asked the browser for, and what it negotiated.
      </p>

      {visibility.reported && spanStart != null && spanEnd != null && (
        <CollapsibleSection title="Tab focus" help="client/tab-focus" defaultOpen>
          <TabFocusTimeline visibility={visibility} start={spanStart} end={spanEnd} />
        </CollapsibleSection>
      )}

      {hasDeviceInfo && clientMeta && (
        <CollapsibleSection title="Environment &amp; devices" help="client/environment" defaultOpen>
          <DeviceDetails clientMeta={clientMeta} embedded />
        </CollapsibleSection>
      )}

      {hasSamples && <MediaConstraintsSection samples={samples} embedded />}

      {codecCount > 0 && samples && <CodecsSection samples={samples} embedded />}
    </CollapsibleSection>
  );
}
