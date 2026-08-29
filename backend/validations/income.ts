import { z } from "zod";
import { centsField, optionalCentsField } from "./money";

// FormData/JSON both send booleans as strings by convention in this project
// (see incomeFormSchema below) — absent (checkbox not checked) transforms to
// `false`, the safe default: a form that forgets to send this field never
// silently creates a recurring income.
export const isRecurringField = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => v === "true");

export const incomeFormSchema = z.object({
  type: z.enum(["SALARY", "FREELANCE", "OTHER"]),
  label: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  netAmountCents: centsField,
  grossAmountCents: optionalCentsField,
  contributionsCents: optionalCentsField,
  bonusCents: optionalCentsField,
  overtimeCents: optionalCentsField,
  periodMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isRecurring: isRecurringField,
});

export const ALLOWED_PAYSLIP_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_PAYSLIP_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
