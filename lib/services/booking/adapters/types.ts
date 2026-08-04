export type BookingAdapterPlatform = "rezdy" | "fareharbor" | "bokun" | "native";

export type AvailabilityInput = {
  operatorId: string;
  tripId: string;
  startsAt: string;
  travellers: number;
};

export type HoldInput = AvailabilityInput & {
  travellerId: string;
};

export type ConfirmInput = {
  holdId: string;
  bookingId: string;
};

export type ReleaseHoldInput = {
  holdId: string;
};

export interface BookingAdapter {
  platform: BookingAdapterPlatform;
  capabilities?: {
    supportsHold: boolean;
    supportsCancellation: boolean;
    supportsLiveAvailability: boolean;
  };

  checkAvailability(input: AvailabilityInput): Promise<{
    available: boolean;
    priceCents: number;
    currency: string;
    holdable: boolean;
  }>;

  placeHold(input: HoldInput): Promise<{ holdId: string; expiresAt: string }>;

  confirmBooking(input: ConfirmInput): Promise<{
    bookingId: string;
    confirmationCode: string;
  }>;

  releaseHold(input: ReleaseHoldInput): Promise<void>;

  verifyWebhook(headers: Headers, rawBody: string): boolean;
}
