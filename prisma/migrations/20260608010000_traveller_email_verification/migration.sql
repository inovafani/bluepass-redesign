ALTER TABLE "Traveller" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "TravellerEmailVerificationToken" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravellerEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TravellerEmailVerificationToken_tokenHash_key" ON "TravellerEmailVerificationToken"("tokenHash");
CREATE INDEX "TravellerEmailVerificationToken_travellerId_idx" ON "TravellerEmailVerificationToken"("travellerId");
CREATE INDEX "TravellerEmailVerificationToken_email_idx" ON "TravellerEmailVerificationToken"("email");
CREATE INDEX "TravellerEmailVerificationToken_expiresAt_idx" ON "TravellerEmailVerificationToken"("expiresAt");

ALTER TABLE "TravellerEmailVerificationToken" ADD CONSTRAINT "TravellerEmailVerificationToken_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
