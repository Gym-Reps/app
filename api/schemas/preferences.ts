import { z } from 'zod';

/**
 * User preferences — backend module 02. One JSONB row per user: measurement
 * units, theme, and the weekly training goal (`weeklyTrainingCount`, int 1–14 or
 * `null` = no goal). Enum constraints live in application code (here), not in
 * Postgres. MVP renders `light` only; `dark` is kept for forward-compat.
 */

export const ZWeightUnit = z.enum(['kg', 'lb']);
export type WeightUnit = z.infer<typeof ZWeightUnit>;

export const ZTheme = z.enum(['dark', 'light']);
export type Theme = z.infer<typeof ZTheme>;

export const ZLengthUnit = z.enum(['meters', 'inches']);
export type LengthUnit = z.infer<typeof ZLengthUnit>;

/** The weekly training goal: integer 1–14, or `null` when no goal is set. */
export const ZWeeklyTrainingCount = z.coerce.number().int().min(1).max(14).nullable();

export const ZPreferences = z.object({
  weightUnit: ZWeightUnit,
  theme: ZTheme,
  lengthUnit: ZLengthUnit,
  weeklyTrainingCount: ZWeeklyTrainingCount,
});
export type Preferences = z.infer<typeof ZPreferences>;

/** `GET /preferences` / `PATCH /preferences` → `{ preferences }`. */
export const ZPreferencesResponse = z.object({ preferences: ZPreferences });

/**
 * `PATCH /preferences` body — any subset; omitted keys keep their stored value.
 * `weeklyTrainingCount: null` clears the goal.
 */
export const ZUpdatePreferencesBody = z.object({
  weightUnit: ZWeightUnit.optional(),
  theme: ZTheme.optional(),
  lengthUnit: ZLengthUnit.optional(),
  weeklyTrainingCount: ZWeeklyTrainingCount.optional(),
});
export type UpdatePreferencesBody = z.infer<typeof ZUpdatePreferencesBody>;
