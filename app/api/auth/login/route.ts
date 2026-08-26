import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/backend/prisma";
import {
  createSession,
  verifyPassword,
  SESSION_COOKIE_NAME,
  DUMMY_PASSWORD_HASH,
} from "@/backend/auth";
import { loginSchema } from "@/backend/validations/auth";
import { getClientIp, isRateLimited, recordAttempt } from "@/backend/rate-limit";
import type { AuthUser } from "@/backend/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(request);

  if (await isRateLimited("LOGIN", email, ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessayez plus tard" },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt.compare, even when the user doesn't exist, so
  // "unknown email" and "wrong password" take the same amount of time and
  // can't be distinguished via response timing (see SECURITY_AUDIT_PLAN.md
  // section 6, point 6).
  const isValid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!user || !isValid) {
    await recordAttempt("LOGIN", email, ip, false);
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  const { rawToken, expiresAt } = await createSession(user.id);
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    currency: user.currency,
  };

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
