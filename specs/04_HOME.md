# Home (latest trainments + weekly progress)

## Overview

The dashboard tab: a **weekly progress** card (completed vs. goal) and a list of the
user's **latest trainments**. Reflects data produced by
[05_REGISTER_TRAINMENT](./05_REGISTER_TRAINMENT.md) once it syncs.

Consumes the backend **Trainment** module (`01`) and **User Preferences** (`02`,
for the weekly goal).

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `app/(tabs)/home.tsx` | `screens/HomeScreen.tsx` | Weekly card + latest trainments list. |
| `app/(tabs)/profile.tsx` | `screens/ProfileScreen.tsx` | Preferences incl. `weeklyTrainingCount` goal + sign out. |

## State ownership

- **Server state (Query):**
  - `['weekly-progress']` — the card.
  - `['trainments']` — latest trainments (`useInfiniteQuery`, paginated).
  - `['preferences']` — for the goal + units (shared with Profile).
- **Client state:** none.

## Endpoints consumed

| Action | Method | Path | Response |
|---|---|---|---|
| Latest trainments | `GET` | `/trainments?page=1` | `{ trainments[], page }` |
| Weekly progress | `GET` | `/trainments/weekly-progress` | `{ weekStart, weekEnd, completed, goal, trainments[] }` |
| Preferences | `GET` | `/preferences` | `{ weightUnit, theme, lengthUnit, weeklyTrainingCount }` |
| Set goal | `PATCH` | `/preferences` | partial; `weeklyTrainingCount` int 1–14 or `null` |
| Trainment detail | `GET` | `/trainments/:id` (+ `/exercises`, `/sets`) | on tap |

## Files

| File | Purpose |
|---|---|
| `api/schemas/trainment.ts` | `ZTrainment`, `ZWeeklyProgress`, list response |
| `api/schemas/preferences.ts` | `ZPreferences` (`weightUnit, theme, lengthUnit, weeklyTrainingCount`) |
| `api/services/trainment.ts` | `listTrainments`, `getWeeklyProgress`, `getTrainment` |
| `api/services/preferences.ts` | `getPreferences`, `updatePreferences` |
| `api/queries/trainment.ts` | `useTrainments`, `useWeeklyProgress` |
| `api/queries/preferences.ts` | `usePreferences` |
| `api/mutations/preferences.ts` | `useUpdatePreferences` |

## Tasks

- [ ] **Weekly progress card** — `completed / goal` as a ring or bar (reuse
  `components/Charts.tsx` if it fits). When `goal === null`, show a "set a goal" hint
  linking to Profile/preferences.
- [ ] **Latest trainments list** — `useInfiniteQuery(['trainments'])`; per row show
  the template title (join via cached `['templates']`), started/finished timestamps,
  and an **"in progress"** badge when `finishedAt === null`.
- [ ] **Pull-to-refresh** → invalidate `['weekly-progress']` + `['trainments']`.
- [ ] **Tap a trainment** → detail (`GET /trainments/:id` + `/exercises` + `/sets`).
  A read-only summary screen; can reuse `progress-detail` or add `trainment/[id]`.
- [ ] **Goal editing** lives in Profile → `useUpdatePreferences` (int 1–14 or null).

## Errors & edge cases

- Empty account (no trainments) → friendly empty state pointing at Templates → Start.
- `goal === null` → "set a goal" affordance, not a broken ring.
- Trainment still pending in the local sync queue (from 05) is **not** in
  `['trainments']` yet — optionally show a "pending sync" section sourced from the
  `syncQueueStore` so the user sees their just-finished workout immediately.
- Loading → skeletons for card + first page; error → inline retry.

## Testing expectations

- Finishing a workout (05) and letting the queue drain updates Home counts after a
  refetch/invalidation.
- Weekly card renders correctly for `goal = null`, `completed < goal`, and
  `completed >= goal`.

## Notes / open questions

- Joining trainment → template title relies on `['templates']` being cached; if a
  trainment references a deleted template, fall back to a stored title or "Workout".
- Confirm whether `weekly-progress.trainments[]` duplicates `['trainments']` data
  (could avoid a second query for the current week).
