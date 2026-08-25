import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { simulatePurchase } from "@/backend/finance";
import { currentMonthValue, getRunningBalance } from "@/backend/queries/balance";
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

  const { startingBalanceCents } = await getRunningBalance(
    user.id,
    currentMonthValue()
  );

  const result = simulatePurchase({
    currentBalanceCents: startingBalanceCents,
    amountCents: parsed.data.amountCents,
  });

  return NextResponse.json({ ...result, currentBalanceCents: startingBalanceCents });
}
