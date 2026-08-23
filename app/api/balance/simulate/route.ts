import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { simulatePurchase } from "@/lib/finance";
import { getDeclaredBalance } from "@/lib/queries/balance";
import { simulatePurchaseSchema } from "@/lib/validations/balance";

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

  const { balanceCents } = await getDeclaredBalance(user.id);
  if (balanceCents === null) {
    return NextResponse.json(
      { error: "Renseigne d'abord ton solde actuel" },
      { status: 409 }
    );
  }

  const result = simulatePurchase({
    currentBalanceCents: balanceCents,
    amountCents: parsed.data.amountCents,
  });

  return NextResponse.json({ ...result, currentBalanceCents: balanceCents });
}
