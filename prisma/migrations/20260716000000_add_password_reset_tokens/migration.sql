-- CreateTable
CREATE TABLE "BluePassAccountPasswordResetToken" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BluePassAccountPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BluePassAccountPasswordResetToken_tokenHash_key" ON "BluePassAccountPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "BluePassAccountPasswordResetToken_accountId_idx" ON "BluePassAccountPasswordResetToken"("accountId");

-- CreateIndex
CREATE INDEX "BluePassAccountPasswordResetToken_expiresAt_idx" ON "BluePassAccountPasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "BluePassAccountPasswordResetToken" ADD CONSTRAINT "BluePassAccountPasswordResetToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BluePassAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
