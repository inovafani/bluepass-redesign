CREATE TABLE "BookingInquiryEvent" (
    "id" TEXT NOT NULL,
    "bookingInquiryId" TEXT NOT NULL,
    "fromStatus" "BookingInquiryStatus",
    "toStatus" "BookingInquiryStatus" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingInquiryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingInquiryEvent_bookingInquiryId_createdAt_idx" ON "BookingInquiryEvent"("bookingInquiryId", "createdAt");

ALTER TABLE "BookingInquiryEvent" ADD CONSTRAINT "BookingInquiryEvent_bookingInquiryId_fkey" FOREIGN KEY ("bookingInquiryId") REFERENCES "BookingInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
