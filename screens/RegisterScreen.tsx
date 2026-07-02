import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { useRouter } from 'expo-router';
import { colors, radius } from '../utils/theme';
import { useAuth } from '../utils/auth';
import { ZRegisterUserRequest } from '../api/schemas/user';
import { useRegister, useAuthenticate } from '../api/mutations/user';

export function RegisterScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const register = useRegister();
  const login = useAuthenticate();
  const [agreed, setAgreed] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<string[] | null>(null);

  const pending = register.isPending || login.isPending;

  async function handleSignUp() {
    if (pending) return;
    setErrors(null);

    if (!agreed) {
      setErrors(['Please agree to the Terms & Privacy Policy.']);
      return;
    }

    const parsed = ZRegisterUserRequest.safeParse({
      username,
      email,
      password,
      confirmPassword: confirm,
    });

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    try {
      // Register returns 201 with no token, so authenticate right after with the
      // same credentials to open the session. The auth gate then routes to (tabs).
      const res = await register.mutateAsync(parsed.data);
      const { token } = await login.mutateAsync({ email, password });
      signIn(token);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Could not create account']);
    }
  }

  return (
    <Screen bg={colors.card}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Body size={22}>←</Body>
      </Pressable>
      <Display size={30} style={styles.title}>Create account</Display>
      <Body color={colors.textFaint} style={styles.sub}>Start tracking in 30 seconds.</Body>

      <View style={styles.form}>
        <Field label="Username" placeholder="yourname" value={username} onChangeText={setUsername} />
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

        {errors && (
          <View style={{ gap: 12 }}>
            {errors.map((error, i) => (
              <Text
                key={i}
                style={{ color: colors.bad, paddingLeft: 4, borderLeftWidth: 1, borderColor: colors.bad }}
              >
                {error}
              </Text>
            ))}
          </View>
        )}

        <Button label={pending ? 'Creating…' : 'Sign up'} onPress={handleSignUp} style={styles.cta} />
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
