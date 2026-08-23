-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('SALARY', 'FREELANCE', 'OTHER');

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "IncomeType" NOT NULL,
    "label" TEXT,
    "netAmountCents" INTEGER NOT NULL,
    "grossAmountCents" INTEGER,
    "contributionsCents" INTEGER,
    "bonusCents" INTEGER,
    "overtimeCents" INTEGER,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "payslipOriginalName" TEXT,
    "payslipStoredName" TEXT,
    "payslipMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Income_userId_idx" ON "Income"("userId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
