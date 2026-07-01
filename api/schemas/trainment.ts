import { z } from 'zod';

/**
 * Trainments (performed workout sessions) — backend module 01. A `trainment` is
 * a session started from a `trainment_template`; `finishedAt === null` means it
 * is still in progress. API responses are camelCased (matching the catalog /
 * template modules) even though Prisma stores snake_case.
 */

/** Backend page size for `GET /trainments` (default `1`, size `20`). */
export const TRAINMENTS_PAGE_SIZE = 20;

export const ZTrainment = z.object({
  id: z.string(),
  trainmentTemplateId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  /**
   * Not guaranteed by the backend DTO. If a response ever snapshots the template
   * title we keep it as a display fallback for when the template was deleted and
   * is no longer in the cached `['templates']` list.
   */
  title: z.string().nullish(),
});
export type Trainment = z.infer<typeof ZTrainment>;

/** `GET /trainments?page=` → `{ trainments, page }`, newest first. */
export const ZTrainmentListResponse = z.object({
  trainments: z.array(ZTrainment),
  page: z.coerce.number(),
});
export type TrainmentListResponse = z.infer<typeof ZTrainmentListResponse>;

/** `GET /trainments/:id` → `{ trainment }`. */
export const ZTrainmentResponse = z.object({ trainment: ZTrainment });

/**
 * `GET /trainments/weekly-progress` — the current Mon–Sun window of finished
 * sessions plus the goal for the progress bar. `goal` is the user's
 * `weeklyTrainingCount` preference and may be `null` (no goal set).
 */
export const ZWeeklyProgress = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  completed: z.coerce.number(),
  goal: z.coerce.number().int().nullable(),
  trainments: z.array(ZTrainment),
});
export type WeeklyProgress = z.infer<typeof ZWeeklyProgress>;
