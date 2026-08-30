import type { ClientSample } from '../schema/ClientSample.ts';
import { getTrackAttachments } from '../schema/clientSampleParse.ts';

export interface TrackAttachmentInfo {
  trackId: string;
  kind?: string;
  peerConnectionId: string;
  attachments: Record<string, unknown>;
}

/** Latest peer-connection attachments for a transport / peer-connection id. */
export function getPcAttachmentsForTransport(
  clientStats: ClientSample[] | null | undefined,
  transportId: string,
): Record<string, unknown> | null {
  if (!clientStats?.length) return null;

  for (let i = clientStats.length - 1; i >= 0; i--) {
    const pc = clientStats[i].peerConnections?.find((p) => p.peerConnectionId === transportId);
    if (pc?.attachments && Object.keys(pc.attachments).length > 0) {
      return pc.attachments;
    }
  }
  return null;
}

export function getProducerTrackAttachments(
  clientStats: ClientSample[] | null | undefined,
  producerId: string,
): TrackAttachmentInfo[] {
  const seen = new Map<string, TrackAttachmentInfo>();

  for (const sample of clientStats ?? []) {
    for (const pc of sample.peerConnections ?? []) {
      for (const track of pc.outboundTracks ?? []) {
        if (!track.attachments || Object.keys(track.attachments).length === 0) continue;
        const { producerId: pid } = getTrackAttachments(track.attachments);
        if (pid !== producerId) continue;
        const key = `${pc.peerConnectionId}:${track.id}`;
        seen.set(key, {
          trackId: track.id,
          kind: track.kind,
          peerConnectionId: pc.peerConnectionId,
          attachments: track.attachments,
        });
      }
    }
  }

  return [...seen.values()];
}

export function getConsumerTrackAttachments(
  clientStats: ClientSample[] | null | undefined,
  consumerId: string,
): TrackAttachmentInfo[] {
  const seen = new Map<string, TrackAttachmentInfo>();

  for (const sample of clientStats ?? []) {
    for (const pc of sample.peerConnections ?? []) {
      for (const track of pc.inboundTracks ?? []) {
        if (!track.attachments || Object.keys(track.attachments).length === 0) continue;
        const { consumerId: cid } = getTrackAttachments(track.attachments);
        if (cid !== consumerId) continue;
        const key = `${pc.peerConnectionId}:${track.id}`;
        seen.set(key, {
          trackId: track.id,
          kind: track.kind,
          peerConnectionId: pc.peerConnectionId,
          attachments: track.attachments,
        });
      }
    }
  }

  return [...seen.values()];
}
