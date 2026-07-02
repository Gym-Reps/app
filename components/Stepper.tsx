import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { Body, Display } from './Text';
import { colors, radius, font } from '../utils/theme';

/** Number → editable text (kept as a helper so formatting stays in one place). */
function fmt(n: number): string {
  return String(n);
}

/**
 * Big vertical +/- stepper used in the focus-mode workout logger. Pass
 * `editable` to also let the user type the value directly (parsed on change).
 */
export function Stepper({
  label,
  value,
  step = 1,
  min = 0,
  editable = false,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  editable?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.col}>
      <Body color={colors.textFaint} size={12} style={styles.cap}>{label}</Body>
      <View style={styles.box}>
        <Pressable hitSlop={10} onPress={() => onChange(value + step)}>
          <Body color={colors.coral} size={26}>＋</Body>
        </Pressable>
        {editable ? (
          <NumberField value={value} min={min} onChange={onChange} />
        ) : (
          <Display size={36}>{value}</Display>
        )}
        <Pressable hitSlop={10} onPress={() => onChange(Math.max(min, value - step))}>
          <Body color={colors.lineStrong} size={26}>－</Body>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * A number the user can type. Keeps local text while editing (so partial input
 * like an empty box or a trailing "." isn't clobbered) and commits a parsed,
 * `min`-clamped number to the parent as they go.
 */
export function NumberField({
  value,
  min = 0,
  onChange,
  style,
}: {
  value: number;
  min?: number;
  onChange: (v: number) => void;
  style?: object;
}) {
  const [text, setText] = useState(fmt(value));

  // Reflect external changes (e.g. the +/- buttons) unless they already agree.
  useEffect(() => {
    const parsed = parseFloat(text.replace(',', '.'));
    if (parsed !== value) setText(fmt(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextInput
      style={[styles.input, style]}
      value={text}
      onChangeText={(t) => {
        setText(t);
        const n = parseFloat(t.replace(',', '.'));
        if (!Number.isNaN(n)) onChange(Math.max(min, n));
      }}
      onBlur={() => setText(fmt(value))}
      keyboardType="decimal-pad"
      selectTextOnFocus
    />
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
  input: {
    fontFamily: font.display,
    fontSize: 36,
    lineHeight: 40,
    color: colors.ink,
    padding: 0,
    minWidth: 60,
    textAlign: 'center',
  },
});
