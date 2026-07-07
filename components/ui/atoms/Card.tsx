import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, hardShadow } from '../../../utils/theme';

/**
 * Bordered surface. `strong` = the 2px ink border + offset shadow hero card;
 * default = a light hairline card. `tint` fills with the soft pink.
 */
export function Card({
  children,
  strong = false,
  tint = false,
  shadow = false,
  style,
}: {
  children: React.ReactNode;
  strong?: boolean;
  tint?: boolean;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.card,
        strong ? styles.strong : styles.light,
        tint && { backgroundColor: colors.pinkTint },
        shadow && hardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
  },
  strong: { borderWidth: 2, borderColor: colors.ink },
  light: { borderWidth: 1.5, borderColor: colors.line },
});
