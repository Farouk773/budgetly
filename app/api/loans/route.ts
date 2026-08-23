import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toLoanDto } from "@/lib/serializers/loan";
import { createLoanSchema } from "@/lib/validations/loan";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const loans = await prisma.loan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ loans: loans.map(toLoanDto) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const loan = await prisma.loan.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      remainingCents: parsed.data.remainingCents,
      monthlyPaymentCents: parsed.data.monthlyPaymentCents,
      annualRateBps: parsed.data.annualRateBps,
      dueDayOfMonth: parsed.data.dueDayOfMonth,
      endDate: new Date(parsed.data.endDate),
    },
  });

  return NextResponse.json({ loan: toLoanDto(loan) }, { status: 201 });
}
