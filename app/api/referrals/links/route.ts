import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { normalizeReferralCode } from "@/lib/services/referrals/attribution";

const referralLinkCreateSchema = z.object({
  role: z.enum(["CREATOR", "OPERATOR", "DIVE_SHOP", "GROUP", "TRAVELLER"]),
  name: z.string().trim().min(2).max(160),
  handle: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(180).optional(),
  phone: z.string().trim().max(40).optional(),
  code: z.string().trim().min(2).max(80),
  label: z.string().trim().max(160).optional(),
  targetPath: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const serviceToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!process.env.BLUEPASS_SERVICE_TOKEN || serviceToken !== process.env.BLUEPASS_SERVICE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = referralLinkCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Referral partner and code are required." }, { status: 400 });
  }

  const code = normalizeReferralCode(parsed.data.code);

  if (!code) {
    return NextResponse.json({ error: "Referral code is invalid." }, { status: 400 });
  }

  const existingLink = await prisma.referralLink.findUnique({
    where: { code },
    select: { id: true },
  });

  if (existingLink) {
    return NextResponse.json({ error: "Referral code already exists." }, { status: 409 });
  }

  const partner = await prisma.referralPartner.create({
    data: {
      role: parsed.data.role,
      name: parsed.data.name,
      handle: parsed.data.handle,
      email: parsed.data.email,
      phone: parsed.data.phone,
      links: {
        create: {
          code,
          label: parsed.data.label,
          targetPath: parsed.data.targetPath,
        },
      },
    },
    include: {
      links: true,
    },
  });

  return NextResponse.json({
    ok: true,
    partner,
    shareUrl: buildShareUrl(code, parsed.data.targetPath),
  });
}

function buildShareUrl(code: string, targetPath?: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BLUEPASS_APP_URL?.trim() ||
    "http://localhost:3000";
  const path = targetPath?.startsWith("/") ? targetPath : "/";
  const url = new URL(path, baseUrl);

  url.searchParams.set("ref", code);

  return url.toString();
}
