import type { NextRequest } from "next/server";
import { prisma } from "./prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export type RateLimitAction = "LOGIN" | "SIGNUP";

/**
 * Best-effort client IP extraction from standard proxy headers. Vercel sets
 * (and overwrites) `x-forwarded-for` on every request, which is what we rely
 * on in production. Falls back to `x-real-ip`, then "unknown" (still usable
 * as a rate-limit key — it just means every un-proxied caller shares one
 * bucket, which is the safe failure mode).
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

/**
 * Sliding-window brute-force / spam guard, backed by the `LoginAttempt`
 * table rather than an in-memory counter — a Vercel serverless invocation
 * is not guaranteed to reuse the same process, so an in-memory store would
 * silently reset on every cold start. Blocks once 5 matching attempts have
 * happened in the last 15 minutes, keyed by email OR IP, so both "target one
 * account" and "spray many accounts from one IP" are covered.
 *
 * For LOGIN, only failed attempts count — a correct password should never
 * lock out a legitimate user just because someone else guessed wrong first.
 * For SIGNUP, every attempt counts (successful or not): the risk there is
 * mass account creation, not repeated failures.
 *
 * Also opportunistically purges attempts older than the window on every
 * call, so the table never grows unbounded without needing a cron job.
 */
export async function isRateLimited(
  action: RateLimitAction,
  email: string,
  ip: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: windowStart } },
  });

  const onlyFailures = action === "LOGIN" ? { success: false } : {};

  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { action, email, createdAt: { gte: windowStart }, ...onlyFailures },
    }),
    prisma.loginAttempt.count({
      where: { action, ip, createdAt: { gte: windowStart }, ...onlyFailures },
    }),
  ]);

  return byEmail >= MAX_ATTEMPTS || byIp >= MAX_ATTEMPTS;
}

export async function recordAttempt(
  action: RateLimitAction,
  email: string,
  ip: string,
  success: boolean
): Promise<void> {
  await prisma.loginAttempt.create({ data: { action, email, ip, success } });
}
