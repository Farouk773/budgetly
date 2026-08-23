import { describe, expect, it } from "vitest";
import { computeMonthlyAvailableCents, simulatePurchase } from "./finance";

describe("computeMonthlyAvailableCents", () => {
  it("subtracts fixed charges and expenses from income", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 200000,
        fixedChargesCents: 80000,
        expensesCents: 30000,
      })
    ).toBe(90000);
  });

  it("returns zero when income exactly covers charges and expenses", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 100000,
        fixedChargesCents: 60000,
        expensesCents: 40000,
      })
    ).toBe(0);
  });

  it("can go negative when spending exceeds income", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 50000,
        fixedChargesCents: 60000,
        expensesCents: 10000,
      })
    ).toBe(-20000);
  });

  it("handles a month with no income at all", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 0,
        fixedChargesCents: 60000,
        expensesCents: 0,
      })
    ).toBe(-60000);
  });
});

describe("simulatePurchase", () => {
  it("marks a purchase affordable when balance stays positive", () => {
    const result = simulatePurchase({
      currentBalanceCents: 100000,
      amountCents: 30000,
    });
    expect(result).toEqual({ affordable: true, balanceAfterCents: 70000 });
  });

  it("marks a purchase affordable when it lands exactly on zero", () => {
    const result = simulatePurchase({
      currentBalanceCents: 50000,
      amountCents: 50000,
    });
    expect(result).toEqual({ affordable: true, balanceAfterCents: 0 });
  });

  it("marks a purchase unaffordable when it would overdraw the account", () => {
    const result = simulatePurchase({
      currentBalanceCents: 20000,
      amountCents: 20001,
    });
    expect(result).toEqual({ affordable: false, balanceAfterCents: -1 });
  });

  it("treats an already-overdrawn balance as unaffordable for any purchase", () => {
    const result = simulatePurchase({
      currentBalanceCents: -5000,
      amountCents: 100,
    });
    expect(result.affordable).toBe(false);
  });

  it("allows a zero-amount simulation to pass through unchanged", () => {
    const result = simulatePurchase({
      currentBalanceCents: 10000,
      amountCents: 0,
    });
    expect(result).toEqual({ affordable: true, balanceAfterCents: 10000 });
  });
});
