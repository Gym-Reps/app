import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Button } from '../components/Button';
import { Stepper } from '../components/Stepper';
import { colors, radius } from '../theme';
import { useNav } from '../navigation';
import { templates, exercises } from '../data/mock';

type Logged = { reps: number; weight: number };

export function LogWorkoutScreen() {
  const { goBack, current } = useNav();
  const templateId = (current.params?.templateId as string) ?? templates[0].id;
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const plan = template.exercises;

  const [idx, setIdx] = useState(0);
  const [weight, setWeight] = useState(40);
  const [reps, setReps] = useState(8);
  // logged sets per exercise index
  const [logged, setLogged] = useState<Record<number, Logged[]>>({});

  const ex = plan[idx];
  const meta = exercises.find((e) => e.id === ex.exerciseId)!;
  const sets = logged[idx] ?? [];
  const setNumber = sets.length + 1;
  const isLast = idx === plan.length - 1;

  const logSet = () => {
    setLogged((l) => ({ ...l, [idx]: [...(l[idx] ?? []), { reps, weight }] }));
  };

  const go = (delta: number) => {
    const nextIdx = Math.min(plan.length - 1, Math.max(0, idx + delta));
    setIdx(nextIdx);
  };

  return (
    <Screen
      footer={
        <View style={styles.navRow}>
          <Pressable onPress={() => go(-1)} disabled={idx === 0} hitSlop={10}>
            <Body color={idx === 0 ? colors.lineStrong : colors.coral} size={15}>‹ Prev</Body>
          </Pressable>
          <Pressable onPress={() => (isLast ? goBack() : go(1))} hitSlop={10}>
            <Body color={colors.coral} size={15}>{isLast ? 'Finish ✓' : 'Next ›'}</Body>
          </Pressable>
        </View>
      }
    >
      {/* progress header */}
      <View style={styles.top}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Body size={22}>✕</Body>
        </Pressable>
        <View style={styles.dots}>
          {plan.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i <= idx ? colors.coral : colors.track }]}
            />
          ))}
        </View>
        <Body color={colors.textFaint} size={13}>{idx + 1}/{plan.length}</Body>
      </View>

      {/* exercise focus */}
      <View style={styles.focus}>
        <Body color={colors.textFaint} size={13}>Exercise {idx + 1} of {plan.length}</Body>
        <Display size={30} style={styles.exName}>{meta.name}</Display>
        <Body color={colors.textFaint} size={13}>target {ex.minReps}–{ex.maxReps} reps</Body>
      </View>

      <Body color={colors.textFaint} size={14} style={styles.setLabel}>Set {setNumber}</Body>

      <View style={styles.steppers}>
        <Stepper label="WEIGHT (kg)" value={weight} step={2.5} onChange={setWeight} />
        <Stepper label="REPS" value={reps} step={1} onChange={setReps} />
      </View>

      <Button label="Log set & rest" icon="✓" variant="success" onPress={logSet} style={styles.logBtn} />

      {/* logged sets */}
      <View style={styles.loggedCard}>
        <Body color={colors.textMuted} size={13} style={styles.loggedTitle}>Logged sets</Body>
        {sets.length === 0 ? (
          <Body color={colors.textGhost} size={13}>No sets yet — log your first one ↑</Body>
        ) : (
          sets.map((s, i) => (
            <View key={i} style={styles.loggedRow}>
              <Body color={colors.textFaint} size={13}>Set {i + 1}</Body>
              <Body size={13}>{s.weight} kg × {s.reps}</Body>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 26, height: 6, borderRadius: 4 },
  focus: { alignItems: 'center', marginTop: 18 },
  exName: { lineHeight: 34, marginTop: 2 },
  setLabel: { textAlign: 'center', marginTop: 8 },
  steppers: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 10 },
  logBtn: { marginTop: 18 },
  loggedCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  loggedTitle: { marginBottom: 2 },
  loggedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
