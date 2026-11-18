-- AlterTable
ALTER TABLE "ListingBooking" ADD COLUMN     "accountId" TEXT;

-- CreateIndex
CREATE INDEX "ListingBooking_accountId_createdAt_idx" ON "ListingBooking"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingBooking" ADD CONSTRAINT "ListingBooking_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One-off: link the bookings that already exist to the account whose verified email they were made
-- under, which is how "Your trips" found them before this column. From here on the link is the
-- signed-in traveller's id, set when the booking is made.
UPDATE "ListingBooking" b
SET "accountId" = a.id
FROM "BluePassAccount" a
WHERE b."accountId" IS NULL
  AND b."leadEmail" IS NOT NULL
  AND a."emailVerifiedAt" IS NOT NULL
  AND lower(a.email) = lower(b."leadEmail");
