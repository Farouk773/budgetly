import { SUPPORTED_CURRENCIES, type Currency } from "./types";

// Intl.NumberFormat applies each currency's native ISO 4217 decimal count
// (e.g. TND has 3 decimals natively) but amountCents always stores
// valeur_affichée × 100, never × 1000 — so decimals are forced to 2 for every
// supported currency to reflect exactly what's stored (see CURRENCY_PLAN.md §4).
const FORMATTERS: Record<Currency, Intl.NumberFormat> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((currency) => [
    currency,
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  ])
) as Record<Currency, Intl.NumberFormat>;

export function formatCents(cents: number, currency: Currency = "EUR"): string {
  return FORMATTERS[currency].format(cents / 100);
}

/** Symbole/suffixe de devise seul (ex. "€", "$US", "DT"), pour les labels de
 * formulaire ("Montant (€)") — dérivé du même formateur que formatCents pour
 * garantir une cohérence parfaite avec les montants affichés. */
export function currencySymbol(currency: Currency = "EUR"): string {
  const parts = FORMATTERS[currency].formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/** Parses a user-typed amount ("1234,56" or "1234.56") into integer cents. Returns null if invalid. */
export function parseEurosToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".").replace(/\s/g, "");
  if (normalized === "" || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(parseFloat(normalized) * 100);
}

/** Same as parseEurosToCents but allows a leading minus (e.g. an overdrawn declared balance). */
export function parseSignedEurosToCents(input: string): number | null {
  const trimmed = input.trim();
  const isNegative = trimmed.startsWith("-");
  const magnitude = parseEurosToCents(
    isNegative ? trimmed.slice(1) : trimmed
  );
  return magnitude === null ? null : isNegative ? -magnitude : magnitude;
}
