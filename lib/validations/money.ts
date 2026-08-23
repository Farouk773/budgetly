import { z } from "zod";

export const centsField = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => parseInt(v, 10))
  .refine((v) => v >= 0 && v <= 100_000_000, "Montant invalide");

export const optionalCentsField = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : v))
  .pipe(centsField.optional());
