import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Session state for the auth gate. Navigation itself is handled by Expo Router
 * (file-based routes under `app/`); this only tracks whether the user is signed
 * in. The root layout (`app/_layout.tsx`) redirects between the `(auth)` and
 * `(tabs)` groups whenever `authed` changes.
 *
 * When the real API is wired, `signIn` should take the access token and persist
 * it (see the rn-feature-builder skill: auth → Zustand, token → axios client).
 */
type AuthValue = {
  authed: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const value = useMemo<AuthValue>(
    () => ({
      authed,
      signIn: () => setAuthed(true),
      signOut: () => setAuthed(false),
    }),
    [authed]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
