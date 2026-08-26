-- CreateEnum
CREATE TYPE "LoginAttemptAction" AS ENUM ('LOGIN', 'SIGNUP');

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "action" "LoginAttemptAction" NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_action_email_createdAt_idx" ON "LoginAttempt"("action", "email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_action_ip_createdAt_idx" ON "LoginAttempt"("action", "ip", "createdAt");
