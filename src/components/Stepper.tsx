import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Body, Display } from './Text';
import { colors, radius } from '../theme';

/** Big vertical +/- stepper used in the focus-mode workout logger. */
export function Stepper({
  label,
  value,
  step = 1,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.col}>
      <Body color={colors.textFaint} size={12} style={styles.cap}>{label}</Body>
      <View style={styles.box}>
        <Pressable hitSlop={10} onPress={() => onChange(value + step)}>
          <Body color={colors.coral} size={26}>＋</Body>
        </Pressable>
        <Display size={36}>{value}</Display>
        <Pressable hitSlop={10} onPress={() => onChange(Math.max(min, value - step))}>
          <Body color={colors.lineStrong} size={26}>－</Body>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: 'center' },
  cap: { marginBottom: 4, letterSpacing: 0.5 },
  box: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.lg - 2,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
});
