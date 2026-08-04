import type { ReferralPartnerRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeReferralCode } from "@/lib/services/referrals/attribution";

type ApplicationKind = "creator" | "operator";

export async function approveReferralApplication(input: {
  kind: ApplicationKind;
  id: string;
}) {
  if (input.kind === "creator") {
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: input.id },
      include: {
        account: true,
        referralPartner: { include: { links: true } },
      },
    });

    if (!profile) {
      throw new Error("Creator application not found.");
    }

    if (profile.referralPartner) {
      return prisma.creatorProfile.update({
        where: { id: profile.id },
        data: { status: "APPROVED" },
        include: { referralPartner: { include: { links: true } }, account: true },
      });
    }

    const partner = await createPartnerWithLink({
      role: "CREATOR",
      name: profile.account.displayName ?? profile.handle ?? profile.account.email,
      handle: profile.handle,
      email: profile.account.email,
      phone: profile.account.phone,
      targetPath: "/",
    });

    return prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        status: "APPROVED",
        referralPartnerId: partner.id,
      },
      include: { referralPartner: { include: { links: true } }, account: true },
    });
  }

  const profile = await prisma.operatorProfile.findUnique({
    where: { id: input.id },
    include: {
      account: true,
      referralPartner: { include: { links: true } },
    },
  });

  if (!profile) {
    throw new Error("Operator application not found.");
  }

  if (profile.referralPartner) {
    return prisma.operatorProfile.update({
      where: { id: profile.id },
      data: { status: "APPROVED" },
      include: { referralPartner: { include: { links: true } }, account: true },
    });
  }

  const partner = await createPartnerWithLink({
    role: "OPERATOR",
    name: profile.companyName ?? profile.account.displayName ?? profile.account.email,
    handle: profile.companyName,
    email: profile.account.email,
    phone: profile.whatsappE164 ?? profile.account.phone,
    targetPath: "/",
  });

  return prisma.operatorProfile.update({
    where: { id: profile.id },
    data: {
      status: "APPROVED",
      referralPartnerId: partner.id,
    },
    include: { referralPartner: { include: { links: true } }, account: true },
  });
}

export async function declineReferralApplication(input: {
  kind: ApplicationKind;
  id: string;
}) {
  if (input.kind === "creator") {
    return prisma.creatorProfile.update({
      where: { id: input.id },
      data: { status: "DECLINED" },
    });
  }

  return prisma.operatorProfile.update({
    where: { id: input.id },
    data: { status: "DECLINED" },
  });
}

async function createPartnerWithLink(input: {
  role: ReferralPartnerRole;
  name: string;
  handle?: string | null;
  email?: string | null;
  phone?: string | null;
  targetPath: string;
}) {
  const code = await buildUniqueReferralCode(input.handle ?? input.name);

  return prisma.referralPartner.create({
    data: {
      role: input.role,
      name: input.name,
      handle: input.handle,
      email: input.email,
      phone: input.phone,
      links: {
        create: {
          code,
          label: `${input.name} main link`,
          targetPath: input.targetPath,
        },
      },
    },
    include: { links: true },
  });
}

async function buildUniqueReferralCode(source: string) {
  const base = normalizeReferralCode(source.replace(/^@/, "")) || "bluepass";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.referralLink.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

export function buildReferralShareUrl(code?: string | null, targetPath?: string | null) {
  if (!code) {
    return undefined;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BLUEPASS_APP_URL?.trim() ||
    "http://localhost:3000";
  const url = new URL(targetPath?.startsWith("/") ? targetPath : "/", baseUrl);
  url.searchParams.set("ref", code);

  return url.toString();
}
