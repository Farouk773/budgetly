import { describe, expect, it } from "vitest";
import { incomeFormSchema } from "./income";

const base = {
  type: "SALARY" as const,
  netAmountCents: "150000",
  periodMonth: "2026-08-01",
};

describe("incomeFormSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(incomeFormSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a net amount of zero", () => {
    const result = incomeFormSchema.safeParse({ ...base, netAmountCents: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = incomeFormSchema.safeParse({
      ...base,
      netAmountCents: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer amount", () => {
    const result = incomeFormSchema.safeParse({
      ...base,
      netAmountCents: "150000.5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an absurdly large amount", () => {
    const result = incomeFormSchema.safeParse({
      ...base,
      netAmountCents: "99999999999",
    });
    expect(result.success).toBe(false);
  });

  it("treats an empty optional field as absent", () => {
    const result = incomeFormSchema.safeParse({ ...base, grossAmountCents: "" });
    expect(result.success && result.data.grossAmountCents).toBeUndefined();
  });

  it("rejects an invalid income type", () => {
    const result = incomeFormSchema.safeParse({ ...base, type: "BONUS" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed period", () => {
    const result = incomeFormSchema.safeParse({ ...base, periodMonth: "2026-08" });
    expect(result.success).toBe(false);
  });

  it("defaults isRecurring to false when absent", () => {
    const result = incomeFormSchema.safeParse(base);
    expect(result.success && result.data.isRecurring).toBe(false);
  });

  it("parses isRecurring \"true\" as true", () => {
    const result = incomeFormSchema.safeParse({ ...base, isRecurring: "true" });
    expect(result.success && result.data.isRecurring).toBe(true);
  });

  it("parses isRecurring \"false\" as false", () => {
    const result = incomeFormSchema.safeParse({ ...base, isRecurring: "false" });
    expect(result.success && result.data.isRecurring).toBe(false);
  });

  it("rejects an arbitrary isRecurring value", () => {
    const result = incomeFormSchema.safeParse({ ...base, isRecurring: "oui" });
    expect(result.success).toBe(false);
  });
});
