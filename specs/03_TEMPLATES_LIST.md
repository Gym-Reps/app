# Templates List

## Overview

The list of the user's `TrainmentTemplate`s — the entry point for **starting a
workout** ([05](./05_REGISTER_TRAINMENT.md)) and for **editing** a template
([02](./02_TEMPLATE_BUILDER.md)).

Consumes the backend **Trainment/Templates** endpoints (`01`).

## Screens & Routes

| Route | Screen | Purpose |
|---|---|---|
| `app/(tabs)/templates.tsx` | `screens/TemplatesScreen.tsx` | List templates; per-row Start / Edit / Delete. |

## State ownership

- **Server state (Query):** `['templates']` — the list. That's the whole slice.
- **Client state:** none beyond transient UI (delete-confirm sheet).

## Endpoints consumed

| Action | Method | Path | Response |
|---|---|---|---|
| List | `GET` | `/trainment-templates` | `{ trainmentTemplate[] }` (`id, title, createdAt, updatedAt`) |
| Rename | `PATCH` | `/trainment-templates/:id` | `{ title }` → updated template |
| Delete | `DELETE` | `/trainment-templates/:id` | `204` |

## Files

| File | Purpose |
|---|---|
| `api/schemas/template.ts` | reuse `ZTrainmentTemplate` (from 02) + list response |
| `api/services/template.ts` | add `listTemplates`, `renameTemplate`, `deleteTemplate` |
| `api/queries/template.ts` | `useTemplates` |
| `api/mutations/template.ts` | `useRenameTemplate`, `useDeleteTemplate` |
| `screens/TemplatesScreen.tsx` | list + row actions (exists, wire to Query) |

## Tasks

- [ ] `useTemplates` → render title + relative "updated" time (e.g. `date-fns`
  `formatDistanceToNow`, or a small local helper — no heavy dep just for this).
- [ ] **Row actions:**
  - **Start** → seed the active trainment and navigate to `log-workout`
    (handoff defined in [05](./05_REGISTER_TRAINMENT.md)).
  - **Edit** → `/template/:id` editor ([02](./02_TEMPLATE_BUILDER.md)).
  - **Delete** → confirm → `useDeleteTemplate`, **optimistic** removal from the
    `['templates']` cache; roll back on error.
- [ ] **Rename** (inline or small modal) → `useRenameTemplate` → invalidate.
- [ ] **Empty state** → CTA to `create-template`.

## Errors & edge cases

- Delete failure → restore the optimistic row + toast.
- Deleting a template that has past trainments: those trainments persist server-side
  (they reference a snapshot); the list simply loses the template. Confirm copy
  reflects "won't delete past workouts" if the backend guarantees that — otherwise
  keep the confirm generic.
- Pull-to-refresh → `refetch` / invalidate `['templates']`.

## Testing expectations

- Newly created templates appear (via invalidation from 02).
- Delete removes the row optimistically and survives a refetch.
- Empty account shows the create CTA, not a spinner forever.

## Notes / open questions

- The backend list response key is `trainmentTemplate` (singular) per the appendix —
  confirm whether it's actually an array under that key or `trainmentTemplates`;
  encode the real shape in the schema and adapt in the service.
