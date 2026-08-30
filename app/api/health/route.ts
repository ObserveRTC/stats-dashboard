import { NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import {
  announceStorageConfig,
  s3Client,
  storageConfig,
  storageConfigReport,
} from '@/lib/s3';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * What a container orchestrator asks, and what a person asks when the dashboard
 * is up but empty — which is the failure this endpoint exists for. A
 * misconfigured bucket does not crash the app; it serves an empty room list
 * that looks exactly like a bucket with nothing in it. This says which it is.
 *
 * `?deep=1` also performs a one-key list against the bucket, turning "the
 * settings look right" into "storage actually answered". It costs a request, so
 * it is opt-in: point a liveness probe at the plain endpoint and a readiness
 * probe at the deep one.
 *
 * ## What makes this answer 503
 *
 * Only a fatal configuration problem — in practice, no bucket or a malformed
 * endpoint. Absent `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` is reported as a
 * *warning*, not a problem, because on AWS the SDK takes credentials from an
 * instance or task role and a correct ECS/EKS deployment sets neither variable.
 * Failing the healthcheck on it put such deployments in a restart loop while
 * they were serving perfectly well.
 *
 * Credentials are never echoed — only where they came from.
 */
export async function GET(request: Request) {
  announceStorageConfig();
  const config = storageConfig();
  const { problems, warnings } = storageConfigReport(config);

  const storage = {
    endpoint: config.endpoint ?? '(aws default)',
    publicEndpoint: config.publicEndpoint ?? '(same as endpoint)',
    bucket: config.bucket || null,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    presignTtlSeconds: config.presignTtl,
    credentials: config.hasCredentials ? 'from environment' : 'from the SDK credential chain',
  };

  const deep = new URL(request.url).searchParams.get('deep');
  if (!deep || deep === '0' || deep === 'false') {
    return NextResponse.json(
      {
        status: problems.length === 0 ? 'ok' : 'misconfigured',
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
        storage,
        problems,
        warnings,
      },
      { status: problems.length === 0 ? 200 : 503 },
    );
  }

  if (!config.bucket) {
    return NextResponse.json(
      { status: 'misconfigured', storage, problems, warnings, reachable: false },
      { status: 503 },
    );
  }

  try {
    const started = Date.now();
    await s3Client().send(new ListObjectsV2Command({ Bucket: config.bucket, MaxKeys: 1 }));
    return NextResponse.json({
      status: 'ok',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      storage,
      problems,
      warnings,
      reachable: true,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    // The message names the bucket and endpoint that failed, because "access
    // denied" without them sends people to the wrong console.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/health] storage unreachable: %s', message);
    return NextResponse.json(
      { status: 'unreachable', storage, problems, warnings, reachable: false, error: message },
      { status: 503 },
    );
  }
}
