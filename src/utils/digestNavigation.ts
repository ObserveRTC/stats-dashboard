import type { CallDigest, EvidenceRef } from '../digest/types.ts';
export function clientEvidenceHref(roomId: string, callId: string, clientId: string, evidence?: EvidenceRef): string {
  const base = '/' + [roomId, callId, clientId].map(encodeURIComponent).join('/');
  const target = evidence?.target;
  // Producer/consumer IDs may be client track IDs rather than the SFU IDs used
  // by the existing rows. Open the verified parent section instead of guessing.
  const section = target === 'consumer' ? 'consumers' : target === 'producer' ? 'producers' : target === 'transport' ? 'transports' : target === 'samples' ? 'sample-browser' : 'client-context';
  return `${base}#${section}`;
}

/** Check the transport envelope and the identity after server-side schema validation. */
export function digestAnswer(body: unknown, roomId: string, callId: string): DigestAnswer {
  if (!body || typeof body !== 'object') return { state: 'failed', document: null, reason: 'Unexpected digest response' };
  const value = body as Partial<DigestAnswer>;
  if (!value.state || !['ready', 'missing', 'invalid', 'unsupported-version', 'failed'].includes(value.state)) return { state: 'failed', document: null, reason: 'Unexpected digest response' };
  if (value.state === 'ready') {
    const doc = value.document;
    if (!doc?.call || !Array.isArray(doc.clients) || doc.call.roomId !== roomId || doc.call.callId !== callId) return { state: 'invalid', document: null, reason: 'Digest identity does not match this room and call' };
    return { state: 'ready', document: doc };
  }
  return { state: value.state, document: null, reason: typeof value.reason === 'string' ? value.reason : undefined };
}
export type DigestAnswer = { state: 'loading' | 'ready' | 'missing' | 'invalid' | 'unsupported-version' | 'failed'; document: CallDigest | null; reason?: string };
