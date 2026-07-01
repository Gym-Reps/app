# Progress Charts (Coming Soon)

## Overview

A placeholder for richer visual progress charts. Ships **without backend work** —
the tab entry exists and is clearly marked upcoming. Its future data source is the
aggregated metrics endpoint proposed in [06_METRICS](./06_METRICS.md).

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| (within `app/(tabs)/progress.tsx`) or a stub route | Charts section/tab | "Coming soon" state. |

## State ownership

- None. No data wiring in this slice.

## Tasks

- [ ] "Coming soon" screen/section with the tab entry in place (no data wiring).
- [ ] Leave a stub `features/charts/` (or `screens/ChartsScreen.tsx`) with a note
  pointing at the [06_METRICS](./06_METRICS.md) aggregated endpoint as the future
  data source.
- [ ] Charting lib TBD — candidates `victory-native` or `react-native-svg`; do
  **not** install yet. Install via `npx expo install` when this slice is picked up.

## Testing expectations

- Tab/section visible, clearly marked upcoming, renders without any backend call.

## Notes / open questions

- Decide whether charts become their own tab or a section under Progress; current
  layout suggests a section within the existing Progress tab.
