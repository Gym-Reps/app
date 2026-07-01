import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import {
  AddTemplateExerciseBody,
  CreateTemplateBody,
  ExerciseTemplate,
  TrainmentTemplate,
  ZAddExerciseResponse,
  ZCreateTemplateResponse,
  ZExerciseTemplateList,
} from '../schemas/template';

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/** POST /trainment-templates — create an empty template, returns it (with id). */
export async function createTemplate(
  body: CreateTemplateBody
): Promise<Result<TrainmentTemplate, string>> {
  try {
    const { data } = await api.post('/trainment-templates', body);
    return Ok(ZCreateTemplateResponse.parse(data).trainmentTemplate);
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** POST /trainment-templates/:id/exercises — add a catalog exercise slot. */
export async function addTemplateExercise(
  templateId: string,
  body: AddTemplateExerciseBody
): Promise<Result<ExerciseTemplate, string>> {
  try {
    const { data } = await api.post(
      `/trainment-templates/${templateId}/exercises`,
      body
    );
    return Ok(ZAddExerciseResponse.parse(data).exerciseTemplate);
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** GET /trainment-templates/:id/exercises — a template's active exercise slots. */
export async function listTemplateExercises(
  templateId: string
): Promise<Result<ExerciseTemplate[], string>> {
  try {
    const { data } = await api.get(`/trainment-templates/${templateId}/exercises`);
    return Ok(ZExerciseTemplateList.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** DELETE /exercise-templates/:id — soft-delete a slot from the template. */
export async function removeTemplateExercise(
  exerciseTemplateId: string
): Promise<Result<void, string>> {
  try {
    await api.delete(`/exercise-templates/${exerciseTemplateId}`);
    return Ok(undefined);
  } catch (err) {
    return Err(errorMessage(err));
  }
}
