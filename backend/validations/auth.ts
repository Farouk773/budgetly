import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/backend/types";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});
