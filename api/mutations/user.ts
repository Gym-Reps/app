import { useMutation } from "@tanstack/react-query";
import { authenticate, changePassword, register } from "../services/user";
import type {
    AuthenticateRequest,
    AuthenticateResponse,
    ChangePasswordRequest,
    RegisterUserRequest,
} from "../schemas/user";

/**
 * Auth mutation hooks. The service layer returns a `Result`; these unwrap it and
 * throw on failure so TanStack Query exposes the error via `isError`/`error` and
 * rejects `mutateAsync` (lets callers `await` and `try/catch`).
 *
 * Note: the user resource has no GET endpoints in the backend contract
 * (`/sessions`, `/users` are POST), so there are no queries here — only mutations.
 */

/** POST /sessions — resolves to `{ token }` on success. */
export function useAuthenticate() {
    return useMutation<AuthenticateResponse, Error, AuthenticateRequest>({
        mutationFn: async (body) => {
            const res = await authenticate(body);
            if (!res.ok) throw new Error(res.error);
            return res.data;
        },
    });
}

/** POST /users — resolves on 201. No token is returned; auto-login separately. */
export function useRegister() {
    return useMutation<void, Error, RegisterUserRequest>({
        mutationFn: async (body) => {
            const res = await register(body);
            if (!res.ok) throw new Error(res.error);
        },
    });
}

/** PATCH /users/password — resolves on 204 (requires an active session). */
export function useChangePassword() {
    return useMutation<void, Error, ChangePasswordRequest>({
        mutationFn: async (body) => {
            const res = await changePassword(body);
            if (!res.ok) throw new Error(res.error);
        },
    });
}
