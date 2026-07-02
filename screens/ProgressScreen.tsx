import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Sparkline } from '../components/Charts';
import { SkeletonList } from '../components/Skeleton';
import { colors, radius, spacing } from '../utils/theme';
import { useMonthlyMetrics, type ExerciseTrend, type Period } from '../api/queries/metrics';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'last-month', label: 'Last month' },
  { key: '3m', label: '3 months' },
  { key: 'all', label: 'All time' },
];

/** Format a signed weight delta, e.g. `+2.5kg`, `-1kg`, `flat`. */
function weightLabel(diff: number | null): string {
  if (diff == null) return '';
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0) return 'flat';
  return `${rounded > 0 ? '+' : ''}${rounded}kg`;
}

function toneFor(diff: number | null): string {
  if (diff == null || diff === 0) return colors.flat;
  return diff > 0 ? colors.good : colors.bad;
}

export function ProgressScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('last-month');
  const query = useMonthlyMetrics(period);

  return (
    <Screen>
      <View style={styles.head}>
        <Display size={28}>Progress</Display>
        <Body color={colors.textFaint} size={13}>Trends per exercise · tap to drill in</Body>
      </View>

      <View style={styles.periods}>
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodPill, active ? styles.periodActive : styles.periodIdle]}
            >
              <Body size={13} color={active ? '#fff' : colors.textFaint}>{p.label}</Body>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <View style={styles.loading}>
          <SkeletonList count={5} rowHeight={46} />
        </View>
      ) : query.isError ? (
        <Card style={styles.errorBox}>
          <Body color={colors.bad} size={14}>{query.error.message || 'Could not load progress'}</Body>
          <Button label="Retry" variant="outline" onPress={() => query.refetch()} />
        </Card>
      ) : query.data && query.data.exercises.length > 0 ? (
        <View>
          {query.data.partial && (
            <Card style={styles.partial}>
              <Body color={colors.textMuted} size={13}>
                Some metrics couldn’t be loaded. Pull to retry.
              </Body>
            </Card>
          )}
          {query.data.exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.key}
              trend={ex}
              last={i === query.data.exercises.length - 1}
              onPress={() =>
                router.push({
                  pathname: '/progress-detail',
                  params: { exerciseId: ex.latestExerciseId, title: ex.title },
                })
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState onBrowse={() => router.push('/templates')} />
      )}
    </Screen>
  );
}

function ExerciseRow({
  trend,
  last,
  onPress,
}: {
  trend: ExerciseTrend;
  last: boolean;
  onPress: () => void;
}) {
  const tone = toneFor(trend.latestWeightDiff);
  const hasComparison = trend.latestWeightDiff != null && trend.points.length >= 2;
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.row, last && styles.rowLast]}>
        <View style={styles.rowText}>
          <Body size={15} numberOfLines={1}>{trend.title}</Body>
          <Body color={colors.textGhost} size={12}>
            {trend.sessions} {trend.sessions === 1 ? 'session' : 'sessions'}
            {trend.failed ? ' · some data missing' : ''}
          </Body>
        </View>
        {hasComparison ? (
          <>
            <Sparkline data={trend.points} color={tone} />
            <Body size={13} color={tone} style={styles.delta}>{weightLabel(trend.latestWeightDiff)}</Body>
          </>
        ) : (
          <Body color={colors.textGhost} size={12} style={styles.noCompare}>no comparison yet</Body>
        )}
      </View>
    </Pressable>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card style={styles.empty}>
      <Display size={22}>No progress yet</Display>
      <Body color={colors.textFaint} size={14} style={styles.emptyBody}>
        Log a couple of sessions from the same template and your set-by-set
        progress shows up here.
      </Body>
      <Button label="Browse templates" icon="▶" onPress={onBrowse} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 12 },
  periods: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  periodPill: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5 },
  periodActive: { backgroundColor: colors.ink },
  periodIdle: { borderWidth: 1.5, borderColor: colors.lineStrong },
  loading: { marginTop: spacing.sm },
  errorBox: { gap: 10, alignItems: 'flex-start' },
  partial: {
    marginBottom: spacing.md,
    backgroundColor: colors.pinkTint,
    borderColor: colors.pinkStrong,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
    paddingVertical: 10,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: 2 },
  delta: { width: 56, textAlign: 'right' },
  noCompare: { textAlign: 'right' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, marginTop: spacing.md },
  emptyBody: { textAlign: 'center' },
});
