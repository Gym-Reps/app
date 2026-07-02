import { useInfiniteQuery } from '@tanstack/react-query';
import { searchExercises } from '../services/catalog';
import { CATALOG_PAGE_SIZE, MuscleGroup } from '../schemas/catalog';
import { QUERY_KEYS } from '../queryKeys';

/**
 * Paginated catalog search (TanStack Query v5 `useInfiniteQuery`). `pageParam`
 * is the 1-based page; `getNextPageParam` derives `hasNextPage` from
 * `page * pageSize < total`. The query key includes the debounced `q` and the
 * selected `muscleGroup` so changing either starts a fresh paginated cache.
 */
export function useCatalogSearch(params: {
  q?: string;
  muscleGroup?: MuscleGroup;
}) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.CATALOG(params),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await searchExercises({
        q: params.q,
        muscleGroup: params.muscleGroup,
        page: pageParam,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * CATALOG_PAGE_SIZE;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}
