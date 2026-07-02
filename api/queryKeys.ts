import type { MuscleGroup } from './schemas/catalog';

/**
 * Centralized TanStack Query keys. Every query/mutation references these instead
 * of inlining raw string arrays, so a key is defined in exactly one place and
 * producers (queries) and consumers (mutations, cache reads/writes) can never
 * drift apart.
 *
 * Keys are single namespaced strings (`@reps:*`) EXCEPT `CATALOG`, which stays a
 * two-element hierarchical key so `CATALOG_ROOT` can prefix-match every cached
 * search page via `getQueriesData` (see `useCatalogIndex` in TemplateEditorScreen).
 */
export const QUERY_KEYS = {
  /** The user's active templates list. */
  TEMPLATES: () => ['@reps:templates'],
  /** A template's active exercise slots (shared by the editor and the metrics fan-out). */
  TEMPLATE_EXERCISES: (templateId: string) => [
    `@reps:template-exercises:${templateId}`,
  ],

  /** The signed-in user's preferences (units/theme/goal). */
  PREFERENCES: () => ['@reps:preferences'],
  /** This week's progress card (goal-driven). */
  WEEKLY_PROGRESS: () => ['@reps:weekly-progress'],

  /** Latest finished trainments (infinite list). */
  TRAINMENTS: () => ['@reps:trainments'],

  /** Prefix for every catalog search cache — use to partial-match all pages. */
  CATALOG_ROOT: () => ['@reps:catalog'],
  /** A specific paginated catalog search, keyed by its filters. */
  CATALOG: (params: { q?: string; muscleGroup?: MuscleGroup }) => [
    '@reps:catalog',
    { q: params.q ?? '', muscleGroup: params.muscleGroup ?? null },
  ],

  /** A finished session's performed exercises (immutable). */
  TRAINMENT_EXERCISES: (trainmentId: string) => [
    `@reps:trainment-exercises:${trainmentId}`,
  ],
  /** One performed exercise's per-set metrics. */
  EXERCISE_METRICS: (exerciseId: string | undefined) => [
    `@reps:exercise-metrics:${exerciseId}`,
  ],
  /** A whole finished session's per-set metrics. */
  TRAINMENT_METRICS: (trainmentId: string | undefined) => [
    `@reps:trainment-metrics:${trainmentId}`,
  ],
  /** Composed per-exercise metrics overview for a period. */
  METRICS_OVERVIEW: (period: string) => [`@reps:metrics-overview:${period}`],
};
