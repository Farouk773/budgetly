import { describe, expect, it } from "vitest";
import { createLoanSchema, loanPaymentSchema } from "./loan";

const base = {
  name: "Prêt auto",
  remainingCents: "1000000",
  monthlyPaymentCents: "30000",
  annualRateBps: 600,
  endDate: "2030-01-01",
};

describe("createLoanSchema", () => {
  it("accepts a valid loan", () => {
    expect(createLoanSchema.safeParse(base).success).toBe(true);
  });

  it("defaults the rate to zero when omitted", () => {
    const { annualRateBps, ...withoutRate } = base;
    void annualRateBps;
    const result = createLoanSchema.safeParse(withoutRate);
    expect(result.success && result.data.annualRateBps).toBe(0);
  });

  it("rejects a payment that doesn't cover the monthly interest", () => {
    const result = createLoanSchema.safeParse({
      ...base,
      monthlyPaymentCents: "100",
      annualRateBps: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a zero-interest loan regardless of payment size", () => {
    const result = createLoanSchema.safeParse({
      ...base,
      monthlyPaymentCents: "1",
      annualRateBps: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createLoanSchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a rate above 100%", () => {
    const result = createLoanSchema.safeParse({ ...base, annualRateBps: 10001 });
    expect(result.success).toBe(false);
  });
});

describe("loanPaymentSchema", () => {
  it("rejects a negative payment", () => {
    expect(loanPaymentSchema.safeParse({ amountCents: "-100" }).success).toBe(
      false
    );
  });
});
