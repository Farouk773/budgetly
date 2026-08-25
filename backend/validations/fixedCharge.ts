import { z } from "zod";
import { centsField } from "./money";

export const fixedChargeInputSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  amountCents: centsField,
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  active: z.boolean().optional().default(true),
});
