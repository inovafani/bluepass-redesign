-- CreateEnum
CREATE TYPE "OperatorPayoutMethod" AS ENUM ('MANUAL_BANK_TRANSFER', 'STRIPE_CONNECT');

-- AlterTable
ALTER TABLE "OperatorProfile" ADD COLUMN     "country" TEXT,
ADD COLUMN     "encryptedPayoutDetails" TEXT,
ADD COLUMN     "payoutContactEmail" TEXT,
ADD COLUMN     "payoutMethod" "OperatorPayoutMethod" NOT NULL DEFAULT 'MANUAL_BANK_TRANSFER';
