import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newId } from '../lib/uuid';
import type { PlannedSet, SyncPayload } from '../api/schemas/sync';

/**
 * The single in-progress workout session, built entirely on-device and persisted
 * to AsyncStorage (`active_trainment`) so a crash mid-workout resumes on next
 * launch. Nothing here is server state — it only touches the network at Finish
 * (see `screens/LogWorkoutScreen.tsx`). Per `specs/05_REGISTER_TRAINMENT.md`.
 *
 * The set-count invariant (`sets.length === keys(plannedSets).length`, both
 * contiguous `1..N`) is maintained on EVERY mutation, so the payload built at
 * Finish always validates before it's synced/enqueued (no guaranteed `409`s).
 */

/** A performed set held in the active session (mirrors the sync `sets[]` shape). */
export type ActiveSet = {
  id: string;
  index: number;
  weight: number | null;
  repetitions: number | null;
  performedAt: string;
  /**
   * Confirmed by the user this session. Drives the focus-advance UI: the first
   * un-`logged` set is the "working" set (big steppers); logging it advances to
   * the next pre-seeded set. Persisted so a resumed workout keeps its progress.
   * Not part of the sync contract (stripped in `finish`).
   */
  logged: boolean;
  /**
   * The immutable "last time" values shown as a hint under the steppers, set at
   * seed time on prefilled sets only (`null` for first-ever / added sets). Never
   * mutated on edit, never synced.
   */
  hint?: { weight: number | null; repetitions: number | null } | null;
};

/** A performed exercise in the active session. `title` is display-only (not synced). */
export type ActiveExercise = {
  id: string;
  exerciseTemplateId: string;
  /** Display label, hydrated from the cached catalog/template. Not sent to the server. */
  title: string;
  plannedSets: Record<string, PlannedSet>;
  sets: ActiveSet[];
};

export type ActiveTrainment = {
  id: string;
  trainmentTemplateId: string;
  startedAt: string;
  exercises: ActiveExercise[];
};

/**
 * One set carried over from the previous same-template session: the plan's
 * target range (`min_reps`/`max_reps`) plus the actual `weight`/`repetitions`
 * performed. Built by `api/queries/prefill.ts`.
 */
export type SeedSet = {
  weight: number | null;
  repetitions: number | null;
  min_reps: number | null;
  max_reps: number | null;
};

/** Shape a caller (Templates "Start") passes for each exercise to seed. */
export type StartExerciseInput = {
  exerciseTemplateId: string;
  title: string;
  /**
   * Sets to prefill from the last session (in `index` order). When present, each
   * becomes a matching `plannedSets` entry + a prefilled performed set carrying a
   * "last time" hint. Absent → a single empty, hint-less set (first-ever flow).
   */
  seedSets?: SeedSet[];
};

export type StartFromTemplateInput = {
  templateId: string;
  exercises: StartExerciseInput[];
};

export type StartResult =
  | { started: true }
  | { started: false; reason: 'active-exists' };

const EMPTY_PLAN: PlannedSet = { weight: null, min_reps: null, max_reps: null };
const EMPTY_SEED: SeedSet = {
  weight: null,
  repetitions: null,
  min_reps: null,
  max_reps: null,
};

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Build one performed set from a planned entry, at `index` (1-based). Used when
 * the user manually appends a set (`addSet`) — starts un-logged with no hint.
 */
function seedSet(plan: PlannedSet, index: number): ActiveSet {
  return {
    id: newId(),
    index,
    weight: plan.weight,
    repetitions: null,
    performedAt: nowIso(),
    logged: false,
    hint: null,
  };
}

