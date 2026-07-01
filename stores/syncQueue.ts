import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncPayload } from '../api/schemas/sync';

/**
 * The pending-upload queue: completed trainment payloads awaiting a successful
 * `POST /trainments/sync`. Persisted to AsyncStorage (`pending_trainments_sync`)
 * so a payload parked while offline survives an app kill and drains on relaunch
 * (see `hooks/useSyncQueue.ts`). Per `specs/05_REGISTER_TRAINMENT.md`.
 *
 * Each item carries `attempts` + `nextAttemptAt` so the poller can back off on
 * network errors without a separate timer store. The `inFlight` flag guards the
 * queue against concurrent drains; it is transient (never persisted) so a crash
 * mid-drain can't leave the queue permanently stuck.
 */

export type QueueItem = {
  payload: SyncPayload;
  /** How many failed upload attempts so far (drives the backoff delay). */
  attempts: number;
  /** Epoch ms before which this item should not be retried. */
  nextAttemptAt: number;
  enqueuedAt: number;
};

type State = {
  items: QueueItem[];
  /** True while a drain is running — blocks a second concurrent drain. */
  inFlight: boolean;

  /** Park a completed payload. Idempotent on `payload.id` (replaces a dup). */
  enqueue: (payload: SyncPayload) => void;
  /** Remove an item by its trainment `id` (after a `2xx` or a permanent drop). */
  dequeue: (id: string) => void;
  /** Record a failed attempt: bump `attempts`, schedule the next retry. */
  markAttempt: (id: string, nextAttemptAt: number) => void;
  setInFlight: (v: boolean) => void;
};

export const useSyncQueueStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      inFlight: false,

      enqueue: (payload) =>
        set((s) => {
          const item: QueueItem = {
            payload,
            attempts: 0,
            nextAttemptAt: Date.now(),
            enqueuedAt: Date.now(),
          };
          // Idempotent id → replace any existing item for the same trainment.
          const rest = s.items.filter((i) => i.payload.id !== payload.id);
          return { items: [...rest, item] };
        }),

      dequeue: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.payload.id !== id) })),

      markAttempt: (id, nextAttemptAt) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.payload.id === id
              ? { ...i, attempts: i.attempts + 1, nextAttemptAt }
              : i
          ),
        })),

      setInFlight: (v) => set({ inFlight: v }),
    }),
    {
      name: 'pending_trainments_sync',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the queue; `inFlight` is runtime-only.
      partialize: (s) => ({ items: s.items }),
    }
  )
);

/** Selector hook: number of trainments waiting to sync (Home / tab-bar badge). */
export const usePendingCount = () => useSyncQueueStore((s) => s.items.length);

/** Non-reactive read of the pending count (for imperative call sites). */
export const getPendingCount = () => useSyncQueueStore.getState().items.length;
