import { email, z } from "zod" 

export const LoginSchema = z.object({
    email: z.email("Input a valid e-mail."),
    password: z
    .string()
    .min(8, "Password is too short")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/,
        "Password must include at least 1 uppercase letter, 1 lowercase letter, and 1 special character"
    )
})

export const CreateAccountSchema = z.object({
    email: z.email("Input a valid e-mail."),
    username: z.string().min(3, "Username is too short").max(99, "Username is too long"),
    password: z
    .string()
    .min(8, "Password is too short")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/,
        "Password must include at least 1 uppercase letter, 1 lowercase letter, and 1 special character"
    ),
    confirmPassword: z
    .string()
    .min(8, "Password is too short")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/,
        "Password must include at least 1 uppercase letter, 1 lowercase letter, and 1 special character"
    ),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], 
  });