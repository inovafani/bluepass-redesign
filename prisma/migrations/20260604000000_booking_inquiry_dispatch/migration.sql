CREATE TYPE "BookingInquiryStatus" AS ENUM ('DRAFT', 'READY_TO_DISPATCH', 'OPERATOR_PENDING', 'OPERATOR_ACCEPTED', 'OPERATOR_DECLINED', 'COUNTER_OFFERED', 'EXPIRED');

CREATE TYPE "WhatsAppOutboundStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

CREATE TABLE "BookingInquiry" (
    "id" TEXT NOT NULL,
    "sourceChannel" "KaiChannel" NOT NULL,
    "kaiSessionId" TEXT,
    "selectedYachtSlug" TEXT,
    "selectedYachtName" TEXT,
    "travellerName" TEXT,
    "travellerEmail" TEXT,
    "travellerPhone" TEXT,
    "destination" TEXT,
    "tripType" TEXT,
    "dateWindow" TEXT,
    "guests" INTEGER,
    "certificationLevel" TEXT,
    "budget" TEXT,
    "interests" JSONB,
    "notes" TEXT,
    "status" "BookingInquiryStatus" NOT NULL DEFAULT 'DRAFT',
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingInquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppOutboundMessage" (
    "id" TEXT NOT NULL,
    "bookingInquiryId" TEXT NOT NULL,
    "operatorId" TEXT,
    "channel" "KaiChannel" NOT NULL DEFAULT 'whatsapp',
    "recipientPhone" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "WhatsAppOutboundStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "WhatsAppOutboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingInquiry_kaiSessionId_status_idx" ON "BookingInquiry"("kaiSessionId", "status");
CREATE INDEX "BookingInquiry_selectedYachtSlug_idx" ON "BookingInquiry"("selectedYachtSlug");
CREATE INDEX "BookingInquiry_operatorId_status_idx" ON "BookingInquiry"("operatorId", "status");
CREATE INDEX "BookingInquiry_createdAt_idx" ON "BookingInquiry"("createdAt");

CREATE INDEX "WhatsAppOutboundMessage_bookingInquiryId_idx" ON "WhatsAppOutboundMessage"("bookingInquiryId");
CREATE INDEX "WhatsAppOutboundMessage_recipientPhone_status_sentAt_idx" ON "WhatsAppOutboundMessage"("recipientPhone", "status", "sentAt");
CREATE INDEX "WhatsAppOutboundMessage_operatorId_status_idx" ON "WhatsAppOutboundMessage"("operatorId", "status");

ALTER TABLE "BookingInquiry" ADD CONSTRAINT "BookingInquiry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_bookingInquiryId_fkey" FOREIGN KEY ("bookingInquiryId") REFERENCES "BookingInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
