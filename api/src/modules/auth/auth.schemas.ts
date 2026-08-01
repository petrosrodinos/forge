import { z } from "zod";
import { AUTH_CONFIG } from "./config/auth.config";

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(AUTH_CONFIG.PASSWORD_MIN_LENGTH),
});

export const updateMeBodySchema = z
  .object({
    email: z.string().trim().email().optional(),
    displayName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => {
        if (value == null) return undefined;
        return value.length > 0 ? value : null;
      }),
    currentPassword: z.string().min(1).optional(),
  })
  .refine((data) => data.email !== undefined || data.displayName !== undefined, {
    message: "At least one of email or displayName is required",
  });

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(AUTH_CONFIG.PASSWORD_MIN_LENGTH).max(128),
});
