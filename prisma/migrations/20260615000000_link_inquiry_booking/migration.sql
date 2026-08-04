ALTER TABLE "BookingInquiry" ADD COLUMN "bookingId" TEXT;

CREATE UNIQUE INDEX "BookingInquiry_bookingId_key" ON "BookingInquiry"("bookingId");
CREATE INDEX "BookingInquiry_bookingId_idx" ON "BookingInquiry"("bookingId");

ALTER TABLE "BookingInquiry" ADD CONSTRAINT "BookingInquiry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
