import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';

/**
 * Bottom-tab group. The order of `Tabs.Screen` entries is the order they appear
 * in the custom `TabBar`. Stack screens (log-workout, compare, etc.) live at the
 * root layout so they cover the tab bar when pushed.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="templates" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
