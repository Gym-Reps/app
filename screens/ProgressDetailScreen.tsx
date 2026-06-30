import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { LineChart } from '../components/Charts';
import { colors, radius } from '../utils/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { progressByExercise, exerciseName, workouts } from '../data/mock';

const METRICS = ['Top weight', '1RM est', 'Volume'] as const;

/** Recent per-session summary for one exercise, e.g. "60 × 12,10,8". */
function recentSessions(exId: string) {
  return workouts
    .filter((w) => w.sets.some((s) => s.exerciseId === exId))
    .map((w) => {
      const sets = w.sets.filter((s) => s.exerciseId === exId);
      const top = Math.max(...sets.map((s) => s.weight));
      const reps = sets.map((s) => s.reps).join(',');
      return { date: w.performedAt, summary: `${top} × ${reps}` };
    });
}

export function ProgressDetailScreen() {
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const exId = exerciseId ?? 'bench';
  const p = progressByExercise[exId] ?? progressByExercise.bench;
  const [metric, setMetric] = useState(0);
  const sessions = recentSessions(exId);

  return (
    <Screen>
      <Header title={exerciseName(exId)} onBack={() => router.back()} />

      <View style={styles.tabs}>
        {METRICS.map((m, i) => {
          const active = i === metric;
          return (
            <View
              key={m}
              style={[styles.tab, active ? styles.tabActive : styles.tabIdle]}
              onTouchEnd={() => setMetric(i)}
            >
              <Body size={13} color={active ? '#fff' : colors.textFaint}>{m}</Body>
            </View>
          );
        })}
      </View>

      <Card style={styles.chartCard}>
        <LineChart data={p.points} months={p.months} />
      </Card>

      <View style={styles.statRow}>
        <Card strong style={styles.statCard}>
          <Body color={colors.textFaint} size={12}>PR</Body>
          <Display size={26}>{p.pr} kg</Display>
        </Card>
        <Card strong style={styles.statCard}>
          <Body color={colors.textFaint} size={12}>+ since {p.months[0]}</Body>
          <Display size={26} color={colors.good}>+{p.gain} kg</Display>
        </Card>
      </View>

      <Body color={colors.textFaint} size={13} style={styles.recentLabel}>Recent sessions</Body>
      {sessions.map((s, i) => (
        <View key={s.date} style={[styles.session, i === sessions.length - 1 && styles.lastSession]}>
          <Body size={14}>{s.date}</Body>
          <Body color={colors.textFaint} size={14}>{s.summary}</Body>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tab: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  tabActive: { backgroundColor: colors.ink },
  tabIdle: { borderWidth: 1.5, borderColor: colors.lineStrong },
  chartCard: { marginTop: 14, paddingHorizontal: 10, paddingTop: 14, paddingBottom: 8 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1 },
  recentLabel: { marginTop: 16, marginBottom: 4 },
  session: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
    paddingVertical: 8,
  },
  lastSession: { borderBottomWidth: 0 },
});
