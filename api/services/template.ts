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
  ZTemplateList,
  ZUpdateTemplateResponse,
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

/** GET /trainment-templates — the user's active templates. */
export async function listTrainmentTemplates(): Promise<
  Result<TrainmentTemplate[], string>
> {
  try {
    const { data } = await api.get('/trainment-templates');
    return Ok(ZTemplateList.parse(data));
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** PATCH /trainment-templates/:id — rename a template, returns the updated one. */
export async function renameTemplate(
  id: string,
  title: string
): Promise<Result<TrainmentTemplate, string>> {
  try {
    const { data } = await api.patch(`/trainment-templates/${id}`, { title });
    return Ok(ZUpdateTemplateResponse.parse(data).trainmentTemplate);
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/** DELETE /trainment-templates/:id — soft-delete a template (204). */
export async function deleteTemplate(
  id: string
): Promise<Result<void, string>> {
  try {
    await api.delete(`/trainment-templates/${id}`);
    return Ok(undefined);
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