/** Seed an exercise's `plannedSets` map + matching `sets` from an input. */
function seedExercise(input: StartExerciseInput): ActiveExercise {
  const prefilled = !!(input.seedSets && input.seedSets.length > 0);
  const seeds = prefilled ? input.seedSets! : [EMPTY_SEED];
  const plannedSets: Record<string, PlannedSet> = {};
  const sets: ActiveSet[] = [];
  seeds.forEach((seed, i) => {
    const index = i + 1;
    plannedSets[String(index)] = {
      weight: seed.weight,
      min_reps: seed.min_reps,
      max_reps: seed.max_reps,
    };
    sets.push({
      id: newId(),
      index,
      weight: seed.weight,
      repetitions: seed.repetitions,
      performedAt: nowIso(),
      logged: false,
      // Only prefilled sets carry a "last time" hint; the empty default doesn't.
      hint: prefilled
        ? { weight: seed.weight, repetitions: seed.repetitions }
        : null,
    });
  });
  return {
    id: newId(),
    exerciseTemplateId: input.exerciseTemplateId,
    title: input.title,
    plannedSets,
    sets,
  };
}

/**
 * Re-key `plannedSets` and re-`index` `sets` to a contiguous `1..N`, preserving
 * order. Run after any add/remove so the invariant is never observed broken.
 */
function reindex(ex: ActiveExercise): ActiveExercise {
  const sets = [...ex.sets]
    .sort((a, b) => a.index - b.index)
    .map((s, i) => ({ ...s, index: i + 1 }));
  const orderedPlans = Object.keys(ex.plannedSets)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => ex.plannedSets[String(k)]);
  const plannedSets: Record<string, PlannedSet> = {};
  orderedPlans.forEach((plan, i) => {
    plannedSets[String(i + 1)] = plan;
  });
  return { ...ex, sets, plannedSets };
}

/**
 * Drop TRAILING sets that were never performed (null / non-positive reps) — an
 * accidental "Add set" at the end, or a prefilled set left unconfirmed. Their
 * `plannedSets` entries are dropped too and the exercise is re-indexed so the
 * count invariant still holds. Only trailing empties are removed; a `0`-rep set
 * with performed sets after it is kept as-is.
 */
function trimTrailingUnperformed(ex: ActiveExercise): ActiveExercise {
  const sorted = [...ex.sets].sort((a, b) => a.index - b.index);
  let end = sorted.length;
  while (end > 0) {
    const s = sorted[end - 1];
    if (s.repetitions == null || s.repetitions <= 0) end--;
    else break;
  }
  if (end === sorted.length) return ex; // nothing trailing to trim
  const kept = new Set(sorted.slice(0, end).map((s) => s.index));
  const plannedSets: Record<string, PlannedSet> = {};
  for (const k of Object.keys(ex.plannedSets)) {
    if (kept.has(Number(k))) plannedSets[k] = ex.plannedSets[k];
  }
  return reindex({ ...ex, plannedSets, sets: sorted.slice(0, end) });
}

type State = {
  active: ActiveTrainment | null;

  /** Seed the session from a template. Refuses if one is already in progress. */
  startFromTemplate: (input: StartFromTemplateInput) => StartResult;

  /**
   * Append a set (index `N+1`) to an exercise, extending BOTH plan and sets.
   * Returns the new set's `id` so the caller can select it as active.
   */
  addSet: (exerciseId: string) => string;

  /**
   * Edit a set: `weight` updates BOTH the performed set and its `plannedSets`
   * entry; `repetitions` updates the performed set (and re-stamps `performedAt`).
   */
  editSet: (
    exerciseId: string,
    index: number,
    patch: { weight?: number | null; repetitions?: number | null }
  ) => void;

  /** Remove a set from an exercise, then re-index `1..N` on plan AND sets. */
  removeSet: (exerciseId: string, index: number) => void;

  /**
   * Mark a set confirmed for this session (focus-advance): the working set
   * collapses to a done row and the next pre-seeded set becomes current.
   */
  logSet: (exerciseId: string, index: number) => void;

  /** Build the sync payload (stamps `finishedAt = now`). Does not clear state. */
  finish: () => SyncPayload | null;

  /** Abandon the in-progress session. */
  discard: () => void;
  /** Alias for `discard` (cleared after a successful sync/enqueue at Finish). */
  clear: () => void;
};

