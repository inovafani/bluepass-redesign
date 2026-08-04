import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const claimedOperatorStatuses = [ApplicationStatus.APPROVED, ApplicationStatus.LIVE];

export async function listClaimedOperatorYachtSlugs() {
  const profiles = await prisma.operatorProfile.findMany({
    where: {
      status: { in: claimedOperatorStatuses },
      claimedYachtSlugs: { isEmpty: false },
    },
    select: {
      claimedYachtSlugs: true,
    },
  });

  return Array.from(new Set(profiles.flatMap((profile) => profile.claimedYachtSlugs.map(normalizeYachtSlug)))).filter(
    Boolean,
  );
}

export async function isYachtClaimedByApprovedOperator(yachtSlug: string) {
  const normalizedSlug = normalizeYachtSlug(yachtSlug);
  if (!normalizedSlug) return false;

  const profile = await prisma.operatorProfile.findFirst({
    where: {
      status: { in: claimedOperatorStatuses },
      claimedYachtSlugs: { has: normalizedSlug },
    },
    select: {
      id: true,
    },
  });

  return Boolean(profile);
}

function normalizeYachtSlug(value: string) {
  return value.trim().toLowerCase();
}
