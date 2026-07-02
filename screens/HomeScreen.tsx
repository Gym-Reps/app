import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { Button } from '../components/Button';
import { ProgressRing } from '../components/Charts';
import { SkeletonCard, SkeletonRow } from '../components/Skeleton';
import { colors, spacing } from '../utils/theme';
import { useTrainments, useWeeklyProgress } from '../api/queries/trainment';
import { useTemplates } from '../api/queries/template';
import { QUERY_KEYS } from '../api/queryKeys';
import type { Trainment, WeeklyProgress } from '../api/schemas/trainment';
import { usePendingCount } from '../stores/syncQueue';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jun 10, 14:30" from an ISO string (local time, deterministic — no Intl dep). */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toTimeString().slice(0, 5);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${time}`;
}

export function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const weekly = useWeeklyProgress();
  const trainments = useTrainments();
  // Load templates so a trainment can be labelled with its template title. Read
  // reactively (not via getQueryData) so titles fill in once the list arrives.
  const templates = useTemplates();
  const pendingSync = usePendingCount();

  const rows = trainments.data?.pages.flatMap((p) => p.trainments) ?? [];

  /** Join a trainment to its template title via the `['templates']` list. */
  const titleFor = useCallback(
    (t: Trainment): string => {
      const match = templates.data?.find((c) => c.id === t.trainmentTemplateId);
      return match?.title ?? t.title ?? 'Workout';
    },
    [templates.data]
  );

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.WEEKLY_PROGRESS() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.TRAINMENTS() });
  }, [qc]);

  const refreshing = weekly.isRefetching || trainments.isRefetching;

  const header = (
    <View>
      <Display size={26} style={styles.title}>Your week</Display>

      <WeeklyCard
        query={weekly}
        onSetGoal={() => router.push('/profile')}
        onRetry={() => weekly.refetch()}
      />

      {pendingSync > 0 && (
        <Card style={styles.pending}>
          <Body color={colors.textMuted} size={13}>
            {pendingSync === 1
              ? '1 workout waiting to sync — will upload when online.'
              : `${pendingSync} workouts waiting to sync — will upload when online.`}
          </Body>
        </Card>
      )}

      <Body color={colors.textFaint} size={13} style={styles.sectionLabel}>Latest trainments</Body>
    </View>
  );

  // Initial load → skeleton rows under the header.
  const showSkeletonRows = trainments.isLoading;

  return (
    <Screen scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <TrainmentRow
            trainment={item}
            title={titleFor(item)}
            onPress={() =>
              router.push({ pathname: '/progress-detail', params: { trainmentId: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          showSkeletonRows ? (
            <View style={styles.list}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : trainments.isError ? (
            <InlineError message={trainments.error.message} onRetry={() => trainments.refetch()} />
          ) : (
            <EmptyState onBrowse={() => router.push('/templates')} />
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (trainments.hasNextPage && !trainments.isFetchingNextPage) trainments.fetchNextPage();
        }}
        ListFooterComponent={
          trainments.isFetchingNextPage ? (
            <ActivityIndicator color={colors.coral} style={styles.footer} />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

/** Weekly progress card: ring vs. goal, or a "set a goal" hint when goal is null. */
function WeeklyCard({
  query,
  onSetGoal,
  onRetry,
}: {
  query: ReturnType<typeof useWeeklyProgress>;
  onSetGoal: () => void;
  onRetry: () => void;
}) {
  if (query.isLoading) return <SkeletonCard style={styles.weekCard} />;
  if (query.isError) {
    return (
      <Card strong style={styles.weekCard}>
        <InlineError message={query.error.message} onRetry={onRetry} />
      </Card>
    );
  }

  const data = query.data as WeeklyProgress;
  const hasGoal = data.goal != null && data.goal > 0;
  const percent = hasGoal ? Math.round(Math.min(data.completed / (data.goal as number), 1) * 100) : 0;

  return (
    <Card strong shadow style={styles.weekCard}>
      {hasGoal ? (
        <View style={styles.weekRow}>
          <ProgressRing percent={percent} />
          <View style={styles.weekText}>
            <Body color={colors.textFaint} size={12}>THIS WEEK</Body>
            <Display size={26}>
              {data.completed}
              <Body color={colors.textFaint} size={15}> / {data.goal}</Body>
            </Display>
            <Body color={data.completed >= (data.goal as number) ? colors.good : colors.textFaint} size={13}>
              {data.completed >= (data.goal as number) ? 'Goal reached 🎉' : 'workouts done'}
            </Body>
          </View>
        </View>
      ) : (
        <View style={styles.weekText}>
          <Body color={colors.textFaint} size={12}>THIS WEEK</Body>
          <Display size={26}>
            {data.completed}
            <Body color={colors.textFaint} size={15}> done</Body>
          </Display>
          <Body color={colors.textFaint} size={13} style={styles.goalHint}>
            Set a weekly goal to track your progress.
          </Body>
          <Button label="Set a goal" variant="outline" onPress={onSetGoal} />
        </View>
      )}
    </Card>
  );
}

function TrainmentRow({
  trainment,
  title,
  onPress,
}: {
  trainment: Trainment;
  title: string;
  onPress: () => void;
}) {
  const inProgress = trainment.finishedAt === null;
  const when = inProgress
    ? `Started ${formatWhen(trainment.startedAt)}`
    : `${formatWhen(trainment.startedAt)} → ${formatWhen(trainment.finishedAt as string)}`;
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Body size={15}>{title}</Body>
          <Body color={colors.textFaint} size={12}>{when}</Body>
        </View>
        {inProgress ? (
          <Pill label="in progress" tone="ghost" size={12} />
        ) : (
          <Body color="#bbb" size={18}>›</Body>
        )}
      </Card>
    </Pressable>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card style={styles.empty}>
      <Display size={22}>No workouts yet</Display>
      <Body color={colors.textFaint} size={14} style={styles.emptyBody}>
        Head to Templates and hit Start to log your first session.
      </Body>
      <Button label="Browse templates" icon="▶" onPress={onBrowse} />
    </Card>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Body color={colors.bad} size={14}>{message || 'Something went wrong'}</Body>
      <Button label="Retry" variant="outline" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  title: { marginBottom: 12 },
  weekCard: { marginBottom: 16 },
  pending: {
    marginBottom: 16,
    backgroundColor: colors.pinkTint,
    borderColor: colors.pinkStrong,
  },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  weekText: { flex: 1, gap: 6 },
  goalHint: { marginBottom: 4 },
  sectionLabel: { marginTop: 4, marginBottom: 8 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowText: { gap: 2, flex: 1 },
  footer: { paddingVertical: 16 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyBody: { textAlign: 'center' },
  errorBox: { gap: 10, alignItems: 'flex-start' },
});
