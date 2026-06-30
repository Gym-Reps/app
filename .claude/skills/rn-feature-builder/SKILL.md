---
name: rn-feature-builder
description: Build React Native / Expo features for this app — screen flows & navigation, global/complex state (Zustand), data fetching & mutations (TanStack Query + Axios + Zod), and gesture/interaction animations (Reanimated). Use whenever implementing or wiring a new screen, store, API call, form, or animated interaction.
---

# RN Feature Builder

Guidance for building features in this Expo + React Native app. This skill keeps
work consistent with the codebase and **version-accurate** for the installed libs.

## 0. Before you write code (do this every time)

1. **Verify versions.** Read `package.json`. The APIs below differ sharply
   between major versions (Reanimated 3→4, Zod 3→4, TanStack Query 4→5). Trust
   `package.json`, not memory. Currently: Expo **54**, React **19**, RN **0.81**,
   `react-native-reanimated@4`, `zod@4`. `zustand`, `axios`, and
   `@tanstack/react-query` are **not installed yet** — add them when first needed.
2. **Honor `AGENTS.md`.** It requires reading the exact versioned Expo docs
   (`https://docs.expo.dev/versions/v<SDK>.0.0/`) before writing Expo code. Use
   the SDK from `package.json` (54), not a remembered number.
3. **Install native/Expo libs with `npx expo install <pkg>`**, never bare
   `npm`/`pnpm install`, so versions stay compatible with the SDK. (Pure-JS libs
   like `zustand`/`axios` can use the normal package manager — this repo uses
   **pnpm**.)

## Project conventions (match these)

- **Components** → `src/components`, **screens** → `src/screens`, design tokens →
  `src/theme.ts` (`colors`, `font`, `radius`, `spacing`, shadows). Never hardcode
  colors/spacing; import tokens.
- **Navigation** is a dependency-free context in `src/navigation.tsx`
  (`useNav()` → `navigate`, `goBack`, `switchTab`, `signIn`, `signOut`, `current.params`).
  Add new routes to the `RouteName` union, `TAB_OF`, and the `SCREENS` map in
  `src/Root.tsx`. Do **not** introduce a navigation library unless asked.
- **Validation** lives in `src/utils/schemas.ts` (Zod). Screens `safeParse` and
  render `error.issues`.
- **Text** via `Body`/`Display` from `src/components/Text.tsx`; **buttons/cards/
  fields/pills** already exist — reuse before building new.
- Functional components, props typed inline, `StyleSheet.create` at file bottom.

## Where each concern lives (suggested, follow if creating new)

| Concern | Location |
|---|---|
| Global/shared state | `src/stores/<name>.ts` (Zustand) |
| Axios client + interceptors | `src/api/client.ts` |
| Endpoint fns + query/mutation hooks | `src/api/<resource>.ts` |
| Response/request schemas | `src/utils/schemas.ts` |
| QueryClient provider | wrap `<Root/>` in `App.tsx` |

## Pick the right tool for state

- **Local UI state** (toggles, inputs, the active step) → `useState`/`useReducer`.
  The existing screens do this well — don't reach for a store prematurely.
- **Server data** (anything from an endpoint) → **TanStack Query**, not a store.
  Query is your cache; don't copy server data into Zustand.
- **Cross-screen client state** (auth/session, units preference, draft that
  outlives a screen, theme) → **Zustand**.

## Backend is the contract source of truth

The API is the **Gym-Reps/backend** repo (`https://github.com/Gym-Reps/backend`,
TypeScript + Prisma). Its `specs/*.md` files define every endpoint
(schema → endpoints → rules → errors) and `prisma/schema.prisma` is the data
model. **Match request/response shapes and field names to the spec, not to the
local `src/data/mock.ts`.** Note the domain term **"trainment"** = a performed
workout session. See `references/backend.md` for the captured contract and how to
read the repo. When a spec is unclear or you need exact fields, read that repo.

## Reference files — read the one matching the task

- **Backend contract: endpoints, data model, auth** → `references/backend.md`
- **State & stores** → `references/state-zustand.md`
- **Data fetching, mutations, API client, response validation** →
  `references/data-fetching.md`
- **Animations & gestures (Reanimated 4)** → `references/animations.md`
- **Forms & validation (Zod 4)** → `references/forms-validation.md`
- **Adding a screen / flow** → `references/flows-navigation.md`

## Definition of done

- Types pass (`npx tsc --noEmit`). Reuse existing components and tokens.
- Server data goes through Query + a Zod schema; user input is validated before
  use. No secrets or base URLs hardcoded inline — keep them in `src/api/client.ts`.
- Animations run on the UI thread (shared values / worklets), not by re-rendering
  in a loop.
