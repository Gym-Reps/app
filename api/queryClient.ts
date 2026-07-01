import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client. Provided once at the root layout
 * (`app/_layout.tsx`). Server data lives in this cache — don't mirror it into
 * auth context / Zustand.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});
