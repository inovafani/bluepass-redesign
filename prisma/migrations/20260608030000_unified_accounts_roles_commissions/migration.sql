CREATE TYPE "BluePassAccountRole" AS ENUM ('TRAVELLER', 'CREATOR', 'OPERATOR', 'ADMIN');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'DECLINED', 'LIVE');

CREATE TABLE "BluePassAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "roles" "BluePassAccountRole"[] NOT NULL DEFAULT ARRAY['TRAVELLER']::"BluePassAccountRole"[],
    "travellerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BluePassAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BluePassAccountSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BluePassAccountSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BluePassAccountEmailVerificationToken" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BluePassAccountEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "handle" TEXT,
    "audienceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperatorProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "companyName" TEXT,
    "whatsappE164" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "bookingInquiryId" TEXT,
    "accountId" TEXT,
    "referralPartnerId" TEXT,
    "role" "BluePassAccountRole",
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ESTIMATED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BluePassAccount_email_key" ON "BluePassAccount"("email");
CREATE UNIQUE INDEX "BluePassAccount_travellerId_key" ON "BluePassAccount"("travellerId");
CREATE INDEX "BluePassAccount_email_idx" ON "BluePassAccount"("email");
CREATE INDEX "BluePassAccount_travellerId_idx" ON "BluePassAccount"("travellerId");

CREATE UNIQUE INDEX "BluePassAccountSession_tokenHash_key" ON "BluePassAccountSession"("tokenHash");
CREATE INDEX "BluePassAccountSession_accountId_idx" ON "BluePassAccountSession"("accountId");
CREATE INDEX "BluePassAccountSession_expiresAt_idx" ON "BluePassAccountSession"("expiresAt");

CREATE UNIQUE INDEX "BluePassAccountEmailVerificationToken_tokenHash_key" ON "BluePassAccountEmailVerificationToken"("tokenHash");
CREATE INDEX "BluePassAccountEmailVerificationToken_accountId_idx" ON "BluePassAccountEmailVerificationToken"("accountId");
CREATE INDEX "BluePassAccountEmailVerificationToken_email_idx" ON "BluePassAccountEmailVerificationToken"("email");
CREATE INDEX "BluePassAccountEmailVerificationToken_expiresAt_idx" ON "BluePassAccountEmailVerificationToken"("expiresAt");

CREATE UNIQUE INDEX "CreatorProfile_accountId_key" ON "CreatorProfile"("accountId");
CREATE INDEX "CreatorProfile_status_idx" ON "CreatorProfile"("status");
CREATE INDEX "CreatorProfile_handle_idx" ON "CreatorProfile"("handle");

CREATE UNIQUE INDEX "OperatorProfile_accountId_key" ON "OperatorProfile"("accountId");
CREATE INDEX "OperatorProfile_status_idx" ON "OperatorProfile"("status");
CREATE INDEX "OperatorProfile_companyName_idx" ON "OperatorProfile"("companyName");

CREATE INDEX "CommissionLedgerEntry_bookingInquiryId_idx" ON "CommissionLedgerEntry"("bookingInquiryId");
CREATE INDEX "CommissionLedgerEntry_accountId_idx" ON "CommissionLedgerEntry"("accountId");
CREATE INDEX "CommissionLedgerEntry_referralPartnerId_idx" ON "CommissionLedgerEntry"("referralPartnerId");
CREATE INDEX "CommissionLedgerEntry_status_idx" ON "CommissionLedgerEntry"("status");

ALTER TABLE "BluePassAccount" ADD CONSTRAINT "BluePassAccount_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BluePassAccountSession" ADD CONSTRAINT "BluePassAccountSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BluePassAccountEmailVerificationToken" ADD CONSTRAINT "BluePassAccountEmailVerificationToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperatorProfile" ADD CONSTRAINT "OperatorProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
