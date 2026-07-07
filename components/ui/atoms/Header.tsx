import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Body, Display } from './Text';
import { colors } from '../../../utils/theme';

/** Top row with a back/close affordance, a title, and an optional right slot. */
export function Header({
  title,
  onBack,
  back = '←',
  right,
}: {
  title: string;
  onBack?: () => void;
  back?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      {onBack != null ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.side}>
          <Body size={22}>{back}</Body>
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
      <Display size={22} numberOfLines={1} style={styles.title}>{title}</Display>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  side: { width: 56, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', color: colors.ink },
});
