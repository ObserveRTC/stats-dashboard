import type { ClientSample } from '../schema/ClientSample.ts';

export interface ClientCodecEntry {
  key: string;
  mimeType: string;
  clockRate?: number;
  channels?: number;
  payloadType?: number;
  sdpFmtpLine?: string;
}

function codecKey(codec: {
  mimeType: string;
  payloadType?: number;
  sdpFmtpLine?: string;
}): string {
  return `${codec.payloadType ?? 'x'}:${codec.mimeType}:${codec.sdpFmtpLine ?? ''}`;
}

/** Collect unique codecs from raw client sample peer connections. */
export function extractClientCodecsFromSamples(
  samples: ClientSample[] | null | undefined,
): ClientCodecEntry[] {
  const map = new Map<string, ClientCodecEntry>();

  for (const sample of samples ?? []) {
    for (const pc of sample.peerConnections ?? []) {
      for (const codec of pc.codecs ?? []) {
        if (!codec.mimeType) continue;
        const key = codecKey(codec);
        const prev = map.get(key);
        map.set(key, {
          key,
          mimeType: codec.mimeType,
          clockRate: codec.clockRate ?? prev?.clockRate,
          channels: codec.channels ?? prev?.channels,
          payloadType: codec.payloadType ?? prev?.payloadType,
          sdpFmtpLine: codec.sdpFmtpLine ?? prev?.sdpFmtpLine,
        });
      }
    }
  }

  return [...map.values()];
}

export function formatClockRateHz(clockRate: number | undefined): string {
  if (clockRate == null) return '—';
  if (clockRate >= 1000 && clockRate % 1000 === 0) {
    return `${clockRate / 1000} kHz (${clockRate} Hz)`;
  }
  return `${clockRate} Hz`;
}

export function formatChannels(channels: number | undefined): string {
  if (channels == null) return '—';
  if (channels === 1) return '1 (mono)';
  if (channels === 2) return '2 (stereo)';
  return String(channels);
}
