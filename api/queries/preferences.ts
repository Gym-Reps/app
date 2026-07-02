import { useQuery } from '@tanstack/react-query';
import { getPreferences } from '../services/preferences';
import { QUERY_KEYS } from '../queryKeys';

/** The signed-in user's preferences (key `['preferences']`, shared with Profile). */
export function usePreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.PREFERENCES(),
    queryFn: async () => {
      const res = await getPreferences();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}
