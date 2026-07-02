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
import { QUERY_KEYS } from '../api/queryKeys';

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
  const logSet = useActiveTrainment((s) => s.logSet);
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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAINMENTS() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEEKLY_PROGRESS() });
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
            loading={submitting}
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
          onLog={(index) => logSet(ex.id, index)}
        />
      ))}
    </Screen>
  );
}

/** "60kg × 10" style summary of a set's last-session hint (nulls → "—"). */
function formatHint(hint: NonNullable<ActiveExercise['sets'][number]['hint']>): string {
  const w = hint.weight != null ? `${hint.weight}kg` : '—';
  const r = hint.repetitions != null ? `${hint.repetitions}` : '—';
  return `${w} × ${r}`;
}

function ExerciseCard({
  exercise,
  onAdd,
  onEdit,
  onRemove,
  onLog,
}: {
  exercise: ActiveExercise;
  onAdd: () => string;
  onEdit: (index: number, patch: { weight?: number; repetitions?: number }) => void;
  onRemove: (index: number) => void;
  onLog: (index: number) => void;
}) {
  // Target rep range from the first planned entry (display only).
  const firstPlan = exercise.plannedSets['1'];
  const target =
    firstPlan && firstPlan.min_reps != null && firstPlan.max_reps != null
      ? `target ${firstPlan.min_reps}–${firstPlan.max_reps} reps`
      : null;

  // Which set the +/- editor is bound to. Tap any row to select it; by default
  // it follows the first not-yet-logged set. Tracked by id so it survives the
  // re-indexing that add/remove trigger.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeSet =
    exercise.sets.find((s) => s.id === selectedId) ??
    exercise.sets.find((s) => !s.logged) ??
    exercise.sets[exercise.sets.length - 1];

  // "Log set ✓" only makes sense while there's still an unlogged set after the
  // one you're on (the prefill step-through); the final set just gets adjusted.
  const showLog =
    activeSet != null &&
    !activeSet.logged &&
    exercise.sets.some((s) => !s.logged && s.index > activeSet.index);

  const handleLog = () => {
    if (!activeSet) return;
    onLog(activeSet.index);
    const next = exercise.sets.find((s) => !s.logged && s.index > activeSet.index);
    setSelectedId(next ? next.id : null);
  };

  // Add one set beyond the plan and move the editor onto it. It is NOT auto-
  // confirmed — an unused trailing set is trimmed at Finish, so this can't leave
  // a phantom set behind.
  const handleAdd = () => setSelectedId(onAdd());

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

      {/* One clean list of every set; the active one is highlighted. */}
      {exercise.sets.map((s) => (
        <SetRow
          key={s.id}
          set={s}
          active={activeSet != null && s.id === activeSet.id}
          onSelect={() => setSelectedId(s.id)}
          onRemove={() => onRemove(s.index)}
        />
      ))}

      {/* The +/- editor is a single control for the highlighted set — not a set
          itself — so it lives once, below the list, never between rows. */}
      {activeSet != null && (
        <View style={styles.editor}>
          <Body color={colors.textMuted} size={13} style={styles.editorHead}>
            Adjust Set {activeSet.index}
          </Body>
          <View style={styles.steppers}>
            <Stepper
              label="WEIGHT (kg)"
              value={activeSet.weight ?? 0}
              step={2.5}
              editable
              onChange={(v) => onEdit(activeSet.index, { weight: v })}
            />
            <Stepper
              label="REPS"
              value={activeSet.repetitions ?? 0}
              step={1}
              editable
              onChange={(v) => onEdit(activeSet.index, { repetitions: v })}
            />
          </View>
          {activeSet.hint != null &&
            (activeSet.hint.weight != null || activeSet.hint.repetitions != null) && (
              <Body color={colors.textFaint} size={13} style={styles.hint}>
                last time: {formatHint(activeSet.hint)}
              </Body>
            )}
          {showLog && (
            <Button
              label="Log set ✓"
              variant="success"
              onPress={handleLog}
              style={styles.logBtn}
            />
          )}
        </View>
      )}

      <Button label="Add set" variant="outline" icon="＋" onPress={handleAdd} style={styles.addBtn} />
    </Card>
  );
}

/**
 * A grey row for a single set: its number plus weight and reps (display only —
 * editing happens in the shared +/- editor). Tap it to make it the active set;
 * the active row is highlighted, and a `logged` (confirmed) set shows a ✓.
 */
function SetRow({
  set,
  onSelect,
  onRemove,
  active = false,
}: {
  set: ActiveExercise['sets'][number];
  onSelect: () => void;
  onRemove: () => void;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onSelect} style={[styles.setRow, active && styles.setRowActive]}>
      <Body
        color={set.logged ? colors.good : colors.textMuted}
        size={14}
        style={styles.setRowIndex}
      >
        {set.logged ? '✓ ' : ''}Set {set.index}
      </Body>
      <View style={styles.setRowField}>
        <Display size={20}>{set.weight ?? 0}</Display>
        <Body color={colors.textFaint} size={13}>kg</Body>
      </View>
      <View style={styles.setRowField}>
        <Display size={20}>{set.repetitions ?? 0}</Display>
        <Body color={colors.textFaint} size={13}>reps</Body>
      </View>
      <Pressable onPress={onRemove} hitSlop={10}>
        <Body color={colors.bad} size={15}>✕</Body>
      </Pressable>
    </Pressable>
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
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.screen,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  setRowActive: { borderColor: colors.coral },
  setRowIndex: { width: 46 },
  setRowField: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4 },
  editor: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  editorHead: { textAlign: 'center', letterSpacing: 0.3 },
  steppers: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  hint: { textAlign: 'center', marginTop: spacing.xs },
  logBtn: { marginTop: spacing.sm },
  addBtn: { marginTop: spacing.xs },
  footer: { gap: spacing.sm },
  error: { textAlign: 'center' },
});
