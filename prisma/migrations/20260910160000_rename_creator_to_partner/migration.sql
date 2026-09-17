-- RenameEnumValue: BluePassAccountRole.CREATOR -> PARTNER
ALTER TYPE "BluePassAccountRole" RENAME VALUE 'CREATOR' TO 'PARTNER';

-- RenameEnumValue: ReferralPartnerRole.CREATOR -> PARTNER
ALTER TYPE "ReferralPartnerRole" RENAME VALUE 'CREATOR' TO 'PARTNER';

-- RenameEnumValue: SignupRole.CREATOR -> PARTNER
ALTER TYPE "SignupRole" RENAME VALUE 'CREATOR' TO 'PARTNER';

-- RenameTable
ALTER TABLE "CreatorProfile" RENAME TO "PartnerProfile";

-- RenameConstraint/Index: keep every generated name in sync with the renamed table
ALTER TABLE "PartnerProfile" RENAME CONSTRAINT "CreatorProfile_pkey" TO "PartnerProfile_pkey";
ALTER TABLE "PartnerProfile" RENAME CONSTRAINT "CreatorProfile_accountId_fkey" TO "PartnerProfile_accountId_fkey";
ALTER TABLE "PartnerProfile" RENAME CONSTRAINT "CreatorProfile_referralPartnerId_fkey" TO "PartnerProfile_referralPartnerId_fkey";
ALTER INDEX "CreatorProfile_accountId_key" RENAME TO "PartnerProfile_accountId_key";
ALTER INDEX "CreatorProfile_referralPartnerId_key" RENAME TO "PartnerProfile_referralPartnerId_key";
ALTER INDEX "CreatorProfile_status_idx" RENAME TO "PartnerProfile_status_idx";
ALTER INDEX "CreatorProfile_handle_idx" RENAME TO "PartnerProfile_handle_idx";
ALTER INDEX "CreatorProfile_referralPartnerId_idx" RENAME TO "PartnerProfile_referralPartnerId_idx";
