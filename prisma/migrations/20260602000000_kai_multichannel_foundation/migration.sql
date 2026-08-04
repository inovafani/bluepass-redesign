CREATE TYPE "KaiChannel" AS ENUM ('web', 'whatsapp');

CREATE TYPE "KaiSessionStatus" AS ENUM ('open', 'handoff', 'closed');

CREATE TYPE "KaiMessageRole" AS ENUM ('user', 'assistant', 'system');

ALTER TABLE "KaiSession"
  ADD COLUMN "channel" "KaiChannel" NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN "externalUserId" TEXT,
  ADD COLUMN "travellerPhone" TEXT,
  ADD COLUMN "status" "KaiSessionStatus" NOT NULL DEFAULT 'open';

ALTER TABLE "KaiSession" ALTER COLUMN "travellerId" DROP NOT NULL;
ALTER TABLE "KaiSession" ALTER COLUMN "slots" DROP NOT NULL;
ALTER TABLE "KaiSession" ALTER COLUMN "channel" DROP DEFAULT;

CREATE TABLE "KaiMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "channel" "KaiChannel" NOT NULL,
  "role" "KaiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KaiMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KaiSession_channel_status_idx" ON "KaiSession"("channel", "status");
CREATE INDEX "KaiSession_externalUserId_idx" ON "KaiSession"("externalUserId");
CREATE INDEX "KaiSession_travellerPhone_idx" ON "KaiSession"("travellerPhone");
CREATE INDEX "KaiMessage_sessionId_createdAt_idx" ON "KaiMessage"("sessionId", "createdAt");
CREATE INDEX "KaiMessage_channel_createdAt_idx" ON "KaiMessage"("channel", "createdAt");

ALTER TABLE "KaiMessage" ADD CONSTRAINT "KaiMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "KaiSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
