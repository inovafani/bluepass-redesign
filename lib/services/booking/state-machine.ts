export const bookingStatuses = [
  "QUOTE_DRAFTED",
  "OPERATOR_NOTIFIED",
  "OPERATOR_ACCEPTED",
  "OPERATOR_DECLINED",
  "COUNTER_REQUESTED",
  "AUTO_DECLINED",
  "PMS_HOLD_PLACED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

const activeCancellableStatuses: BookingStatus[] = [
  "QUOTE_DRAFTED",
  "OPERATOR_NOTIFIED",
  "OPERATOR_ACCEPTED",
  "COUNTER_REQUESTED",
  "PMS_HOLD_PLACED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
];

const allowedTransitions = new Map<BookingStatus, BookingStatus[]>([
  ["QUOTE_DRAFTED", ["OPERATOR_NOTIFIED", "CANCELLED"]],
  ["OPERATOR_NOTIFIED", ["OPERATOR_ACCEPTED", "OPERATOR_DECLINED", "COUNTER_REQUESTED", "AUTO_DECLINED", "CANCELLED"]],
  ["OPERATOR_ACCEPTED", ["PMS_HOLD_PLACED", "CANCELLED"]],
  ["OPERATOR_DECLINED", []],
  ["COUNTER_REQUESTED", ["OPERATOR_NOTIFIED", "CANCELLED"]],
  ["AUTO_DECLINED", []],
  ["PMS_HOLD_PLACED", ["AWAITING_PAYMENT", "CANCELLED"]],
  ["AWAITING_PAYMENT", ["CONFIRMED", "EXPIRED", "CANCELLED"]],
  ["CONFIRMED", ["REFUNDED"]],
  ["EXPIRED", []],
  ["CANCELLED", []],
  ["REFUNDED", []],
]);

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (to === "CANCELLED") {
    return activeCancellableStatuses.includes(from);
  }

  return allowedTransitions.get(from)?.includes(to) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid booking status transition: ${from} -> ${to}`);
  }
}
