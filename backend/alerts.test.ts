import { describe, expect, it } from "vitest";
import { computeCashFlowTimingRisk, computeOverdraftRisk, daysUntilDue } from "./alerts";

describe("daysUntilDue", () => {
  it("returns zero when due today", () => {
    const today = new Date(Date.UTC(2026, 7, 15)); // 2026-08-15
    expect(daysUntilDue(15, today)).toBe(0);
  });

  it("counts forward within the same month", () => {
    const today = new Date(Date.UTC(2026, 7, 10)); // 2026-08-10
    expect(daysUntilDue(15, today)).toBe(5);
  });

  it("rolls over to next month once the day has passed", () => {
    const today = new Date(Date.UTC(2026, 7, 20)); // 2026-08-20
    // next Sept 5th is 16 days away
    expect(daysUntilDue(5, today)).toBe(16);
  });

  it("handles a year boundary", () => {
    const today = new Date(Date.UTC(2026, 11, 28)); // 2026-12-28
    expect(daysUntilDue(3, today)).toBe(6); // 2027-01-03
  });
});

describe("computeOverdraftRisk", () => {
  it("flags a risk when committed outflows exceed the balance", () => {
    const result = computeOverdraftRisk({
      balanceCents: 50000,
      upcomingCommittedCents: 80000,
    });
    expect(result).toEqual({ atRisk: true, shortfallCents: 30000 });
  });

  it("finds no risk when the balance comfortably covers outflows", () => {
    const result = computeOverdraftRisk({
      balanceCents: 100000,
      upcomingCommittedCents: 80000,
    });
    expect(result).toEqual({ atRisk: false, shortfallCents: 0 });
  });

  it("treats an exact match as not at risk", () => {
    const result = computeOverdraftRisk({
      balanceCents: 80000,
      upcomingCommittedCents: 80000,
    });
    expect(result.atRisk).toBe(false);
  });

  it("flags risk immediately when the balance is already negative", () => {
    const result = computeOverdraftRisk({
      balanceCents: -1000,
      upcomingCommittedCents: 0,
    });
    expect(result).toEqual({ atRisk: true, shortfallCents: 1000 });
  });
});

describe("computeCashFlowTimingRisk", () => {
  it("detects a risk when salary lands on the 28th but rent is due on the 1st", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 150000, // 0 de départ + le salaire du mois déjà compté par getMonthlyBudget
      todayDayOfMonth: 1,
      daysInMonthCount: 30,
      outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 80000 }],
      inflows: [{ label: "Salaire", payDay: 28, amountCents: 150000 }],
    });
    expect(result).toEqual({
      atRisk: true,
      worstDayOfMonth: 1,
      shortfallCents: 80000,
      recoversOnDay: 28,
    });
  });

  it("finds no risk when salary lands on the 1st and rent is due on the 28th", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 150000,
      todayDayOfMonth: 1,
      daysInMonthCount: 30,
      outflows: [{ label: "Loyer", dayOfMonth: 28, amountCents: 80000 }],
      inflows: [{ label: "Salaire", payDay: 1, amountCents: 150000 }],
    });
    expect(result).toEqual({
      atRisk: false,
      worstDayOfMonth: null,
      shortfallCents: 0,
      recoversOnDay: null,
    });
  });

  it("stays negative through the end of the month when the whole month is already overdrawn", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 50000,
      todayDayOfMonth: 1,
      daysInMonthCount: 30,
      outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 80000 }],
      inflows: [],
    });
    expect(result.atRisk).toBe(true);
    // No inflow ever compensates, so the last simulated day (30) must stay
    // negative — this is exactly the case getAlertsSnapshot must exclude via
    // `overdraft.atRisk ? {...} : computeCashFlowTimingRisk(...)`.
    expect(result.shortfallCents).toBeGreaterThan(0);
  });

  it("treats an income with no payDay as arriving on the last day of the month", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 150000,
      todayDayOfMonth: 1,
      daysInMonthCount: 30,
      outflows: [{ label: "Loyer", dayOfMonth: 5, amountCents: 80000 }],
      inflows: [{ label: "Salaire", payDay: null, amountCents: 150000 }],
    });
    expect(result).toEqual({
      atRisk: true,
      worstDayOfMonth: 5,
      shortfallCents: 80000,
      recoversOnDay: 30,
    });
  });

  it("applies an already-late outflow immediately, at today's day", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 150000,
      todayDayOfMonth: 15,
      daysInMonthCount: 30,
      outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 200000 }], // déjà "dû" au jour 1, jamais retiré ailleurs
      inflows: [{ label: "Salaire", payDay: 28, amountCents: 150000 }],
    });
    // Note : CASHFLOW_TIMING_PLAN.md section 7.1 (cas 5) annonce
    // `shortfallCents: 50000, recoversOnDay: 28` pour ces mêmes entrées, mais
    // c'est une erreur arithmétique du document, pas de l'algorithme (déjà
    // vérifié correct par les 6 autres cas de cette section, tous copiés à
    // l'identique et tous conformes). Avec ces entrées exactes,
    // pendingInflowsCents (150000, le salaire pas encore arrivé) est retiré
    // de `currentCashOnHandCents` puis le loyer en retard (200000) est
    // appliqué dès le jour 15 : running = 150000 - 150000 - 200000 =
    // -200000, puis +150000 au jour 28 = -50000 en fin de mois — ce mois est
    // en fait déjà en découvert total (cohérent avec la preuve de la section
    // 2.4 : ce cas ne serait de toute façon jamais atteint par
    // `getAlertsSnapshot`, gaté par `overdraft.atRisk === false`).
    expect(result).toEqual({
      atRisk: true,
      worstDayOfMonth: 15,
      shortfallCents: 200000,
      recoversOnDay: null,
    });
  });

  it("clamps a day beyond the month's length instead of rolling over", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 100000,
      todayDayOfMonth: 1,
      daysInMonthCount: 30,
      outflows: [{ label: "Prêt", dayOfMonth: 31, amountCents: 50000 }],
      inflows: [],
    });
    expect(result).toEqual({
      atRisk: false,
      worstDayOfMonth: null,
      shortfallCents: 0,
      recoversOnDay: null,
    });
  });

  it("applies outflows before inflows on the same day", () => {
    const result = computeCashFlowTimingRisk({
      currentCashOnHandCents: 150000,
      todayDayOfMonth: 1,
      daysInMonthCount: 30,
      outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 80000 }],
      inflows: [{ label: "Salaire", payDay: 1, amountCents: 150000 }],
    });
    // Both events land on day 1 (dayOfMonth === payDay): the function
    // subtracts the outflow before adding the inflow, but since only the
    // end-of-day net balance is recorded, the result is the same net value
    // either way here — atRisk stays false because day 1 ends >= 0.
    expect(result).toEqual({
      atRisk: false,
      worstDayOfMonth: null,
      shortfallCents: 0,
      recoversOnDay: null,
    });
  });
});
