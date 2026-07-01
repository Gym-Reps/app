import { z } from "zod";

export const ZPassword = z
    .string()
    .min(8, "Password is too short")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/,
        "Password must include at least 1 uppercase letter, 1 lowercase letter, and 1 special character"
    )

export const ZAuthenticateRequest = z.object({
    email: z.email(),
    password: ZPassword
})

export const ZAuthenticateResponse = z.object({
    token: z.string()
})

export const ZRegisterUserRequest = z.object({
    email: z.email("Input a valid e-mail."),
    username: z.string().min(3, "Username is too short").max(99, "Username is too long"),
    password: ZPassword,
    confirmPassword: ZPassword,
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], 
  });

export const ZChangePasswordRequest = z.object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: ZPassword,
    confirmPassword: ZPassword,
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export type AuthenticateRequest = z.infer<typeof ZAuthenticateRequest>
export type AuthenticateResponse = z.infer<typeof ZAuthenticateResponse>
export type RegisterUserRequest = z.infer<typeof ZRegisterUserRequest>
export type ChangePasswordRequest = z.infer<typeof ZChangePasswordRequest>