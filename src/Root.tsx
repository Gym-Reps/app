import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useNav, RouteName } from './navigation';
import { TabBar } from './components/TabBar';

import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ChangePasswordScreen } from './screens/ChangePasswordScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { CreateTemplateScreen } from './screens/CreateTemplateScreen';
import { LogWorkoutScreen } from './screens/LogWorkoutScreen';
import { CompareScreen } from './screens/CompareScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { ProgressDetailScreen } from './screens/ProgressDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const SCREENS: Record<RouteName, React.ComponentType> = {
  login: LoginScreen,
  register: RegisterScreen,
  changePassword: ChangePasswordScreen,
  home: HomeScreen,
  templates: TemplatesScreen,
  createTemplate: CreateTemplateScreen,
  logWorkout: LogWorkoutScreen,
  compare: CompareScreen,
  progress: ProgressScreen,
  progressDetail: ProgressDetailScreen,
  profile: ProfileScreen,
};

/**
 * Fades + gently rises each screen in on mount. Because `Root` keys this by
 * route name, every navigation remounts it and replays the enter animation,
 * giving a smooth transition between pages without a native nav library.
 */
function AnimatedScreen({ name }: { name: RouteName }) {
  const ScreenComponent = SCREENS[name];
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.body,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <ScreenComponent />
    </Animated.View>
  );
}

export function Root() {
  const { current, showTabBar } = useNav();
  // `key` forces a fresh mount per stack entry so screen-local state resets
  // and the enter animation replays on every navigation.
  return (
    <View style={styles.root}>
      <AnimatedScreen key={current.name} name={current.name} />
      {showTabBar && <TabBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
