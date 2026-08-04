-- AlterTable
ALTER TABLE "OperatorProfile" ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "OperatorProfile_stripeConnectAccountId_key" ON "OperatorProfile"("stripeConnectAccountId");
