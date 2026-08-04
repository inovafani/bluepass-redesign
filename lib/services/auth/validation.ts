import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(128),
});

export const registerTravellerSchema = authCredentialsSchema.extend({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  next: z.string().trim().max(300).optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email().max(180),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(180),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8).max(128),
});

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
