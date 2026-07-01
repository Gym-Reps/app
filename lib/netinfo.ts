import NetInfo, {
  useNetInfo,
  type NetInfoState,
} from '@react-native-community/netinfo';

/**
 * Connectivity detection for the offline-first flow (specs/05_REGISTER_TRAINMENT.md):
 * the Finish path checks `isOnline()` to decide sync-now vs. enqueue, the sync
 * poller re-triggers on `subscribeOnline`, and the app-wide banner uses `useIsOnline`.
 *
 * "Online" = a network is connected AND the internet is not known-unreachable.
 * `isInternetReachable` can be `null` (still probing); we treat `null` as reachable
 * to avoid false negatives — if we're wrong, the sync request simply fails and the
 * payload is enqueued anyway (that path also falls back to the queue on error).
 */
function stateIsOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/** Point-in-time check (fetches a fresh state). Use at the Finish decision point. */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return stateIsOnline(state);
}

/** Subscribe to connectivity changes. Returns an unsubscribe fn. */
export function subscribeOnline(cb: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => cb(stateIsOnline(state)));
}

/**
 * Reactive online flag for UI (offline banner). Before the first probe resolves the
 * state is `unknown` (`isConnected`/`isInternetReachable === null`); we treat that
 * as online so the banner doesn't flash on mount.
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected !== false && isInternetReachable !== false;
}
