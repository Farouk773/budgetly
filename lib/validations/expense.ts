import { z } from "zod";
import { centsField } from "./money";

export const expenseInputSchema = z.object({
  categoryId: z.string().min(1),
  label: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  amountCents: centsField,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
