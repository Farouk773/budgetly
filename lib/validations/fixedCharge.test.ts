import { describe, expect, it } from "vitest";
import { fixedChargeInputSchema } from "./fixedCharge";

const base = {
  categoryId: "cat_123",
  label: "Loyer",
  amountCents: "65000",
  dayOfMonth: 5,
};

describe("fixedChargeInputSchema", () => {
  it("accepts a minimal valid payload and defaults active to true", () => {
    const result = fixedChargeInputSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.success && result.data.active).toBe(true);
  });

  it("rejects an empty label", () => {
    const result = fixedChargeInputSchema.safeParse({ ...base, label: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects a day of month of 0", () => {
    const result = fixedChargeInputSchema.safeParse({ ...base, dayOfMonth: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a day of month above 31", () => {
    const result = fixedChargeInputSchema.safeParse({ ...base, dayOfMonth: 32 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = fixedChargeInputSchema.safeParse({
      ...base,
      amountCents: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("accepts active explicitly set to false", () => {
    const result = fixedChargeInputSchema.safeParse({ ...base, active: false });
    expect(result.success && result.data.active).toBe(false);
  });
});
