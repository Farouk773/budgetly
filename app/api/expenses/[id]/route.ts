import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toExpenseDto } from "@/lib/serializers/expense";
import { expenseInputSchema } from "@/lib/validations/expense";

async function getOwnedExpense(userId: string, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.userId !== userId) return null;
  return expense;
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
  const existing = await getOwnedExpense(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
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

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      categoryId: parsed.data.categoryId,
      label: parsed.data.label,
      amountCents: parsed.data.amountCents,
      date: new Date(parsed.data.date),
    },
    include: { category: true },
  });

  return NextResponse.json({ expense: toExpenseDto(expense) });
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
  const existing = await getOwnedExpense(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({}, { status: 200 });
}
