-- AlterTable
ALTER TABLE "OperatorProfile" ADD COLUMN     "kaiTenantSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OperatorProfile_kaiTenantSlug_key" ON "OperatorProfile"("kaiTenantSlug");
