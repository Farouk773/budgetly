import { z } from "zod";
import { centsField, signedCentsField } from "./money";

export const updateBalanceSchema = z.object({
  balanceCents: signedCentsField,
});

export const simulatePurchaseSchema = z.object({
  amountCents: centsField,
});
