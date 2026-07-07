import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body } from './Text';
import { colors, spacing } from '../../../utils/theme';
import { useIsOnline } from '../../../lib/netinfo';

/**
 * App-wide offline indicator (specs/08_CROSS_CUTTING.md). Pinned above the tab
 * bar so it never collides with top-anchored toasts. Pairs with the Home
 * pending-sync badge: this says "you're offline", that says "N waiting to sync".
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { paddingBottom: insets.bottom + spacing.sm }]}
    >
      <Body size={13} color="#fff" style={styles.text}>
        You’re offline — changes will sync when you reconnect.
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    elevation: 90,
    backgroundColor: colors.ink,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: { textAlign: 'center' },
});
