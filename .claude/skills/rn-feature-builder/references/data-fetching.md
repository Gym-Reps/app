# Data fetching — Axios + TanStack Query v5 + Zod

For anything that talks to **Gym-Reps/backend**. Read `references/backend.md` for
the contract first. Server data lives in Query's cache — **never** mirror it into
Zustand.

## Install (not yet in this repo)

```bash
pnpm add axios @tanstack/react-query
npx expo install @react-native-async-storage/async-storage   # for persisting auth token
```

## 1. Axios client — `src/api/client.ts`

Centralize base URL, the access-token header, and refresh-on-401. Read the base
URL from Expo config / env, never hardcode.

```ts
import axios from 'axios';
import Constants from 'expo-constants';

// e.g. set in app.json -> expo.extra.apiUrl, or use EXPO_PUBLIC_API_URL
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string);

export const api = axios.create({ baseURL, withCredentials: true });

let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Refresh once on 401, then replay. The refresh token is an httpOnly cookie,
// so we send no body and rely on withCredentials. See backend.md caveat.
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshing ??= api
          .patch<{ token: string }>('/token/refresh')
          .then((res) => res.data.token)
          .finally(() => { refreshing = null; });
        const token = await refreshing;
        setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
        // surface to the auth store so the app can route to Login
      }
    }
    return Promise.reject(error);
  },
);
```

## 2. QueryClient provider — wrap `<Root/>` in `App.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// inside App, wrap the existing tree:
// <QueryClientProvider client={queryClient}><NavProvider>…</NavProvider></QueryClientProvider>
```

## 3. Endpoints + hooks — `src/api/<resource>.ts`

Validate every response with a Zod schema (`references/forms-validation.md`).
v5 notes: **object-form only** (`useQuery({ queryKey, queryFn })`), loading flag
is `isPending`, `cacheTime`→`gcTime`.

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from './client';

const Trainment = z.object({
  id: z.uuid(),
  trainment_template_id: z.uuid(),
  created_at: z.iso.datetime(),
});
export type Trainment = z.infer<typeof Trainment>;

// keys in one place so invalidation is consistent
export const trainmentKeys = {
  all: ['trainments'] as const,
  list: () => [...trainmentKeys.all, 'list'] as const,
};

export function useTrainments() {
  return useQuery({
    queryKey: trainmentKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/trainments');
      return z.array(Trainment).parse(data); // throws on contract drift = caught early
    },
  });
}

export function useCreateTrainment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { trainment_template_id: string }) => {
      const { data } = await api.post('/trainments', body);
      return Trainment.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: trainmentKeys.all }),
  });
}
```

## 4. Using it in a screen

```tsx
const { data, isPending, isError, refetch } = useTrainments();
if (isPending) return <Body>Loading…</Body>;
if (isError) return <Button label="Retry" onPress={() => refetch()} />;
return data.map((t) => /* … */);
```

`useMutation` exposes `mutate`/`mutateAsync`, `isPending`, `error`. Wire the
LoginScreen `// call api here` placeholder to a `useMutation` that calls
`POST /sessions`, stores `token` via `setAccessToken` + the auth store, then
`signIn()`.

## Conventions

- One Zod schema per response; derive TS types with `z.infer`. Translate
  backend field names (`repetitions`, `weight`) to UI names at this boundary.
- Query keys via a `*Keys` factory per resource; invalidate by the `all` key
  after mutations.
- Don't `try/catch` in components for loading/error — use Query's flags.
- Never put the base URL or secrets in component files.
