# Flows & navigation

This app uses a **dependency-free navigation context** in `src/navigation.tsx`
(an auth gate + a single screen stack + four bottom tabs that reset to their
root). Do **not** add React Navigation / Expo Router unless the user asks — it
would mean rebuilding the whole shell.

## `useNav()` API

```ts
const {
  current,          // { name, params }
  navigate,         // (name, params?) => void   — push onto the stack
  goBack,           // () => void
  switchTab,        // (tab) => void              — resets that tab's stack
  signIn, signOut,  // auth gate
  activeTab,
} = useNav();
// read params: const id = current.params?.templateId as string | undefined
```

## Adding a screen (checklist)

1. Create `src/screens/<Name>Screen.tsx` using `Screen`, `Header`, and existing
   components + `theme` tokens.
2. Add its key to the `RouteName` union in `src/navigation.tsx`.
3. Map the route → owning tab in `TAB_OF` (drives the active-tab highlight).
4. Register the component in the `SCREENS` map in `src/Root.tsx`.
5. Navigate to it: `navigate('<name>', { …params })`.

`Root.tsx` keys the rendered screen by route name and replays an enter animation
on every navigation — new screens get the transition for free.

## Building a multi-step flow

- **Step state that dies with the flow** (current step index, in-progress
  inputs) → `useState`/`useReducer` in the flow's root screen. `LogWorkoutScreen`
  is the model: it holds `idx`, `weight`, `reps`, and a `logged` map locally.
- **Data that must survive leaving the flow** (a half-built template draft the
  user can resume) → a Zustand store (`references/state-zustand.md`).
- **Server reads/writes inside the flow** → TanStack Query hooks
  (`references/data-fetching.md`); on a successful mutation, `invalidateQueries`
  so the list screens refetch, then `goBack()` or `switchTab()`.

## Typical end-to-end feature wiring

1. Read the matching `specs/NN_*.md` in the backend repo for the contract.
2. Add request/response Zod schemas (`src/utils/schemas.ts`).
3. Add endpoint fn + Query/Mutation hook (`src/api/<resource>.ts`).
4. Build/extend the screen; validate input, call the mutation, handle
   `isPending`/`isError`.
5. Animate the meaningful interactions with Reanimated
   (`references/animations.md`).
6. `npx tsc --noEmit` to confirm types.

## Watch-outs

- Params are untyped (`Record<string, any>`) — narrow with `as` and a fallback,
  as the existing screens do.
- Keep `useNav()`'s surface stable if you refactor the gate onto a store; screens
  depend on it.
- Map backend terms at the API boundary ("trainment" → "workout",
  `repetitions`/`weight` → UI names) so screen code stays readable.
