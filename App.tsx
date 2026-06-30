import React, { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';

import { NavProvider } from './src/navigation';
import { Root } from './src/Root';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Caveat_700Bold,
    Caveat_600SemiBold,
    PatrickHand_400Regular,
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.screen }} onLayout={onLayout}>
        <NavProvider>
          <Root />
        </NavProvider>
      </View>
    </SafeAreaProvider>
  );
}
