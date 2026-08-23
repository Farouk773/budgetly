import { describe, expect, it } from "vitest";
import { formatCents, parseEurosToCents } from "./money";

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
