import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, SESSION_COOKIE_NAME, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAllPayslipFilesForUser } from "@/lib/storage";
import { deleteAccountSchema } from "@/lib/validations/account";

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const fullUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });
  const isValid = await verifyPassword(
    parsed.data.password,
    fullUser.passwordHash
  );
  if (!isValid) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  // cascades to sessions, incomes, expenses, fixed charges, loans, savings
  // goals/contributions and partner links via the schema's onDelete rules
  await prisma.user.delete({ where: { id: user.id } });
  await deleteAllPayslipFilesForUser(user.id);

  const response = NextResponse.json({}, { status: 200 });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
