# Register a Trainment — Offline-First ⭐

## Overview

**The core flow.** The entire workout session is built **locally** in Zustand +
AsyncStorage and only touches the network at **Finish**. If offline (or the request
fails) at finish, the payload is parked in a pending queue and drained later by a
background poller. Persisted so a crash mid-workout resumes on next launch.

Consumes the backend **Offline Sync** module (`07`), whose single endpoint
`POST /trainments/sync` persists the whole session graph **atomically &
idempotently** keyed by the client-generated `id`.

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `app/log-workout.tsx` | `screens/LogWorkoutScreen.tsx` | The live session: per-exercise sets, add/edit/remove, Finish. |
| (mounted at root) | `useSyncQueue()` hook | Background drain of pending payloads. |

Entry: **Start** from [03_TEMPLATES_LIST](./03_TEMPLATES_LIST.md) seeds the active
session, then navigates to `log-workout`.

## State ownership

Everything here is **client/offline** state — the server is not the source of truth
until sync succeeds. **Do not put any of this in TanStack Query.**

- **`stores/activeTrainment.ts`** (Zustand, persisted → AsyncStorage key
  `active_trainment`): the single in-progress session.
- **`stores/syncQueue.ts`** (Zustand, persisted → AsyncStorage key
  **`pending_trainments_sync`**): array of completed payloads awaiting upload.

On successful sync, invalidate the server caches `['trainments']` and
`['weekly-progress']` so [04_HOME](./04_HOME.md) refreshes.

## Exact payload contract (validated server-side — match precisely)

```jsonc
{
  "id": "<uuid>",                    // client-generated, stable across retries
  "trainmentTemplateId": "<uuid>",
  "startedAt": "<ISO date>",
  "finishedAt": "<ISO date|null>",
  "exercises": [
    {
      "id": "<uuid>",                // client-generated
      "exerciseTemplateId": "<uuid>",// from the template's exercises (slice 02)
      "plannedSets": {               // keys are contiguous "1".."N"
        "1": { "weight": 60, "min_reps": 8, "max_reps": 12 },
        "2": { "weight": 60, "min_reps": 8, "max_reps": 12 }
      },
      "sets": [                      // MUST be same count as plannedSets keys
        { "id": "<uuid>", "index": 1, "weight": 60, "repetitions": 10, "performedAt": "<ISO>" },
        { "id": "<uuid>", "index": 2, "weight": 60, "repetitions": 9,  "performedAt": "<ISO>" }
      ]
    }
  ]
}
```

> **Server invariants — satisfy locally *before* enqueuing (avoid `409`s):** per
> exercise, `sets.length === Object.keys(plannedSets).length`, and both
> `sets[].index` and the `plannedSets` keys are **contiguous `1..N`**. Re-index on
> every add/remove. Validate the whole payload with a Zod schema at Finish.

## Files

| File | Purpose |
|---|---|
| `stores/activeTrainment.ts` | active session store (persisted) + set add/edit/remove + re-index |
| `stores/syncQueue.ts` | pending payload queue (persisted) + enqueue/dequeue/in-flight flag |
| `api/schemas/sync.ts` | `ZSyncPayload` mirroring the contract above (the local validator) |
| `api/services/sync.ts` | `syncTrainment(payload)` → `Result` (`POST /trainments/sync`) |
| `hooks/useSyncQueue.ts` | background poller (foreground / connectivity / interval) |
| `screens/LogWorkoutScreen.tsx` | the live session UI (exists — wire to the store) |
| `lib/uuid.ts`, `lib/netinfo.ts` | id generation + connectivity (from 00) |

## Primary endpoint

`POST /trainments/sync` — `201` on first sync, `200` on idempotent re-sync (same
`id`) → **safe to retry**. Errors: `404` (template/exercise not found), `403` (not
owner), `409` (`SyncConflictError` / `InvalidSetIndexError`).

## Tasks

- [ ] **Start session** (from Templates "Start"): seed `activeTrainment` from the
  template — generate the trainment `id`, copy exercises (each with its
  `exerciseTemplateId` and an `id`), set `startedAt = now`. Hydrate title/image from
  the cached catalog for display. Refuse to start if a session is already active
  (offer resume/discard).
- [ ] **Session screen** — per exercise: add / edit / remove sets. Each set edit
  updates **both** the `plannedSets` entry and the performed `sets` entry; removing a
  set **re-indexes `1..N`** on both. Fully functional with **no network**.
- [ ] **Auto-persist** — the store persists to AsyncStorage on every change (Zustand
  `persist` middleware). Survives app kill → **resume prompt** on next launch if
  `active_trainment` exists.
- [ ] **Finish** → set `finishedAt = now`, build the payload, run
  `ZSyncPayload.parse` + the invariant check, then:
  - **Online** (`isOnline()`), attempt `POST /trainments/sync`; on `2xx` clear
    `active_trainment` and invalidate `['trainments']` + `['weekly-progress']`.
  - **Offline or request fails** → `enqueue(payload)` into `pending_trainments_sync`,
    clear `active_trainment`, show "will sync when online".
- [ ] **Background sync poller** (`useSyncQueue`, mounted once at `app/_layout.tsx`):
  - Triggers: app foreground (`AppState`), NetInfo regains connectivity, and an
    interval fallback.
  - For each queued payload: `POST /trainments/sync`; on `200/201` dequeue it
    (idempotent — safe even if partially sent before); on `409` surface conflict
    resolution (drop or flag); on network error keep it and back off.
  - **Process sequentially**; guard with an in-flight flag against concurrent drains.
- [ ] **Pending indicator** — a badge/count of `pending_trainments_sync` (Home
  and/or the tab bar).

## Errors & edge cases

| Case | Handling |
|---|---|
| `409` conflict on drain | Stop retrying that payload; prompt drop/flag (don't silently loop). |
| `404`/`403` on drain | Template/exercise gone or not owner → drop with a toast (won't ever succeed). |
| Network error on drain | Keep in queue, exponential backoff, retry on next trigger. |
| App killed mid-set | Resume from `active_trainment` on relaunch. |
| Duplicate finish taps | Idempotent `id` → second sync returns `200`, no duplicate. |
| Empty exercise (0 sets) | Block Finish or drop that exercise — must satisfy the count invariant. |

## Testing expectations

- Airplane mode → complete a full workout → Finish lands the payload in
  `pending_trainments_sync`; re-enable network → poller drains it → it appears in
  Home.
- Running the drain **twice never creates duplicates** (idempotent `id`).
- Re-index correctness: remove set 2 of 3 → indices become `1,2` on both `sets` and
  `plannedSets`; local validation passes.
- Kill the app mid-session → relaunch resumes the exact session.

## Notes / open questions

- `plannedSets` uses `min_reps`/`max_reps` (snake_case, a range) while `sets` uses
  `repetitions` (the achieved count). Keep both — don't collapse them.
- Prefer the single atomic `/sync` over the granular per-set endpoints
  (`POST /exercises/:id/sets`, …); those exist for an online-incremental flow this
  app doesn't use.
- Backoff/state for queue items: store `attempts` + `nextAttemptAt` per payload so
  the poller can back off without a separate timer store.
