'use client';
import { useEffect, useState } from 'react';
import { BASE_URL } from '../api/client.ts';
import { digestAnswer, type DigestAnswer } from '../utils/digestNavigation.ts';
export type { DigestAnswer } from '../utils/digestNavigation.ts';

export function useCallDigest(roomId: string, callId: string): DigestAnswer {
  const key = `${roomId}/${callId}`;
  const [answer, setAnswer] = useState<{key: string; value: DigestAnswer} | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    if (!roomId || !callId) return;
    void fetch(`${BASE_URL}/api/digest?callId=${encodeURIComponent(callId)}`, { signal: ac.signal })
      .then(async res => { if (!res.ok) throw new Error(`Digest request failed (${res.status})`); return res.json(); })
      .then(body => {
        if (ac.signal.aborted) return;
        const value = digestAnswer(body, roomId, callId);
        setAnswer({ key, value });
      })
      .catch(error => { if (!ac.signal.aborted) setAnswer({ key, value: { state: 'failed', document: null, reason: String(error) } }); });
    return () => ac.abort();
  }, [roomId, callId, key]);
  return answer?.key === key ? answer.value : { state: 'loading', document: null };
}
