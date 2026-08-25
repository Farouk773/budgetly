import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { currentMonthValue, getDeclaredBalance, getMonthlyBudget } from "@/backend/queries/balance";
import { updateBalanceSchema } from "@/backend/validations/balance";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentMonthValue();

  const [budget, declared] = await Promise.all([
    getMonthlyBudget(user.id, month),
    getDeclaredBalance(user.id),
  ]);

  return NextResponse.json({ ...budget, ...declared });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateBalanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      balanceCents: parsed.data.balanceCents,
      balanceAsOf: now,
      balanceSource: parsed.data.balanceSource,
    },
  });

  return NextResponse.json({
    balanceCents: parsed.data.balanceCents,
    balanceAsOf: now.toISOString(),
    balanceSource: parsed.data.balanceSource ?? null,
  });
}
