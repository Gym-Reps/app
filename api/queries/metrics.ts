import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { getExerciseMetrics, getTrainmentMetrics } from '../services/metrics';
import { listTrainmentExercises, listTrainmentSets } from '../services/exercise';
import { listTemplateExercises, listTemplates } from '../services/template';
import { getTrainment, listTrainments } from '../services/trainment';
import { TRAINMENTS_PAGE_SIZE } from '../schemas/trainment';
import type { PerformedSet } from '../schemas/exercise';
import type { Metric } from '../schemas/metrics';
import { QUERY_KEYS } from '../queryKeys';

/**
 * Exercise metrics (spec 06). The backend has no aggregated "metrics by period"
 * endpoint (see the flagged API gap / backend follow-up ticket in 08), so the
 * Progress trend view is composed CLIENT-SIDE: list finished trainments in range
 * → their performed exercises + performed sets → for each exercise slot compare
 * the OLDEST in-range performance against the NEWEST.
 *
 * Progress is grouped by **trainment template → exercise slot** (keyed
 * `templateId::exerciseTemplateId`). Two different templates that share the same
 * catalog exercise are distinct slots, so they never collide into one row.
 *
 * The comparison uses the absolute weight/reps of the performed *sets* (from
 * `GET /trainments/:id/sets`) rather than the eventually-consistent per-set
 * `metrics` diffs: we match the oldest and newest performances set-by-set (by
 * index) and report the signed change. This is exact and available immediately,
 * without waiting for the async metrics computation.
 *
 * The fan-out is cached aggressively: every leaf request goes through
 * `queryClient.fetchQuery` with a per-resource key and a long `staleTime`, so
 * switching period re-composes from cache instead of refetching, and finished
 * sessions (immutable) are only ever fetched once. Leaf failures are caught
 * per-session so one bad request degrades to a "partial" result instead of
 * blanking the whole screen.
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

/** One performance of an exercise slot in a single session (absolute numbers). */
type Occurrence = {
  at: string;
  /** Performed-exercise id — used for the drill-in detail on the newest one. */
  performedExerciseId: string;
  /** Set index → the weight/reps actually logged (either may be null). */
  byIndex: Map<number, { weight: number | null; reps: number | null }>;
  meanWeight: number | null;
  meanReps: number | null;
};

type GroupAccum = {
  key: string;
  exerciseTemplateId: string;
  trainmentTemplateId: string;
  title: string;
  /** Chronological (oldest → newest) — `inRange` is sorted that way. */
  occ: Occurrence[];
  failed: boolean;
};

/** A per-exercise trend row for the Progress screen. */
export type ExerciseTrend = {
  /** Grouping key = `templateId::exerciseTemplateId`. */
  key: string;
  /** The exercise slot this row tracks. */
  exerciseTemplateId: string;
  /** Exercise name (from the template slot; never "Exercise 1"). */
  title: string;
  /** Most recent performed-exercise id (for the drill-in detail). */
  latestExerciseId: string;
  /** Number of in-range sessions that logged this exercise. */
  sessions: number;
  /**
   * Signed change from the OLDEST to the NEWEST in-range performance, matched
   * set-by-set (mean over matched indices). `null` = fewer than two in-range
   * performances, so there's nothing to compare. Weight may be null while reps
   * is not (e.g. a bodyweight exercise that logs no load).
   */
  rangeWeightDiff: number | null;
  rangeRepsDiff: number | null;
  /** Per-session series of the primary metric (weight, or reps if no load) for the sparkline. */
  points: number[];
  /** True if some session's data failed to load (row shown, marked retryable). */
  failed: boolean;
};

/** A template section: the exercises tracked under one trainment template. */
export type TemplateProgress = {
  templateId: string;
  title: string;
  exercises: ExerciseTrend[];
};

export type MetricsOverview = {
  from: string;
  to: string;
  templates: TemplateProgress[];
  /** True if any leaf request failed — the screen shows a soft "some data missing" note. */
  partial: boolean;
};

