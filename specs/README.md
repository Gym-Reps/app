# Frontend Specs

Source-of-truth specifications for the **REPS mobile app** (React Native + Expo,
expo-router). Each spec describes one **feature slice** in enough detail to be
implemented end-to-end (routes → screens → stores → api layer → tests), the same
way the backend's `specs/` describe its modules.

These files are the input for the **`rn-feature-builder`** skill: point it at a
spec and it wires the screens, stores, and typed api layer following this repo's
conventions. The backend contract that every data slice consumes lives in
`Gym-Reps/backend` (`specs/*.md` + `prisma/schema.prisma`) — mirror request /
response shapes and field names to it, **not** to `data/mock.ts`. Domain term:
**"trainment" = a performed workout session.**

## Convention

- One file per **feature**, numbered for ordering and named in upper snake case:
  `NN_<FEATURE>.md` (e.g. `00_FOUNDATION.md`, `01_AUTH.md`).
- Keep the structure consistent: **Overview → Screens & Routes → State ownership →
  Endpoints consumed → Local state / stores → Files → Tasks (with acceptance) →
  Errors & edge cases → Testing → Notes / open questions.**
- When a slice needs a package that isn't installed yet, call it out explicitly and
  use `npx expo install` for native/Expo libs (bare `pnpm add` only for pure-JS).

## Project layout (actual — follow this, not the `src/` sketch in the old plan)

```
api/
  client.ts          # axios instance + auth/refresh interceptors (done)
  queryClient.ts     # TanStack Query client (done)
  result.ts          # Result<T,E> = Ok | Err (done)
  services/<x>.ts    # endpoint fns → Result, one file per resource
  schemas/<x>.ts     # Zod request/response schemas + inferred types
  mutations/<x>.ts   # React Query hooks (unwrap Result, throw on Err)
  queries/<x>.ts     # React Query read hooks (add when first needed)
stores/<name>.ts     # Zustand stores (auth is currently a context in utils/auth.tsx)
app/                 # expo-router routes: (auth)/, (tabs)/, + modal routes
screens/<X>Screen.tsx# screen components rendered by the routes
components/           # shared UI (Button, Card, Field, Pill, Stepper, Text, …)
utils/                # auth.tsx (AuthProvider), theme.ts
data/mock.ts          # placeholder data — replace slice by slice, never a contract
```

> **Rule of thumb.** TanStack Query owns anything the server is the source of truth
> for. Zustand + AsyncStorage owns anything created offline that hasn't been
> persisted yet (auth session, the active trainment, the sync queue). Never mirror
> one into the other.

## Index

| # | Feature | Spec | Depends on | Status |
|---|---------|------|------------|--------|
| 00 | Foundation | [00_FOUNDATION](./00_FOUNDATION.md) | — | Mostly built |
| 01 | Auth / session | [01_AUTH](./01_AUTH.md) | 00 | Partly built |
| 02 | Template builder (create + catalog) | [02_TEMPLATE_BUILDER](./02_TEMPLATE_BUILDER.md) | 00, 01 | Scaffolded |
| 03 | Templates list | [03_TEMPLATES_LIST](./03_TEMPLATES_LIST.md) | 02 | Scaffolded |
| 04 | Home (latest + weekly) | [04_HOME](./04_HOME.md) | 01 | Scaffolded |
| 05 | Register trainment (offline-first) ⭐ | [05_REGISTER_TRAINMENT](./05_REGISTER_TRAINMENT.md) | 02, 03 | Scaffolded |
| 06 | Exercise metrics | [06_METRICS](./06_METRICS.md) | 05 | Scaffolded |
| 07 | Progress charts (coming soon) | [07_PROGRESS_CHARTS](./07_PROGRESS_CHARTS.md) | 06 | Placeholder |
| 08 | Cross-cutting | [08_CROSS_CUTTING](./08_CROSS_CUTTING.md) | all | Ongoing |
| — | API reference (appendix) | [API_REFERENCE](./API_REFERENCE.md) | — | Reference |

## Build order

Do **00 Foundation** first — everything else depends on the api client, query
client, and auth gate being green. Then the slices are largely independent, but a
sensible order that respects data dependencies is:

1. **00 Foundation** — client, queryClient, secure storage, uuid, netinfo.
2. **01 Auth** — session bootstrap + gate; unblocks every authenticated call.
3. **02 Template builder** → **03 Templates list** — produces the templates a
   workout is started from.
4. **04 Home** — reads trainments + weekly progress (data appears once 05 syncs).
5. **05 Register trainment** ⭐ — the core offline-first flow; the main write path.
6. **06 Metrics** — reads performed exercises produced by 05.
7. **07 Progress charts** — placeholder, ships without backend work.
8. **08 Cross-cutting** — applied throughout, verified at the end.
