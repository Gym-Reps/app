# Auth / Session

## Overview

Account lifecycle and session bootstrap: sign up, sign in, sign out, silent
refresh, and the auth gate that routes between the `(auth)` and `(tabs)` stacks on
launch. The service + schema + mutation layer for this slice is **already built**
(`api/services/user.ts`, `api/schemas/user.ts`, `api/mutations/user.ts`); the
remaining work is the session store/bootstrap and finishing the screens.

Consumes the backend **Auth module** (`Gym-Reps/backend/specs/00_AUTH_MODULE.md`).

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `app/index.tsx` | — (auth gate) | Bootstraps the session, redirects to `(auth)` or `(tabs)`. |
| `app/(auth)/login.tsx` | `screens/LoginScreen.tsx` | Sign in. |
| `app/(auth)/register.tsx` | `screens/RegisterScreen.tsx` | Sign up → auto sign-in. |
| `app/change-password.tsx` | `screens/ChangePasswordScreen.tsx` | Change password (authed, optional). |
| `utils/auth.tsx` | `AuthProvider` / `useAuth` | Holds session, exposes `signIn`/`signOut`. |

## State ownership

- **Server state:** none to cache — the user resource is write-only
  (`/sessions`, `/users`, `/users/password` are all POST/PATCH). No queries here.
- **Client state (session):** `accessToken`, `status`
  (`'loading' | 'authenticated' | 'unauthenticated'`), and `user` (decoded from the
  JWT `sub`/`role`). Currently a React **context** in `utils/auth.tsx`; may migrate
  to a Zustand `stores/auth.ts` if it needs to be read outside the tree (e.g. the
  sync poller). The **token itself** persists in SecureStore, not in state.

## Endpoints consumed

| Action | Method | Path | Body → Response |
|---|---|---|---|
| Register | `POST` | `/users` | `{ username, email, password }` → `201` (no body) |
| Sign in | `POST` | `/sessions` | `{ email, password }` → `200 { token }` (+ refresh cookie) |
| Refresh | `PATCH` | `/token/refresh` | (cookie) → `200 { token }` |
| Change password | `PATCH` | `/users/password` | `{ currentPassword, newPassword }` → `204` |

## Files

| File | Purpose | Status |
|---|---|---|
| `api/schemas/user.ts` | `ZAuthenticate*`, `ZRegisterUser*`, `ZChangePassword*`, `ZPassword` | ✅ built |
| `api/services/user.ts` | `authenticate`, `register`, `changePassword` → `Result` | ✅ built |
| `api/mutations/user.ts` | `useAuthenticate`, `useRegister`, `useChangePassword` | ✅ built |
| `utils/auth.tsx` | `AuthProvider`, `useAuth`, `bootstrap`, `signIn`, `signOut` | 🟡 partial |
| `lib/storage.ts` | SecureStore token get/set/clear (from 00) | ⬜ todo |
| `screens/LoginScreen.tsx` / `RegisterScreen.tsx` | forms + inline errors | 🟡 in progress |

## Validation (already defined in `api/schemas/user.ts`)

- **`ZPassword`** — min 8 chars, at least one uppercase, one lowercase, one
  special character. **Note:** this is stricter than the backend's `min 6`; keep the
  client rule and let the server accept it. If the backend later tightens, mirror.
- **Register** — `email` valid, `username` 3–99, `password` + `confirmPassword`
  match (`confirmPassword` is client-only, never sent).
- **Change password** — `currentPassword` non-empty, `newPassword` = `ZPassword`,
  confirm match.

Screens `safeParse` on submit and render `error.issues` inline (per repo
convention).

## Tasks

- [ ] **Session store / provider** — `status`, `accessToken`, `user`; actions
  `bootstrap()`, `signIn(token)`, `signOut()`, `setToken(token)`. On `signIn`:
  `setAccessToken(token)` (client.ts) + persist to SecureStore + decode JWT.
- [ ] **Auth gate** (`app/index.tsx`): on launch load the token from SecureStore,
  attempt a silent `PATCH /token/refresh`; route to `(tabs)` on success, `(auth)`
  otherwise. Show a splash while `status === 'loading'`.
- [ ] **Sign In screen** — form → `useAuthenticate`; on success `signIn(token)` →
  redirect to `(tabs)/home`. Handle `401` (invalid credentials) inline.
- [ ] **Sign Up screen** — form → `useRegister`; on `201` auto sign-in
  (`useAuthenticate` with the same email/password) then route home. Handle `409`
  (user exists) inline.
- [ ] **Refresh wiring** — already in the `401` interceptor; ensure `onAuthError`
  is registered by the provider so a dead refresh routes to Login.
- [ ] **Sign out** — clear SecureStore + `setAccessToken(null)` + `queryClient.clear()`
  + reset session → route to Login.
- [ ] **(Optional) Change password** — form → `useChangePassword`; on `204` toast +
  `goBack`. Handle `401` (wrong current password) inline.

## Errors & edge cases

| Status | Where | UX |
|---|---|---|
| `400`/`401` (sign-in) | Login | Inline "Invalid email or password". |
| `409` (register) | Sign Up | Inline "That email or username is taken". |
| `401` (change pwd) | Change password | Inline "Current password is incorrect". |
| Refresh fails at bootstrap | Gate | Silently route to Login (no error toast). |
| Expired access token mid-session | interceptor | Transparent refresh + replay. |

## Testing expectations

- Cold start with a valid stored token lands on Home without a login prompt.
- Expired access token silently refreshes and the original request succeeds.
- Invalid/absent refresh routes to Sign In and clears any stale token.
- Register with an existing email surfaces `409` inline (no crash).

## Notes / open questions

- Decide whether the session lives as context (`utils/auth.tsx`) or a Zustand store.
  Lean Zustand **only if** a non-React consumer (the sync poller in
  [05_REGISTER_TRAINMENT](./05_REGISTER_TRAINMENT.md)) needs the token; otherwise
  the interceptor's in-memory token already covers non-React reads.
- JWT decode: use a tiny base64 decode of the payload for `sub`/`role`; no need for
  a full verify on-device (the server is authoritative).
