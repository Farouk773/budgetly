import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPayslipFile } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const income = await prisma.income.findUnique({ where: { id } });

  if (!income || income.userId !== user.id || !income.payslipStoredName) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const buffer = await readPayslipFile(user.id, income.payslipStoredName).catch(
    () => null
  );
  if (!buffer) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": income.payslipMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        income.payslipOriginalName ?? "fiche-de-paie"
      )}"`,
    },
  });
}
