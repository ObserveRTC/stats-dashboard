import type { RoomListResponse, CallListResponse, ClientsResponse, ClientStatsResponse, CallSummaryResponse, RouterSampleResponse, CallObjectResponse } from './types.ts';

// Empty string = same-origin (Next.js serves /api/* from the same host).
// Set NEXT_PUBLIC_API_BASE_URL only when the API is on a different origin.
export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export async function fetchRooms(signal?: AbortSignal): Promise<RoomListResponse> {
  const res = await fetch(`${BASE_URL}/api`, { signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch rooms: ${res.status} ${res.statusText}. ${text}`);
  }
  return res.json();
}

export async function fetchCalls(roomId: string, signal?: AbortSignal): Promise<CallListResponse> {
  const res = await fetch(`${BASE_URL}/api/${encodeURIComponent(roomId)}`, { signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch calls: ${res.status} ${res.statusText}. ${text}`);
  }
  return res.json();
}

export async function fetchClients(roomId: string, callId: string, signal?: AbortSignal): Promise<ClientsResponse> {
  const res = await fetch(`${BASE_URL}/api/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}`, { signal });
  if (!res.ok) return { success: false, clients: [] };
  return res.json();
}

export async function fetchClientStats(roomId: string, callId: string, clientId: string, signal?: AbortSignal): Promise<ClientStatsResponse> {
  const res = await fetch(`${BASE_URL}/api/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/${encodeURIComponent(clientId)}`, { signal });
  if (!res.ok) return { stats: [] };
  return res.json();
}

export async function fetchSignedUrl(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return res.text();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return null;
  }
}

export async function fetchCallSummary(roomId: string, callId: string, signal?: AbortSignal): Promise<CallSummaryResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/call-summary`, { signal });
    if (!res.ok) return { success: false, summary: null };
    return res.json();
  } catch {
    return { success: false, summary: null };
  }
}

/**
 * The raw JSON of one object in a call folder, by its exact filename.
 *
 * Raw on purpose: `fetchCallSummary` returns the merged view of every per-SFU
 * summary, and this returns what a single file actually said — the question you
 * ask when the merged view looks wrong.
 */
export async function fetchCallObject(
  roomId: string,
  callId: string,
  name: string,
  signal?: AbortSignal,
): Promise<CallObjectResponse> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/object/${encodeURIComponent(name)}`,
      { signal },
    );
    const body = (await res.json()) as CallObjectResponse;
    if (!res.ok) return { success: false, name, error: body?.error ?? `HTTP ${res.status}` };
    return body;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { success: false, name, error: 'Could not reach the server.' };
  }
}

export async function fetchRouterSample(roomId: string, callId: string, routerId: string, signal?: AbortSignal): Promise<RouterSampleResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/${encodeURIComponent(roomId)}/${encodeURIComponent(callId)}/router/${encodeURIComponent(routerId)}`, { signal });
    if (!res.ok) return { success: false, router: null };
    return res.json();
  } catch {
    return { success: false, router: null };
  }
}
