-- AlterEnum
ALTER TYPE "PmsPlatform" ADD VALUE 'BOKUN';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_operatorId_externalId_key" ON "Trip"("operatorId", "externalId");
