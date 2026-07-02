import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getWeeklyProgress, listTrainments } from '../services/trainment';
import { TRAINMENTS_PAGE_SIZE } from '../schemas/trainment';
import { QUERY_KEYS } from '../queryKeys';

/**
 * Latest trainments (TanStack Query v5 `useInfiniteQuery`, key `['trainments']`).
 * `pageParam` is the 1-based page. The list endpoint returns `{ trainments, page }`
 * with no total, so `getNextPageParam` infers "there may be more" from a full
 * page (length === page size); a short/empty page ends pagination.
 */
export function useTrainments() {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.TRAINMENTS(),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await listTrainments(pageParam);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.trainments.length === TRAINMENTS_PAGE_SIZE ? lastPage.page + 1 : undefined,
  });
}

/** This week's progress card (key `['weekly-progress']`). */
export function useWeeklyProgress() {
  return useQuery({
    queryKey: QUERY_KEYS.WEEKLY_PROGRESS(),
    queryFn: async () => {
      const res = await getWeeklyProgress();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}
