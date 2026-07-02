import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Pill } from '../components/Pill';
import { Stepper } from '../components/Stepper';
import { colors, radius } from '../utils/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../utils/auth';
import { usePreferences } from '../api/queries/preferences';
import { useUpdatePreferences } from '../api/mutations/preferences';
import type { Preferences } from '../api/schemas/preferences';

const WEIGHT_LABEL: Record<Preferences['weightUnit'], string> = {
  kg: 'Kilograms (kg)',
  lb: 'Pounds (lb)',
};
const LENGTH_LABEL: Record<Preferences['lengthUnit'], string> = {
  meters: 'Metric (m / cm)',
  inches: 'Imperial (in)',
};

const GOAL_MIN = 1;
const GOAL_MAX = 14;
const DEFAULT_GOAL = 3;

export function ProfileScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const prefs = usePreferences();
  const updatePrefs = useUpdatePreferences();

  // No user profile endpoint yet (see specs/01_AUTH.md); the JWT only carries id
  // + role. Show honest session info rather than a fabricated name/email.
  const roleLabel = user ? cap(user.role.toLowerCase()) : 'Member';

  return (
    <Screen footer={<Button label="Log out" icon="⎋" variant="danger" onPress={signOut} />}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Display size={30} color="#fff">💪</Display>
        </View>
        <Display size={26}>Your account</Display>
        <Body color={colors.textFaint} size={13}>{roleLabel} · REPS</Body>
      </View>

      {prefs.isLoading ? (
        <View style={[styles.card, styles.skeleton]} />
      ) : prefs.isError ? (
        <Card style={styles.section}>
          <Body color={colors.bad} size={14}>{prefs.error.message || 'Could not load preferences'}</Body>
          <Button label="Retry" variant="outline" onPress={() => prefs.refetch()} />
        </Card>
      ) : prefs.data ? (
        <>
          <GoalEditor
            current={prefs.data.weeklyTrainingCount}
            saving={updatePrefs.isPending}
            error={updatePrefs.isError ? updatePrefs.error.message : undefined}
            onSave={(goal) => updatePrefs.mutate({ weeklyTrainingCount: goal })}
            onClear={() => updatePrefs.mutate({ weeklyTrainingCount: null })}
          />

          <Body color={colors.textFaint} size={13} style={styles.sectionLabel}>Preferences</Body>
          <View style={styles.menu}>
            <InfoRow label="⚖️  Weight unit" value={WEIGHT_LABEL[prefs.data.weightUnit]} />
            <InfoRow label="📏  Length unit" value={LENGTH_LABEL[prefs.data.lengthUnit]} />
            <InfoRow label="🎨  Theme" value={cap(prefs.data.theme)} last />
          </View>
        </>
      ) : null}

      <Body color={colors.textFaint} size={13} style={styles.sectionLabel}>Account</Body>
      <View style={styles.menu}>
        <Pressable onPress={() => router.push('/change-password')} style={[styles.menuRow, styles.lastRow]}>
          <Body size={15}>🔒  Change password</Body>
          <Body color="#bbb" size={18}>›</Body>
        </Pressable>
      </View>
    </Screen>
  );
}

/** Weekly training goal editor (int 1–14, or null = no goal). */
function GoalEditor({
  current,
  saving,
  error,
  onSave,
  onClear,
}: {
  current: number | null;
  saving: boolean;
  error?: string;
  onSave: (goal: number) => void;
  onClear: () => void;
}) {
  const [goal, setGoal] = useState<number>(current ?? DEFAULT_GOAL);

  // Sync local editor with the server value when it (re)loads or changes.
  useEffect(() => {
    setGoal(current ?? DEFAULT_GOAL);
  }, [current]);

  const dirty = goal !== current;

  return (
    <Card strong style={styles.section}>
      <View style={styles.goalHead}>
        <Body color={colors.textFaint} size={12}>WEEKLY GOAL</Body>
        {current == null ? (
          <Pill label="not set" tone="neutral" size={12} />
        ) : (
          <Pill label={`${current}/week`} tone="ghost" size={12} />
        )}
      </View>

      <View style={styles.goalBody}>
        <Stepper
          label="workouts / week"
          value={goal}
          min={GOAL_MIN}
          onChange={(v) => setGoal(Math.min(GOAL_MAX, Math.max(GOAL_MIN, v)))}
        />
      </View>

      {error != null && <Body color={colors.bad} size={13}>{error}</Body>}

      <View style={styles.goalActions}>
        <Button
          label={saving ? 'Saving…' : dirty ? 'Save goal' : 'Saved'}
          onPress={() => !saving && dirty && onSave(goal)}
          style={styles.goalBtn}
        />
        {current != null && (
          <Button label="Clear" variant="outline" onPress={() => !saving && onClear()} style={styles.goalBtn} />
        )}
      </View>
    </Card>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.menuRow, last && styles.lastRow]}>
      <Body size={15}>{label}</Body>
      <Body color={colors.textFaint} size={15}>{value}</Body>
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 4, marginTop: 8 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  card: { borderRadius: radius.md },
  skeleton: { height: 180, backgroundColor: colors.line, marginTop: 20 },
  section: { marginTop: 20, gap: 12 },
  goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalBody: { alignItems: 'center' },
  goalActions: { flexDirection: 'row', gap: 10 },
  goalBtn: { flex: 1 },
  sectionLabel: { marginTop: 20, marginBottom: 8 },
  menu: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
  },
  lastRow: { borderBottomWidth: 0 },
});
