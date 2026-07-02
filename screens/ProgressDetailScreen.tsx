import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SkeletonList } from '../components/Skeleton';
import { colors, radius, spacing } from '../utils/theme';
import { useExerciseMetrics, useTrainmentMetrics } from '../api/queries/metrics';
import type { Metric } from '../api/schemas/metrics';

/**
 * Set-by-set progress diffs for one performed exercise (`exerciseId`) or a whole
 * finished session (`trainmentId`, reached from the Home "latest trainments"
 * rows). Diffs come straight from the Metrics module — each row is the signed
 * change vs. the matched set in the previous same-template session.
 */
export function ProgressDetailScreen() {
  const router = useRouter();
  const { exerciseId, trainmentId, title } = useLocalSearchParams<{
    exerciseId?: string;
    trainmentId?: string;
    title?: string;
  }>();

  const bySession = trainmentId != null && exerciseId == null;

  // Exactly one of these is enabled (the other is disabled via `enabled`).
  const exerciseQuery = useExerciseMetrics(bySession ? undefined : exerciseId);
  const sessionQuery = useTrainmentMetrics(bySession ? trainmentId : undefined);
  const query = bySession ? sessionQuery : exerciseQuery;

  const heading = title ?? (bySession ? 'Session' : 'Exercise');

  return (
    <Screen>
      <Header title={heading} onBack={() => router.back()} />

      {query.isLoading ? (
        <View style={styles.loading}>
          <SkeletonList count={4} rowHeight={44} />
        </View>
      ) : query.isError ? (
        <Card style={styles.errorBox}>
          <Body color={colors.bad} size={14}>{query.error.message || 'Could not load metrics'}</Body>
          <Button label="Retry" variant="outline" onPress={() => query.refetch()} />
        </Card>
      ) : query.data && query.data.length > 0 ? (
        bySession ? (
          <SessionMetrics metrics={query.data} />
        ) : (
          <ExerciseMetrics metrics={query.data} />
        )
      ) : (
        <NoComparison />
      )}
    </Screen>
  );
}

/** One exercise: a flat list of per-set deltas (index order). */
function ExerciseMetrics({ metrics }: { metrics: Metric[] }) {
  return (
    <View style={styles.section}>
      <Body color={colors.textFaint} size={13} style={styles.sectionLabel}>
        Change vs. your previous session
      </Body>
      <Card>
        {metrics.map((m, i) => (
          <SetRow key={m.currentSetId} index={i + 1} metric={m} last={i === metrics.length - 1} />
        ))}
      </Card>
    </View>
  );
}

/** A whole session: group the per-set deltas by performed exercise. */
function SessionMetrics({ metrics }: { metrics: Metric[] }) {
  const groups = new Map<string, Metric[]>();
  for (const m of metrics) {
    const list = groups.get(m.exerciseId) ?? [];
    list.push(m);
    groups.set(m.exerciseId, list);
  }
  return (
    <View style={styles.section}>
      <Body color={colors.textFaint} size={13} style={styles.sectionLabel}>
        Change vs. the previous session
      </Body>
      {[...groups.entries()].map(([exerciseId, sets], gi) => (
        <View key={exerciseId} style={gi > 0 && styles.groupGap}>
          <Body color={colors.textFaint} size={12} style={styles.groupLabel}>
            Exercise {gi + 1}
          </Body>
          <Card>
            {sets.map((m, i) => (
              <SetRow key={m.currentSetId} index={i + 1} metric={m} last={i === sets.length - 1} />
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

function SetRow({ index, metric, last }: { index: number; metric: Metric; last: boolean }) {
  return (
    <View style={[styles.setRow, last && styles.setRowLast]}>
      <Body color={colors.textFaint} size={14} style={styles.setNum}>Set {index}</Body>
      <Delta value={metric.weightDiff} unit="kg" />
      <Delta value={metric.repetitionsDiff} unit="rep" />
    </View>
  );
}

/** A signed, color-coded delta chip (`+2.5kg`, `-1rep`, `=`). */
function Delta({ value, unit }: { value: number; unit: 'kg' | 'rep' }) {
  const rounded = Math.round(value * 10) / 10;
  const color = rounded === 0 ? colors.textGhost : rounded > 0 ? colors.good : colors.bad;
  const suffix = unit === 'rep' ? (Math.abs(rounded) === 1 ? ' rep' : ' reps') : 'kg';
  const label = rounded === 0 ? '=' : `${rounded > 0 ? '+' : ''}${rounded}${suffix}`;
  return (
    <Body size={14} color={color} style={styles.delta}>{label}</Body>
  );
}

function NoComparison() {
  return (
    <Card style={styles.empty}>
      <Display size={22}>No comparison yet</Display>
      <Body color={colors.textFaint} size={14} style={styles.emptyBody}>
        Diffs appear once you’ve done this workout at least twice — we compare each
        set against your previous session. Metrics can also take a moment to compute
        after a sync.
      </Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.lg },
  errorBox: { gap: 10, alignItems: 'flex-start', marginTop: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm },
  groupGap: { marginTop: spacing.lg },
  groupLabel: { marginBottom: spacing.xs },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  setRowLast: { borderBottomWidth: 0 },
  setNum: { flex: 1 },
  delta: { width: 84, textAlign: 'right' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, marginTop: spacing.lg, borderRadius: radius.md },
  emptyBody: { textAlign: 'center' },
});
