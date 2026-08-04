import { PmsPlatform } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const operatorPmsReadinessSchema = z.object({
  platform: z.nativeEnum(PmsPlatform),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  contactWhatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(1200).optional().or(z.literal("")),
});

export type OperatorPmsReadinessInput = z.infer<
  typeof operatorPmsReadinessSchema
>;

export async function submitOperatorPmsReadiness(
  input: OperatorPmsReadinessInput & { accountId: string },
) {
  const profile = await prisma.operatorProfile.findUnique({
    where: { accountId: input.accountId },
    select: {
      id: true,
      companyName: true,
      claimedOperatorSlug: true,
    },
  });

  if (!profile) {
    throw new Error("Operator profile was not found.");
  }

  const readiness = await prisma.operatorPmsReadiness.upsert({
    where: { operatorProfileId: profile.id },
    create: {
      operatorProfileId: profile.id,
      platform: input.platform,
      status: "CREDENTIALS_SUBMITTED",
      contactEmail: optionalString(input.contactEmail),
      contactWhatsapp: optionalString(input.contactWhatsapp),
      notes: optionalString(input.notes),
      metadata: {
        submittedAt: new Date().toISOString(),
      },
    },
    update: {
      platform: input.platform,
      status: "CREDENTIALS_SUBMITTED",
      contactEmail: optionalString(input.contactEmail),
      contactWhatsapp: optionalString(input.contactWhatsapp),
      notes: optionalString(input.notes),
      metadata: {
        submittedAt: new Date().toISOString(),
      },
    },
  });

  await prisma.operatorOutreachEvent.create({
    data: {
      operatorSlug: profile.claimedOperatorSlug ?? profile.id,
      type: "PMS_READINESS_SUBMITTED",
      message: `${profile.companyName ?? "Operator"} submitted ${input.platform} PMS readiness.`,
      metadata: {
        operatorProfileId: profile.id,
        platform: input.platform,
      },
    },
  });

  return readiness;
}

function optionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
