import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { useRouter } from 'expo-router';
import { colors, radius } from '../utils/theme';
import { useAuth } from '../utils/auth';

export function RegisterScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <Screen bg={colors.card}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Body size={22}>←</Body>
      </Pressable>
      <Display size={30} style={styles.title}>Create account</Display>
      <Body color={colors.textFaint} style={styles.sub}>Start tracking in 30 seconds.</Body>

      <View style={styles.form}>
        <Field label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password" placeholder="• • • • • • • •" value={password} onChangeText={setPassword} secure />
        <Field label="Confirm password" placeholder="• • • • • • • •" value={confirm} onChangeText={setConfirm} secure />

        <Pressable style={styles.checkRow} onPress={() => setAgreed((a) => !a)}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed && <Body size={12} color="#fff">✓</Body>}
          </View>
          <Body color={colors.textMuted} size={13} style={styles.flex}>
            I agree to the Terms & Privacy Policy
          </Body>
        </Pressable>

        <Button label="Sign up" onPress={signIn} style={styles.cta} />
        <Pressable onPress={() => router.back()}>
          <Body color={colors.textMuted} style={styles.center}>
            Have an account? <Body color={colors.coral}>Log in</Body>
          </Body>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 14, lineHeight: 32 },
  sub: { marginTop: 2 },
  form: { marginTop: 18, gap: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  flex: { flex: 1 },
  cta: { marginTop: 8 },
  center: { textAlign: 'center' },
});
