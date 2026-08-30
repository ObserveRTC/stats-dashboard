/**
 * Correlating replies from a shared worker with the requests that asked for
 * them.
 *
 * A `Worker`'s `message` event is a broadcast, not a reply channel: every
 * listener attached to it fires for every message the worker sends. Code that
 * treats "attach a listener, post a message, resolve on the next message" as a
 * request/response pair is therefore only correct while exactly one request is
 * ever in flight. The moment two overlap, both listeners run on the first
 * reply, both callers resolve with the same payload, and the second reply
 * arrives with nobody waiting for it.
 *
 * That is not a hang or a crash — it is two callers being handed a third
 * party's data and rendering it. In this app it meant loading several clients
 * at once gave overlapping rows identical RTT, loss and issue counts.
 *
 * This is the fix, kept apart from the React hook so the rule it enforces can
 * be tested without a DOM: every request gets an id, the worker echoes it, and
 * a reply can only ever settle the request whose id it carries.
 */

/** A reply as it arrives from the worker, before anything is trusted about it. */
export interface WorkerReply {
  id?: unknown;
  results?: unknown;
  error?: unknown;
}

/** The requests posted to a worker and not yet answered. */
export class PendingWorkerRequests<T> {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (value: T) => void; reject: (error: Error) => void }
  >();

  /** How many requests are outstanding. */
  get size(): number {
    return this.pending.size;
  }

  /**
   * Register a request and return the id to post alongside it.
   *
   * Ids are never reused within a dispatcher's lifetime, so a late reply from
   * an abandoned request can never be mistaken for a live one.
   */
  open(resolve: (value: T) => void, reject: (error: Error) => void): number {
    const id = this.nextId++;
    this.pending.set(id, { resolve, reject });
    return id;
  }

  /**
   * Route one reply to the request that asked for it.
   *
   * Returns false when the reply matches nothing — an unknown or missing id,
   * which happens when the caller was torn down before the answer came back.
   * Dropped rather than guessed at: handing it to some other request is
   * precisely the bug.
   */
  settle(reply: WorkerReply | null | undefined, decode: (results: unknown[]) => T): boolean {
    if (!reply || typeof reply !== 'object' || typeof reply.id !== 'number') return false;

    const request = this.pending.get(reply.id);
    if (!request) return false;
    this.pending.delete(reply.id);

    if (typeof reply.error === 'string') {
      request.reject(new Error(reply.error));
    } else if (Array.isArray(reply.results)) {
      try {
        request.resolve(decode(reply.results));
      } catch (err) {
        request.reject(err instanceof Error ? err : new Error('Failed to decode worker response'));
      }
    } else {
      request.reject(new Error('Unexpected worker response'));
    }
    return true;
  }

  /**
   * Fail everything outstanding.
   *
   * For a worker-level error or a teardown, neither of which is attributable to
   * one request. The alternative — failing one arbitrarily — leaves the rest
   * pending for ever, and a promise that never settles is a spinner that never
   * stops.
   */
  failAll(error: Error): void {
    const requests = [...this.pending.values()];
    this.pending.clear();
    for (const request of requests) request.reject(error);
  }
}
