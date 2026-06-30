import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Lightweight, dependency-free navigation:
 *  - an auth gate (Login/Register vs. the main app)
 *  - a single screen stack with push / back
 *  - four bottom tabs that each reset the stack to their root
 *
 * This mirrors the wireframe's custom bottom nav exactly and avoids pulling in
 * a native navigation library for a handful of screens.
 */

export type RouteName =
  | 'login'
  | 'register'
  | 'home'
  | 'templates'
  | 'createTemplate'
  | 'logWorkout'
  | 'progress'
  | 'progressDetail'
  | 'compare'
  | 'profile'
  | 'changePassword';

export type Route = { name: RouteName; params?: Record<string, any> };

export type TabName = 'home' | 'templates' | 'progress' | 'profile';

/** Which tab "owns" each route (drives the active-tab highlight). */
const TAB_OF: Partial<Record<RouteName, TabName>> = {
  home: 'home',
  templates: 'templates',
  createTemplate: 'templates',
  logWorkout: 'home',
  progress: 'progress',
  progressDetail: 'progress',
  compare: 'progress',
  profile: 'profile',
  changePassword: 'profile',
};

/** Routes that show the bottom tab bar (tab roots only). */
const TAB_ROOTS: RouteName[] = ['home', 'templates', 'progress', 'profile'];

type NavContextValue = {
  authed: boolean;
  signIn: () => void;
  signOut: () => void;
  stack: Route[];
  current: Route;
  activeTab: TabName | undefined;
  showTabBar: boolean;
  navigate: (name: RouteName, params?: Record<string, any>) => void;
  replace: (name: RouteName, params?: Record<string, any>) => void;
  goBack: () => void;
  switchTab: (tab: TabName) => void;
};

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [authStack, setAuthStack] = useState<Route[]>([{ name: 'login' }]);
  const [appStack, setAppStack] = useState<Route[]>([{ name: 'home' }]);

  const value = useMemo<NavContextValue>(() => {
    const stack = authed ? appStack : authStack;
    const setStack = authed ? setAppStack : setAuthStack;
    const current = stack[stack.length - 1];

    return {
      authed,
      signIn: () => {
        setAppStack([{ name: 'home' }]);
        setAuthed(true);
      },
      signOut: () => {
        setAuthStack([{ name: 'login' }]);
        setAuthed(false);
      },
      stack,
      current,
      activeTab: TAB_OF[current.name],
      showTabBar: authed && TAB_ROOTS.includes(current.name),
      navigate: (name, params) => setStack((s) => [...s, { name, params }]),
      replace: (name, params) =>
        setStack((s) => [...s.slice(0, -1), { name, params }]),
      goBack: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      switchTab: (tab) => setAppStack([{ name: tab }]),
    };
  }, [authed, authStack, appStack]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within a NavProvider');
  return ctx;
}
