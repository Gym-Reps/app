# API Reference (appendix)

Mirror of the endpoints the app consumes. The **authoritative** source is
`Gym-Reps/backend` (`specs/*.md` + `prisma/schema.prisma`) — when this appendix and
the backend disagree, the backend wins; update this file. Keep the typed api layer
(`api/schemas/*`, `api/services/*`) in sync with this table.

All routes **except** `POST /users`, `POST /sessions`, `PATCH /token/refresh`
require `Authorization: Bearer <token>` (attached by the `api/client.ts` request
interceptor). Base URL: `EXPO_PUBLIC_API_URL`.

## Auth
- `POST /users` `{ username, email, password }` → `201`
- `POST /sessions` `{ email, password }` → `200 { token }` (+ refresh cookie)
- `PATCH /token/refresh` (refresh cookie) → `200 { token }`
- `PATCH /users/password` `{ currentPassword, newPassword }` → `204` *(auth)*

## Preferences (Home goal & settings)
- `GET /preferences` → `{ weightUnit, theme, lengthUnit, weeklyTrainingCount }`
- `PATCH /preferences` (partial) same shape; `weeklyTrainingCount` int 1–14 or `null`

## Catalog
- `GET /catalog/exercises?q=&muscleGroup=&page=` →
  `{ exercises: [{ id, title, slug, muscleGroup, imageUrl }], page, total }`
- `GET /catalog/exercises/:id`
- `muscleGroup` enum: `CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, CORE,
  QUADS, HAMSTRINGS, GLUTES, CALVES, FULL_BODY`

## Templates
- `POST /trainment-templates` `{ title }` →
  `201 { trainmentTemplate: { id, title, createdAt, updatedAt } }`
- `GET /trainment-templates` → `{ trainmentTemplate[] }`
- `GET|PATCH|DELETE /trainment-templates/:id`
- `POST /trainment-templates/:id/exercises` `{ exerciseCatalogId }` →
  `201 { exerciseTemplate: { id, trainmentTemplateId, exerciseCatalogId, title, createdAt } }`
- `GET /trainment-templates/:id/exercises`
- `DELETE /exercise-templates/:id`

## Trainments
- `POST /trainments` `{ trainmentTemplateId }` → `201 { trainment }`
  *(online start; the offline path uses `/sync` instead)*
- `POST /trainments/sync` → see [05_REGISTER_TRAINMENT](./05_REGISTER_TRAINMENT.md)
  contract; `201`/`200`, errors `404/403/409`
- `PATCH /trainments/:id/finish`
- `GET /trainments?trainmentTemplateId=&page=` → `{ trainments[], page }`
- `GET /trainments/weekly-progress` → `{ weekStart, weekEnd, completed, goal, trainments[] }`
- `GET /trainments/:id` → `{ trainment: { id, trainmentTemplateId, userId, startedAt, finishedAt } }`
- `GET /trainments/:id/exercises` →
  `{ ... exercise: { id, trainmentId, exerciseTemplateId, plannedSets, createdAt } }`
- `GET /trainments/:id/sets`, `GET /trainments/:id/metrics`

## Exercises / Sets (performed)
- `POST /trainments/:id/exercises`, `GET /exercises/:id`, `DELETE /exercises/:id`
- `GET|POST /exercises/:id/sets`, `PATCH|DELETE /sets/:id`
- `set` DTO: `{ id, trainmentId, exerciseId, index, weight, repetitions, performedAt }`

## Metrics
- `GET /exercises/:id/metrics` →
  `{ metrics: [{ id, trainmentId, exerciseId, previousSetId, currentSetId, weightDiff, repetitionsDiff }] }`

> **Note on the online per-set endpoints** (`POST /exercises/:id/sets`, etc.): they
> exist for an online-incremental flow, but this app is **offline-first**, so the
> primary write path is the single atomic `POST /trainments/sync`. Prefer `/sync`;
> treat the granular endpoints as optional/advanced.
