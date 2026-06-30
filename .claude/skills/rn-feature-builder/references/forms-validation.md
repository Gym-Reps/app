# Forms & validation — Zod 4

Installed: `zod@4`. Schemas live in `src/utils/schemas.ts`. **Zod 4 moved string
formats to top-level functions** — the repo already uses this (`z.email(...)`),
so follow it; do not write the v3 `z.string().email()` form.

## v4 essentials (what changed from v3)

- Formats are standalone: `z.email()`, `z.url()`, `z.uuid()`, `z.iso.datetime()`,
  `z.iso.date()`. (`z.string().email()` is deprecated.)
- Custom message: pass a string or `{ message }` → `z.email("Input a valid e-mail.")`.
- `safeParse` returns `{ success, data }` or `{ success, error }`; iterate
  `error.issues` (each has `message`, `path`). The screens already render
  `error.issues.map(i => i.message)`.
- Types from schemas: `type Login = z.infer<typeof LoginSchema>`.
- Cross-field rules with `.refine(..., { message, path: ['field'] })` — see the
  existing `CreateAccountSchema` password-match check.

## The validate-then-act pattern (already used in `LoginScreen`)

```ts
const parsed = LoginSchema.safeParse({ email, password });
if (!parsed.success) {
  setErrors(parsed.error.issues.map((i) => i.message));
  return;
}
await loginMutation.mutateAsync(parsed.data); // parsed.data is fully typed
```

## Field-level errors (when you need them per input)

`safeParse` then index issues by their `path[0]`:

```ts
const errorsByField = (issues: z.core.$ZodIssue[]) =>
  Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));
// errorsByField(parsed.error.issues).password
```

## Validate server responses too, not just inputs

Inputs aren't the only untrusted data — so are API responses. Define a response
schema next to the request schema and `parse` it in the query/mutation fn
(`references/data-fetching.md`). Build response schemas from the Prisma models in
`references/backend.md` (snake_case, UUID ids, ISO timestamps):

```ts
export const UserSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  email: z.email(),
  role: z.enum(['MEMBER', 'ADMIN']),
  created_at: z.iso.datetime(),
});
export const SessionResponse = z.object({ token: z.string() });
```

## Align client rules with the server

The backend password minimum is **6 chars**; the app's `LoginSchema`/
`CreateAccountSchema` are stricter (8 + complexity). Keep the stricter client
rules for UX, but make sure the **field names you submit** match the spec
(`username`, `email`, `password`; `currentPassword`/`newPassword` for change
password) — don't send `confirmPassword` to the server.

## Rules

- One schema per request and per response; derive types with `z.infer`.
- Validate at boundaries: user input before submit, API data after fetch.
- Keep messages user-facing and specific (the repo's tone: "Input a valid
  e-mail.", "Password is too short").
