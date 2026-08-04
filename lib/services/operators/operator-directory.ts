import { prisma } from "@/lib/db/prisma";

export type BluePassOperatorDirectoryEntry = {
  operatorSlug: string;
  operatorName: string;
  yachtSlugs: string[];
  whatsappPhone: string;
  status: "APPROVED" | "LIVE";
  source: "operator_profile";
};

export async function listApprovedOperatorDirectory(): Promise<BluePassOperatorDirectoryEntry[]> {
  const profiles = await prisma.operatorProfile.findMany({
    where: {
      status: { in: ["APPROVED", "LIVE"] },
    },
    orderBy: [{ companyName: "asc" }, { createdAt: "desc" }],
    include: {
      account: {
        select: {
          phone: true,
        },
      },
    },
  });

  return profiles
    .map((profile) => {
      const whatsappPhone = normalizePhone(profile.whatsappE164) ?? normalizePhone(profile.account.phone);
      const operatorSlug = normalizeSlug(profile.claimedOperatorSlug ?? profile.companyName ?? profile.id);
      const yachtSlugs = Array.from(new Set(profile.claimedYachtSlugs.map(normalizeSlug).filter(Boolean)));

      if (!whatsappPhone || !operatorSlug) {
        return null;
      }

      return {
        operatorSlug,
        operatorName: profile.companyName?.trim() || operatorSlug,
        yachtSlugs,
        whatsappPhone,
        status: profile.status,
        source: "operator_profile" as const,
      };
    })
    .filter((entry): entry is BluePassOperatorDirectoryEntry => Boolean(entry));
}

function normalizePhone(value?: string | null) {
  return value?.trim() || null;
}

function normalizeSlug(value?: string | null) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ?? ""
  );
}
