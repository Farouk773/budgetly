import { describe, expect, it } from "vitest";
import { expenseInputSchema } from "./expense";

const base = {
  categoryId: "cat_123",
  amountCents: "4590",
  date: "2026-08-15",
};

describe("expenseInputSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(expenseInputSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an amount of zero", () => {
    const result = expenseInputSchema.safeParse({ ...base, amountCents: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = expenseInputSchema.safeParse({
      ...base,
      amountCents: "-500",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing category", () => {
    const result = expenseInputSchema.safeParse({ ...base, categoryId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = expenseInputSchema.safeParse({ ...base, date: "15/08/2026" });
    expect(result.success).toBe(false);
  });

  it("treats an empty label as absent", () => {
    const result = expenseInputSchema.safeParse({ ...base, label: "" });
    expect(result.success && result.data.label).toBeUndefined();
  });
});
