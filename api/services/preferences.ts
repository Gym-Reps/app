import { isAxiosError } from 'axios';
import { api } from '../client';
import { Err, Ok, Result } from '../result';
import {
  Preferences,
  UpdatePreferencesBody,
  ZPreferencesResponse,
} from '../schemas/preferences';

/** Prefer the backend's `{ message }` over Axios's generic status-code text. */
function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return 'Something went wrong';
}

/** GET /preferences — the signed-in user's units, theme, and weekly goal. */
export async function getPreferences(): Promise<Result<Preferences, string>> {
  try {
    const { data } = await api.get('/preferences');
    return Ok(ZPreferencesResponse.parse(data).preferences);
  } catch (err) {
    return Err(errorMessage(err));
  }
}

/**
 * PATCH /preferences — partial update; omitted keys keep their stored value.
 * `weeklyTrainingCount: null` clears the goal. Returns the merged preferences.
 */
export async function updatePreferences(
  partial: UpdatePreferencesBody
): Promise<Result<Preferences, string>> {
  try {
    const { data } = await api.patch('/preferences', partial);
    return Ok(ZPreferencesResponse.parse(data).preferences);
  } catch (err) {
    return Err(errorMessage(err));
  }
}
