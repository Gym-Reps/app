import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import {
  CatalogExercise,
  CatalogSearchResponse,
  MuscleGroup,
  ZCatalogExerciseResponse,
  ZCatalogSearchResponse,
} from '../schemas/catalog';

/** Prefer the backend's `{ message }` over Axios's generic status-code text. */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/**
 * GET /catalog/exercises — search/filter/paginate the exercise catalog.
 * `page` is 1-based (size 20). Empty `q` / absent `muscleGroup` are omitted.
 */
export async function searchExercises(params: {
  q?: string;
  muscleGroup?: MuscleGroup;
  page?: number;
}): Promise<Result<CatalogSearchResponse, string>> {
  try {
    const { data } = await api.get('/catalog/exercises', {
      params: {
        q: params.q?.trim() || undefined,
        muscleGroup: params.muscleGroup,
        page: params.page ?? 1,
      },
    });
    return Ok(ZCatalogSearchResponse.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** GET /catalog/exercises/:id — a single catalog entry. */
export async function getCatalogExercise(
  id: string
): Promise<Result<CatalogExercise, string>> {
  try {
    const { data } = await api.get(`/catalog/exercises/${id}`);
    return Ok(ZCatalogExerciseResponse.parse(data).exercise);
  } catch (err) {
    return Err(errorMessage(err));
  }
}
