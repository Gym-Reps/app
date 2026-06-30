import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body } from './Text';
import { colors } from '../theme';
import { TabName, useNav } from '../navigation';

const TABS: { key: TabName; icon: string; label: string }[] = [
  { key: 'home', icon: '⌂', label: 'Home' },
  { key: 'templates', icon: '▤', label: 'Templates' },
  { key: 'progress', icon: '📈', label: 'Progress' },
  { key: 'profile', icon: '◔', label: 'Profile' },
];

export function TabBar() {
  const { activeTab, switchTab } = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const active = t.key === activeTab;
        const color = active ? colors.coral : '#9a9a9a';
        return (
          <Pressable key={t.key} style={styles.tab} onPress={() => switchTab(t.key)}>
            <Body size={18} color={color}>{t.icon}</Body>
            <Body size={11} color={color} style={styles.label}>{t.label}</Body>
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
