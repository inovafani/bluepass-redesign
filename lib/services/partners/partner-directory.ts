import { prisma } from "@/lib/db/prisma";

export type BluePassPartnerDirectoryEntry = {
  partnerId: string;
  partnerName: string;
  partnerRole: "CREATOR" | "DIVE_SHOP" | "GROUP" | "TRAVELLER";
  handle: string | null;
  whatsappPhone: string;
  status: "APPROVED" | "LIVE";
  source: "creator_profile";
};

export async function listApprovedPartnerDirectory(): Promise<BluePassPartnerDirectoryEntry[]> {
  const profiles = await prisma.creatorProfile.findMany({
    where: {
      status: { in: ["APPROVED", "LIVE"] },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      account: {
        select: {
          displayName: true,
          phone: true,
        },
      },
      referralPartner: {
        select: {
          id: true,
          name: true,
          role: true,
          handle: true,
          phone: true,
        },
      },
    },
  });

  return profiles
    .map((profile) => {
      const partner = profile.referralPartner;
      const whatsappPhone = normalizePhone(partner?.phone) ?? normalizePhone(profile.account.phone);
      const partnerId = partner?.id ?? profile.referralPartnerId ?? profile.id;
      const partnerName =
        partner?.name?.trim() ||
        profile.account.displayName?.trim() ||
        profile.handle?.trim() ||
        partner?.handle?.trim() ||
        "BluePass partner";
      const partnerRole = partner?.role === "OPERATOR" ? "CREATOR" : partner?.role ?? "CREATOR";

      if (!whatsappPhone) {
        return null;
      }

      return {
        partnerId,
        partnerName,
        partnerRole,
        handle: partner?.handle ?? profile.handle ?? null,
        whatsappPhone,
        status: profile.status,
        source: "creator_profile" as const,
      };
    })
    .filter((entry): entry is BluePassPartnerDirectoryEntry => Boolean(entry));
}

function normalizePhone(value?: string | null) {
  return value?.trim() || null;
}
