import { describe, expect, it } from "vitest";
import {
  computeSavingsStreakMonths,
  evaluateBadges,
  generateMotivationMessage,
} from "./motivation";

describe("computeSavingsStreakMonths", () => {
  it("counts a streak including the current month", () => {
    expect(
      computeSavingsStreakMonths(
        ["2026-06", "2026-07", "2026-08"],
        "2026-08"
      )
    ).toBe(3);
  });

  it("still credits the streak if this month has no contribution yet", () => {
    expect(
      computeSavingsStreakMonths(["2026-06", "2026-07"], "2026-08")
    ).toBe(2);
  });

  it("breaks the streak when a full month is skipped", () => {
    expect(
      computeSavingsStreakMonths(["2026-05", "2026-06"], "2026-08")
    ).toBe(0);
  });

  it("returns zero with no contributions at all", () => {
    expect(computeSavingsStreakMonths([], "2026-08")).toBe(0);
  });

  it("counts a single contributed month as a streak of one", () => {
    expect(computeSavingsStreakMonths(["2026-08"], "2026-08")).toBe(1);
  });

  it("ignores duplicate entries for the same month", () => {
    expect(
      computeSavingsStreakMonths(["2026-08", "2026-08", "2026-07"], "2026-08")
    ).toBe(2);
  });
});

describe("generateMotivationMessage", () => {
  it("prioritizes a long savings streak over other signals", () => {
    const message = generateMotivationMessage({
      availableCents: -1000,
      previousAvailableCents: null,
      savingsStreakMonths: 4,
      hasCompletedSavingsGoal: false,
    });
    expect(message).toContain("4 mois");
  });

  it("stays calm and non-judgmental on a deficit month", () => {
    const message = generateMotivationMessage({
      availableCents: -5000,
      previousAvailableCents: null,
      savingsStreakMonths: 0,
      hasCompletedSavingsGoal: false,
    });
    expect(message.toLowerCase()).not.toMatch(/mauvais|échec|attention/);
  });

  it("celebrates improvement over the previous month", () => {
    const message = generateMotivationMessage({
      availableCents: 20000,
      previousAvailableCents: 5000,
      savingsStreakMonths: 0,
      hasCompletedSavingsGoal: false,
    });
    expect(message).toContain("mieux");
  });
});

describe("evaluateBadges", () => {
  it("marks nothing achieved with no real activity", () => {
    const badges = evaluateBadges({
      savingsStreakMonths: 0,
      hasCompletedSavingsGoal: false,
      hasPaidOffLoan: false,
      hasDeclaredBalance: false,
    });
    expect(badges.every((b) => !b.achieved)).toBe(true);
  });

  it("unlocks the 3-month streak badge but not the 6-month one at 3 months", () => {
    const badges = evaluateBadges({
      savingsStreakMonths: 3,
      hasCompletedSavingsGoal: false,
      hasPaidOffLoan: false,
      hasDeclaredBalance: false,
    });
    const streak3 = badges.find((b) => b.id === "savings-streak-3");
    const streak6 = badges.find((b) => b.id === "savings-streak-6");
    expect(streak3?.achieved).toBe(true);
    expect(streak6?.achieved).toBe(false);
  });
});
