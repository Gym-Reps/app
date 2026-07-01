# Foundation (Phase 0)

## Overview

The shared plumbing every feature slice sits on: the configured axios instance,
the TanStack Query client, the `Result` helper, secure token storage, client-side
uuid generation, and connectivity detection. **No feature work until this is
green.** Much of it already exists (`api/client.ts`, `api/queryClient.ts`,
`api/result.ts`, `utils/auth.tsx`); this spec records the intended shape and the
remaining gaps.

## Stack & conventions

- **Expo (SDK 54, managed)** + **expo-router** (file-based routes under `app/`).
  Read the exact versioned docs (`https://docs.expo.dev/versions/v54.0.0/`) before
  writing Expo code — per `AGENTS.md`.
- **axios** — one instance with auth + refresh interceptors.
- **@tanstack/react-query** — all *server* state.
- **zustand** + **@react-native-async-storage/async-storage** — all *local /
  offline* state (active trainment, sync queue; auth session may migrate here).
- **expo-secure-store** — the JWT access token (never AsyncStorage for the token).
- **expo-crypto** `randomUUID()` (or `react-native-uuid`) — client-side ids so
  offline records are idempotent across sync.
- **@react-native-community/netinfo** — connectivity for offline-first.
- **zod@4** — request/response validation.

Install native/Expo libs with `npx expo install <pkg>`; pure-JS libs (`zustand`,
`axios`, `@tanstack/react-query`) with `pnpm add`.

## Files

| File | Purpose | Status |
|---|---|---|
| `api/client.ts` | axios instance + request/refresh interceptors | ✅ built |
| `api/queryClient.ts` | `QueryClient` (`staleTime: 30s`, `retry: 1`) | ✅ built |
| `api/result.ts` | `Result<T,E> = Ok \| Err` + `Ok`/`Err` ctors | ✅ built |
| `app/_layout.tsx` | wrap app in `QueryClientProvider` + `AuthProvider` | ✅ built |
| `lib/storage.ts` | secure-store get/set/clear for the access token | ✅ built |
| `lib/uuid.ts` | `newId()` via `expo-crypto` | ✅ built |
| `lib/netinfo.ts` | `useIsOnline()` / `isOnline()` / `subscribeOnline()` | ✅ built |
| `.env` / `app.json` | `EXPO_PUBLIC_API_URL` (Render URL) | ✅ present |

## Config

- `EXPO_PUBLIC_API_URL` points at the Render deployment
  (`https://reps-backend-api.onrender.com`). Read via
  `process.env.EXPO_PUBLIC_API_URL`, with `Constants.expoConfig?.extra?.apiUrl`
  as fallback (already wired in `api/client.ts`). Never hardcode base URLs in
  feature code.

## Tasks

- [x] **axios instance** — `baseURL` from env, `withCredentials: true`.
  - [x] Request interceptor attaches `Authorization: Bearer <accessToken>` from
    the in-memory token.
  - [x] Response interceptor: on `401`, run a single shared refresh
    (`PATCH /token/refresh`) once, replay the original request; on failure clear
    the token and call `onAuthError` so the gate routes to Login.
- [x] **Query client** — `staleTime` 30s, `retry: 1`. Wrapped at `app/_layout.tsx`.
- [x] **`Result` helper** — services return `Result`; mutation/query hooks unwrap.
- [x] **Secure storage helpers** (`lib/storage.ts`) — `getToken`/`setToken`/
  `clearToken` over `expo-secure-store`; the auth bootstrap reads from here.
  No-ops on web (SecureStore is native-only) so bootstrap doesn't crash.
- [x] **uuid helper** (`lib/uuid.ts`) — `newId()` (`Crypto.randomUUID`, v4, sync)
  for client-generated ids (trainment / exercise / set), stable across retries.
- [x] **netinfo helper** (`lib/netinfo.ts`) — `isOnline()` (point-in-time, for the
  finish path), `subscribeOnline()` (sync poller), `useIsOnline()` (offline banner).
- [ ] **Typed api layer** — one `schemas/<x>.ts` + `services/<x>.ts` per resource,
  mirroring the DTOs in [API_REFERENCE](./API_REFERENCE.md). Every endpoint fn
  returns `Result`; every response is `Z…​.parse`d before it leaves the service.

## Auth / refresh design decision — RESOLVED

The backend issues the access token in the JSON body (`{ token }`) and the refresh
token in an **httpOnly cookie**; `PATCH /token/refresh` reads it via
`onlyCookie: true`. This app takes **Option 1 (client cookie persistence)**: the
axios instance sets `withCredentials: true` and relies on the platform cookie jar
to carry the refresh cookie on `/token/refresh` (see `api/client.ts`).

> ⚠️ **Open risk.** RN networking does not persist httpOnly cookies as reliably as
> a browser, especially on iOS. If refresh proves flaky in device testing, escalate
> the backend tweak (refresh token in the response body + `Authorization`/body on
> `/token/refresh`, stored in SecureStore) to the backend team — this is the
> recommended long-term fix. Track under [08_CROSS_CUTTING](./08_CROSS_CUTTING.md).

## Testing expectations

- Type check passes: `npx tsc --noEmit`.
- Interceptor unit test: a `401` triggers exactly one refresh even under concurrent
  requests (shared in-flight promise); a failing refresh clears the token and fires
  `onAuthError` once.
- Manual: cold start with the Render URL reachable performs a request with the
  Bearer header attached.

## Notes / open questions

- The legacy `rn-feature-builder` skill references a dependency-free
  `src/navigation.tsx`; the app has since adopted **expo-router** (`app/` routes).
  Follow expo-router. Update the skill text when convenient.
- `data/mock.ts` is placeholder data, replaced slice by slice — never treat it as a
  contract.
