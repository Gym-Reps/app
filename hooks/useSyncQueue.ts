import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isOnline, subscribeOnline } from '../lib/netinfo';
import { queryClient } from '../api/queryClient';
import { QUERY_KEYS } from '../api/queryKeys';
import { syncTrainment, isPermanent } from '../api/services/sync';
import { useSyncQueueStore } from '../stores/syncQueue';

/**
 * Background drain of the pending trainment-sync queue
 * (`specs/05_REGISTER_TRAINMENT.md`). Mounted ONCE at `app/_layout.tsx`.
 *
 * Triggers: app returns to the foreground (`AppState`), NetInfo regains
 * connectivity (`subscribeOnline`), and a periodic interval fallback. The queue
 * is processed **sequentially** and guarded by the store's `inFlight` flag so
 * two triggers can't drain concurrently. Per item:
 *  - `200/201` → dequeue (idempotent — safe even if a prior attempt half-sent).
 *  - `409/404/403/400` → drop (re-sending can never succeed; don't loop).
 *  - network error → keep it, exponential backoff, retry on the next trigger.
 *
 * When at least one payload syncs, invalidate `['trainments']` +
 * `['weekly-progress']` so Home refreshes.
 */

const INTERVAL_MS = 30_000;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;

function backoffDelay(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** attempts, BACKOFF_MAX_MS);
}

/** Drain the queue once. No-ops if already draining or offline. */
async function drain(): Promise<void> {
  const store = useSyncQueueStore.getState();
  if (store.inFlight) return;
  if (store.items.length === 0) return;
  if (!(await isOnline())) return;

  store.setInFlight(true);
  let syncedAny = false;
  try {
    // Sequential loop; each branch removes an item or backs it off, so this
    // always makes progress or breaks.
    for (;;) {
      const now = Date.now();
      const item = useSyncQueueStore
        .getState()
        .items.find((i) => i.nextAttemptAt <= now);
      if (!item) break;

      const res = await syncTrainment(item.payload);
      if (res.ok) {
        useSyncQueueStore.getState().dequeue(item.payload.id);
        syncedAny = true;
        continue;
      }

      if (isPermanent(res.error)) {
        // Template/exercise gone, not owner, or bad shape → will never succeed.
        useSyncQueueStore.getState().dequeue(item.payload.id);
        continue;
      }

      // Network / transient error: back this item off and stop (likely offline).
      useSyncQueueStore
        .getState()
        .markAttempt(
          item.payload.id,
          Date.now() + backoffDelay(item.attempts)
        );
      break;
    }
  } finally {
    useSyncQueueStore.getState().setInFlight(false);
    if (syncedAny) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAINMENTS() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEEKLY_PROGRESS() });
    }
  }
}

/** Fire-and-forget drain (swallows rejections; failures stay queued). */
function triggerDrain(): void {
  void drain().catch(() => {});
}

/**
 * Mount the background sync poller. Call once, high in the tree
 * (`app/_layout.tsx`), inside the `QueryClientProvider`.
 */
export function useSyncQueue(): void {
  useEffect(() => {
    triggerDrain(); // attempt a drain on mount / cold start

    const appStateSub = AppState.addEventListener(
      'change',
      (status: AppStateStatus) => {
        if (status === 'active') triggerDrain();
      }
    );
    const unsubscribeOnline = subscribeOnline((online) => {
      if (online) triggerDrain();
    });
    const interval = setInterval(triggerDrain, INTERVAL_MS);

    return () => {
      appStateSub.remove();
      unsubscribeOnline();
      clearInterval(interval);
    };
  }, []);
}
