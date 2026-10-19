-- Two-factor sign-in for dashboard accounts (rules.md §8.2). Additive only.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpPendingSecret" TEXT,
ADD COLUMN     "totpSecret" TEXT;
