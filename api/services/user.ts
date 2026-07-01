import { isAxiosError } from "axios";
import { api } from "../client";
import {
    AuthenticateRequest,
    AuthenticateResponse,
    ChangePasswordRequest,
    RegisterUserRequest,
    ZAuthenticateResponse,
} from "../schemas/user";
import { Err, Ok, Result } from "../result";

/**
 * Pull a user-facing message out of an error. The backend sends `{ message }`
 * on 400 (bad credentials) / 409 (user exists); prefer that over Axios's
 * generic "Request failed with status code 4xx".
 */
function errorMessage(err: unknown): string {
    if (isAxiosError(err)) {
        const body = err.response?.data as { message?: string } | undefined;
        return body?.message ?? err.message;
    }
    return "Something went wrong";
}

/**
 * POST /sessions — exchange credentials for a short-lived access token. The
 * refresh token comes back as an httpOnly cookie the JS never sees.
 * Inputs are validated by the caller (screen) against ZAuthenticateRequest.
 */
export async function authenticate(
    body: AuthenticateRequest
): Promise<Result<AuthenticateResponse, string>> {
    try {
        const { data } = await api.post("/sessions", body);
        return Ok(ZAuthenticateResponse.parse(data));
    } catch (err) {
        return Err(errorMessage(err));
    }
}

/**
 * POST /users — create an account. Returns 201 with an empty body (no token),
 * so callers must authenticate afterwards to start a session. `confirmPassword`
 * is a client-only check and is never sent to the server.
 */
export async function register(
    body: RegisterUserRequest
): Promise<Result<void, string>> {
    try {
        const { email, password, username } = body;
        await api.post("/users", { email, password, username });
        return Ok(undefined);
    } catch (err) {
        return Err(errorMessage(err));
    }
}

/**
 * PATCH /users/password — change the signed-in user's password (Bearer auth via
 * the request interceptor). Returns 204. `confirmPassword` is client-only.
 */
export async function changePassword(
    body: ChangePasswordRequest
): Promise<Result<void, string>> {
    try {
        const { currentPassword, newPassword } = body;
        await api.patch("/users/password", { currentPassword, newPassword });
        return Ok(undefined);
    } catch (err) {
        return Err(errorMessage(err));
    }
}
