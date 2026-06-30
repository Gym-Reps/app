import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Body } from './Text';
import { colors } from '../utils/theme';

/** Per-route presentation, keyed by the route file name under `app/(tabs)`. */
const META: Record<string, { icon: string; label: string }> = {
  home: { icon: '⌂', label: 'Home' },
  templates: { icon: '▤', label: 'Templates' },
  progress: { icon: '📈', label: 'Progress' },
  profile: { icon: '◔', label: 'Profile' },
};

/** Custom bottom bar rendered by the `(tabs)` layout via the `tabBar` prop. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const meta = META[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? colors.coral : '#9a9a9a';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress}>
            <Body size={18} color={color}>{meta.icon}</Body>
            <Body size={11} color={color} style={styles.label}>{meta.label}</Body>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    backgroundColor: colors.card,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  label: { marginTop: 1 },
});
