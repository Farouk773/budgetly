import { z } from "zod";
import { centsField } from "./money";

const rateBpsField = z.coerce.number().int().min(0).max(10_000); // 0% to 100%

// A payment that doesn't even cover the monthly interest would let the debt
// grow forever (computeRemainingMonths returns Infinity, which isn't valid
// JSON) — reject that combination up front instead of producing a loan that
// can never be paid off under this model.
function paymentCoversInterest(data: {
  remainingCents: number;
  monthlyPaymentCents: number;
  annualRateBps: number;
}): boolean {
  const monthlyRate = data.annualRateBps / 10_000 / 12;
  if (monthlyRate === 0) return true;
  return data.monthlyPaymentCents > monthlyRate * data.remainingCents;
}

export const createLoanSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    remainingCents: centsField,
    monthlyPaymentCents: centsField,
    annualRateBps: rateBpsField.optional().default(0),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine(paymentCoversInterest, {
    message: "La mensualité ne couvre pas les intérêts",
    path: ["monthlyPaymentCents"],
  });

export const updateLoanSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    remainingCents: centsField.optional(),
    monthlyPaymentCents: centsField.optional(),
    annualRateBps: rateBpsField.optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.remainingCents === undefined ||
      data.monthlyPaymentCents === undefined ||
      paymentCoversInterest({
        remainingCents: data.remainingCents,
        monthlyPaymentCents: data.monthlyPaymentCents,
        annualRateBps: data.annualRateBps ?? 0,
      }),
    { message: "La mensualité ne couvre pas les intérêts", path: ["monthlyPaymentCents"] }
  );

export const loanPaymentSchema = z.object({
  amountCents: centsField,
});

export const earlyRepaymentSimulationSchema = z.object({
  extraPaymentCents: centsField,
});
