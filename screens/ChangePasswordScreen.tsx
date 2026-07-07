import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/ui/atoms/Screen';
import { Body, Display } from '../components/ui/atoms/Text';
import { Field } from '../components/ui/atoms/Field';
import { Button } from '../components/ui/atoms/Button';
import { Header } from '../components/ui/atoms/Header';
import { colors } from '../utils/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../utils/auth';
import { ZChangePasswordRequest } from '../api/schemas/user';
import { useChangePassword } from '../api/mutations/user';

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^\w]/.test(pw)) score++;
  return score; // 0..3
}

const LABELS = ['', 'Weak', 'Okay', 'Strong — nice 💪'];

export function ChangePasswordScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<string[] | null>(null);
  const score = useMemo(() => strengthOf(next), [next]);

  async function handleUpdate() {
    if (changePassword.isPending) return;
    setErrors(null);

    const parsed = ZChangePasswordRequest.safeParse({
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirm,
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    try {
      await changePassword.mutateAsync(parsed.data);
      router.back();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Could not update password']);
    }
  }

  return (
    <Screen
      bg={colors.card}
      footer={<Button label="Log out" icon="⎋" variant="danger" onPress={signOut} />}
    >
      <Header title="Security" onBack={() => router.back()} />
      <Body color={colors.textFaint} style={styles.sub}>Settings → Change password</Body>

      <View style={styles.form}>
        <Field label="Current password" placeholder="• • • • • • • •" value={current} onChangeText={setCurrent} secure />
        <Field label="New password" placeholder="• • • • • • • •" value={next} onChangeText={setNext} secure />

        <View style={styles.meter}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i < score ? colors.good : colors.track }]}
            />
          ))}
        </View>
        {score > 0 && <Body color={colors.textFaint} size={12} style={styles.hint}>{LABELS[score]}</Body>}

        <Field label="Confirm new password" placeholder="• • • • • • • •" value={confirm} onChangeText={setConfirm} secure />

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

        <Button
          label={changePassword.isPending ? 'Updating…' : 'Update password'}
          onPress={handleUpdate}
          loading={changePassword.isPending}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: 6 },
  form: { marginTop: 16, gap: 14 },
  meter: { flexDirection: 'row', gap: 6, marginTop: -2 },
  bar: { flex: 1, height: 6, borderRadius: 4 },
  hint: { marginTop: -6 },
  cta: { marginTop: 10 },
});
