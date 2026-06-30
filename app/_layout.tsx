import React, { useCallback, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';

import { AuthProvider, useAuth } from '../utils/auth';
import { colors } from '../utils/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Redirects between the `(auth)` and `(tabs)` route groups when the session
 * changes — the file-based equivalent of the old `NavProvider` auth gate.
 */
function useAuthGate() {
  const { authed } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!authed && !inAuthGroup) {
      router.replace('/login');
    } else if (authed && inAuthGroup) {
      router.replace('/home');
    }
  }, [authed, segments]);
}

function RootNavigator() {
  useAuthGate();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.screen },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="log-workout" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-template" />
      <Stack.Screen name="compare" />
      <Stack.Screen name="progress-detail" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Caveat_700Bold,
    Caveat_600SemiBold,
    PatrickHand_400Regular,
  });

  const onReady = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
