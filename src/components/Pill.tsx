import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Body } from './Text';
import { colors, radius } from '../theme';

type Tone = 'neutral' | 'good' | 'bad' | 'dark' | 'ghost';

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: 'transparent', fg: colors.textMuted, border: colors.lineStrong },
  good: { bg: colors.goodBg, fg: colors.goodText, border: colors.goodBorder },
  bad: { bg: colors.badBg, fg: colors.bad, border: colors.badBorder },
  dark: { bg: colors.ink, fg: '#fff', border: colors.ink },
  ghost: { bg: colors.pinkTint, fg: colors.ink, border: colors.ink },
};

export function Pill({
  label,
  tone = 'neutral',
  size = 13,
  style,
}: {
  label: string;
  tone?: Tone;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      <Body color={t.fg} size={size}>{label}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
});
