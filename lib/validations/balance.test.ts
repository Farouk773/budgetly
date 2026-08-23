import { describe, expect, it } from "vitest";
import { simulatePurchaseSchema, updateBalanceSchema } from "./balance";

describe("updateBalanceSchema", () => {
  it("accepts a positive balance", () => {
    const result = updateBalanceSchema.safeParse({ balanceCents: "150000" });
    expect(result.success).toBe(true);
  });

  it("accepts a negative balance (overdrawn account)", () => {
    const result = updateBalanceSchema.safeParse({ balanceCents: "-5000" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.balanceCents).toBe(-5000);
  });

  it("accepts zero", () => {
    const result = updateBalanceSchema.safeParse({ balanceCents: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric value", () => {
    const result = updateBalanceSchema.safeParse({ balanceCents: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("simulatePurchaseSchema", () => {
  it("rejects a negative purchase amount", () => {
    const result = simulatePurchaseSchema.safeParse({ amountCents: "-100" });
    expect(result.success).toBe(false);
  });

  it("accepts a zero purchase amount", () => {
    const result = simulatePurchaseSchema.safeParse({ amountCents: "0" });
    expect(result.success).toBe(true);
  });
});
