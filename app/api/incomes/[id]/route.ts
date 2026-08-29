import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toIncomeDto } from "@/backend/serializers/income";
import { deletePayslipFile } from "@/backend/storage";
import { incomeFormSchema } from "@/backend/validations/income";

async function getOwnedIncome(userId: string, id: string) {
  const income = await prisma.income.findUnique({ where: { id } });
  if (!income || income.userId !== userId) return null;
  return income;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const income = await getOwnedIncome(user.id, id);
  if (!income) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json({ income: toIncomeDto(income) });
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
  const existing = await getOwnedIncome(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = incomeFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const {
    type,
    label,
    netAmountCents,
    grossAmountCents,
    contributionsCents,
    bonusCents,
    overtimeCents,
    periodMonth,
    isRecurring,
  } = parsed.data;

  const income = await prisma.income.update({
    where: { id },
    data: {
      type,
      label,
      netAmountCents,
      grossAmountCents,
      contributionsCents,
      bonusCents,
      overtimeCents,
      periodMonth: new Date(periodMonth),
      isRecurring,
    },
  });

  return NextResponse.json({ income: toIncomeDto(income) });
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
  const existing = await getOwnedIncome(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.income.delete({ where: { id } });

  if (existing.payslipStoredName) {
    await deletePayslipFile(user.id, existing.payslipStoredName);
  }

  return NextResponse.json({}, { status: 200 });
}
