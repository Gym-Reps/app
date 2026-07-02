import { QueryClient, QueryCache } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client. Provided once at the root layout
 * (`app/_layout.tsx`). Server data lives in this cache — don't mirror it into
 * auth context / Zustand.
 *
 * The cache-level `onError` logs failed queries in development only
 * (specs/08_CROSS_CUTTING.md — devtools/logging gated behind `__DEV__`). User-
 * facing surfacing lives elsewhere: 5xx/network → toast (axios interceptor),
 * 4xx → inline at the call site.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (__DEV__) {
        const key = JSON.stringify(query.queryKey);
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[query] ${key} failed: ${message}`);
      }
    },
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});