function mapExercise(
  state: ActiveTrainment | null,
  exerciseId: string,
  fn: (ex: ActiveExercise) => ActiveExercise
): ActiveTrainment | null {
  if (!state) return state;
  return {
    ...state,
    exercises: state.exercises.map((ex) => (ex.id === exerciseId ? fn(ex) : ex)),
  };
}

export const useActiveTrainment = create<State>()(
  persist(
    (set, get) => ({
      active: null,

      startFromTemplate: (input) => {
        if (get().active) return { started: false, reason: 'active-exists' };
        set({
          active: {
            id: newId(),
            trainmentTemplateId: input.templateId,
            startedAt: nowIso(),
            exercises: input.exercises.map(seedExercise),
          },
        });
        return { started: true };
      },

      addSet: (exerciseId) => {
        const newSet = seedSet(EMPTY_PLAN, 0); // index fixed up by reindex below
        set((s) => ({
          active: mapExercise(s.active, exerciseId, (ex) => {
            const keys = Object.keys(ex.plannedSets).map(Number);
            const next = (keys.length ? Math.max(...keys) : 0) + 1;
            // New plan mirrors the last planned entry's weight (a sensible
            // default); reps start empty so the added set must be logged fresh.
            const lastPlan = ex.plannedSets[String(next - 1)] ?? EMPTY_PLAN;
            const plan: PlannedSet = { ...lastPlan };
            newSet.index = next;
            newSet.weight = plan.weight;
            return reindex({
              ...ex,
              plannedSets: { ...ex.plannedSets, [String(next)]: plan },
              sets: [...ex.sets, newSet],
            });
          }),
        }));
        return newSet.id;
      },

      editSet: (exerciseId, index, patch) =>
        set((s) => ({
          active: mapExercise(s.active, exerciseId, (ex) => {
            const plannedSets = { ...ex.plannedSets };
            if (patch.weight !== undefined) {
              const key = String(index);
              const plan = plannedSets[key] ?? { ...EMPTY_PLAN };
              plannedSets[key] = { ...plan, weight: patch.weight };
            }
            const sets = ex.sets.map((set_) =>
              set_.index === index
                ? {
                    ...set_,
                    ...(patch.weight !== undefined && { weight: patch.weight }),
                    ...(patch.repetitions !== undefined && {
                      repetitions: patch.repetitions,
                    }),
                    performedAt: nowIso(),
                  }
                : set_
            );
            return { ...ex, plannedSets, sets };
          }),
        })),

      removeSet: (exerciseId, index) =>
        set((s) => ({
          active: mapExercise(s.active, exerciseId, (ex) => {
            const plannedSets = { ...ex.plannedSets };
            delete plannedSets[String(index)];
            return reindex({
              ...ex,
              plannedSets,
              sets: ex.sets.filter((set_) => set_.index !== index),
            });
          }),
        })),

      logSet: (exerciseId, index) =>
        set((s) => ({
          active: mapExercise(s.active, exerciseId, (ex) => ({
            ...ex,
            sets: ex.sets.map((set_) =>
              set_.index === index ? { ...set_, logged: true } : set_
            ),
          })),
        })),

      finish: () => {
        const active = get().active;
        if (!active) return null;
        return {
          id: active.id,
          trainmentTemplateId: active.trainmentTemplateId,
          startedAt: active.startedAt,
          finishedAt: nowIso(),
          // Trim trailing unperformed sets so an accidental "Add set" doesn't
          // persist a phantom 0-rep set (which would then prefill next session).
          exercises: active.exercises.map(trimTrailingUnperformed).map((ex) => ({
            id: ex.id,
            exerciseTemplateId: ex.exerciseTemplateId,
            plannedSets: ex.plannedSets,
            sets: ex.sets.map((set_) => ({
              id: set_.id,
              index: set_.index,
              weight: set_.weight,
              repetitions: set_.repetitions,
              performedAt: set_.performedAt,
            })),
          })),
        };
      },

      discard: () => set({ active: null }),
      clear: () => set({ active: null }),
    }),
    {
      name: 'active_trainment',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Selector: is there a session in progress? (for resume/discard prompts). */
export const useHasActiveTrainment = () =>
  useActiveTrainment((s) => s.active !== null);
