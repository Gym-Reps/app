import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePreferences } from '../services/preferences';
import type { Preferences, UpdatePreferencesBody } from '../schemas/preferences';
import { QUERY_KEYS } from '../queryKeys';

/**
 * PATCH /preferences. Unwraps the service `Result` and throws on `Err` so
 * TanStack Query surfaces the error. On success invalidates `['preferences']`
 * (units/theme/goal) and `['weekly-progress']` (the goal drives the card).
 */
export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation<Preferences, Error, UpdatePreferencesBody>({
    mutationFn: async (partial) => {
      const res = await updatePreferences(partial);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (prefs) => {
      qc.setQueryData(QUERY_KEYS.PREFERENCES(), prefs);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.WEEKLY_PROGRESS() });
    },
  });
}
