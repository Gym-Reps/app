import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import { SyncPayload } from '../schemas/sync';

/** Prefer the backend's `{ message }` over Axios's generic status-code text. */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/**
 * How a sync failure should be handled by the poller:
 *  - `network` (no HTTP response) → keep the payload, back off, retry later.
 *  - `conflict` (`409`) / `notFound` (`404`) / `forbidden` (`403`) / `invalid`
 *    (`400`) → the server will never accept this payload, so drop it (don't loop).
 *  - `unknown` (any other status) → treated as retryable.
 */
export type SyncErrorKind =
  | 'network'
  | 'conflict'
  | 'notFound'
  | 'forbidden'
  | 'invalid'
  | 'unknown';

export type SyncError = {
  kind: SyncErrorKind;
  status?: number;
  message: string;
};

/** Statuses the poller should give up on (re-sending can never succeed). */
export function isPermanent(err: SyncError): boolean {
  return (
    err.kind === 'conflict' ||
    err.kind === 'notFound' ||
    err.kind === 'forbidden' ||
    err.kind === 'invalid'
  );
}

function classify(err: unknown): SyncError {
  const message = errorMessage(err);
  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status == null) return { kind: 'network', message };
    switch (status) {
      case 409:
        return { kind: 'conflict', status, message };
      case 404:
        return { kind: 'notFound', status, message };
      case 403:
        return { kind: 'forbidden', status, message };
      case 400:
        return { kind: 'invalid', status, message };
      default:
        return { kind: 'unknown', status, message };
    }
  }
  return { kind: 'unknown', message };
}

/**
 * `POST /trainments/sync` — persist one completed offline trainment graph
 * atomically & idempotently (keyed by the client-generated `id`). `201` on the
 * first sync and `200` on an idempotent re-sync are BOTH success (safe to retry).
 * Follows the `Result` pattern (try/catch → `Ok`/`Err`); the `Err` carries a
 * classified `SyncError` so the poller can decide keep-and-backoff vs. drop.
 */
export async function syncTrainment(
  payload: SyncPayload
): Promise<Result<void, SyncError>> {
  try {
    await api.post('/trainments/sync', payload);
    return Ok(undefined);
  } catch (err) {
    return Err(classify(err));
  }
}
