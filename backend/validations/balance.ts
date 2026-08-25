import { z } from "zod";
import { centsField, signedCentsField } from "./money";

export const updateBalanceSchema = z.object({
  balanceCents: signedCentsField,
  balanceSource: z.enum(["BANK", "CASH", "MIXED"]).optional(),
});

export const simulatePurchaseSchema = z.object({
  amountCents: centsField,
});
