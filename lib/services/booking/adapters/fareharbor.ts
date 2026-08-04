import type { BookingAdapter } from "./types";

export const fareharborAdapter: BookingAdapter = {
  platform: "fareharbor",
  async checkAvailability() {
    throw new Error("Not implemented yet");
  },
  async placeHold() {
    throw new Error("Not implemented yet");
  },
  async confirmBooking() {
    throw new Error("Not implemented yet");
  },
  async releaseHold() {
    throw new Error("Not implemented yet");
  },
  verifyWebhook() {
    return false;
  },
};
