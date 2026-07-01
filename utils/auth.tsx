import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, setAccessToken, setOnAuthError } from '../api/client';
import { queryClient } from '../api/queryClient';
import { clearToken, getToken, setToken } from '../lib/storage';

/**
 * Session state + bootstrap for the auth gate. Navigation is Expo Router's job
 * (file routes under `app/`); this tracks whether we have a live session and who
 * the user is. Design decision (per specs/01_AUTH.md): the session is a React
 * context, not a Zustand store — the axios client's in-memory token already
 * covers the only non-React reader (the 401 interceptor).
 *
 * Token lifecycle:
 * - The short-lived access token lives in-memory in the axios client
 *   (`setAccessToken`) AND is persisted to SecureStore so a cold start can
 *   restore or refresh the session.
 * - On launch `bootstrap()` restores a still-valid token, or exchanges the
 *   refresh cookie for a fresh one via `PATCH /token/refresh`.
 */

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthUser = { id: string; role: 'MEMBER' | 'ADMIN' };

type AuthValue = {
  status: SessionStatus;
  /** Convenience flag: `status === 'authenticated'`. */
  authed: boolean;
  user: AuthUser | null;
  signIn: (token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

// --- JWT payload decode (no verification — the server is authoritative) --------

type JwtPayload = { sub?: string; role?: string; exp?: number };

const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Minimal base64url decoder (avoids relying on a global `atob`). */
function base64UrlDecode(input: string): string {
  const str = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    if (ch === '=') break;
    const idx = B64_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromClaims(claims: JwtPayload | null): AuthUser | null {
  if (!claims?.sub) return null;
  return { id: claims.sub, role: claims.role === 'ADMIN' ? 'ADMIN' : 'MEMBER' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Adopt an access token: axios (in-memory) + SecureStore (persisted) + session.
  const applyToken = useCallback(async (token: string) => {
    setAccessToken(token);
    setUser(userFromClaims(decodeJwt(token)));
    setStatus('authenticated');
    await setToken(token);
  }, []);

  const signIn = useCallback(
    (token: string) => {
      void applyToken(token);
    },
    [applyToken]
  );

  const signOut = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
    void clearToken();
  }, []);

  // Cold-start bootstrap: restore a valid token or silently refresh; otherwise
  // land on unauthenticated so the gate routes to Login.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const stored = await getToken();
        if (!stored) {
          if (!cancelled) setStatus('unauthenticated');
          return;
        }

        const claims = decodeJwt(stored);
        const nowSeconds = Date.now() / 1000;
        // Still valid (with a 30s guard) → use it as-is.
        if (claims?.exp && claims.exp - 30 > nowSeconds) {
          setAccessToken(stored);
          if (!cancelled) {
            setUser(userFromClaims(claims));
            setStatus('authenticated');
          }
          return;
        }

        // Expired/near-expiry → exchange the refresh cookie for a new token.
        // `_retry: true` stops the 401 interceptor from re-refreshing this call.
        const { data } = await api.patch<{ token: string }>(
          '/token/refresh',
          undefined,
          { _retry: true } as never
        );
        if (!cancelled) await applyToken(data.token);
      } catch {
        setAccessToken(null);
        await clearToken();
        if (!cancelled) setStatus('unauthenticated');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyToken]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      authed: status === 'authenticated',
      user,
      signIn,
      signOut,
    }),
    [status, user, signIn, signOut]
  );

  // When a 401 can't be recovered by refreshing, the axios client calls this —
  // tear down the session so the auth gate routes back to Login.
  useEffect(() => {
    setOnAuthError(signOut);
    return () => setOnAuthError(null);
  }, [signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
