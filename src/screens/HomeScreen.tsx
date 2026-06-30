import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { Button } from '../components/Button';
import { colors, radius } from '../theme';
import { useNav } from '../navigation';
import { homeStats, templates, exerciseName } from '../data/mock';

export function HomeScreen() {
  const { navigate } = useNav();
  const next = templates[0]; // "Push Day"
  const chips = next.exercises.slice(0, 3).map((e) => exerciseName(e.exerciseId).split(' ')[0]);
  const extra = next.exercises.length - chips.length;

  return (
    <Screen>
      {/* Greeting + streak */}
      <View style={styles.greetRow}>
        <View>
          <Display size={26}>Hey {homeStats.name} 👋</Display>
          <Body color={colors.textFaint} size={13}>{homeStats.date}</Body>
        </View>
        <Pill label={`🔥 ${homeStats.streak}`} tone="ghost" size={14} />
      </View>

      {/* NEXT UP hero */}
      <Card strong shadow style={styles.hero}>
        <Body color={colors.textFaint} size={12} style={styles.kicker}>NEXT UP</Body>
        <View style={styles.heroTitleRow}>
          <Display size={28}>{next.title} {next.emoji}</Display>
          <Body color={colors.textFaint} size={12}>~{next.estMinutes} min</Body>
        </View>
        <View style={styles.chips}>
          {chips.map((c) => (
            <Pill key={c} label={c} tone="neutral" size={12} />
          ))}
          {extra > 0 && <Pill label={`+${extra}`} tone="neutral" size={12} />}
        </View>
        <Button label="Start workout" icon="▶" onPress={() => navigate('logWorkout', { templateId: next.id })} />
      </Card>

      {/* Week strip */}
      <View style={styles.strip}>
        <StatCell value={`${homeStats.sessionsDone}`} suffix={`/${homeStats.sessionsGoal}`} label="sessions" />
        <StatCell value={`${homeStats.volumeTons}t`} label="volume" />
        <StatCell value={`${homeStats.prs}`} label="PRs" valueColor={colors.good} />
      </View>

      {/* Last session recap */}
      <Body color={colors.textFaint} size={13} style={styles.sectionLabel}>Last session</Body>
      <Pressable onPress={() => navigate('compare')}>
        <Card style={styles.recap}>
          <View>
            <Body size={15}>Push Day · Jun 10</Body>
            <Body color={colors.good} size={12}>beat last Bench by +5 kg 🎉</Body>
          </View>
          <Body color="#bbb" size={18}>›</Body>
        </Card>
      </Pressable>
    </Screen>
  );
}

function StatCell({
  value,
  suffix,
  label,
  valueColor,
}: {
  value: string;
  suffix?: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.cell}>
      <Display size={22} color={valueColor}>
        {value}
        {suffix != null && <Body color={colors.textFaint} size={13}>{suffix}</Body>}
      </Display>
      <Body color={colors.textFaint} size={11}>{label}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { marginTop: 16, gap: 11 },
  kicker: { letterSpacing: 0.5 },
  heroTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  strip: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cell: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sectionLabel: { marginTop: 16, marginBottom: 8 },
  recap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
