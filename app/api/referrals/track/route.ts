import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  encodeReferralAttribution,
  normalizeReferralCode,
  REFERRAL_ATTRIBUTION_COOKIE,
  type ReferralAttribution,
} from "@/lib/services/referrals/attribution";

const trackReferralSchema = z.object({
  code: z.string().trim().min(1).max(120),
  landingPath: z.string().trim().max(500).optional(),
});

const REFERRAL_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = trackReferralSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Referral code is required." }, { status: 400 });
  }

  const code = normalizeReferralCode(parsed.data.code);

  if (!code) {
    return NextResponse.json({ error: "Referral code is invalid." }, { status: 400 });
  }

  const referralLink = await prisma.referralLink.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      label: true,
      active: true,
      partner: {
        select: {
          id: true,
          role: true,
          name: true,
          handle: true,
        },
      },
    },
  });

  const attribution: ReferralAttribution =
    referralLink && referralLink.active
      ? {
          code: referralLink.code,
          referralLinkId: referralLink.id,
          referralPartnerId: referralLink.partner.id,
          role: referralLink.partner.role,
          label: referralLink.label ?? referralLink.partner.handle ?? referralLink.partner.name,
        }
      : { code };

  await prisma.referralClick.create({
    data: {
      code,
      referralLinkId: attribution.referralLinkId,
      referralPartnerId: attribution.referralPartnerId,
      landingPath: parsed.data.landingPath,
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    },
  });

  const response = NextResponse.json({
    ok: true,
    attribution,
    resolved: Boolean(attribution.referralLinkId),
  });

  response.cookies.set(REFERRAL_ATTRIBUTION_COOKIE, encodeReferralAttribution(attribution), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
