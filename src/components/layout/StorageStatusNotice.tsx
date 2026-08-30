'use client';
import { useEffect, useState } from 'react';
import styles from './StorageStatusNotice.module.css';

interface HealthResponse {
  status: 'ok' | 'misconfigured' | 'unreachable';
  storage?: {
    endpoint?: string;
    publicEndpoint?: string;
    bucket?: string | null;
    region?: string;
    credentials?: string;
  };
  problems?: string[];
  error?: string;
}

/**
 * Say when the room list is empty because storage is misconfigured.
 *
 * This is the failure the whole configuration story turns on: a wrong bucket, a
 * missing key or an unreachable endpoint does not crash the app. It serves an
 * empty room list — which looks exactly like a correctly configured bucket that
 * happens to have nothing in it. Without this notice the two are
 * indistinguishable from the browser, and the usual next step is to go looking
 * for the recordings rather than for the config.
 *
 * Shown only when something is actually wrong; a healthy deployment sees
 * nothing. Never renders a credential — the endpoint only reports whether keys
 * were found, not what they were.
 */
export function StorageStatusNotice() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // The deep check asks storage to answer rather than only checking that the
    // settings look plausible — "S3_BUCKET is set" and "that bucket exists and
    // we may read it" are different claims, and only the second one matters.
    fetch('/api/health?deep=1', { signal: controller.signal })
      .then((res) => res.json() as Promise<HealthResponse>)
      .then((body) => setHealth(body))
      .catch(() => {
        // The server itself is unreachable; the page is already broken in a way
        // this banner cannot usefully describe.
      });
    return () => controller.abort();
  }, []);

  if (!health || health.status === 'ok') return null;

  const misconfigured = health.status === 'misconfigured';

  return (
    <div className={styles.notice} role="alert">
      <strong className={styles.title}>
        {misconfigured ? 'Storage is not configured' : 'Storage did not answer'}
      </strong>
      <p className={styles.body}>
        {misconfigured
          ? 'The dashboard reads calls from an S3-compatible bucket. Until it is configured, the room list is empty for that reason rather than because the bucket is.'
          : 'The settings are present, but the bucket could not be read. An empty room list below is this failure, not an empty bucket.'}
      </p>

      {health.problems && health.problems.length > 0 && (
        <ul className={styles.problems}>
          {health.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {health.error && <p className={styles.error}>{health.error}</p>}

      {health.storage && (
        <dl className={styles.config}>
          <dt>endpoint</dt>
          <dd>{health.storage.endpoint}</dd>
          {health.storage.publicEndpoint && (
            <>
              <dt>public endpoint</dt>
              <dd>{health.storage.publicEndpoint}</dd>
            </>
          )}
          <dt>bucket</dt>
          <dd>{health.storage.bucket ?? '(unset)'}</dd>
          <dt>region</dt>
          <dd>{health.storage.region}</dd>
          <dt>credentials</dt>
          <dd>{health.storage.credentials}</dd>
        </dl>
      )}

      <p className={styles.hint}>
        Set these in <code>.env.local</code>, or pass them to the container — see{' '}
        <code>.env.example</code>. <code>/api/health?deep=1</code> reports the same detail.
      </p>
    </div>
  );
}
