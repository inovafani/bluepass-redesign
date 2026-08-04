-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('GHOST', 'CLAIMED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PmsPlatform" AS ENUM ('REZDY', 'FAREHARBOR', 'NATIVE');

-- CreateEnum
CREATE TYPE "CertLevel" AS ENUM ('NONE', 'OW', 'AOW', 'RESCUE', 'DIVEMASTER', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('QUOTE_DRAFTED', 'OPERATOR_NOTIFIED', 'OPERATOR_ACCEPTED', 'OPERATOR_DECLINED', 'COUNTER_REQUESTED', 'AUTO_DECLINED', 'PMS_HOLD_PLACED', 'AWAITING_PAYMENT', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('TRAVELLER', 'OPERATOR', 'SYSTEM', 'KAI');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('QUEUED', 'SENT', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OperatorStatus" NOT NULL DEFAULT 'GHOST',
    "whatsappE164" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceCents" INTEGER NOT NULL,
    "minCert" "CertLevel" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traveller" (
    "id" TEXT NOT NULL,
    "whatsappE164" TEXT NOT NULL,
    "displayName" TEXT,
    "certLevel" "CertLevel" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traveller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'QUOTE_DRAFTED',
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "creatorAttributionCode" TEXT,
    "pmsPlatform" "PmsPlatform" NOT NULL DEFAULT 'NATIVE',
    "pmsHoldId" TEXT,
    "pmsHoldExpiresAt" TIMESTAMP(3),
    "paymentLinkUrl" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaiSession" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KaiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConservationTransfer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransferStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConservationTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorIntegration" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "platform" "PmsPlatform" NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_operatorId_idx" ON "Trip"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Traveller_whatsappE164_key" ON "Traveller"("whatsappE164");

-- CreateIndex
CREATE INDEX "Booking_operatorId_status_idx" ON "Booking"("operatorId", "status");

-- CreateIndex
CREATE INDEX "Booking_travellerId_idx" ON "Booking"("travellerId");

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "KaiSession_travellerId_idx" ON "KaiSession"("travellerId");

-- CreateIndex
CREATE UNIQUE INDEX "ConservationTransfer_bookingId_key" ON "ConservationTransfer"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorIntegration_operatorId_platform_key" ON "OperatorIntegration"("operatorId", "platform");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KaiSession" ADD CONSTRAINT "KaiSession_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConservationTransfer" ADD CONSTRAINT "ConservationTransfer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorIntegration" ADD CONSTRAINT "OperatorIntegration_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
