#!/usr/bin/env node
/**
 * A small REST surface over the two processing operations.
 *
 * `node:http` and nothing else — no framework, no router, no queue. The whole
 * point of this app is to show that the processing is ordinary code: read the
 * archive, do the arithmetic, write the digest. A real deployment puts a queue
 * in front, runs many workers, and handles backfill and retries properly; none
 * of that changes what happens in `process.mjs`.
 *
 *   POST /process/call/:roomId/:callId
 *   POST /process/call                  { "roomId": "...", "callId": "..." }
 *   POST /process/day/:YYYY-MM-DD
 *   POST /process/month/:YYYY-MM
 *   GET  /healthz
 *
 * ## Synchronous on purpose
 *
 * A request processes the call and answers with the digest. That is wrong for
 * production — a long call will outlive a load balancer's timeout — and right
 * for a demonstration, because the response shows you exactly what was computed
 * instead of a job id you then have to poll. The README says what to change.
 *
 * ## No authentication
 *
 * There is none, and this must not be exposed. It is a worker meant to sit on a
 * private network or be called from your own backend, which is where the
 * authentication and tenant checks belong. `S3_PREFIX` scopes everything to one
 * tenant at deploy time, the same way the dashboard does it.
 */

import { createServer } from 'node:http';
import { processCall, processPeriod } from './process.mjs';
import { config } from './storage.mjs';

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10);
const HOST = process.env.HOSTNAME ?? '0.0.0.0';
/** Bounded so one oversized body cannot exhaust memory. */
const MAX_BODY_BYTES = 64 * 1024;

function send(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('body is not valid JSON'), { status: 400 });
  }
}

/**
 * Route by exploded path segments rather than by regex on the raw URL.
 *
 * Segments are decoded individually, so a room id containing a percent-encoded
 * slash arrives as one segment and is then rejected by `isSafeSegment` rather
 * than silently splitting into two path parts.
 */
function segments(url) {
  return new URL(url, 'http://localhost').pathname
    .split('/')
    .filter((s) => s !== '')
    .map((s) => decodeURIComponent(s));
}

async function route(req, res) {
  const parts = segments(req.url);

  if (req.method === 'GET' && parts[0] === 'healthz') {
    return send(res, config.bucket ? 200 : 503, {
      ok: Boolean(config.bucket),
      bucket: config.bucket || null,
      endpoint: config.endpoint ?? '(aws default)',
      roots: {
        tenant: config.tenant || '(bucket root)',
        samples: config.samples || '(tenant root)',
        analytics: config.analytics || '(tenant root)',
      },
      credentials: config.hasCredentials ? 'from environment' : 'from the SDK credential chain',
      ...(config.bucket ? {} : { problem: 'S3_BUCKET is not set' }),
    });
  }

  if (req.method === 'POST' && parts[0] === 'process') {
    if (parts[1] === 'call') {
      const body = parts.length >= 4 ? { roomId: parts[2], callId: parts[3] } : await readJson(req);
      const { roomId, callId } = body;
      if (!roomId || !callId) {
        return send(res, 400, { error: 'roomId and callId are required' });
      }
      const { digest, job } = await processCall({ roomId, callId });
      return send(res, 200, { job, digest });
    }

    if ((parts[1] === 'day' || parts[1] === 'month') && parts[2]) {
      const { digest, job } = await processPeriod({ period: parts[1], id: parts[2] });
      return send(res, 200, { job, digest });
    }
  }

  send(res, 404, {
    error: 'not found',
    routes: [
      'POST /process/call/:roomId/:callId',
      'POST /process/call   { roomId, callId }',
      'POST /process/day/:YYYY-MM-DD',
      'POST /process/month/:YYYY-MM',
      'GET  /healthz',
    ],
  });
}

const server = createServer((req, res) => {
  route(req, res).catch((err) => {
    const status = err?.status ?? 500;
    // The message, never the stack and never source contents: an error here can
    // carry a storage key, and a 500 body is the wrong place for one.
    console.error(JSON.stringify({ event: 'request.failed', url: req.url, status, error: err?.message }));
    if (!res.headersSent) send(res, status, { error: err?.message ?? 'internal error' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify({
      event: 'listening',
      url: `http://${HOST}:${PORT}`,
      bucket: config.bucket || null,
      analytics: config.analytics,
    }),
  );
});
