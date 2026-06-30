import React from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme';

/**
 * Standard screen frame: warm background + safe-area padding. Pass `scroll` for
 * scrollable content, otherwise children fill the screen (for sticky footers).
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  bg = colors.screen,
  contentStyle,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  bg?: string;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? spacing.xl : 0;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { paddingHorizontal: pad, paddingTop: pad, paddingBottom: pad + spacing.lg },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, paddingHorizontal: pad, paddingTop: pad, paddingBottom: pad },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {body}
      {footer != null && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
  },
});
