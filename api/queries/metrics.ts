import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { getExerciseMetrics, getTrainmentMetrics } from '../services/metrics';
import { listTrainmentExercises } from '../services/exercise';
import { listTrainments } from '../services/trainment';
import { TRAINMENTS_PAGE_SIZE } from '../schemas/trainment';
import type { Metric } from '../schemas/metrics';

/**
 * Exercise metrics (spec 06). The backend has no aggregated "metrics by period"
 * endpoint (see the flagged API gap / backend follow-up ticket in 08), so the
 * per-exercise trend view is composed CLIENT-SIDE: list finished trainments in
 * range → their performed exercises → each exercise's per-set diffs, grouped by
 * `exerciseTemplateId`.
 *
 * The fan-out is deliberately cached aggressively: every leaf request goes
 * through `queryClient.fetchQuery` with a per-resource key and a long
 * `staleTime`, so switching period re-composes from cache instead of refetching,
 * and finished sessions (immutable) are only ever fetched once. Leaf failures are
 * caught per-exercise/per-session so one bad request degrades to a "partial"
 * result instead of blanking the whole screen.
 */

export type Period = 'last-month' | '3m' | 'all';

/** Leaf caches live ~10 min — finished-session data doesn't change underneath us. */
const LEAF_STALE_MS = 10 * 60_000;
/** Safety cap on how many trainment pages the fan-out will walk. */
const MAX_PAGES = 6;
const DAY_MS = 86_400_000;

