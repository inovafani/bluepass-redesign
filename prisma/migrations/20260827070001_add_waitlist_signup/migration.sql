-- CreateEnum
CREATE TYPE "WaitlistRole" AS ENUM ('OPERATOR', 'PARTNER', 'TRAVELLER');

-- CreateTable
CREATE TABLE "WaitlistSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "WaitlistRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistSignup_createdAt_idx" ON "WaitlistSignup"("createdAt");

-- CreateIndex
CREATE INDEX "WaitlistSignup_email_idx" ON "WaitlistSignup"("email");
