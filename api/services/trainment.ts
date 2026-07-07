import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import {
  Trainment,
  TrainmentListResponse,
  WeeklyProgressResponse,
  ZTrainmentListResponse,
  ZTrainmentResponse,
  ZWeeklyProgress,
} from '../schemas/trainment';

/** Prefer the backend's `{ message }` over Axios's generic status-code text. */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/**
 * GET /trainments — the user's performed sessions, newest first. `page` is
 * 1-based (size 20). Powers the Home "latest trainments" infinite list. Pass
 * `trainmentTemplateId` to scope to one template's sessions (the prefill loader
 * uses this to find the previous same-template session).
 */
export async function listTrainments(
  page = 1,
  opts?: { trainmentTemplateId?: string }
): Promise<Result<TrainmentListResponse, string>> {
  try {
    const { data } = await api.get('/trainments', {
      params: {
        page,
        ...(opts?.trainmentTemplateId != null && {
          trainmentTemplateId: opts.trainmentTemplateId,
        }),
      },
    });
    return Ok(ZTrainmentListResponse.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/**
 * GET /trainments/weekly-progress — this Mon–Sun window's finished sessions plus
 * the `weeklyTrainingCount` goal (nullable). Powers the weekly progress card.
 */
export async function getWeeklyProgress(): Promise<Result<WeeklyProgressResponse, string>> {
  try {
    const { data } = await api.get<WeeklyProgressResponse>('/trainments/weekly-progress');
    return Ok(data);
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** GET /trainments/:id — a single session (read-only detail). */
export async function getTrainment(id: string): Promise<Result<Trainment, string>> {
  try {
    const { data } = await api.get(`/trainments/${id}`);
    return Ok(ZTrainmentResponse.parse(data).trainment);
  } catch (err) {
    return Err(errorMessage(err));
  }
}
