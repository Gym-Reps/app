import { z } from 'zod';

/**
 * Exercise Catalog (backend module 03: `/catalog/exercises`). Read-only for
 * members: a curated list users pick from when building a template. The backend
 * already resolves `imageUrl` to an absolute URL (`${APP_URL}${image_path}`), so
 * no client-side origin prefixing is needed.
 */

export const MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'CORE',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'FULL_BODY',
] as const;

export const ZMuscleGroup = z.enum(MUSCLE_GROUPS);
export type MuscleGroup = z.infer<typeof ZMuscleGroup>;

/** Backend page size for `GET /catalog/exercises` (default `1`, size `20`). */
export const CATALOG_PAGE_SIZE = 20;

export const ZCatalogExercise = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  muscleGroup: ZMuscleGroup,
  imageUrl: z.string().nullish(),
});
export type CatalogExercise = z.infer<typeof ZCatalogExercise>;

/** `GET /catalog/exercises` → `{ exercises, page, total }`. */
export const ZCatalogSearchResponse = z.object({
  exercises: z.array(ZCatalogExercise),
  page: z.coerce.number(),
  total: z.coerce.number(),
});
export type CatalogSearchResponse = z.infer<typeof ZCatalogSearchResponse>;

/** `GET /catalog/exercises/:id` → `{ exercise }`. */
export const ZCatalogExerciseResponse = z.object({ exercise: ZCatalogExercise });

/** Human-friendly label for a muscle-group enum value (`FULL_BODY` → `Full body`). */
export function formatMuscle(group: string): string {
  return group.charAt(0) + group.slice(1).toLowerCase().replace('_', ' ');
}
