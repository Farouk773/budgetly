import { describe, expect, it } from "vitest";
import { computeOverdraftRisk, daysUntilDue } from "./alerts";

describe("daysUntilDue", () => {
  it("returns zero when due today", () => {
    const today = new Date(Date.UTC(2026, 7, 15)); // 2026-08-15
    expect(daysUntilDue(15, today)).toBe(0);
  });

  it("counts forward within the same month", () => {
    const today = new Date(Date.UTC(2026, 7, 10)); // 2026-08-10
    expect(daysUntilDue(15, today)).toBe(5);
  });

  it("rolls over to next month once the day has passed", () => {
    const today = new Date(Date.UTC(2026, 7, 20)); // 2026-08-20
    // next Sept 5th is 16 days away
    expect(daysUntilDue(5, today)).toBe(16);
  });

  it("handles a year boundary", () => {
    const today = new Date(Date.UTC(2026, 11, 28)); // 2026-12-28
    expect(daysUntilDue(3, today)).toBe(6); // 2027-01-03
  });
});

describe("computeOverdraftRisk", () => {
  it("flags a risk when committed outflows exceed the balance", () => {
    const result = computeOverdraftRisk({
      balanceCents: 50000,
      upcomingCommittedCents: 80000,
    });
    expect(result).toEqual({ atRisk: true, shortfallCents: 30000 });
  });

  it("finds no risk when the balance comfortably covers outflows", () => {
    const result = computeOverdraftRisk({
      balanceCents: 100000,
      upcomingCommittedCents: 80000,
    });
    expect(result).toEqual({ atRisk: false, shortfallCents: 0 });
  });

  it("treats an exact match as not at risk", () => {
    const result = computeOverdraftRisk({
      balanceCents: 80000,
      upcomingCommittedCents: 80000,
    });
    expect(result.atRisk).toBe(false);
  });

  it("flags risk immediately when the balance is already negative", () => {
    const result = computeOverdraftRisk({
      balanceCents: -1000,
      upcomingCommittedCents: 0,
    });
    expect(result).toEqual({ atRisk: true, shortfallCents: 1000 });
  });
});
