/** Shifts a "YYYY-MM" month string by a number of months (can be negative). */
export function shiftMonth(month: string, deltaMonths: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + deltaMonths, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Formats a Date as its "YYYY-MM" month string (UTC, consistent with monthRange()). */
export function toMonthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Number of calendar days in a "YYYY-MM" month (UTC), for dense day-by-day
 * series that must fill in days with no data instead of skipping them. */
export function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  // Day 0 of the following month is the last day of `month`.
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}
