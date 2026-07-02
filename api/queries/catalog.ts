import {
  useInfiniteQuery,
  useQueries,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { getCatalogExercise, searchExercises } from '../services/catalog';
import {
  CATALOG_PAGE_SIZE,
  CatalogExercise,
  CatalogSearchResponse,
  MuscleGroup,
} from '../schemas/catalog';
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

/** Catalog entries barely change, so keep the by-id caches fresh for a while. */
const CATALOG_ENTRY_STALE_MS = 30 * 60_000;

/**
 * Build an id→catalog lookup from whatever catalog search pages are already
 * cached (the picker populates them). Zero-cost hydration for entries we've
 * already loaded during this session.
 */
function cachedCatalogIndex(qc: QueryClient): Map<string, CatalogExercise> {
  const map = new Map<string, CatalogExercise>();
  const caches = qc.getQueriesData<{ pages: CatalogSearchResponse[] }>({
    queryKey: QUERY_KEYS.CATALOG_ROOT(),
  });
  for (const [, data] of caches) {
    data?.pages?.forEach((page) =>
      page.exercises.forEach((ex) => map.set(ex.id, ex))
    );
  }
  return map;
}

/**
 * Resolve a set of catalog exercise ids to their full entries (for image/muscle
 * display on template rows). Entries already present in the search-page cache
 * are used as-is; any that aren't are fetched by id via `GET /catalog/exercises/:id`
 * and cached under their own key. Returns an id→exercise map of whatever has
 * resolved so far (partial while fetches are in flight).
 */
export function useCatalogByIds(ids: string[]): Map<string, CatalogExercise> {
  const qc = useQueryClient();
  const cached = cachedCatalogIndex(qc);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: QUERY_KEYS.CATALOG_EXERCISE(id),
      queryFn: async () => {
        const res = await getCatalogExercise(id);
        if (!res.ok) throw new Error(res.error);
        return res.data;
      },
      // Skip the network when the picker already loaded this entry.
      enabled: !cached.has(id),
      initialData: cached.get(id),
      staleTime: CATALOG_ENTRY_STALE_MS,
    })),
  });

  const map = new Map<string, CatalogExercise>();
  for (const r of results) {
    if (r.data) map.set(r.data.id, r.data);
  }
  return map;
}
