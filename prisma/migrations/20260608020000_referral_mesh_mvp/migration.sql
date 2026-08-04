CREATE TYPE "ReferralPartnerRole" AS ENUM ('CREATOR', 'OPERATOR', 'DIVE_SHOP', 'GROUP', 'TRAVELLER');

CREATE TABLE "ReferralPartner" (
    "id" TEXT NOT NULL,
    "role" "ReferralPartnerRole" NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPartner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "targetPath" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralClick" (
    "id" TEXT NOT NULL,
    "referralLinkId" TEXT,
    "referralPartnerId" TEXT,
    "code" TEXT NOT NULL,
    "landingPath" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralClick_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "KaiSession" ADD COLUMN "referralLinkId" TEXT;
ALTER TABLE "KaiSession" ADD COLUMN "referralPartnerId" TEXT;
ALTER TABLE "KaiSession" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "KaiSession" ADD COLUMN "referralRole" "ReferralPartnerRole";

ALTER TABLE "BookingInquiry" ADD COLUMN "referralLinkId" TEXT;
ALTER TABLE "BookingInquiry" ADD COLUMN "referralPartnerId" TEXT;
ALTER TABLE "BookingInquiry" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "BookingInquiry" ADD COLUMN "referralRole" "ReferralPartnerRole";

CREATE INDEX "ReferralPartner_role_idx" ON "ReferralPartner"("role");
CREATE INDEX "ReferralPartner_handle_idx" ON "ReferralPartner"("handle");
CREATE INDEX "ReferralPartner_email_idx" ON "ReferralPartner"("email");

CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE INDEX "ReferralLink_partnerId_idx" ON "ReferralLink"("partnerId");
CREATE INDEX "ReferralLink_active_idx" ON "ReferralLink"("active");

CREATE INDEX "ReferralClick_referralLinkId_idx" ON "ReferralClick"("referralLinkId");
CREATE INDEX "ReferralClick_referralPartnerId_idx" ON "ReferralClick"("referralPartnerId");
CREATE INDEX "ReferralClick_code_idx" ON "ReferralClick"("code");
CREATE INDEX "ReferralClick_createdAt_idx" ON "ReferralClick"("createdAt");

CREATE INDEX "KaiSession_referralLinkId_idx" ON "KaiSession"("referralLinkId");
CREATE INDEX "KaiSession_referralPartnerId_idx" ON "KaiSession"("referralPartnerId");
CREATE INDEX "KaiSession_referralCode_idx" ON "KaiSession"("referralCode");

CREATE INDEX "BookingInquiry_referralLinkId_idx" ON "BookingInquiry"("referralLinkId");
CREATE INDEX "BookingInquiry_referralPartnerId_idx" ON "BookingInquiry"("referralPartnerId");
CREATE INDEX "BookingInquiry_referralCode_idx" ON "BookingInquiry"("referralCode");

ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KaiSession" ADD CONSTRAINT "KaiSession_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KaiSession" ADD CONSTRAINT "KaiSession_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingInquiry" ADD CONSTRAINT "BookingInquiry_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingInquiry" ADD CONSTRAINT "BookingInquiry_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
