import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/backend/prisma";
import { createSession, verifyPassword, SESSION_COOKIE_NAME } from "@/backend/auth";
import { loginSchema } from "@/backend/validations/auth";
import type { AuthUser } from "@/backend/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  const isValid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !isValid) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  const { rawToken, expiresAt } = await createSession(user.id);
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name };

  const response = NextResponse.json({ user: authUser }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
