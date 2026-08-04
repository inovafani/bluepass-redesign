-- CreateEnum
CREATE TYPE "OperatorLeadStatus" AS ENUM ('IMPORTED', 'CLAIM_LINK_REQUESTED', 'CLAIM_SUBMITTED', 'APPROVED', 'LIVE', 'DECLINED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "OperatorPmsReadinessStatus" AS ENUM ('NEEDS_CREDENTIALS', 'CREDENTIALS_SUBMITTED', 'CONNECTED', 'SYNCED', 'MANUAL_REVIEW');

-- CreateTable
CREATE TABLE "OperatorLead" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "region" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "claimUrl" TEXT,
    "websiteUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'csv',
    "status" "OperatorLeadStatus" NOT NULL DEFAULT 'IMPORTED',
    "lastOutreachAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorClaimToken" (
    "id" TEXT NOT NULL,
    "operatorLeadId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorOutreachEvent" (
    "id" TEXT NOT NULL,
    "operatorLeadId" TEXT,
    "operatorSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorOutreachEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorPmsReadiness" (
    "id" TEXT NOT NULL,
    "operatorProfileId" TEXT NOT NULL,
    "platform" "PmsPlatform" NOT NULL,
    "status" "OperatorPmsReadinessStatus" NOT NULL DEFAULT 'NEEDS_CREDENTIALS',
    "contactEmail" TEXT,
    "contactWhatsapp" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorPmsReadiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorLead_slug_key" ON "OperatorLead"("slug");

-- CreateIndex
CREATE INDEX "OperatorLead_status_idx" ON "OperatorLead"("status");

-- CreateIndex
CREATE INDEX "OperatorLead_email_idx" ON "OperatorLead"("email");

-- CreateIndex
CREATE INDEX "OperatorLead_region_idx" ON "OperatorLead"("region");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorClaimToken_tokenHash_key" ON "OperatorClaimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OperatorClaimToken_operatorLeadId_idx" ON "OperatorClaimToken"("operatorLeadId");

-- CreateIndex
CREATE INDEX "OperatorClaimToken_email_idx" ON "OperatorClaimToken"("email");

-- CreateIndex
CREATE INDEX "OperatorClaimToken_expiresAt_idx" ON "OperatorClaimToken"("expiresAt");

-- CreateIndex
CREATE INDEX "OperatorOutreachEvent_operatorLeadId_idx" ON "OperatorOutreachEvent"("operatorLeadId");

-- CreateIndex
CREATE INDEX "OperatorOutreachEvent_operatorSlug_idx" ON "OperatorOutreachEvent"("operatorSlug");

-- CreateIndex
CREATE INDEX "OperatorOutreachEvent_type_idx" ON "OperatorOutreachEvent"("type");

-- CreateIndex
CREATE INDEX "OperatorOutreachEvent_createdAt_idx" ON "OperatorOutreachEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorPmsReadiness_operatorProfileId_key" ON "OperatorPmsReadiness"("operatorProfileId");

-- CreateIndex
CREATE INDEX "OperatorPmsReadiness_status_idx" ON "OperatorPmsReadiness"("status");

-- CreateIndex
CREATE INDEX "OperatorPmsReadiness_platform_idx" ON "OperatorPmsReadiness"("platform");

-- AddForeignKey
ALTER TABLE "OperatorClaimToken" ADD CONSTRAINT "OperatorClaimToken_operatorLeadId_fkey" FOREIGN KEY ("operatorLeadId") REFERENCES "OperatorLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorOutreachEvent" ADD CONSTRAINT "OperatorOutreachEvent_operatorLeadId_fkey" FOREIGN KEY ("operatorLeadId") REFERENCES "OperatorLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorPmsReadiness" ADD CONSTRAINT "OperatorPmsReadiness_operatorProfileId_fkey" FOREIGN KEY ("operatorProfileId") REFERENCES "OperatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
