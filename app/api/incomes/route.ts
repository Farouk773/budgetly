import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toIncomeDto } from "@/backend/serializers/income";
import { generateStoredName, savePayslipFile } from "@/backend/storage";
import {
  ALLOWED_PAYSLIP_MIME_TYPES,
  incomeFormSchema,
  MAX_PAYSLIP_SIZE_BYTES,
} from "@/backend/validations/income";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const incomes = await prisma.income.findMany({
    where: { userId: user.id },
    orderBy: { periodMonth: "desc" },
  });

  return NextResponse.json({ incomes: incomes.map(toIncomeDto) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const parsed = incomeFormSchema.safeParse({
    type: form.get("type"),
    label: form.get("label") ?? undefined,
    netAmountCents: form.get("netAmountCents"),
    grossAmountCents: form.get("grossAmountCents") ?? undefined,
    contributionsCents: form.get("contributionsCents") ?? undefined,
    bonusCents: form.get("bonusCents") ?? undefined,
    overtimeCents: form.get("overtimeCents") ?? undefined,
    periodMonth: form.get("periodMonth"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const payslip = form.get("payslip");
  let payslipOriginalName: string | undefined;
  let payslipStoredName: string | undefined;
  let payslipMimeType: string | undefined;

  if (payslip instanceof File && payslip.size > 0) {
    if (!ALLOWED_PAYSLIP_MIME_TYPES.includes(payslip.type)) {
      return NextResponse.json(
        { error: "Format de fichier non supporté (PDF, JPG, PNG, WEBP uniquement)" },
        { status: 400 }
      );
    }
    if (payslip.size > MAX_PAYSLIP_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (10 Mo maximum)" },
        { status: 400 }
      );
    }

    const storedName = generateStoredName(payslip.type);
    const buffer = Buffer.from(await payslip.arrayBuffer());
    await savePayslipFile(user.id, storedName, buffer);

    payslipOriginalName = payslip.name;
    payslipStoredName = storedName;
    payslipMimeType = payslip.type;
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
  } = parsed.data;

  const income = await prisma.income.create({
    data: {
      userId: user.id,
      type,
      label,
      netAmountCents,
      grossAmountCents,
      contributionsCents,
      bonusCents,
      overtimeCents,
      periodMonth: new Date(periodMonth),
      payslipOriginalName,
      payslipStoredName,
      payslipMimeType,
    },
  });

  return NextResponse.json({ income: toIncomeDto(income) }, { status: 201 });
}
