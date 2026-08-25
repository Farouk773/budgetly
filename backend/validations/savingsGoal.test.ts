import { describe, expect, it } from "vitest";
import { contributeSchema, createSavingsGoalSchema } from "./savingsGoal";

describe("createSavingsGoalSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = createSavingsGoalSchema.safeParse({
      name: "Vacances",
      targetCents: "200000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createSavingsGoalSchema.safeParse({
      name: "",
      targetCents: "200000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative target", () => {
    const result = createSavingsGoalSchema.safeParse({
      name: "Vacances",
      targetCents: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional starting progress", () => {
    const result = createSavingsGoalSchema.safeParse({
      name: "Vacances",
      targetCents: "200000",
      currentCents: "50000",
    });
    expect(result.success && result.data.currentCents).toBe(50000);
  });
});

describe("contributeSchema", () => {
  it("rejects a negative contribution", () => {
    const result = contributeSchema.safeParse({ amountCents: "-100" });
    expect(result.success).toBe(false);
  });

  it("accepts a positive contribution", () => {
    const result = contributeSchema.safeParse({ amountCents: "5000" });
    expect(result.success).toBe(true);
  });
});
