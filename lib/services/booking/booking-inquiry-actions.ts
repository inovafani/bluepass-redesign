import type { ActorType, BookingInquiryStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { OperatorButtonAction } from "@/lib/services/whatsapp/payloads";

const jsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const actorPayloadSchema = z.record(z.string(), jsonScalarSchema).default({});

const inquiryActionStatus: Record<OperatorButtonAction, BookingInquiryStatus> = {
  accept: "OPERATOR_ACCEPTED",
  decline: "OPERATOR_DECLINED",
  counter: "COUNTER_OFFERED",
};

const actionableStatuses: BookingInquiryStatus[] = [
  "READY_TO_DISPATCH",
  "OPERATOR_PENDING",
  "COUNTER_OFFERED",
];

export type ProcessOperatorInquiryActionInput = {
  inquiryId: string;
  action: OperatorButtonAction;
  actorPayload?: Prisma.InputJsonObject;
};

export type ProcessOperatorInquiryActionResult =
  | {
      processed: true;
      inquiryId: string;
      fromStatus: BookingInquiryStatus;
      toStatus: BookingInquiryStatus;
    }
  | {
      processed: false;
      reason: "not_found";
    };

export async function processOperatorInquiryAction(
  input: ProcessOperatorInquiryActionInput,
): Promise<ProcessOperatorInquiryActionResult> {
  const parsedPayload = actorPayloadSchema.parse(
    input.actorPayload ?? {},
  ) as Prisma.InputJsonObject;
  const toStatus = inquiryActionStatus[input.action];

  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.bookingInquiry.findUnique({
      where: { id: input.inquiryId },
      select: { id: true, status: true },
    });

    if (!inquiry) {
      return {
        processed: false as const,
        reason: "not_found" as const,
      };
    }

    if (!actionableStatuses.includes(inquiry.status)) {
      throw new Error(
        `Invalid inquiry status transition: ${inquiry.status} -> ${toStatus}`,
      );
    }

    const updated = await tx.bookingInquiry.update({
      where: { id: inquiry.id },
      data: { status: toStatus },
      select: { id: true, status: true },
    });

    await tx.bookingInquiryEvent.create({
      data: {
        bookingInquiryId: inquiry.id,
        fromStatus: inquiry.status,
        toStatus: updated.status,
        actorType: "OPERATOR" satisfies ActorType,
        payload: {
          ...parsedPayload,
          action: input.action,
        },
      },
    });

    return {
      processed: true as const,
      inquiryId: updated.id,
      fromStatus: inquiry.status,
      toStatus: updated.status,
    };
  });
}
