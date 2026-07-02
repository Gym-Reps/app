import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Central Axios instance for the Gym-Reps backend. Base URL comes from the
 * environment (`EXPO_PUBLIC_API_URL`) or `expo.extra.apiUrl` in app.json — never
 * hardcode it in feature code. `withCredentials` lets the platform cookie jar
 * carry the httpOnly refresh-token cookie for `PATCH /token/refresh`.
 */
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined);

// `timeout` guarantees a hung request fails as a clear error (surfaced as a
// "Network error" toast via the response interceptor) instead of spinning
// forever. 15s comfortably covers the slowest endpoint (register ~2s of bcrypt).
export const api = axios.create({ baseURL, withCredentials: true, timeout: 15_000 });

/**
 * In-memory access token. Short-lived JWT sent as `Authorization: Bearer`.
 * Set it from the login mutation (and on refresh); clear it on sign-out.
 */
let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}

/**
 * Called when the access token is gone and a refresh attempt fails — i.e. the
 * session is truly dead. The AuthProvider registers `signOut` here so the auth
 * gate routes back to Login. Lives outside React because interceptors do.
 */
let onAuthError: (() => void) | null = null;
export function setOnAuthError(cb: (() => void) | null) {
  onAuthError = cb;
}

/**
 * Called for server/network failures the feature layer can't surface itself: the
 * `Result` pattern collapses errors to a message and drops the status code, so
 * this interceptor is the one place that still sees 5xx / network drops. The
 * Toast host registers a handler here to raise an app-wide toast.
 */
let onServerError: ((message: string) => void) | null = null;
export function setOnServerError(cb: ((message: string) => void) | null) {
  onServerError = cb;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Refresh once on 401, then replay the original request. A single in-flight
// refresh is shared so concurrent 401s don't trigger a stampede.
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        refreshing ??= api
          .patch<{ token: string }>('/token/refresh')
          .then((res) => res.data.token)
          .finally(() => {
            refreshing = null;
          });
        const token = await refreshing;
        setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
        onAuthError?.(); // surface to the auth gate so the app routes to Login
      }
      return Promise.reject(error);
    }

    // Global surfacing of failures the feature layer can't see. 4xx (except the
    // 401 handled above) stays inline at the call site; 5xx / network drops get
    // an app-wide toast.
    if (!error.response) {
      onServerError?.('Network error — check your connection and try again.');
    } else if (status != null && status >= 500) {
      onServerError?.('Something went wrong on our end. Please try again.');
    }

    return Promise.reject(error);
  },
);
