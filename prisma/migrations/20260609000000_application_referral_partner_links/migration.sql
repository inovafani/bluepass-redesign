ALTER TABLE "CreatorProfile" ADD COLUMN "referralPartnerId" TEXT;
ALTER TABLE "OperatorProfile" ADD COLUMN "referralPartnerId" TEXT;

CREATE UNIQUE INDEX "CreatorProfile_referralPartnerId_key" ON "CreatorProfile"("referralPartnerId");
CREATE INDEX "CreatorProfile_referralPartnerId_idx" ON "CreatorProfile"("referralPartnerId");

CREATE UNIQUE INDEX "OperatorProfile_referralPartnerId_key" ON "OperatorProfile"("referralPartnerId");
CREATE INDEX "OperatorProfile_referralPartnerId_idx" ON "OperatorProfile"("referralPartnerId");

ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperatorProfile" ADD CONSTRAINT "OperatorProfile_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
