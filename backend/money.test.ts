import { describe, expect, it } from "vitest";
import { currencySymbol, formatCents, parseEurosToCents, parseSignedEurosToCents } from "./money";

// Intl.NumberFormat("fr-FR") inserts non-breaking space variants (U+00A0,
// U+202F) around the currency sign and as a thousands separator; normalize
// them to a regular space so assertions don't depend on which one is used.
function normalizeSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

describe("formatCents", () => {
  it("formats cents as euros with a comma decimal separator", () => {
    expect(normalizeSpaces(formatCents(185042))).toBe("1 850,42 €");
  });

  it("formats zero correctly", () => {
    expect(normalizeSpaces(formatCents(0))).toBe("0,00 €");
  });

  it("formats negative amounts (e.g. an overdraft)", () => {
    expect(normalizeSpaces(formatCents(-500))).toBe("-5,00 €");
  });

  it("forces 2 decimals for TND even though its ISO 4217 native precision is 3", () => {
    expect(normalizeSpaces(formatCents(150055, "TND"))).toBe("1 500,55 TND");
  });

  it("formats USD with the requested currency", () => {
    expect(normalizeSpaces(formatCents(185042, "USD"))).toBe("1 850,42 $US");
  });
});

describe("currencySymbol", () => {
  it("defaults to the euro sign", () => {
    expect(currencySymbol()).toBe("€");
  });

  it("returns the suffix for TND", () => {
    expect(currencySymbol("TND")).toBe("TND");
  });

  it("returns the suffix for USD", () => {
    expect(currencySymbol("USD")).toBe("$US");
  });
});

describe("parseEurosToCents", () => {
  it("parses a comma-separated amount", () => {
    expect(parseEurosToCents("1850,42")).toBe(185042);
  });

  it("parses a dot-separated amount", () => {
    expect(parseEurosToCents("1850.42")).toBe(185042);
  });

  it("parses a whole number", () => {
    expect(parseEurosToCents("2400")).toBe(240000);
  });

  it("rounds to the nearest cent", () => {
    expect(parseEurosToCents("10.005")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseEurosToCents("")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseEurosToCents("abc")).toBeNull();
  });

  it("rejects a negative amount", () => {
    expect(parseEurosToCents("-100")).toBeNull();
  });
});

describe("parseSignedEurosToCents", () => {
  it("parses a positive amount", () => {
    expect(parseSignedEurosToCents("1200")).toBe(120000);
  });

  it("parses a negative amount (overdrawn balance)", () => {
    expect(parseSignedEurosToCents("-50,25")).toBe(-5025);
  });

  it("rejects non-numeric input", () => {
    expect(parseSignedEurosToCents("-abc")).toBeNull();
  });
});
