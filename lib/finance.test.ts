import { describe, expect, it } from "vitest";
import {
  combineMonthlyBudgets,
  computeMonthlyAvailableCents,
  computeRemainingMonths,
  simulateEarlyRepayment,
  simulatePurchase,
  suggestSavingsCents,
} from "./finance";

describe("combineMonthlyBudgets", () => {
  it("sums two people's budgets into a household total", () => {
    const result = combineMonthlyBudgets([
      { incomeCents: 200000, fixedChargesCents: 80000, loanPaymentsCents: 0, expensesCents: 30000 },
      { incomeCents: 150000, fixedChargesCents: 20000, loanPaymentsCents: 15000, expensesCents: 10000 },
    ]);
    expect(result).toEqual({
      incomeCents: 350000,
      fixedChargesCents: 100000,
      loanPaymentsCents: 15000,
      expensesCents: 40000,
      availableCents: 195000,
    });
  });

  it("returns all zeros for an empty household", () => {
    expect(combineMonthlyBudgets([])).toEqual({
      incomeCents: 0,
      fixedChargesCents: 0,
      loanPaymentsCents: 0,
      expensesCents: 0,
      availableCents: 0,
    });
  });

  it("passes a single budget through unchanged", () => {
    const budget = {
      incomeCents: 100000,
      fixedChargesCents: 50000,
      loanPaymentsCents: 0,
      expensesCents: 20000,
    };
    expect(combineMonthlyBudgets([budget])).toEqual({
      ...budget,
      availableCents: 30000,
    });
  });
});

describe("computeMonthlyAvailableCents", () => {
  it("subtracts fixed charges, loan payments and expenses from income", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 200000,
        fixedChargesCents: 80000,
        loanPaymentsCents: 20000,
        expensesCents: 30000,
      })
    ).toBe(70000);
  });

  it("returns zero when income exactly covers charges and expenses", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 100000,
        fixedChargesCents: 60000,
        loanPaymentsCents: 0,
        expensesCents: 40000,
      })
    ).toBe(0);
  });

  it("can go negative when spending exceeds income", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 50000,
        fixedChargesCents: 60000,
        loanPaymentsCents: 0,
        expensesCents: 10000,
      })
    ).toBe(-20000);
  });

  it("handles a month with no income at all", () => {
    expect(
      computeMonthlyAvailableCents({
        incomeCents: 0,
        fixedChargesCents: 60000,
        loanPaymentsCents: 0,
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

describe("suggestSavingsCents", () => {
  it("suggests a fraction of what's left by default (20%)", () => {
    expect(suggestSavingsCents(100000)).toBe(20000);
  });

  it("suggests nothing when there's nothing left", () => {
    expect(suggestSavingsCents(0)).toBe(0);
  });

  it("suggests nothing when the month is in deficit", () => {
    expect(suggestSavingsCents(-50000)).toBe(0);
  });

  it("supports a custom ratio", () => {
    expect(suggestSavingsCents(100000, 0.5)).toBe(50000);
  });

  it("rounds to the nearest cent", () => {
    expect(suggestSavingsCents(10001)).toBe(2000);
  });
});

describe("computeRemainingMonths", () => {
  it("divides evenly when there is no interest", () => {
    expect(
      computeRemainingMonths({
        remainingCents: 120000,
        monthlyPaymentCents: 10000,
        annualRateBps: 0,
      })
    ).toBe(12);
  });

  it("rounds up a partial final month with no interest", () => {
    expect(
      computeRemainingMonths({
        remainingCents: 125000,
        monthlyPaymentCents: 10000,
        annualRateBps: 0,
      })
    ).toBe(13);
  });

  it("returns zero for an already-paid-off loan", () => {
    expect(
      computeRemainingMonths({
        remainingCents: 0,
        monthlyPaymentCents: 10000,
        annualRateBps: 500,
      })
    ).toBe(0);
  });

  it("returns Infinity when the payment doesn't cover monthly interest", () => {
    expect(
      computeRemainingMonths({
        remainingCents: 1_000_000,
        monthlyPaymentCents: 100,
        annualRateBps: 2000,
      })
    ).toBe(Infinity);
  });

  it("matches an independent month-by-month amortization simulation", () => {
    const remainingCents = 1_000_000;
    const monthlyPaymentCents = 30000;
    const annualRateBps = 600;
    const monthlyRate = annualRateBps / 10_000 / 12;

    const months = computeRemainingMonths({
      remainingCents,
      monthlyPaymentCents,
      annualRateBps,
    });

    function balanceAfter(n: number): number {
      let balance = remainingCents;
      for (let i = 0; i < n; i++) {
        balance = balance * (1 + monthlyRate) - monthlyPaymentCents;
      }
      return balance;
    }

    expect(balanceAfter(months)).toBeLessThanOrEqual(1);
    expect(balanceAfter(months - 1)).toBeGreaterThan(0);
  });
});

describe("simulateEarlyRepayment", () => {
  it("saves no interest on a zero-rate loan (just finishes earlier)", () => {
    const result = simulateEarlyRepayment({
      remainingCents: 120000,
      monthlyPaymentCents: 10000,
      annualRateBps: 0,
      extraPaymentCents: 20000,
    });
    expect(result).toEqual({
      monthsBefore: 12,
      monthsAfter: 10,
      monthsSaved: 2,
      interestSavedCents: 0,
    });
  });

  it("saves both months and interest on an interest-bearing loan", () => {
    const result = simulateEarlyRepayment({
      remainingCents: 1_000_000,
      monthlyPaymentCents: 30000,
      annualRateBps: 600,
      extraPaymentCents: 200000,
    });
    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.interestSavedCents).toBeGreaterThan(0);
  });

  it("pays off the loan immediately when the extra payment covers the balance", () => {
    const result = simulateEarlyRepayment({
      remainingCents: 50000,
      monthlyPaymentCents: 10000,
      annualRateBps: 300,
      extraPaymentCents: 100000,
    });
    expect(result.monthsAfter).toBe(0);
  });
});
