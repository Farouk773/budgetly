-- CreateEnum
CREATE TYPE "BalanceSource" AS ENUM ('BANK', 'CASH', 'MIXED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balanceSource" "BalanceSource";
