# Cross-cutting

## Overview

Concerns that apply across every slice — verified at the end, not owned by any one
feature.

## Tasks

- [ ] **Global error handling** — toast on `5xx` (transport-level, e.g. an axios
  response error interceptor or a Query `onError` default); inline on `4xx` (the
  owning screen renders `Result` errors / `error.issues`).
- [ ] **Auth gate** hides `(tabs)` routes when unauthenticated and redirects to
  `(auth)` (owned by [01_AUTH](./01_AUTH.md); verified globally).
- [ ] **React Query devtools** in dev builds only.
- [ ] **Loading / empty / error** states for **every** list and detail screen.
- [ ] **Offline banner** — app-wide, driven by NetInfo (`lib/netinfo.ts`); pairs
  with the pending-sync badge from [05](./05_REGISTER_TRAINMENT.md).
- [ ] **Type-safe api layer** kept in sync with [API_REFERENCE](./API_REFERENCE.md);
  every response `Z…​.parse`d in its service before leaving the boundary.
- [ ] **Design tokens only** — colors/spacing/radius/typography come from
  `utils/theme.ts` and shared `components/`; never hardcode.

## Definition of done (per the `rn-feature-builder` skill)

- Types pass: `npx tsc --noEmit`.
- Server data goes through Query + a Zod schema; user input is validated before use.
- No secrets or base URLs inline — only in `api/client.ts`.
- Animations run on the UI thread (Reanimated shared values / worklets), not by
  re-rendering in a loop.
- Reuse existing components and tokens before building new ones.

## Backend follow-up tickets (flag to the backend team)

1. **Refresh token for mobile** — RN doesn't persist the httpOnly refresh cookie as
   reliably as a browser (esp. iOS). Preferred fix: return the refresh token in the
   response body + accept it on `/token/refresh` via `Authorization`/body, stored in
   SecureStore. See [00_FOUNDATION](./00_FOUNDATION.md) "Auth/refresh decision".
2. **Aggregated metrics endpoint** — `GET /metrics/exercises?from=&to=` to remove the
   N+1 fan-out. See [06_METRICS](./06_METRICS.md).

## Open questions to resolve as slices land

- Session state: React context (`utils/auth.tsx`) vs. Zustand store — decide when
  the sync poller needs the token outside React ([01](./01_AUTH.md), [05](./05_REGISTER_TRAINMENT.md)).
- Exact list-response key names for templates and template-exercises — verify against
  the backend `specs/*.md` before finalizing schemas ([02](./02_TEMPLATE_BUILDER.md),
  [03](./03_TEMPLATES_LIST.md)).
