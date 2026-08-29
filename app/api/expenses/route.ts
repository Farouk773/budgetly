import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toExpenseDto } from "@/backend/serializers/expense";
import { expenseInputSchema } from "@/backend/validations/expense";

function parseMonthRange(month: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { gte: start, lt: end };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const monthRange = parseMonthRange(request.nextUrl.searchParams.get("month"));

  const expenses = await prisma.expense.findMany({
    where: { userId: user.id, ...(monthRange ? { date: monthRange } : {}) },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ expenses: expenses.map(toExpenseDto) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = expenseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      userId: user.id,
      categoryId: parsed.data.categoryId,
      label: parsed.data.label,
      amountCents: parsed.data.amountCents,
      date: new Date(parsed.data.date),
    },
    include: { category: true },
  });

  return NextResponse.json({ expense: toExpenseDto(expense) }, { status: 201 });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const result = await prisma.expense.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ count: result.count });
}
