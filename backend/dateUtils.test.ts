import { describe, expect, it } from "vitest";
import { shiftMonth, toMonthString } from "./dateUtils";

describe("shiftMonth", () => {
  it("goes back one month within the same year", () => {
    expect(shiftMonth("2026-08", -1)).toBe("2026-07");
  });

  it("crosses back over a year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("goes forward one month", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("returns the same month with a zero delta", () => {
    expect(shiftMonth("2026-08", 0)).toBe("2026-08");
  });
});

describe("toMonthString", () => {
  it("formats a date as YYYY-MM in UTC", () => {
    expect(toMonthString(new Date(Date.UTC(2026, 7, 24)))).toBe("2026-08");
  });

  it("pads single-digit months", () => {
    expect(toMonthString(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
  });
});
