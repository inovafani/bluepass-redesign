import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  normalizeReferralCode,
  resolveReferralAttribution,
  REFERRAL_ATTRIBUTION_COOKIE,
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

  const { attribution } = await resolveReferralAttribution(code);

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

  // Only the code goes in the cookie - see getReferralAttributionFromCookies's own comment for why
  // baking in referralPartnerId/role/label here (as an unsigned blob) was the actual vulnerability.
  response.cookies.set(REFERRAL_ATTRIBUTION_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
