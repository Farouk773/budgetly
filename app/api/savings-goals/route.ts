import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSavingsGoalDto } from "@/lib/serializers/savingsGoal";
import { createSavingsGoalSchema } from "@/lib/validations/savingsGoal";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ savingsGoals: goals.map(toSavingsGoalDto) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSavingsGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      targetCents: parsed.data.targetCents,
      currentCents: parsed.data.currentCents ?? 0,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
    },
  });

  return NextResponse.json(
    { savingsGoal: toSavingsGoalDto(goal) },
    { status: 201 }
  );
}
