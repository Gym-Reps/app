import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { colors, radius } from '../theme';
import { useNav } from '../navigation';
import { templates, exerciseName } from '../data/mock';

export function TemplatesScreen() {
  const { navigate } = useNav();
  return (
    <Screen>
      <View style={styles.head}>
        <Display size={28}>Templates</Display>
        <Body color={colors.textFaint} size={13}>Reusable workout plans</Body>
      </View>

      <View style={styles.list}>
        {templates.map((t) => (
          <Pressable key={t.id} onPress={() => navigate('createTemplate', { templateId: t.id })}>
            <Card strong shadow style={styles.card}>
              <View style={styles.cardHead}>
                <Display size={24}>{t.title} {t.emoji}</Display>
                <Body color={colors.textFaint} size={12}>~{t.estMinutes} min</Body>
              </View>
              <View style={styles.chips}>
                {t.exercises.map((e) => (
                  <Pill key={e.exerciseId} label={exerciseName(e.exerciseId)} tone="neutral" size={12} />
                ))}
              </View>
              <Body color={colors.textFaint} size={12}>{t.exercises.length} exercises</Body>
            </Card>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => navigate('createTemplate')}>
        <View style={styles.add}>
          <Body color={colors.coral} size={15}>+ New template</Body>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 16 },
  list: { gap: 14 },
  card: { gap: 10 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  add: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
