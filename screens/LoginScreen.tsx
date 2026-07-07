import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Screen } from '../components/ui/atoms/Screen';
import { Body, Display } from '../components/ui/atoms/Text';
import { Field } from '../components/ui/atoms/Field';
import { Button } from '../components/ui/atoms/Button';
import { useRouter } from 'expo-router';
import { colors, radius, hardShadowStrong,    } from '../utils/theme';
import { useAuth } from '../utils/auth';
import { ZAuthenticateRequest } from '../api/schemas/user';
import { useAuthenticate } from '../api/mutations/user';


export function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const login = useAuthenticate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[] | null>(null)

  async function handleSignIn() {
    if (login.isPending) return
    if (errors) setErrors(null)

    const parsedRequest = ZAuthenticateRequest.safeParse({
      email,
      password
    })

    if (!parsedRequest.success) {
      setErrors(parsedRequest.error.issues.map((issue) => issue.message))
      return
    }

    try {
      // On success, open the session with the returned token. The auth gate in
      // app/_layout.tsx then redirects into the (tabs) group.
      const { token } = await login.mutateAsync(parsedRequest.data);
      signIn(token);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Could not sign in']);
    }
  }

  return (
    <Screen bg={colors.card} contentStyle={styles.content}>
      <View style={styles.logo}>
                <Display size={32} color="#fff">R</Display>

      </View>
      <Display size={30} style={styles.brand}>REPS</Display>
      <Body color={colors.textFaint} style={styles.tag}>Track every set.</Body>

      <View style={styles.form}>
        <Field label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password" placeholder="• • • • • • • •" value={password} onChangeText={setPassword} secure />
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
        
        <Button label={login.isPending ? 'Logging in…' : 'Log in'} onPress={handleSignIn} loading={login.isPending} style={styles.cta} />
        {/* <Pressable onPress={() => {}}>
          <Body color={colors.coral} style={styles.center}>Forgot password?</Body>
        </Pressable> */}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Body color="#cfcfcf" size={13}>or</Body>
          <View style={styles.line} />
        </View>

        <Pressable onPress={() => router.push('/register')}>
          <Body color={colors.textMuted} style={styles.center}>
            New here? <Body color={colors.coral}>Create account</Body>
          </Body>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 40, paddingHorizontal: 22 },
  logo: {
    alignSelf: 'center',
    width: 74,
    height: 74,
    borderRadius: radius.lg + 4,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...hardShadowStrong,
  },
  brand: { textAlign: 'center' },
  tag: { textAlign: 'center', marginTop: -4 },
  form: { marginTop: 24, gap: 16 },
  cta: { marginTop: 6 },
  center: { textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: '#dcdcdc' },
});
