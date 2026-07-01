import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure persistence for the JWT access token. Backed by `expo-secure-store`
 * (Keychain on iOS, Keystore-backed on Android) — **never** AsyncStorage for the
 * token. The token is held in memory by `api/client.ts` at runtime; these helpers
 * persist it so a cold start can bootstrap the session (see specs/01_AUTH.md).
 *
 * `expo-secure-store` is native-only (Android/iOS/tvOS). On web it throws
 * `UnavailabilityError`, so the helpers degrade to a no-op there rather than crash
 * the auth bootstrap — the in-memory token still works for the active session.
 */
const ACCESS_TOKEN_KEY = 'reps.accessToken';

const unavailable = Platform.OS === 'web';

export async function getToken(): Promise<string | null> {
  if (unavailable) return null;
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (unavailable) return;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (unavailable) return;
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
