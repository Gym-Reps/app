import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body } from '../components/Text';
import { Header } from '../components/Header';
import { Pill } from '../components/Pill';
import { colors, radius } from '../theme';
import { useNav } from '../navigation';
import { workouts, exerciseName, WorkoutSet } from '../data/mock';

type SetRow = { setNumber: number; prev?: WorkoutSet; now?: WorkoutSet; delta: string; tone: 'good' | 'bad' | 'flat' };

function fmt(s?: WorkoutSet) {
  return s ? `${s.weight}×${s.reps}` : '—';
}

/** Aligns prev/now sets by setNumber and labels the per-set delta. */
function diffExercise(exId: string) {
  const now = workouts[0].sets.filter((s) => s.exerciseId === exId);
  const prev = workouts[1].sets.filter((s) => s.exerciseId === exId);
  const count = Math.max(now.length, prev.length);
  const rows: SetRow[] = [];
  for (let i = 0; i < count; i++) {
    const n = now[i];
    const p = prev[i];
    let delta = '=';
    let tone: SetRow['tone'] = 'flat';
    if (n && p) {
      if (n.weight !== p.weight) {
        const d = n.weight - p.weight;
        delta = `${d > 0 ? '+' : ''}${d}kg`;
        tone = d > 0 ? 'good' : 'bad';
      } else if (n.reps !== p.reps) {
        const d = n.reps - p.reps;
        delta = `${d > 0 ? '+' : ''}${d}r`;
        tone = d > 0 ? 'good' : 'bad';
      }
    }
    rows.push({ setNumber: i + 1, prev: p, now: n, delta, tone });
  }
  // summary = change in top weight
  const topNow = Math.max(...now.map((s) => s.weight));
  const topPrev = Math.max(...prev.map((s) => s.weight));
  const d = topNow - topPrev;
  const summary = d === 0 ? '=' : `${d > 0 ? '+' : ''}${d}kg`;
  const summaryTone: 'good' | 'bad' | 'neutral' = d > 0 ? 'good' : d < 0 ? 'bad' : 'neutral';
  return { rows, summary, summaryTone };
}

export function CompareScreen() {
  const { goBack } = useNav();
  const exIds = useMemo(
    () => Array.from(new Set(workouts[0].sets.map((s) => s.exerciseId))),
    []
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ ohp: true });

  return (
    <Screen>
      <Header title="Set-by-set" onBack={goBack} />
      <Body color={colors.textFaint} size={13} style={styles.sub}>
        {workouts[0].performedAt} vs {workouts[1].performedAt}
      </Body>

      <View style={styles.list}>
        {exIds.map((id) => {
          const { rows, summary, summaryTone } = diffExercise(id);
          const open = !!expanded[id];
          return (
            <Pressable key={id} onPress={() => setExpanded((e) => ({ ...e, [id]: !e[id] }))}>
              <View style={[styles.row, open && styles.rowOpen]}>
                <View style={styles.rowHead}>
                  <Body size={16}>{exerciseName(id)}</Body>
                  <View style={styles.rowRight}>
                    {summary !== '=' ? (
                      <Pill label={summary} tone={summaryTone === 'good' ? 'good' : 'bad'} size={13} />
                    ) : (
                      <Body color={colors.textGhost} size={14}>=</Body>
                    )}
                    <Body color="#bbb" size={14}>{open ? '⌃' : '⌄'}</Body>
                  </View>
                </View>

                {open && (
                  <View style={styles.table}>
                    <View style={styles.theadRow}>
                      <Body color={colors.textGhost} size={11} style={styles.cSet}>set</Body>
                      <Body color={colors.textGhost} size={11} style={styles.cMid}>prev</Body>
                      <Body color={colors.textGhost} size={11} style={styles.cMid}>now</Body>
                      <Body color={colors.textGhost} size={11} style={styles.cDelta}>Δ</Body>
                    </View>
                    {rows.map((r) => (
                      <View key={r.setNumber} style={styles.trow}>
                        <Body color={colors.textFaint} size={13} style={styles.cSet}>{r.setNumber}</Body>
                        <Body color={colors.textFaint} size={13} style={styles.cMid}>{fmt(r.prev)}</Body>
                        <Body size={13} style={styles.cMid}>{fmt(r.now)}</Body>
                        <Body
                          size={13}
                          style={styles.cDelta}
                          color={r.tone === 'good' ? colors.good : r.tone === 'bad' ? colors.bad : '#bbb'}
                        >
                          {r.delta}
                        </Body>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Body color={colors.textGhost} size={12} style={styles.hint}>
        Tap any exercise to expand its sets
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: 6, marginBottom: 14 },
  list: { gap: 12 },
  row: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
  },
  rowOpen: { borderColor: colors.ink },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  table: { marginTop: 10 },
  theadRow: { flexDirection: 'row', paddingBottom: 6 },
  trow: { flexDirection: 'row', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cSet: { width: 34 },
  cMid: { flex: 1, textAlign: 'center' },
  cDelta: { width: 46, textAlign: 'right' },
  hint: { textAlign: 'center', marginTop: 16 },
});
