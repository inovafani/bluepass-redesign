-- CreateEnum
CREATE TYPE "OperatorListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'LIVE', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "OperatorListing" (
    "id" TEXT NOT NULL,
    "operatorProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "maxGuests" INTEGER,
    "priceSignal" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "status" "OperatorListingStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorListing_slug_key" ON "OperatorListing"("slug");

-- CreateIndex
CREATE INDEX "OperatorListing_operatorProfileId_idx" ON "OperatorListing"("operatorProfileId");

-- CreateIndex
CREATE INDEX "OperatorListing_status_idx" ON "OperatorListing"("status");

-- CreateIndex
CREATE INDEX "OperatorListing_region_idx" ON "OperatorListing"("region");

-- AddForeignKey
ALTER TABLE "OperatorListing" ADD CONSTRAINT "OperatorListing_operatorProfileId_fkey" FOREIGN KEY ("operatorProfileId") REFERENCES "OperatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
