import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import {
  PerformedExercise,
  PerformedSet,
  ZPerformedExerciseList,
  ZPerformedSetList,
} from '../schemas/exercise';

/** Prefer the backend's `{ message }` over Axios's generic status-code text. */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/**
 * GET /trainments/:id/exercises — the performed exercises inside a finished
 * session. The metrics fan-out (spec 06) walks these to reach each performed
 * exercise's per-set metrics and to group them by `exerciseTemplateId`.
 */
export async function listTrainmentExercises(
  trainmentId: string
): Promise<Result<PerformedExercise[], string>> {
  try {
    const { data } = await api.get(`/trainments/${trainmentId}/exercises`);
    return Ok(ZPerformedExerciseList.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/**
 * GET /trainments/:id/sets — every performed set in a finished session, ordered
 * by `index` and keyed to its `exerciseId`. Used by the prefill loader (spec 05)
 * to seed a new session's sets from the last same-template session's numbers.
 */
export async function listTrainmentSets(
  trainmentId: string
): Promise<Result<PerformedSet[], string>> {
  try {
    const { data } = await api.get(`/trainments/${trainmentId}/sets`);
    return Ok(ZPerformedSetList.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}
