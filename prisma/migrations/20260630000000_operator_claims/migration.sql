-- CreateEnum
CREATE TYPE "OperatorClaimStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "OperatorProfile"
ADD COLUMN "claimedOperatorSlug" TEXT,
ADD COLUMN "claimedYachtSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "claimedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OperatorClaim" (
    "id" TEXT NOT NULL,
    "operatorSlug" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "yachtSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "accountId" TEXT NOT NULL,
    "status" "OperatorClaimStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "claimantName" TEXT NOT NULL,
    "claimantEmail" TEXT NOT NULL,
    "claimantPhone" TEXT,
    "claimantRole" TEXT,
    "websiteUrl" TEXT,
    "proofUrl" TEXT,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperatorProfile_claimedOperatorSlug_idx" ON "OperatorProfile"("claimedOperatorSlug");

-- CreateIndex
CREATE INDEX "OperatorClaim_operatorSlug_idx" ON "OperatorClaim"("operatorSlug");

-- CreateIndex
CREATE INDEX "OperatorClaim_accountId_idx" ON "OperatorClaim"("accountId");

-- CreateIndex
CREATE INDEX "OperatorClaim_status_idx" ON "OperatorClaim"("status");

-- AddForeignKey
ALTER TABLE "OperatorClaim" ADD CONSTRAINT "OperatorClaim_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
