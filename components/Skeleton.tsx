import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../utils/theme';

/**
 * Loading placeholders shared across screens (spec 08: loading state for every
 * list/detail screen; spec 06: skeletons for the metrics fan-out). The shimmer
 * is a single opacity pulse driven by the native driver — it animates on the UI
 * thread, not by re-rendering in a loop.
 */

/** A single shimmering block. Size/shape via `style`. */
export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { opacity }, style]} />;
}

/** Placeholder for a hero/summary card (e.g. the weekly ring, a chart card). */
export function SkeletonCard({ height = 120, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <SkeletonBlock style={[{ height, borderRadius: radius.md }, style]} />;
}

/** Placeholder for a single list row. */
export function SkeletonRow({ height = 58, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <SkeletonBlock style={[{ height, borderRadius: radius.md }, style]} />;
}

/** A stack of `count` row placeholders (the common list-loading state). */
export function SkeletonList({
  count = 3,
  rowHeight = 58,
  gap = spacing.md,
}: {
  count?: number;
  rowHeight?: number;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} height={rowHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.line,
    borderRadius: radius.sm,
  },
});
