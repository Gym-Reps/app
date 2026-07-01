import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Stepper } from '../components/Stepper';
import { colors, radius, spacing } from '../utils/theme';
import { useRouter } from 'expo-router';
import {
  useActiveTrainment,
  type ActiveExercise,
} from '../stores/activeTrainment';
import { useSyncQueueStore } from '../stores/syncQueue';
import { ZSyncPayload, checkInvariants } from '../api/schemas/sync';
import { syncTrainment } from '../api/services/sync';
import { isOnline } from '../lib/netinfo';
import { queryClient } from '../api/queryClient';

/**
 * The live workout session (`specs/05_REGISTER_TRAINMENT.md`). Fully functional
 * offline: every add/edit/remove writes to the persisted `activeTrainment` store
 * (which keeps the set-count invariant), and only Finish touches the network.
 */
export function LogWorkoutScreen() {
  const router = useRouter();

  const active = useActiveTrainment((s) => s.active);
  const addSet = useActiveTrainment((s) => s.addSet);
  const editSet = useActiveTrainment((s) => s.editSet);
  const removeSet = useActiveTrainment((s) => s.removeSet);
  const finish = useActiveTrainment((s) => s.finish);
  const clear = useActiveTrainment((s) => s.clear);
  const enqueue = useSyncQueueStore((s) => s.enqueue);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // No session in progress (e.g. opened directly) — offer a way out.
  if (!active) {
    return (
      <Screen>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Body size={22}>✕</Body>
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Display size={26}>No active workout</Display>
          <Body color={colors.textFaint} size={14} style={styles.emptyHint}>
            Start one from a template to begin logging sets.
          </Body>
          <Button label="Back to templates" onPress={() => router.back()} style={styles.emptyBtn} />
        </View>
      </Screen>
    );
  }

  const onFinish = async () => {
    if (submitting) return; // guard duplicate taps
    setError(null);

    const payload = finish();
    if (!payload) return;

    // Block Finish if any exercise has no sets (can't satisfy the count invariant).
    if (payload.exercises.some((e) => e.sets.length === 0)) {
      setError('Every exercise needs at least one set before finishing.');
      return;
    }

    // Local validation BEFORE any network / enqueue → never a guaranteed 409.
    const parsed = ZSyncPayload.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'This workout is not valid to save.');
      return;
    }
    const invariant = checkInvariants(payload);
    if (invariant) {
      setError(invariant);
      return;
    }

    setSubmitting(true);
    try {
      if (await isOnline()) {
        const res = await syncTrainment(payload);
        if (res.ok) {
          clear();
          queryClient.invalidateQueries({ queryKey: ['trainments'] });
          queryClient.invalidateQueries({ queryKey: ['weekly-progress'] });
          router.back();
          return;
        }
        // fall through: online attempt failed → park it for the poller
      }
      enqueue(payload);
      clear();
      router.back();
      Alert.alert('Saved offline', 'This workout will sync when you’re back online.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDiscard = () => {
    Alert.alert('Discard workout?', 'This in-progress session will be lost.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          clear();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {error != null && (
            <Body color={colors.bad} size={13} style={styles.error}>
              {error}
            </Body>
          )}
          <Button
            label={submitting ? 'Saving…' : 'Finish ✓'}
            variant="success"
            onPress={onFinish}
          />
        </View>
      }
    >
      <View style={styles.top}>
        <Pressable onPress={confirmDiscard} hitSlop={12}>
          <Body size={22}>✕</Body>
        </Pressable>
        <Display size={24}>Workout</Display>
        <View style={{ width: 22 }} />
      </View>

      {active.exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          onAdd={() => addSet(ex.id)}
          onEdit={(index, patch) => editSet(ex.id, index, patch)}
          onRemove={(index) => removeSet(ex.id, index)}
        />
      ))}
    </Screen>
  );
}

function ExerciseCard({
  exercise,
  onAdd,
  onEdit,
  onRemove,
}: {
  exercise: ActiveExercise;
  onAdd: () => void;
  onEdit: (index: number, patch: { weight?: number; repetitions?: number }) => void;
  onRemove: (index: number) => void;
}) {
  // Target rep range from the first planned entry (display only).
  const firstPlan = exercise.plannedSets['1'];
  const target =
    firstPlan && firstPlan.min_reps != null && firstPlan.max_reps != null
      ? `target ${firstPlan.min_reps}–${firstPlan.max_reps} reps`
      : null;

  return (
    <Card style={styles.exCard}>
      <Display size={26} style={styles.exName}>
        {exercise.title}
      </Display>
      {target != null && (
        <Body color={colors.textFaint} size={13}>
          {target}
        </Body>
      )}

      {exercise.sets.map((s) => (
        <View key={s.id} style={styles.setBlock}>
          <View style={styles.setHead}>
            <Body color={colors.textMuted} size={14}>
              Set {s.index}
            </Body>
            <Pressable onPress={() => onRemove(s.index)} hitSlop={10}>
              <Body color={colors.bad} size={14}>
                Remove ✕
              </Body>
            </Pressable>
          </View>
          <View style={styles.steppers}>
            <Stepper
              label="WEIGHT (kg)"
              value={s.weight ?? 0}
              step={2.5}
              onChange={(v) => onEdit(s.index, { weight: v })}
            />
            <Stepper
              label="REPS"
              value={s.repetitions ?? 0}
              step={1}
              onChange={(v) => onEdit(s.index, { repetitions: v })}
            />
          </View>
        </View>
      ))}

      <Button label="Add set" variant="outline" icon="＋" onPress={onAdd} style={styles.addBtn} />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  empty: { alignItems: 'center', marginTop: spacing.xxl * 2, gap: spacing.sm },
  emptyHint: { textAlign: 'center' },
  emptyBtn: { marginTop: spacing.lg, alignSelf: 'stretch' },
  exCard: { marginBottom: spacing.lg, gap: spacing.sm },
  exName: { lineHeight: 30 },
  setBlock: {
    borderTopWidth: 1.5,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  setHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  steppers: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  addBtn: { marginTop: spacing.xs },
  footer: { gap: spacing.sm },
  error: { textAlign: 'center' },
});
