'use client';
import type { ClientTrackIndex } from '../../utils/clientTracks.ts';
import { CollapsibleSection } from './CollapsibleSection.tsx';
import { TrackDetails } from './TrackDetails.tsx';

interface UnassociatedTracksSectionProps {
  index: ClientTrackIndex;
  eventBus?: EventTarget;
}

/**
 * Tracks the client reported whose attachments name no producer or consumer.
 *
 * Every track that could be matched is rendered inside the SFU object it
 * belongs to. What lands here is what could not be placed — an untagged track,
 * or one whose SFU object is missing from the loaded router samples — so an
 * empty section is the healthy outcome.
 */
export function UnassociatedTracksSection({ index, eventBus }: UnassociatedTracksSectionProps) {
  const tracks = [...index.unassociatedOutbound, ...index.unassociatedInbound];
  if (tracks.length === 0) return null;

  return (
    <CollapsibleSection
      title="Unassociated Tracks"
      id="unassociated-tracks"
      help="client/unassociated-tracks"
      count={tracks.length}
      defaultOpen={false}
    >
      <TrackDetails tracks={tracks} eventBus={eventBus} />
    </CollapsibleSection>
  );
}
