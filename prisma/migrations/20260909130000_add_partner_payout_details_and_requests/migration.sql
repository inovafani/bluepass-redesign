-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "encryptedPayoutDetails" TEXT;

-- CreateEnum
CREATE TYPE "PartnerPayoutRequestStatus" AS ENUM ('PENDING', 'PAID', 'DECLINED');

-- CreateTable
CREATE TABLE "PartnerPayoutRequest" (
    "id" TEXT NOT NULL,
    "referralPartnerId" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PartnerPayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "paidReference" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declinedBy" TEXT,
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerPayoutRequest_referralPartnerId_idx" ON "PartnerPayoutRequest"("referralPartnerId");

-- CreateIndex
CREATE INDEX "PartnerPayoutRequest_status_idx" ON "PartnerPayoutRequest"("status");

-- AddForeignKey
ALTER TABLE "PartnerPayoutRequest" ADD CONSTRAINT "PartnerPayoutRequest_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
