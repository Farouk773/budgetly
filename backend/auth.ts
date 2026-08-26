import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { AuthUser } from "./types";
import { SESSION_COOKIE_NAME } from "./session-cookie";

export { SESSION_COOKIE_NAME };
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Precomputed bcrypt hash (cost 12) of an arbitrary constant string, never
// matched by any real password. Used to run `bcrypt.compare` even when the
// looked-up user doesn't exist, so "unknown email" and "wrong password" take
// the same amount of time and can't be told apart via response timing.
export const DUMMY_PASSWORD_HASH =
  "$2b$12$yIeWV/zfkYFMbAuLIkTKAu97zAK5.ASgTWqcmW3qUtwKUH7WAWjG.";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createSession(userId: string): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function validateSessionToken(
  rawToken: string
): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    createdAt: session.user.createdAt.toISOString(),
    currency: session.user.currency,
  };
}

export async function invalidateSession(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(rawToken) },
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return rawToken ? validateSessionToken(rawToken) : null;
}
