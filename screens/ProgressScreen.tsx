import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Sparkline } from '../components/Charts';
import { colors } from '../utils/theme';
import { useRouter } from 'expo-router';
import { progressByExercise, exerciseName } from '../data/mock';

export function ProgressScreen() {
  const router = useRouter();
  const ids = Object.keys(progressByExercise);

  return (
    <Screen>
      <View style={styles.head}>
        <Display size={28}>Progress</Display>
        <Body color={colors.textFaint} size={13}>Trends per exercise · tap to drill in</Body>
      </View>

      {ids.map((id, i) => {
        const p = progressByExercise[id];
        const trend = p.gain > 4 ? colors.good : p.gain > 0 ? colors.flat : colors.bad;
        const label = p.gain > 4 ? `+${p.gain}kg` : p.gain > 0 ? 'flat' : `${p.gain}kg`;
        return (
          <Pressable key={id} onPress={() => router.push({ pathname: '/progress-detail', params: { exerciseId: id } })}>
            <View style={[styles.row, i === ids.length - 1 && styles.last]}>
              <Body size={15} style={styles.name}>{exerciseName(id)}</Body>
              <Sparkline data={p.points} color={trend} />
              <Body size={13} color={trend} style={styles.delta}>{label}</Body>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
    paddingVertical: 10,
  },
  last: { borderBottomWidth: 0 },
  name: { flex: 1 },
  delta: { width: 56, textAlign: 'right' },
});
