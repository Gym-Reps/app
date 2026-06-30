# Backend contract — Gym-Reps/backend

Repo: `https://github.com/Gym-Reps/backend` — TypeScript, Prisma, Vite, Docker.
**This is the source of truth for the API.** This file is a captured snapshot;
when in doubt, read the repo (it has its own `.claude/skills/backend-engineer`).

## How to read it from this session

- Quick peeks: `WebFetch` on raw files, e.g.
  `https://raw.githubusercontent.com/Gym-Reps/backend/main/specs/01_TRAINMENT_MODULE.md`
  or `.../main/prisma/schema.prisma`.
- Full access (private or need to browse): ask the user to add it, then
  `gh repo clone Gym-Reps/backend` / `gh api`. Don't pre-check existence with an
  unauthenticated curl — private repos 404 even when you have access.

## Spec layout

`specs/*.md`, one module each, structured: Overview → Entity → Functional
Requirements → **Endpoints** → Use-cases → Business Rules → Security → Errors →
Testing → Notes. Modules:

| # | Module | # | Module |
|---|---|---|---|
| 00 | Auth | 05 | Exercises |
| 01 | Trainment | 06 | Sets |
| 02 | User Preferences | 07 | Offline Sync |
| 03 | Exercise Catalog | 08 | Events |
| 04 | Improvements (roadmap) | 09 | Metrics |

## Data model (Prisma) — and the frontend term mapping

Backend uses snake_case fields, UUID ids, and soft-deletes (`deleted_at`).
**"Trainment" = a performed workout session** (the app's `mock.ts` calls it a
"workout"). Map carefully when typing schemas:

| Backend model | Frontend (`mock.ts`) | Notes |
|---|---|---|
| `TrainmentTemplate` | `Template` | reusable plan, belongs to a user |
| `ExerciseTemplate` | `TemplateExercise` | planned exercise in a template |
| `Trainment` | `Workout` | a performed session |
| `Exercise` | (per-exercise within a workout) | instance performed in a trainment |
| `Set` | `WorkoutSet` | `index`, `repetitions` (int), `weight` (float) |

- `User`: `id`, `username`, `email` (unique), `password_hash` (never returned),
  `role` (`MEMBER`|`ADMIN`), timestamps.
- `Set` fields are `repetitions` and `weight` — **not** `reps`. Translate at the
  API boundary so UI code can keep its own names.

## Auth (module 00) — JWT access + httpOnly refresh cookie

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/users` | public | `{ username, email, password }` → `201`, user (no `password_hash`) |
| POST | `/sessions` | public | `{ email, password }` → `200 { token }` + refresh cookie |
| PATCH | `/users/password` | Bearer | `{ currentPassword, newPassword }` → `204` |
| PATCH | `/token/refresh` | refresh cookie | (no body) → `200 { token }` + new cookie |

- **Access token**: short-lived JWT (~`10m`), sent as `Authorization: Bearer <token>`.
- **Refresh token**: ~`7d`, delivered as an **`httpOnly` `secure` `sameSite`
  cookie**; rotated on every refresh. JS cannot read it.
- Password minimum is **6 chars** server-side. (Note: the app's local
  `LoginSchema` enforces stricter rules — keep client validation, but don't send
  fields the server rejects.)

### Refresh-on-401 in React Native

The refresh token is an httpOnly cookie, so JS can't access it. On 401, call
`PATCH /token/refresh` and let the platform cookie jar attach the cookie
(`axios` instance with `withCredentials: true`). RN cookie handling can be
flaky — if refresh doesn't round-trip, confirm with the backend team whether the
refresh token is also returned in the body, and adapt. See
`references/data-fetching.md` for the interceptor wiring.

## When implementing an endpoint

1. Open the relevant `specs/NN_*.md`; copy the exact path, method, body, and
   error codes.
2. Write/extend a Zod schema in `src/utils/schemas.ts` for both request and
   response (use the Prisma model as the response shape).
3. Add the endpoint fn + Query/Mutation hook in `src/api/<resource>.ts`.
