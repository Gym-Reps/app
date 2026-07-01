import { z } from 'zod';

/**
 * Metrics (backend module 09) — per-set progress diffs between the same exercise
 * across a user's consecutive sessions of the same template. Each metric is the
 * signed change vs. the matched set in the previous session:
 * `weightDiff = current.weight − previous.weight`, likewise `repetitionsDiff`.
 *
 * Metrics are computed asynchronously and are eventually consistent, so the read
 * endpoints can legitimately return an empty list (nothing computed yet, or a
 * first-ever performance with no previous session to diff against).
 *
 * The backend DTO documents `{ exerciseId, previousSetId, currentSetId,
 * weightDiff, repetitionsDiff }`; `id`/`trainmentId` appear in some responses, so
 * they're accepted but optional. `weightDiff` is a float (2.5kg steps), so both
 * diffs are coerced numbers.
 */
export const ZMetric = z.object({
  id: z.string().optional(),
  trainmentId: z.string().nullish(),
  exerciseId: z.string(),
  previousSetId: z.string(),
  currentSetId: z.string(),
  weightDiff: z.coerce.number(),
  repetitionsDiff: z.coerce.number(),
});
export type Metric = z.infer<typeof ZMetric>;

/**
 * `GET /exercises/:id/metrics` and `GET /trainments/:id/metrics` both return
 * `{ metrics: [...] }`. Accept a bare array too (tolerant of envelope drift) and
 * normalize to `Metric[]`.
 */
export const ZMetricsResponse = z.union([
  z.object({ metrics: z.array(ZMetric) }).transform((o) => o.metrics),
  z.array(ZMetric),
]);
