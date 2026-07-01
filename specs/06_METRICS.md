# Exercise Metrics (default: last month)

## Overview

Per-exercise progress metrics, defaulting to the **last month**. Metrics are
set-to-set diffs (`weightDiff`, `repetitionsDiff`, `previousSetId`,
`currentSetId`). Reads performed exercises produced by
[05_REGISTER_TRAINMENT](./05_REGISTER_TRAINMENT.md).

Consumes the backend **Metrics** module (`09`).

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `app/(tabs)/progress.tsx` | `screens/ProgressScreen.tsx` | Period selector + per-exercise trends. |
| `app/progress-detail.tsx` | `screens/ProgressDetailScreen.tsx` | One exercise's set-by-set deltas. |
| `app/compare.tsx` | `screens/CompareScreen.tsx` | Compare two exercises/periods (optional). |

## State ownership

- **Server state (Query):** the fan-out below, cached aggressively (long
  `staleTime`, per-exercise keys). Suggested keys: `['trainments', { from, to }]`,
  `['trainment', id, 'exercises']`, `['exercise', id, 'metrics']`.
- **Client state:** the selected period (`useState`: `last-month` default / `3m` /
  `all`).

## Endpoint consumed

| Action | Method | Path | Response |
|---|---|---|---|
| Metrics for one performed exercise | `GET` | `/exercises/:id/metrics` | `{ metrics: [{ id, trainmentId, exerciseId, previousSetId, currentSetId, weightDiff, repetitionsDiff }] }` |

`:id` is a **performed exercise id** (not a template/catalog id).

> ⚠️ **API gap.** This endpoint returns metrics for **one performed exercise** and
> has **no date-range / aggregation param**. "Last month per exercise" therefore
> requires the client to fan out: list last-month trainments → their exercises →
> metrics per exercise, then group by `exerciseTemplateId`/catalog. That's N+1 and
> chatty. **Recommended:** ask the backend for an aggregated endpoint, e.g.
> `GET /metrics/exercises?from=&to=`. Until then, implement the client composition
> below. See [08_CROSS_CUTTING](./08_CROSS_CUTTING.md) for the follow-up ticket.

## Files

| File | Purpose |
|---|---|
| `api/schemas/metrics.ts` | `ZMetric`, `ZMetricsResponse` |
| `api/services/metrics.ts` | `getExerciseMetrics(exerciseId)` → `Result` |
| `api/queries/metrics.ts` | `useExerciseMetrics`; a composed `useMonthlyMetrics(period)` orchestrator |
| `screens/ProgressScreen.tsx`, `ProgressDetailScreen.tsx` | wire to the composed query |

## Tasks

- [ ] **Period selector** — Last month (default), 3m, all (reuse `Pill`).
- [ ] **Data assembly** (client-side until the aggregated endpoint exists):
  - Fetch trainments in range (`GET /trainments?page=` filtered by `finishedAt`).
  - For each, `GET /trainments/:id/exercises`, then `GET /exercises/:id/metrics`.
  - Group by exercise (catalog) → reduce to totals/trends. Cache aggressively.
- [ ] **Metrics screen** — per exercise, show latest weight/rep deltas + a simple
  trend (reuse `components/Charts.tsx`).
- [ ] **Detail screen** — set-by-set `weightDiff`/`repetitionsDiff` for one exercise.
- [ ] Loading skeletons for the multi-request fan-out; **error boundary per
  exercise** so one failed request doesn't blank the whole screen.

## Errors & edge cases

- An exercise with a single set has no diffs (metrics need a previous set) → show
  "no comparison yet".
- Partial failures in the fan-out → render the exercises that loaded; mark the failed
  one retryable.
- Period with no trainments → empty state, not spinner.

## Testing expectations

- With last month's workouts, each trained exercise shows its weight/rep
  progression; switching period refetches (respecting cache).
- One exercise's metrics failing does not crash the list.

## Notes / open questions

- **Backend follow-up ticket:** aggregated metrics-by-period endpoint (removes the
  N+1). Tracked separately from this app plan — flag to the backend team.
- Grouping key: metrics carry `exerciseId` (performed) — resolve to
  `exerciseTemplateId` → catalog id via the `/exercises` responses to group across
  trainments.
