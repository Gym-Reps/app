import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Screen } from '../components/Screen';
import { Body } from '../components/Text';
import { Header } from '../components/Header';
import { colors, radius, font } from '../theme';
import { useNav } from '../navigation';
import { templates, exercises, exerciseName } from '../data/mock';

type Row = { key: string; exerciseId: string; min: number; max: number };

let uid = 0;
const newKey = () => `row-${uid++}`;

export function CreateTemplateScreen() {
  const { goBack, current } = useNav();
  const templateId = current.params?.templateId as string | undefined;
  const source = templates.find((t) => t.id === templateId);

  const [title, setTitle] = useState(source ? `${source.title} ${source.emoji}` : '');
  const [rows, setRows] = useState<Row[]>(
    source
      ? source.exercises.map((e) => ({ key: newKey(), exerciseId: e.exerciseId, min: e.minReps, max: e.maxReps }))
      : [{ key: newKey(), exerciseId: 'bench', min: 8, max: 12 }]
  );

  const setReps = (key: string, field: 'min' | 'max', value: string) => {
    const n = parseInt(value.replace(/\D/g, ''), 10);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: isNaN(n) ? 0 : n } : r)));
  };

  const remove = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const addExercise = () => {
    const used = new Set(rows.map((r) => r.exerciseId));
    const nextEx = exercises.find((e) => !used.has(e.id)) ?? exercises[0];
    setRows((rs) => [...rs, { key: newKey(), exerciseId: nextEx.id, min: nextEx.minReps, max: nextEx.maxReps }]);
  };

  return (
    <Screen>
      <Header
        title={source ? 'Edit template' : 'New template'}
        onBack={goBack}
        right={
          <Pressable onPress={goBack} hitSlop={10}>
            <Body color={colors.coral} size={14}>Save</Body>
          </Pressable>
        }
      />

      <TextInput
        style={styles.titleInput}
        placeholder="Template name"
        placeholderTextColor={colors.placeholder}
        value={title}
        onChangeText={setTitle}
      />

      <Body color={colors.textFaint} size={13} style={styles.label}>Exercises</Body>

      <View style={styles.list}>
        {rows.map((r) => (
          <View key={r.key} style={styles.exCard}>
            <View style={styles.exHead}>
              <Body size={16}>⠿ {exerciseName(r.exerciseId)}</Body>
              <Pressable onPress={() => remove(r.key)} hitSlop={10}>
                <Body color="#bbb" size={15}>✕</Body>
              </Pressable>
            </View>
            <View style={styles.repsRow}>
              <Body color={colors.textMuted} size={13}>Reps</Body>
              <TextInput
                style={styles.repBox}
                value={String(r.min)}
                onChangeText={(t) => setReps(r.key, 'min', t)}
                keyboardType="numeric"
                maxLength={2}
              />
              <Body color={colors.textMuted} size={13}>–</Body>
              <TextInput
                style={styles.repBox}
                value={String(r.max)}
                onChangeText={(t) => setReps(r.key, 'max', t)}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
        ))}

        <Pressable onPress={addExercise}>
          <View style={styles.add}>
            <Body color={colors.coral} size={15}>+ Add exercise</Body>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleInput: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: colors.placeholder,
    borderStyle: 'dashed',
    borderRadius: radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font.body,
    fontSize: 16,
    color: colors.text,
  },
  label: { marginTop: 14, marginBottom: 8 },
  list: { gap: 14 },
  exCard: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: 12,
    gap: 10,
  },
  exHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  repBox: {
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 44,
    textAlign: 'center',
    fontFamily: font.body,
    fontSize: 15,
    color: colors.text,
  },
  add: {
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
