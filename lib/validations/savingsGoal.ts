import { z } from "zod";
import { centsField, optionalCentsField } from "./money";

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetCents: centsField,
  currentCents: optionalCentsField,
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial();

export const contributeSchema = z.object({
  amountCents: centsField,
});
