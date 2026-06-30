import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { colors } from '../theme';
import { useNav } from '../navigation';

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^\w]/.test(pw)) score++;
  return score; // 0..3
}

const LABELS = ['', 'Weak', 'Okay', 'Strong — nice 💪'];

export function ChangePasswordScreen() {
  const { goBack, signOut } = useNav();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const score = useMemo(() => strengthOf(next), [next]);

  return (
    <Screen
      bg={colors.card}
      footer={<Button label="Log out" icon="⎋" variant="danger" onPress={signOut} />}
    >
      <Header title="Security" onBack={goBack} />
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
        <Button label="Update password" onPress={goBack} style={styles.cta} />
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
