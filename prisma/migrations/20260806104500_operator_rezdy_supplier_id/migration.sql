-- AlterTable
ALTER TABLE "OperatorProfile" ADD COLUMN     "rezdySupplierId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OperatorProfile_rezdySupplierId_key" ON "OperatorProfile"("rezdySupplierId");
