const EUR_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number): string {
  return EUR_FORMATTER.format(cents / 100);
}

/** Parses a user-typed amount ("1234,56" or "1234.56") into integer cents. Returns null if invalid. */
export function parseEurosToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".").replace(/\s/g, "");
  if (normalized === "" || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(parseFloat(normalized) * 100);
}
