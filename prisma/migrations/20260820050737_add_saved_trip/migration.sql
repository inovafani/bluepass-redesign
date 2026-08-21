-- CreateTable
CREATE TABLE "SavedTrip" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tripSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTrip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedTrip_accountId_tripSlug_key" ON "SavedTrip"("accountId", "tripSlug");
CREATE INDEX "SavedTrip_accountId_idx" ON "SavedTrip"("accountId");

ALTER TABLE "SavedTrip" ADD CONSTRAINT "SavedTrip_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
