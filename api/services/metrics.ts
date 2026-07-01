import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import { Metric, ZMetricsResponse } from '../schemas/metrics';

/** Prefer the backend's `{ message }` over Axios's generic status-code text. */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/**
 * GET /exercises/:id/metrics — per-set diffs for ONE performed exercise vs. its
 * matched exercise in the previous same-template session. `:id` is a performed
 * exercise id (not a template/catalog id). Empty list = not yet computed or a
 * first-ever performance (both valid, eventually-consistent states).
 */
export async function getExerciseMetrics(
  exerciseId: string
): Promise<Result<Metric[], string>> {
  try {
    const { data } = await api.get(`/exercises/${exerciseId}/metrics`);
    return Ok(ZMetricsResponse.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/**
 * GET /trainments/:id/metrics — per-set diffs for a whole finished session
 * (every performed exercise's sets). Used by the session-level detail view.
 */
export async function getTrainmentMetrics(
  trainmentId: string
): Promise<Result<Metric[], string>> {
  try {
    const { data } = await api.get(`/trainments/${trainmentId}/metrics`);
    return Ok(ZMetricsResponse.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}
