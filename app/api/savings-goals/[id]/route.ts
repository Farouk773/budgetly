import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSavingsGoalDto } from "@/lib/serializers/savingsGoal";
import { updateSavingsGoalSchema } from "@/lib/validations/savingsGoal";

async function getOwnedGoal(userId: string, id: string) {
  const goal = await prisma.savingsGoal.findUnique({ where: { id } });
  if (!goal || goal.userId !== userId) return null;
  return goal;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedGoal(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSavingsGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.update({
    where: { id },
    data: {
      name: parsed.data.name,
      targetCents: parsed.data.targetCents,
      currentCents: parsed.data.currentCents,
      targetDate:
        parsed.data.targetDate !== undefined
          ? new Date(parsed.data.targetDate)
          : undefined,
    },
  });

  return NextResponse.json({ savingsGoal: toSavingsGoalDto(goal) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedGoal(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.savingsGoal.delete({ where: { id } });
  return NextResponse.json({}, { status: 200 });
}
