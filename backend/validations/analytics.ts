import { z } from "zod";

export const analyticsTypeSchema = z.enum(["depenses", "revenu", "epargne", "pret", "charges"]);

export const analyticsGranularitySchema = z.enum(["jour", "mois"]);

export const analyticsQuerySchema = z.object({
  granularite: analyticsGranularitySchema,
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  loanId: z.string().trim().min(1).optional(),
});
