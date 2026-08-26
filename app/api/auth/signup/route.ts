import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/backend/generated/prisma/client";
import { prisma } from "@/backend/prisma";
import { createSession, hashPassword, SESSION_COOKIE_NAME } from "@/backend/auth";
import { signupSchema } from "@/backend/validations/auth";
import type { AuthUser } from "@/backend/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const { email, password, name, currency } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash, name, currency },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }
    throw err;
  }

  const { rawToken, expiresAt } = await createSession(user.id);
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    currency: user.currency,
  };

  const response = NextResponse.json({ user: authUser }, { status: 201 });
  response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
