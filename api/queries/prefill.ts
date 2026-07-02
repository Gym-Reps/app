import { queryClient } from '../queryClient';
import { listTrainments } from '../services/trainment';
import {
  listTrainmentExercises,
  listTrainmentSets,
} from '../services/exercise';
import { QUERY_KEYS } from '../queryKeys';
import type { SeedSet } from '../../stores/activeTrainment';

/**
 * Prefill for a new trainment from the user's most recent finished session of the
 * SAME template (spec 05). Returns `exerciseTemplateId → SeedSet[]` (ordered by
 * set index): the weight/reps actually performed last time plus the target rep
 * range, so `TemplatesScreen` can seed the session pre-filled instead of blank.
 *
 * Best-effort and offline-safe: a first-ever template, an offline Start, or any
 * request failure resolves to an EMPTY map — the store then falls back to a
 * single empty set (the first-ever flow). Prefill never blocks starting a
 * workout. Reads go through `queryClient.fetchQuery` (finished-session data is
 * immutable) so a repeated Start re-uses cache, mirroring `queries/metrics.ts`.
 */

/** Finished-session data never changes underneath us — cache it for a while. */
const STALE_MS = 10 * 60_000;

export async function loadLastSessionSeeds(
  templateId: string
): Promise<Map<string, SeedSet[]>> {
  const empty = new Map<string, SeedSet[]>();
  try {
    // 1) Newest-first trainments for this template → the previous finished one.
    const list = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.TRAINMENTS_BY_TEMPLATE(templateId),
      queryFn: async () => {
        const res = await listTrainments(1, { trainmentTemplateId: templateId });
        if (!res.ok) throw new Error(res.error);
        return res.data;
      },
      staleTime: STALE_MS,
    });
    const previous = list.trainments.find((t) => t.finishedAt != null);
    if (!previous) return empty;

    // 2) + 3) The session's exercises (for target ranges) and its performed sets.
    const [exercises, sets] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: QUERY_KEYS.TRAINMENT_EXERCISES(previous.id),
        queryFn: async () => {
          const res = await listTrainmentExercises(previous.id);
          if (!res.ok) throw new Error(res.error);
          return res.data;
        },
        staleTime: STALE_MS,
      }),
      queryClient.fetchQuery({
        queryKey: QUERY_KEYS.TRAINMENT_SETS(previous.id),
        queryFn: async () => {
          const res = await listTrainmentSets(previous.id);
          if (!res.ok) throw new Error(res.error);
          return res.data;
        },
        staleTime: STALE_MS,
      }),
    ]);

    // 4) Group sets by their performed exercise, then key by exerciseTemplateId.
    const setsByExercise = new Map<string, typeof sets>();
    for (const s of sets) {
      const bucket = setsByExercise.get(s.exerciseId);
      if (bucket) bucket.push(s);
      else setsByExercise.set(s.exerciseId, [s]);
    }

    const seeds = new Map<string, SeedSet[]>();
    for (const ex of exercises) {
      const exSets = (setsByExercise.get(ex.id) ?? [])
        .slice()
        .sort((a, b) => a.index - b.index)
        // Only carry over sets that were ACTUALLY performed. A session can hold a
        // trailing/blank set (0 or unlogged reps) that was never done — copying it
        // would seed a phantom "0 reps" set and shift the visible numbering.
        .filter((s) => s.repetitions != null && s.repetitions > 0);
      if (exSets.length === 0) continue; // nothing performed → leave it blank
      const plan = ex.plannedSets ?? {};
      seeds.set(
        ex.exerciseTemplateId,
        exSets.map((s) => {
          const planned = plan[String(s.index)];
          return {
            weight: s.weight,
            repetitions: s.repetitions,
            min_reps: planned?.min_reps ?? null,
            max_reps: planned?.max_reps ?? null,
          };
        })
      );
    }
    return seeds;
  } catch {
    // Offline, no prior session, or a bad response → seed blank (first-ever flow).
    return empty;
  }
}
