-- DropForeignKey
ALTER TABLE "KaiSession" DROP CONSTRAINT "KaiSession_travellerId_fkey";

-- AddForeignKey
ALTER TABLE "KaiSession" ADD CONSTRAINT "KaiSession_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
