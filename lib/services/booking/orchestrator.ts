import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertTransition, type BookingStatus } from "./state-machine";

const jsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const actorPayloadSchema = z.record(z.string(), jsonScalarSchema).default({});

export type ActorType = "TRAVELLER" | "OPERATOR" | "SYSTEM" | "KAI";
export type ActorPayload = Prisma.InputJsonObject;

type TransitionInput = {
  bookingId: string;
  toStatus: BookingStatus;
  actorType: ActorType;
  payload?: ActorPayload;
};

async function transitionBooking({
  bookingId,
  toStatus,
  actorType,
  payload = {},
}: TransitionInput) {
  const parsedPayload = actorPayloadSchema.parse(payload) as Prisma.InputJsonObject;

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { id: true, status: true },
    });
    const fromStatus = booking.status as BookingStatus;

    assertTransition(fromStatus, toStatus);

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: toStatus },
    });

    await tx.bookingEvent.create({
      data: {
        bookingId,
        fromStatus,
        toStatus,
        actorType,
        payload: parsedPayload,
      },
    });

    return updated;
  });
}

export function notifyOperator(bookingId: string) {
  return transitionBooking({
    bookingId,
    toStatus: "OPERATOR_NOTIFIED",
    actorType: "SYSTEM",
  });
}

export function acceptByOperator(bookingId: string, actorPayload: ActorPayload) {
  return transitionBooking({
    bookingId,
    toStatus: "OPERATOR_ACCEPTED",
    actorType: "OPERATOR",
    payload: actorPayload,
  });
}

export function declineByOperator(bookingId: string, actorPayload: ActorPayload) {
  return transitionBooking({
    bookingId,
    toStatus: "OPERATOR_DECLINED",
    actorType: "OPERATOR",
    payload: actorPayload,
  });
}

export function requestCounterOffer(bookingId: string, actorPayload: ActorPayload) {
  return transitionBooking({
    bookingId,
    toStatus: "COUNTER_REQUESTED",
    actorType: "OPERATOR",
    payload: actorPayload,
  });
}

export function placePmsHold(bookingId: string) {
  return transitionBooking({
    bookingId,
    toStatus: "PMS_HOLD_PLACED",
    actorType: "SYSTEM",
  });
}

export function markAwaitingPayment(bookingId: string) {
  return transitionBooking({
    bookingId,
    toStatus: "AWAITING_PAYMENT",
    actorType: "SYSTEM",
  });
}

export function confirmAfterPayment(bookingId: string, paymentPayload: ActorPayload) {
  return transitionBooking({
    bookingId,
    toStatus: "CONFIRMED",
    actorType: "SYSTEM",
    payload: paymentPayload,
  });
}

export function expireBooking(bookingId: string) {
  return transitionBooking({
    bookingId,
    toStatus: "EXPIRED",
    actorType: "SYSTEM",
  });
}
