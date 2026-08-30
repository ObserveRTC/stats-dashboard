import type { CallSession, ClientSession, ClientsResponse } from '../api/types.ts';

export function buildCallSession(clientsRes: ClientsResponse): CallSession {
  const clientSessions = new Map<string, ClientSession>();
  let callStart = Infinity;
  let callEnd = -Infinity;

  for (const c of clientsRes.clients) {
    const joined = c.joined ?? null;
    const left = c.left ?? null;
    if (joined) callStart = Math.min(callStart, joined);
    if (left) callEnd = Math.max(callEnd, left);
    clientSessions.set(c.clientId, {
      displayName: c.displayName,
      joined,
      left,
    });
  }

  if (!isFinite(callStart)) callStart = Date.now() - 60000;
  if (!isFinite(callEnd)) callEnd = Date.now();
  if (callEnd <= callStart) callEnd = callStart + 60000;

  const _clientLabelMap = buildClientLabels(clientSessions);
  return { clientSessions, callStart, callEnd, _clientLabelMap };
}

function buildClientLabels(clientSessions: Map<string, ClientSession>): Map<string, string> {
  const sorted = Array.from(clientSessions.entries())
    .sort((a, b) => (a[1].joined ?? 0) - (b[1].joined ?? 0));

  const map = new Map<string, string>();
  const nameCount = new Map<string, number>();
  sorted.forEach(([, s]) => {
    const dn = s.displayName ?? '';
    nameCount.set(dn, (nameCount.get(dn) ?? 0) + 1);
  });

  sorted.forEach(([cid, s], idx) => {
    const dn = s.displayName ?? '';
    const num = `C${idx + 1}`;
    if (dn && nameCount.get(dn) === 1) map.set(cid, dn);
    else if (dn) map.set(cid, `${dn} (${num})`);
    else map.set(cid, num);
  });
  return map;
}
