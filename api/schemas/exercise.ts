import { z } from 'zod';

/**
 * Performed exercises (backend module 05, the `exercise` entity) — the exercises
 * inside a finished `trainment` session, each realizing an `exercise_template`
 * slot. Read via `GET /trainments/:trainmentId/exercises`.
 *
 * The metrics fan-out (spec 06) uses this to walk a session's exercises and
 * resolve each performed `exercise.id` → its `exerciseTemplateId` (the grouping
 * key across sessions) and a display `title`. `title` isn't guaranteed by the
 * DTO (it lives on the template), so it's optional with a resolved fallback.
 */
export const ZPerformedExercise = z.object({
  id: z.string(),
  exerciseTemplateId: z.string(),
  trainmentId: z.string().nullish(),
  /** Snapshotted display name if the DTO joins it; otherwise resolved elsewhere. */
  title: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type PerformedExercise = z.infer<typeof ZPerformedExercise>;

/**
 * `GET /trainments/:id/exercises`. Envelope is loosely specified in the backend
 * appendix, so accept a bare array or a wrapped `{ exercises }` and normalize to
 * `PerformedExercise[]` — mirroring the tolerant template-exercise list.
 */
export const ZPerformedExerciseList = z.union([
  z.array(ZPerformedExercise),
  z
    .object({ exercises: z.array(ZPerformedExercise) })
    .transform((o) => o.exercises),
]);
