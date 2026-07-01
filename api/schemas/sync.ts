import { z } from 'zod';

/**
 * Offline trainment **sync payload** — the local validator for
 * `POST /trainments/sync` (backend module 07). Mirrors the wire contract in
 * `specs/05_REGISTER_TRAINMENT.md` EXACTLY:
 *
 *  - `plannedSets` is a map keyed by contiguous `"1".."N"`; its values use
 *    snake_case `min_reps` / `max_reps` (a target range) + `weight`.
 *  - `sets` is an array using `repetitions` (the achieved count) + `index`.
 *  - Per exercise the **invariant** holds: `sets.length ===
 *    Object.keys(plannedSets).length`, and both the `sets[].index` values and the
 *    `plannedSets` keys are contiguous `1..N`. We enforce it here so the payload
 *    is validated on-device BEFORE it is enqueued — no guaranteed `409`s.
 *
 * Timestamps are kept as ISO strings (what we store in AsyncStorage and send on
 * the wire); the server coerces them to dates. We validate they parse.
 */

const ZIsoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'invalid ISO date' });

/** One entry of the `plannedSets` map (the per-index plan / UI placeholders). */
export const ZPlannedSet = z.object({
  weight: z.number().nullable(),
  min_reps: z.number().int().nullable(),
  max_reps: z.number().int().nullable(),
});
export type PlannedSet = z.infer<typeof ZPlannedSet>;

/** One performed set row (actual weight/reps for a given index). */
export const ZSet = z.object({
  id: z.string(),
  index: z.number().int().min(1),
  weight: z.number().min(0).nullable(),
  repetitions: z.number().int().min(0).nullable(),
  performedAt: ZIsoDate,
});
export type SetPayload = z.infer<typeof ZSet>;

/** Is `1..n` a contiguous, gap-free, duplicate-free set of the ints in `xs`? */
function isContiguous(xs: number[]): boolean {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted.every((v, i) => v === i + 1);
}

export const ZExercisePayload = z
  .object({
    id: z.string(),
    exerciseTemplateId: z.string(),
    plannedSets: z.record(z.string(), ZPlannedSet),
    sets: z.array(ZSet),
  })
  .refine((e) => e.sets.length === Object.keys(e.plannedSets).length, {
    message: 'sets count must equal plannedSets length',
  })
  .refine((e) => isContiguous(e.sets.map((s) => s.index)), {
    message: 'set indices must be contiguous 1..N',
  })
  .refine((e) => isContiguous(Object.keys(e.plannedSets).map(Number)), {
    message: 'plannedSets keys must be contiguous 1..N',
  });
export type ExercisePayload = z.infer<typeof ZExercisePayload>;

export const ZSyncPayload = z.object({
  id: z.string(),
  trainmentTemplateId: z.string(),
  startedAt: ZIsoDate,
  finishedAt: ZIsoDate.nullable(),
  exercises: z.array(ZExercisePayload),
});
export type SyncPayload = z.infer<typeof ZSyncPayload>;

/**
 * Re-assert the per-exercise invariant outside of Zod (the Finish path runs this
 * after `ZSyncPayload.parse` as belt-and-suspenders). Returns an error message,
 * or `null` when the payload is valid to enqueue/sync.
 */
export function checkInvariants(payload: SyncPayload): string | null {
  for (const e of payload.exercises) {
    const plannedCount = Object.keys(e.plannedSets).length;
    if (e.sets.length !== plannedCount) {
      return `An exercise has ${e.sets.length} sets but ${plannedCount} planned.`;
    }
    if (!isContiguous(e.sets.map((s) => s.index))) {
      return 'Set indices are not contiguous 1..N.';
    }
    if (!isContiguous(Object.keys(e.plannedSets).map(Number))) {
      return 'Planned-set keys are not contiguous 1..N.';
    }
  }
  return null;
}
