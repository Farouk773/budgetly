import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { simulatePurchase } from "@/backend/finance";
import { currentMonthValue, getMonthlyBudget, getRunningBalance } from "@/backend/queries/balance";
import { simulatePurchaseSchema } from "@/backend/validations/balance";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = simulatePurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const month = currentMonthValue();
  const [{ startingBalanceCents }, budget] = await Promise.all([
    getRunningBalance(user.id, month),
    getMonthlyBudget(user.id, month),
  ]);
  // Same figure as the dashboard hero number: start-of-month balance plus
  // what's already happened this month (income/expenses recorded so far) —
  // not just the stale start-of-month snapshot, otherwise the simulator can
  // say yes to a purchase you can no longer afford, or no to one you can.
  const currentBalanceCents = startingBalanceCents + budget.availableCents;

  const result = simulatePurchase({
    currentBalanceCents,
    amountCents: parsed.data.amountCents,
  });

  return NextResponse.json({ ...result, currentBalanceCents });
}
