import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toSavingsGoalDto } from "@/backend/serializers/savingsGoal";
import { contributeSchema } from "@/backend/validations/savingsGoal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.savingsGoal.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = contributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const [goal] = await prisma.$transaction([
    prisma.savingsGoal.update({
      where: { id },
      data: { currentCents: { increment: parsed.data.amountCents } },
    }),
    prisma.savingsContribution.create({
      data: {
        savingsGoalId: id,
        userId: user.id,
        amountCents: parsed.data.amountCents,
      },
    }),
  ]);

  return NextResponse.json({ savingsGoal: toSavingsGoalDto(goal) });
}
