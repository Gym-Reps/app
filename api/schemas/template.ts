import { z } from 'zod';

/**
 * Trainment templates (reusable workout plans) and their exercise slots.
 * Backend contract: create lives in the trainment module; the exercise slots are
 * `exercise_template`s (module 05, `/trainment-templates/:id/exercises`). API
 * responses are camelCased (matching the catalog module), so field names here
 * are camelCase even though Prisma stores snake_case.
 */

export const ZTrainmentTemplate = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});
export type TrainmentTemplate = z.infer<typeof ZTrainmentTemplate>;

/** `POST /trainment-templates` → `201 { trainmentTemplate }`. */
export const ZCreateTemplateResponse = z.object({
  trainmentTemplate: ZTrainmentTemplate,
});

/**
 * A planned exercise slot inside a template. The DTO carries the snapshotted
 * `title` + the catalog reference, but no image/muscle group — those are
 * cross-referenced against the cached catalog for display (see the editor).
 */
export const ZExerciseTemplate = z.object({
  id: z.string(),
  title: z.string(),
  exerciseCatalogId: z.string().nullish(),
  trainmentTemplateId: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type ExerciseTemplate = z.infer<typeof ZExerciseTemplate>;

/** `POST /trainment-templates/:id/exercises` → `201 { exerciseTemplate }`. */
export const ZAddExerciseResponse = z.object({
  exerciseTemplate: ZExerciseTemplate,
});

/**
 * `GET /trainment-templates/:id/exercises`. The exact envelope is loosely
 * specified in the backend appendix, so accept a bare array or a wrapped
 * `{ exercises }` / `{ exerciseTemplates }` and normalize to `ExerciseTemplate[]`.
 */
export const ZExerciseTemplateList = z.union([
  z.array(ZExerciseTemplate),
  z.object({ exercises: z.array(ZExerciseTemplate) }).transform((o) => o.exercises),
  z
    .object({ exerciseTemplates: z.array(ZExerciseTemplate) })
    .transform((o) => o.exerciseTemplates),
]);

/**
 * `GET /trainment-templates`. The backend contract returns
 * `{ trainmentTemplates: [...] }` (plural — confirmed in
 * `backend/specs/01_TRAINMENT_MODULE.md`), but the frontend appendix noted the
 * key as `trainmentTemplate` (singular). To stay tolerant of either envelope
 * (and a bare array), accept any of them and normalize to `TrainmentTemplate[]`
 * — mirroring `ZExerciseTemplateList` above.
 */
export const ZTemplateList = z.union([
  z.array(ZTrainmentTemplate),
  z
    .object({ trainmentTemplates: z.array(ZTrainmentTemplate) })
    .transform((o) => o.trainmentTemplates),
  z
    .object({ trainmentTemplate: z.array(ZTrainmentTemplate) })
    .transform((o) => o.trainmentTemplate),
  z.object({ templates: z.array(ZTrainmentTemplate) }).transform((o) => o.templates),
]);

/** `PATCH /trainment-templates/:id` → `200 { trainmentTemplate }`. */
export const ZUpdateTemplateResponse = z.object({
  trainmentTemplate: ZTrainmentTemplate,
});

export type CreateTemplateBody = { title: string };
export type AddTemplateExerciseBody = { exerciseCatalogId: string };
export type RenameTemplateBody = { title: string };
