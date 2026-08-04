-- CreateEnum
CREATE TYPE "SignupRole" AS ENUM ('OPERATOR', 'CREATOR', 'USER');

-- CreateTable
CREATE TABLE "SignupLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "SignupRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignupLead_role_createdAt_idx" ON "SignupLead"("role", "createdAt");

-- CreateIndex
CREATE INDEX "SignupLead_email_idx" ON "SignupLead"("email");
