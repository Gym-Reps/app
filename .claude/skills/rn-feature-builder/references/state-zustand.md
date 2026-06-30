# State management — Zustand

Use Zustand only for **client state that must outlive a single screen**: auth/
session, units (kg/lb) preference, theme, a multi-screen draft. Server data does
**not** go here — that's TanStack Query (`references/data-fetching.md`). Local UI
state stays in `useState`/`useReducer` (the existing screens already do this
well; don't replace them with a store).

## Install (not yet in this repo)

```bash
pnpm add zustand
npx expo install @react-native-async-storage/async-storage   # only if persisting
```

## Store — `src/stores/auth.ts`

Type the state, expose actions inside the store, keep it small.

```ts
import { create } from 'zustand';
import { setAccessToken } from '../api/client';

type AuthState = {
  token: string | null;
  userId: string | null;
  status: 'guest' | 'authed';
  signIn: (token: string, userId: string) => void;
  signOut: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: null,
  userId: null,
  status: 'guest',
  signIn: (token, userId) => {
    setAccessToken(token);            // keep axios in sync
    set({ token, userId, status: 'authed' });
  },
  signOut: () => {
    setAccessToken(null);
    set({ token: null, userId: null, status: 'guest' });
  },
}));
```

## Consuming — always select narrowly

Select the slice you need so a component re-renders only when that slice changes.
**Don't** destructure the whole store.

```ts
const status = useAuth((s) => s.status);          // good
const signOut = useAuth((s) => s.signOut);        // actions are stable refs

// reading outside React (e.g. in the axios interceptor):
useAuth.getState().signOut();
```

Selecting multiple values? Return primitives separately, or use `useShallow` to
avoid an unstable object identity (Zustand v5 no longer ships a default shallow
equality):

```ts
import { useShallow } from 'zustand/react/shallow';
const { token, status } = useAuth(useShallow((s) => ({ token: s.token, status: s.status })));
```

## Persisting (optional)

For preferences (units, theme) survive restarts with the `persist` middleware +
AsyncStorage. **Don't persist the access token to plain AsyncStorage** — it's
short-lived (~10m) and refreshed via cookie; persisting it adds risk for little
gain. If you must persist a secret, use `expo-secure-store`.

```ts
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({ units: 'kg', setUnits: (units) => set({ units }) }),
    { name: 'reps-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
```

## Wiring to existing navigation

`src/navigation.tsx` already owns `signIn`/`signOut` for the auth gate. Prefer
having the navigation context call the auth store (single source of truth for
session) rather than duplicating session state in two places. If you migrate the
gate to the store, keep `useNav()`'s API stable so screens don't change.

## Rules

- One store per concern; don't build a single god-store.
- Actions live in the store, not scattered across components.
- Always select with a function; never subscribe to the whole state in a screen.
- Server data → Query. Ephemeral UI state → `useState`. Zustand is the
  in-between.
