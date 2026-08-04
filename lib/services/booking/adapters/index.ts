import { bokunAdapter } from "./bokun";
import { fareharborAdapter } from "./fareharbor";
import { nativeAdapter } from "./native";
import { rezdyAdapter } from "./rezdy";
import type { BookingAdapter, BookingAdapterPlatform } from "./types";

export const bookingAdapters: Record<BookingAdapterPlatform, BookingAdapter> = {
  rezdy: rezdyAdapter,
  fareharbor: fareharborAdapter,
  bokun: bokunAdapter,
  native: nativeAdapter,
};

export function getBookingAdapter(platform: BookingAdapterPlatform) {
  return bookingAdapters[platform];
}