/** Cached fetch of a finished session's performed exercises (immutable). */
function fetchTrainmentExercises(trainmentId: string) {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.TRAINMENT_EXERCISES(trainmentId),
    queryFn: async () => {
      const res = await listTrainmentExercises(trainmentId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

/** Cached fetch of a finished session's performed sets (immutable). */
function fetchTrainmentSets(trainmentId: string) {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.TRAINMENT_SETS(trainmentId),
    queryFn: async () => {
      const res = await listTrainmentSets(trainmentId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

/**
 * Cached fetch of a template's exercise slots — used to resolve display titles
 * (the performed-exercise DTO doesn't reliably carry one). Shares the key with
 * `useTemplateExercises` so the editor and this fan-out reuse each other's cache.
 */
function fetchTemplateExercises(templateId: string) {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.TEMPLATE_EXERCISES(templateId),
    queryFn: async () => {
      const res = await listTemplateExercises(templateId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

/** Cached fetch of the user's templates — used to title the sections. */
function fetchTemplates() {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.TEMPLATES(),
    queryFn: async () => {
      const res = await listTemplates();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

/** Cached fetch of one finished session (to resolve its template). */
function fetchTrainment(trainmentId: string) {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.TRAINMENT(trainmentId),
    queryFn: async () => {
      const res = await getTrainment(trainmentId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: LEAF_STALE_MS,
  });
}

/** Reduce a set of performed sets to an occurrence (per-index map + means). */
function toOccurrence(
  at: string,
  performedExerciseId: string,
  sets: PerformedSet[]
): Occurrence | null {
  const byIndex = new Map<number, { weight: number | null; reps: number | null }>();
  const weights: number[] = [];
  const reps: number[] = [];
  for (const s of sets) {
    byIndex.set(s.index, { weight: s.weight, reps: s.repetitions });
    if (s.weight != null) weights.push(s.weight);
    if (s.repetitions != null) reps.push(s.repetitions);
  }
  // Nothing logged → not a real performance to compare against.
  if (weights.length === 0 && reps.length === 0) return null;
  return {
    at,
    performedExerciseId,
    byIndex,
    meanWeight: weights.length > 0 ? mean(weights) : null,
    meanReps: reps.length > 0 ? mean(reps) : null,
  };
}

/**
 * Signed oldest→newest change for one field, matched by set index. Averages the
 * per-index diffs where both performances logged that field; falls back to the
 * difference of the two performances' means when no index lines up.
 */
function occurrenceDiff(
  oldest: Occurrence,
  newest: Occurrence,
  field: 'weight' | 'reps'
): number | null {
  const diffs: number[] = [];
  for (const [index, cur] of newest.byIndex) {
    const prev = oldest.byIndex.get(index);
    if (!prev) continue;
    const c = cur[field === 'weight' ? 'weight' : 'reps'];
    const p = prev[field === 'weight' ? 'weight' : 'reps'];
    if (c != null && p != null) diffs.push(c - p);
  }
  if (diffs.length > 0) return mean(diffs);
  const cm = field === 'weight' ? newest.meanWeight : newest.meanReps;
  const pm = field === 'weight' ? oldest.meanWeight : oldest.meanReps;
  return cm != null && pm != null ? cm - pm : null;
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
    // Chronological (oldest → newest) so the last occurrence is the "newest".
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // 2a) Section titles: template id → name. Prefer the live templates list, then
  //     any title snapshotted on the trainment (covers deleted templates).
  const templateTitleById = new Map<string, string>();
  for (const t of inRange) {
    if (t.title) templateTitleById.set(t.trainmentTemplateId, t.title);
  }
  try {
    const templates = await fetchTemplates();
    for (const tpl of templates) templateTitleById.set(tpl.id, tpl.title);
  } catch {
    // Fall back to the snapshotted trainment titles / a generic label.
  }

  // 2b) Exercise names: map `exerciseTemplateId → title` from each in-range
  //     template's slots (cached, deduped across the sessions in range).
  const titleByExerciseTemplate = new Map<string, string>();
  const templateIds = [...new Set(inRange.map((t) => t.trainmentTemplateId))];
  await Promise.all(
    templateIds.map(async (templateId) => {
      try {
        const slots = await fetchTemplateExercises(templateId);
        for (const slot of slots) {
          if (slot.title) titleByExerciseTemplate.set(slot.id, slot.title);
        }
      } catch {
        // A missing template just leaves those rows on the DTO/fallback title.
      }
    })
  );

  // 3) Fan out: per session → performed exercises + performed sets → occurrences,
  //    grouped by template + exercise slot.
  const groups = new Map<string, GroupAccum>();
  let partial = false;

  for (const t of inRange) {
    let exercises, sets;
    try {
      [exercises, sets] = await Promise.all([
        fetchTrainmentExercises(t.id),
        fetchTrainmentSets(t.id),
      ]);
    } catch {
      partial = true; // couldn't read this session — skip it
      continue;
    }

    // Bucket the session's sets by their performed exercise.
    const setsByExercise = new Map<string, PerformedSet[]>();
    for (const s of sets) {
      const bucket = setsByExercise.get(s.exerciseId);
      if (bucket) bucket.push(s);
      else setsByExercise.set(s.exerciseId, [s]);
    }

    for (const ex of exercises) {
      const key = `${t.trainmentTemplateId}::${ex.exerciseTemplateId}`;
      const resolvedTitle =
        titleByExerciseTemplate.get(ex.exerciseTemplateId) ?? ex.title ?? null;
      const group: GroupAccum = groups.get(key) ?? {
        key,
        exerciseTemplateId: ex.exerciseTemplateId,
        trainmentTemplateId: t.trainmentTemplateId,
        title: resolvedTitle ?? 'Exercise',
        occ: [],
        failed: false,
      };
      if (resolvedTitle) group.title = resolvedTitle;

      const occurrence = toOccurrence(
        t.startedAt,
        ex.id,
        setsByExercise.get(ex.id) ?? []
      );
      if (occurrence) group.occ.push(occurrence);

      groups.set(key, group);
    }
  }

  // 4) Reduce each group to a trend row (oldest vs. newest in-range performance).
  type Row = ExerciseTrend & { trainmentTemplateId: string };
  const rows: Row[] = [];
  for (const g of groups.values()) {
    if (g.occ.length === 0) continue; // exercise never logged in range
    const oldest = g.occ[0];
    const newest = g.occ[g.occ.length - 1];
    const hasComparison = g.occ.length >= 2;

    const rangeWeightDiff = hasComparison
      ? occurrenceDiff(oldest, newest, 'weight')
      : null;
    const rangeRepsDiff = hasComparison
      ? occurrenceDiff(oldest, newest, 'reps')
      : null;

    // Sparkline: the primary metric per session — weight when any session logged
    // load, otherwise reps (so bodyweight work still shows a trend).
    const hasWeights = g.occ.some((o) => o.meanWeight != null);
    const points = hasComparison
      ? g.occ.map((o) => (hasWeights ? o.meanWeight ?? 0 : o.meanReps ?? 0))
      : [];

    rows.push({
      key: g.key,
      exerciseTemplateId: g.exerciseTemplateId,
      trainmentTemplateId: g.trainmentTemplateId,
      title: g.title,
      latestExerciseId: newest.performedExerciseId,
      sessions: g.occ.length,
      rangeWeightDiff,
      rangeRepsDiff,
      points,
      failed: g.failed,
    });
  }

  // 5) Group the rows into template sections.
  const sections = new Map<string, TemplateProgress>();
  for (const row of rows) {
    const { trainmentTemplateId, ...trend } = row;
    const section = sections.get(trainmentTemplateId) ?? {
      templateId: trainmentTemplateId,
      title: templateTitleById.get(trainmentTemplateId) ?? 'Workout',
      exercises: [],
    };
    section.exercises.push(trend);
    sections.set(trainmentTemplateId, section);
  }

  const templates = [...sections.values()];
  for (const section of templates) {
    // Within a template: exercises with a real comparison first, then alphabetical.
    section.exercises.sort((a, b) => {
      const aHas = a.rangeWeightDiff != null || a.rangeRepsDiff != null ? 0 : 1;
      const bHas = b.rangeWeightDiff != null || b.rangeRepsDiff != null ? 0 : 1;
      return aHas - bHas || a.title.localeCompare(b.title);
    });
  }
  templates.sort((a, b) => a.title.localeCompare(b.title));

  return { from: new Date(fromMs).toISOString(), to: toIso, templates, partial };
}

/**
 * Composed template→exercise progress for a period (default: last month). Cached
 * under `['metrics-overview', period]`; the underlying leaf requests are cached
 * separately so period switches reuse them.
 */
export function useMonthlyMetrics(period: Period) {
  return useQuery({
    queryKey: QUERY_KEYS.METRICS_OVERVIEW(period),
    queryFn: () => composeOverview(period),
    staleTime: 5 * 60_000,
  });
}

/** One performed exercise's per-set diffs (drill-in detail). */
export function useExerciseMetrics(exerciseId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.EXERCISE_METRICS(exerciseId),
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
    queryKey: QUERY_KEYS.TRAINMENT_METRICS(trainmentId),
    enabled: trainmentId != null,
    staleTime: LEAF_STALE_MS,
    queryFn: async (): Promise<Metric[]> => {
      const res = await getTrainmentMetrics(trainmentId as string);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

/**
 * Resolve a finished session's performed-exercise ids → display names, so the
 * session detail can label each group by its exercise instead of "Exercise 1".
 * Names come from the session's template slots (fallback: the DTO title).
 */
async function resolveTrainmentExerciseTitles(
  trainmentId: string
): Promise<Record<string, string>> {
  const exercises = await fetchTrainmentExercises(trainmentId);
  const slotTitle = new Map<string, string>();
  try {
    const trainment = await fetchTrainment(trainmentId);
    const slots = await fetchTemplateExercises(trainment.trainmentTemplateId);
    for (const slot of slots) {
      if (slot.title) slotTitle.set(slot.id, slot.title);
    }
  } catch {
    // Template gone → fall back to the DTO title / a generic label below.
  }
  const titles: Record<string, string> = {};
  for (const ex of exercises) {
    titles[ex.id] = slotTitle.get(ex.exerciseTemplateId) ?? ex.title ?? 'Exercise';
  }
  return titles;
}

/** Performed-exercise-id → exercise name for one session (detail labels). */
export function useTrainmentExerciseTitles(trainmentId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.TRAINMENT_EXERCISE_TITLES(trainmentId),
    enabled: trainmentId != null,
    staleTime: LEAF_STALE_MS,
    queryFn: () => resolveTrainmentExerciseTitles(trainmentId as string),
  });
}
