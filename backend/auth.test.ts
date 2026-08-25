import { afterAll, describe, expect, it } from "vitest";
import {
  createSession,
  hashPassword,
  invalidateSession,
  validateSessionToken,
  verifyPassword,
} from "./auth";
import { prisma } from "./prisma";

describe("password hashing", () => {
  it("verifies a matching password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(
      verifyPassword("correct-horse-battery-staple", hash)
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("sessions", () => {
  const testEmail = `test-session-${Date.now()}@example.com`;
  let userId: string;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it("creates a session and validates it against the right user", async () => {
    const user = await prisma.user.create({
      data: { email: testEmail, passwordHash: await hashPassword("irrelevant") },
    });
    userId = user.id;

    const { rawToken, expiresAt } = await createSession(userId);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const validated = await validateSessionToken(rawToken);
    expect(validated?.id).toBe(userId);
    expect(validated?.email).toBe(testEmail);
  });

  it("returns null for a token that doesn't exist", async () => {
    const validated = await validateSessionToken("not-a-real-token");
    expect(validated).toBeNull();
  });

  it("invalidates a session so the token can no longer be used", async () => {
    const { rawToken } = await createSession(userId);
    await invalidateSession(rawToken);

    const validated = await validateSessionToken(rawToken);
    expect(validated).toBeNull();
  });
});
