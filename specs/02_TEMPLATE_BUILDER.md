# Template Builder (create template + add catalog exercises)

## Overview

Create a `TrainmentTemplate` (a reusable workout plan) and populate it with
exercises picked from the server exercise **catalog**. A template is what a workout
is later started from ([05_REGISTER_TRAINMENT](./05_REGISTER_TRAINMENT.md)).

Consumes the backend **Exercise Catalog** (`03`) and **Exercises /
exercise_template** (`05`) modules.

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `app/create-template.tsx` | `screens/CreateTemplateScreen.tsx` | Name a new template → create → open editor. |
| `app/template/[id].tsx` *(add)* | `screens/TemplateEditorScreen.tsx` *(add)* | The template's exercise list + "Add exercise". |
| `app/catalog-picker.tsx` *(add, modal)* | `screens/CatalogPickerScreen.tsx` *(add)* | Searchable catalog with muscle-group filter. |

> `create-template.tsx` exists; the editor and picker routes/screens are new.

## State ownership

- **Server state (Query):**
  - `['catalog', { q, muscleGroup }]` — paginated catalog search (`useInfiniteQuery`).
  - `['template', id, 'exercises']` — a template's exercise list.
  - `['templates']` — invalidated on create (see [03_TEMPLATES_LIST](./03_TEMPLATES_LIST.md)).
- **Client state:** local `useState` only — the search box `q`, the selected
  `muscleGroup` chip, list scroll. No store; nothing here outlives the screen.

## Endpoints consumed

| Action | Method | Path | Notes |
|---|---|---|---|
| Create template | `POST` | `/trainment-templates` | `{ title }` → `201 { trainmentTemplate }` |
| Search catalog | `GET` | `/catalog/exercises?q=&muscleGroup=&page=` | → `{ exercises[], page, total }` |
| Catalog detail | `GET` | `/catalog/exercises/:id` | optional |
| Add exercise to template | `POST` | `/trainment-templates/:id/exercises` | `{ exerciseCatalogId }` → `201 { exerciseTemplate }` |
| List template exercises | `GET` | `/trainment-templates/:id/exercises` | → list of `exerciseTemplate` |
| Remove exercise | `DELETE` | `/exercise-templates/:id` | → `204` |

`muscleGroup` enum (12 chips): `CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS,
CORE, QUADS, HAMSTRINGS, GLUTES, CALVES, FULL_BODY`.

## Files

| File | Purpose |
|---|---|
| `api/schemas/catalog.ts` | `ZCatalogExercise`, `ZCatalogSearchResponse`, `MuscleGroup` enum |
| `api/schemas/template.ts` | `ZTrainmentTemplate`, `ZExerciseTemplate`, request bodies |
| `api/services/catalog.ts` | `searchExercises`, `getCatalogExercise` → `Result` |
| `api/services/template.ts` | `createTemplate`, `addTemplateExercise`, `listTemplateExercises`, `removeTemplateExercise` |
| `api/queries/catalog.ts` | `useCatalogSearch` (`useInfiniteQuery`) |
| `api/queries/template.ts` | `useTemplateExercises` |
| `api/mutations/template.ts` | `useCreateTemplate`, `useAddTemplateExercise`, `useRemoveTemplateExercise` |
| `screens/TemplateEditorScreen.tsx`, `screens/CatalogPickerScreen.tsx` | new UI |

## Tasks

- [ ] **Create Template** — form (title, required) → `useCreateTemplate`; on `201`
  `router.replace('/template/' + id)` and invalidate `['templates']`.
- [ ] **Catalog Picker** — `useInfiniteQuery` over `searchExercises`:
  - `page`-based pagination; derive `hasNextPage` from `page * pageSize < total`.
  - Debounced `q` text search (~300ms); `muscleGroup` filter chips (reuse `Pill`).
  - Render `title` + `imageUrl` (+ muscle group). Tap → add to the template.
- [ ] **Add exercise** — `useAddTemplateExercise` → on success invalidate
  `['template', id, 'exercises']`. Allow adding several without leaving the picker.
- [ ] **Template Editor** — `useTemplateExercises` lists current exercises. The
  template DTO returns only `title` + ids, so **cross-reference `exerciseCatalogId`
  against the cached catalog** for image/muscle. Support remove (confirm →
  `useRemoveTemplateExercise` → invalidate).
- [ ] Empty state in the editor → CTA opening the Catalog Picker.

## Errors & edge cases

- Catalog search returns `total: 0` → "No exercises found" empty state; keep chips.
- Adding a duplicate exercise: backend behavior TBD — until confirmed, don't block
  client-side; reflect whatever the server returns.
- Removing an exercise that's referenced by an in-progress active trainment does not
  affect that session (it snapshotted `exerciseTemplateId` at start — see 05).
- Offline: this slice is **online-only** (templates are authored while connected).
  Show the app-wide offline banner; disable "Add" while offline.

## Testing expectations

- Create a template, add 3 exercises from the catalog, see them listed, remove one —
  all reflected without a manual refresh (query invalidation).
- Infinite scroll loads page 2 and stops at `total`.
- Debounced search doesn't fire a request per keystroke.

## Notes / open questions

- Catalog images: confirm `imageUrl` is absolute; if relative, prefix with the API
  origin in the schema transform.
- Exact list shape of `GET /trainment-templates/:id/exercises` is loosely specified
  in the backend appendix — verify field names against
  `Gym-Reps/backend/specs/05_EXERCISES_MODULE.md` before finalizing the schema.
