import { create } from 'zustand';

/**
 * Transient app-wide toast (specs/08_CROSS_CUTTING.md — global error surfacing).
 * Runtime-only, never persisted: one message at a time; a new `show` replaces the
 * current one. Rendered by `components/Toast.tsx`, which also wires the axios
 * `setOnServerError` hook into `show` so 5xx / network failures reach the user.
 */

export type ToastKind = 'error' | 'info';
export type ToastMessage = { id: number; kind: ToastKind; text: string };

type State = {
  current: ToastMessage | null;
  show: (text: string, kind?: ToastKind) => void;
  dismiss: () => void;
};

let seq = 0;

export const useToast = create<State>((set) => ({
  current: null,
  show: (text, kind = 'error') => set({ current: { id: ++seq, kind, text } }),
  dismiss: () => set({ current: null }),
}));

/** Imperative helper for non-React callers (e.g. the axios interceptor). */
export function showToast(text: string, kind: ToastKind = 'error') {
  useToast.getState().show(text, kind);
}
