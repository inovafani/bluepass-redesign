-- CreateEnum
CREATE TYPE "PartnerCategory" AS ENUM ('CREATOR', 'DIVE_SHOP', 'TRAVEL_AGENCY', 'TRIP_LEADER', 'DIVE_INSTRUCTOR', 'ADVISOR', 'OCEAN_PARTNER');

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "partnerCategory" "PartnerCategory";
