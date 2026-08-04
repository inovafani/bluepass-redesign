-- Traveller auth is optional: anonymous Kai sessions continue to work.
ALTER TABLE "Traveller" ADD COLUMN "email" TEXT;
ALTER TABLE "Traveller" ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "Traveller_email_key" ON "Traveller"("email");
CREATE INDEX "Traveller_email_idx" ON "Traveller"("email");

CREATE TABLE "TravellerSession" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravellerSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TravellerSession_tokenHash_key" ON "TravellerSession"("tokenHash");
CREATE INDEX "TravellerSession_travellerId_idx" ON "TravellerSession"("travellerId");
CREATE INDEX "TravellerSession_expiresAt_idx" ON "TravellerSession"("expiresAt");

ALTER TABLE "TravellerSession" ADD CONSTRAINT "TravellerSession_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
