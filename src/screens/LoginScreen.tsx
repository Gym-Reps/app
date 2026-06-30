import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { colors, radius, hardShadowStrong, font } from '../theme';
import { useNav } from '../navigation';
import { LoginSchema } from '../utils/schemas';

export function LoginScreen() {
  const { signIn, navigate } = useNav();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[] | null>(null)

  async function handleSignIn() {
    if (errors) setErrors(null)

    const parsedRequest = LoginSchema.safeParse({
      email,
      password
    })

    if (!parsedRequest.success) {
      setErrors(parsedRequest.error.issues.map((issue) => issue.message))
      return
    }

    // call api here
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
            {errors.map((error) => {
              console.log("err ->", error)

              return (
                <Text style={{ color: colors.bad, paddingLeft: 4, borderLeftWidth: 1, borderColor: colors.bad }}>{error}</Text>
              )
            }) }
            
          </View>
        )}
        
        <Button label="Log in" onPress={handleSignIn} style={styles.cta} />
        {/* <Pressable onPress={() => {}}>
          <Body color={colors.coral} style={styles.center}>Forgot password?</Body>
        </Pressable> */}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Body color="#cfcfcf" size={13}>or</Body>
          <View style={styles.line} />
        </View>

        <Pressable onPress={() => navigate('register')}>
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
