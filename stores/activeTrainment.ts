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

/** Shape a caller (Templates "Start") passes for each exercise to seed. */
export type StartExerciseInput = {
  exerciseTemplateId: string;
  title: string;
  /** Optional per-index plan snapshot. Defaults to a single empty planned set. */
  plannedSets?: PlannedSet[];
};

export type StartFromTemplateInput = {
  templateId: string;
  exercises: StartExerciseInput[];
};

export type StartResult =
  | { started: true }
  | { started: false; reason: 'active-exists' };

const EMPTY_PLAN: PlannedSet = { weight: null, min_reps: null, max_reps: null };

function nowIso(): string {
  return new Date().toISOString();
}

/** Build one performed set from a planned entry, at `index` (1-based). */
function seedSet(plan: PlannedSet, index: number): ActiveSet {
  return {
    id: newId(),
    index,
    weight: plan.weight,
    repetitions: null,
    performedAt: nowIso(),
  };
}

/** Seed an exercise's `plannedSets` map + matching `sets` from an input. */
function seedExercise(input: StartExerciseInput): ActiveExercise {
  const plans =
    input.plannedSets && input.plannedSets.length > 0
      ? input.plannedSets
      : [EMPTY_PLAN];
  const plannedSets: Record<string, PlannedSet> = {};
  const sets: ActiveSet[] = [];
  plans.forEach((plan, i) => {
    const index = i + 1;
    plannedSets[String(index)] = { ...plan };
    sets.push(seedSet(plan, index));
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

type State = {
  active: ActiveTrainment | null;

  /** Seed the session from a template. Refuses if one is already in progress. */
  startFromTemplate: (input: StartFromTemplateInput) => StartResult;

  /** Append a set (index `N+1`) to an exercise, extending BOTH plan and sets. */
  addSet: (exerciseId: string) => void;

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

      addSet: (exerciseId) =>
        set((s) => ({
          active: mapExercise(s.active, exerciseId, (ex) => {
            const keys = Object.keys(ex.plannedSets).map(Number);
            const next = (keys.length ? Math.max(...keys) : 0) + 1;
            // New plan mirrors the last planned entry (a sensible default).
            const lastPlan = ex.plannedSets[String(next - 1)] ?? EMPTY_PLAN;
            const plan: PlannedSet = { ...lastPlan };
            return reindex({
              ...ex,
              plannedSets: { ...ex.plannedSets, [String(next)]: plan },
              sets: [...ex.sets, seedSet(plan, next)],
            });
          }),
        })),

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

      finish: () => {
        const active = get().active;
        if (!active) return null;
        return {
          id: active.id,
          trainmentTemplateId: active.trainmentTemplateId,
          startedAt: active.startedAt,
          finishedAt: nowIso(),
          exercises: active.exercises.map((ex) => ({
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
