import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, radius } from '../utils/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../utils/auth';
import { homeStats } from '../data/mock';

const MENU: { icon: string; label: string; route?: '/change-password' }[] = [
  { icon: '🔒', label: 'Change password', route: '/change-password' },
  { icon: '⚖️', label: 'Units · kg' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '❔', label: 'Help & feedback' },
];

export function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <Screen footer={<Button label="Log out" icon="⎋" variant="danger" onPress={signOut} />}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Display size={30} color="#fff">{homeStats.name[0]}</Display>
        </View>
        <Display size={26}>{homeStats.name}</Display>
        <Body color={colors.textFaint} size={13}>alex@reps.app</Body>
      </View>

      <View style={styles.stats}>
        <Card tint strong style={styles.stat}>
          <Body color={colors.textFaint} size={12}>🔥 Streak</Body>
          <Display size={24}>{homeStats.streak} days</Display>
        </Card>
        <Card strong style={styles.stat}>
          <Body color={colors.textFaint} size={12}>Volume</Body>
          <Display size={24}>{homeStats.volumeTons} t</Display>
        </Card>
      </View>

      <View style={styles.menu}>
        {MENU.map((m, i) => (
          <Pressable
            key={m.label}
            onPress={() => m.route && router.push(m.route)}
            style={[styles.menuRow, i === MENU.length - 1 && styles.lastRow]}
          >
            <Body size={15}>{m.icon}  {m.label}</Body>
            <Body color="#bbb" size={18}>›</Body>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 4, marginTop: 8 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stats: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { flex: 1 },
  menu: {
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
  },
  lastRow: { borderBottomWidth: 0 },
});
