import type { MuscleGroup } from './schemas/catalog';

export const QUERY_KEYS = {
  TEMPLATES: () => ['@reps:templates'],
  TEMPLATE_EXERCISES: (templateId: string) => [
    `@reps:template-exercises:${templateId}`,
  ],
  PREFERENCES: () => ['@reps:preferences'],
  WEEKLY_PROGRESS: () => ['@reps:weekly-progress'],
  TRAINMENTS: () => ['@reps:trainments'],
  TRAINMENTS_BY_TEMPLATE: (templateId: string) => [
    `@reps:trainments-by-template:${templateId}`,
  ],
  TRAINMENT_SETS: (trainmentId: string) => [
    `@reps:trainment-sets:${trainmentId}`,
  ],
  CATALOG_ROOT: () => ['@reps:catalog'],
  CATALOG: (params: { q?: string; muscleGroup?: MuscleGroup }) => [
    '@reps:catalog',
    { q: params.q ?? '', muscleGroup: params.muscleGroup ?? null },
  ],
  CATALOG_EXERCISE: (id: string) => [`@reps:catalog-exercise:${id}`],
  TRAINMENT: (trainmentId: string) => [`@reps:trainment:${trainmentId}`],
  TRAINMENT_EXERCISES: (trainmentId: string) => [
    `@reps:trainment-exercises:${trainmentId}`,
  ],
  TRAINMENT_EXERCISE_TITLES: (trainmentId: string | undefined) => [
    `@reps:trainment-exercise-titles:${trainmentId}`,
  ],
  EXERCISE_METRICS: (exerciseId: string | undefined) => [
    `@reps:exercise-metrics:${exerciseId}`,
  ],
  TRAINMENT_METRICS: (trainmentId: string | undefined) => [
    `@reps:trainment-metrics:${trainmentId}`,
  ],
  METRICS_OVERVIEW: (period: string) => [`@reps:metrics-overview:${period}`],
};