function periodStartMs(period: Period): number {
  const now = Date.now();
  switch (period) {
    case 'last-month':
      return now - 30 * DAY_MS;
    case '3m':
      return now - 90 * DAY_MS;
    case 'all':
      return 0;
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** One session's contribution to an exercise trend (mean diff vs. its previous). */
type SessionPoint = { at: string; weightDiff: number | null; repsDiff: number | null };

type GroupAccum = {
  key: string;
  title: string;
  latestExerciseId: string;
  points: SessionPoint[];
  failed: boolean;
};

/** A per-exercise trend row for the Progress screen. */
export type ExerciseTrend = {
  /** Grouping key = `exerciseTemplateId` (the slot across sessions). */
  key: string;
  title: string;
  /** Most recent performed-exercise id (for the drill-in detail). */
  latestExerciseId: string;
  /** Number of in-range sessions that included this exercise. */
  sessions: number;
  /** Latest session's mean weight diff vs. the prior session (null = no comparison). */
  latestWeightDiff: number | null;
  latestRepsDiff: number | null;
  /** Cumulative weight-diff series for the sparkline (empty when no diffs yet). */
  points: number[];
  /** True if some session's metrics failed to load (row shown, marked retryable). */
  failed: boolean;
};

export type MetricsOverview = {
  from: string;
  to: string;
  exercises: ExerciseTrend[];
  /** True if any leaf request failed — the screen shows a soft "some data missing" note. */
  partial: boolean;
};

/** Cached fetch of a finished session's performed exercises (immutable). */
function fetchTrainmentExercises(trainmentId: string) {
  return queryClient.fetchQuery({
    queryKey: ['trainment-exercises', trainmentId],
    queryFn: async () => {
      const res = await listTrainmentExercises(trainmentId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

/** Cached fetch of one performed exercise's per-set metrics. */
function fetchExerciseMetrics(exerciseId: string) {
  return queryClient.fetchQuery({
    queryKey: ['exercise', exerciseId, 'metrics'],
    queryFn: async () => {
      const res = await getExerciseMetrics(exerciseId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

async function composeOverview(period: Period): Promise<MetricsOverview> {
  const fromMs = periodStartMs(period);
  const toIso = new Date().toISOString();

  // 1) Collect finished trainments in range. The list is newest-first, so stop
  //    once a page's oldest item predates the window (or a short page ends it).
  const trainments = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await listTrainments(page);
    if (!res.ok) throw new Error(res.error);
    const items = res.data.trainments;
    trainments.push(...items);
    if (items.length < TRAINMENTS_PAGE_SIZE) break;
    const oldest = items[items.length - 1];
    if (oldest && new Date(oldest.startedAt).getTime() < fromMs) break;
  }

  const inRange = trainments
    .filter((t) => t.finishedAt != null && new Date(t.startedAt).getTime() >= fromMs)
    // Chronological (oldest → newest) so the last write wins as "latest".
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // 2) Fan out: per session → performed exercises → per-exercise metrics.
  const groups = new Map<string, GroupAccum>();
  let partial = false;

  for (const t of inRange) {
    let exercises;
    try {
      exercises = await fetchTrainmentExercises(t.id);
    } catch {
      partial = true; // couldn't read this session's exercises — skip it
      continue;
    }

    for (const ex of exercises) {
      const key = ex.exerciseTemplateId;
      const group: GroupAccum = groups.get(key) ?? {
        key,
        title: ex.title ?? 'Exercise',
        latestExerciseId: ex.id,
        points: [],
        failed: false,
      };
      if (ex.title) group.title = ex.title;
      group.latestExerciseId = ex.id; // chronological order → most recent wins

      try {
        const metrics = await fetchExerciseMetrics(ex.id);
        group.points.push(
          metrics.length > 0
            ? {
                at: t.startedAt,
                weightDiff: mean(metrics.map((m) => m.weightDiff)),
                repsDiff: mean(metrics.map((m) => m.repetitionsDiff)),
              }
            : { at: t.startedAt, weightDiff: null, repsDiff: null }
        );
      } catch {
        group.failed = true;
        partial = true;
      }

      groups.set(key, group);
    }
  }

  // 3) Reduce each group to a trend row.
  const exercises: ExerciseTrend[] = [...groups.values()].map((g) => {
    const withDiff = g.points.filter((p) => p.weightDiff != null);
    const last = withDiff[withDiff.length - 1];
    let cumulative = 0;
    const series = withDiff.map((p) => (cumulative += p.weightDiff ?? 0));
    return {
      key: g.key,
      title: g.title,
      latestExerciseId: g.latestExerciseId,
      sessions: g.points.length,
      latestWeightDiff: last?.weightDiff ?? null,
      latestRepsDiff: last?.repsDiff ?? null,
      // Anchor the sparkline at 0 so a single diff still renders a line.
      points: series.length >= 1 ? [0, ...series] : [],
      failed: g.failed,
    };
  });

  // Exercises with a real comparison first, then alphabetical.
  exercises.sort((a, b) => {
    const aHas = a.latestWeightDiff != null ? 0 : 1;
    const bHas = b.latestWeightDiff != null ? 0 : 1;
    return aHas - bHas || a.title.localeCompare(b.title);
  });

  return { from: new Date(fromMs).toISOString(), to: toIso, exercises, partial };
}

/**
 * Composed per-exercise metrics for a period (default: last month). Cached under
 * `['metrics-overview', period]`; the underlying leaf requests are cached
 * separately so period switches reuse them.
 */
export function useMonthlyMetrics(period: Period) {
  return useQuery({
    queryKey: ['metrics-overview', period],
    queryFn: () => composeOverview(period),
    staleTime: 5 * 60_000,
  });
}

/** One performed exercise's per-set diffs (drill-in detail). */
export function useExerciseMetrics(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['exercise', exerciseId, 'metrics'],
    enabled: exerciseId != null,
    staleTime: LEAF_STALE_MS,
    queryFn: async (): Promise<Metric[]> => {
      const res = await getExerciseMetrics(exerciseId as string);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

/** A whole finished session's per-set diffs (detail reached from Home rows). */
export function useTrainmentMetrics(trainmentId: string | undefined) {
  return useQuery({
    queryKey: ['trainment', trainmentId, 'metrics'],
    enabled: trainmentId != null,
    staleTime: LEAF_STALE_MS,
    queryFn: async (): Promise<Metric[]> => {
      const res = await getTrainmentMetrics(trainmentId as string);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}
