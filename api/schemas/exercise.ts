import { z } from 'zod';
import { ZPlannedSet } from './sync';

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
  /**
   * The per-index plan snapshot (`{ "1": { weight, min_reps, max_reps }, … }`),
   * keyed contiguous `1..N`. Present on the exercises DTO; used to carry a prior
   * session's target rep ranges into a new one (see `api/queries/prefill.ts`).
   */
  plannedSets: z.record(z.string(), ZPlannedSet).nullish(),
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

/**
 * A performed `set` row (backend module 06) inside a finished session. Read via
 * `GET /trainments/:trainmentId/sets`. `weight`/`repetitions` are nullable (an
 * unlogged set); `exerciseId` links it back to its performed exercise so the
 * prefill loader can group a session's sets per exercise.
 */
export const ZPerformedSet = z.object({
  id: z.string(),
  exerciseId: z.string(),
  index: z.number().int(),
  weight: z.number().nullable(),
  repetitions: z.number().int().nullable(),
  performedAt: z.string().nullish(),
});
export type PerformedSet = z.infer<typeof ZPerformedSet>;

/**
 * `GET /trainments/:id/sets`. Envelope is loosely specified, so accept a bare
 * array or a wrapped `{ sets }` and normalize to `PerformedSet[]` — mirroring the
 * tolerant performed-exercise list above.
 */
export const ZPerformedSetList = z.union([
  z.array(ZPerformedSet),
  z.object({ sets: z.array(ZPerformedSet) }).transform((o) => o.sets),
]);
