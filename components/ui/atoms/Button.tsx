import React from 'react';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, hardShadowStrong } from '../../../utils/theme';
import { Body } from './Text';

type Variant = 'primary' | 'success' | 'outline' | 'danger';

const FILLS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.coral, fg: '#fff', border: colors.ink },
  success: { bg: colors.good, fg: '#fff', border: colors.ink },
  outline: { bg: 'transparent', fg: colors.coral, border: '#e0a3a3' },
  danger: { bg: 'transparent', fg: colors.bad, border: '#e0a3a3' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Shows a pending state (dimmed, non-interactive) — pair with a "…" label. */
  loading?: boolean;
}) {
  const c = FILLS[variant];
  const filled = variant === 'primary' || variant === 'success';
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: c.bg, borderColor: c.border },
        filled && hardShadowStrong,
        pressed && !inactive && { transform: [{ translateX: 1 }, { translateY: 1 }], shadowOpacity: 0 },
        inactive && styles.inactive,
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon != null && <Body color={c.fg} size={17} style={styles.icon}>{icon}</Body>}
        <Body color={c.fg} size={17}>{label}</Body>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  inactive: { opacity: 0.6 },
});
