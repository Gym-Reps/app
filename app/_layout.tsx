import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';

import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../utils/auth';
import { queryClient } from '../api/queryClient';
import { colors } from '../utils/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Redirects between the `(auth)` and `(tabs)` route groups when the session
 * changes — the file-based equivalent of the old `NavProvider` auth gate. Stays
 * inert while the session is still bootstrapping.
 */
function useAuthGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const authed = status === 'authenticated';
    const inAuthGroup = segments[0] === '(auth)';
    if (!authed && !inAuthGroup) {
      router.replace('/login');
    } else if (authed && inAuthGroup) {
      router.replace('/home');
    }
  }, [status, segments]);
}

function RootNavigator() {
  const { status } = useAuth();
  useAuthGate();

  // Keep the native splash up until the session resolves, so we never flash the
  // wrong stack before the gate has decided.
  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

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
      <Stack.Screen name="template/[id]" />
      <Stack.Screen name="catalog-picker" options={{ presentation: 'modal' }} />
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

  // Hold the native splash until fonts are ready; `RootNavigator` then hides it
  // once the session has bootstrapped, so the gate never flashes.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
