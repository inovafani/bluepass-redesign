import { NextRequest, NextResponse } from "next/server";
import { BluePassAccountRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  instagramUrl: z.string().trim().max(300).optional(),
  youtubeUrl: z.string().trim().max(300).optional(),
  tiktokUrl: z.string().trim().max(300).optional(),
  websiteUrl: z.string().trim().max(300).optional(),
  roles: z
    .array(z.enum(["OPERATOR", "CREATOR"]))
    .min(1)
    .max(2),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form fields and try again." },
      { status: 400 },
    );
  }

  const currentTraveller = await getCurrentTraveller();

  if (!currentTraveller?.accountId) {
    return NextResponse.json(
      { error: "Please create or sign in to your BluePass account first." },
      { status: 401 },
    );
  }

  const account = await prisma.bluePassAccount.findUnique({
    where: { id: currentTraveller.accountId },
    select: {
      id: true,
      email: true,
      roles: true,
      creatorProfile: { select: { status: true } },
      operatorProfile: { select: { status: true } },
    },
  });

  if (!account) {
    return NextResponse.json(
      { error: "Please create or sign in to your BluePass account first." },
      { status: 401 },
    );
  }

  const instagramUrl = normalizeSocialUrl(
    parsed.data.instagramUrl,
    "instagram",
  );
  const youtubeUrl = normalizeSocialUrl(parsed.data.youtubeUrl, "youtube");
  const tiktokUrl = normalizeSocialUrl(parsed.data.tiktokUrl, "tiktok");
  const websiteUrl = normalizeWebsiteUrl(parsed.data.websiteUrl);
  const name = parsed.data.name.trim();
  const email = account.email;
  const phone = parsed.data.phone.trim();
  const lead = await prisma.signupLead.create({
    data: {
      name,
      email,
      phone,
      roles: parsed.data.roles,
      instagramUrl,
      youtubeUrl,
      tiktokUrl,
      websiteUrl,
    },
    select: {
      id: true,
      roles: true,
      createdAt: true,
    },
  });

  const requestedRoles = parsed.data.roles.map((role) =>
    role === "CREATOR"
      ? BluePassAccountRole.CREATOR
      : BluePassAccountRole.OPERATOR,
  );
  const nextRoles = Array.from(
    new Set<BluePassAccountRole>([
      BluePassAccountRole.TRAVELLER,
      ...account.roles,
      ...requestedRoles,
    ]),
  );

  await prisma.bluePassAccount.update({
    where: { id: account.id },
    data: {
      displayName: name,
      phone,
      roles: { set: nextRoles },
    },
    select: { id: true },
  });

  if (parsed.data.roles.includes("CREATOR")) {
    await prisma.creatorProfile.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        status: "PENDING_REVIEW",
        handle: buildHandle(name),
        instagramUrl,
        youtubeUrl,
        tiktokUrl,
        notes: `Applied from signup lead ${lead.id}.`,
      },
      update: {
        status:
          account.creatorProfile?.status === "APPROVED"
            ? "APPROVED"
            : "PENDING_REVIEW",
        handle: buildHandle(name),
        instagramUrl,
        youtubeUrl,
        tiktokUrl,
        notes: `Updated from signup lead ${lead.id}.`,
      },
    });
  }

  if (parsed.data.roles.includes("OPERATOR")) {
    await prisma.operatorProfile.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        status: "PENDING_REVIEW",
        companyName: name,
        whatsappE164: phone,
        websiteUrl,
        notes: `Applied from signup lead ${lead.id}.`,
      },
      update: {
        status:
          account.operatorProfile?.status === "APPROVED"
            ? "APPROVED"
            : "PENDING_REVIEW",
        companyName: name,
        whatsappE164: phone,
        websiteUrl,
        notes: `Updated from signup lead ${lead.id}.`,
      },
    });
  }

  return NextResponse.json({ ok: true, lead, attachedToAccount: true });
}

/*
  /signup is an account-bound role application. Public visitor data entry lives
  elsewhere; this keeps partner/operator review, referral links, and dashboards
  attached to the verified BluePass account that submitted the application.
*/

function buildHandle(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || null;
}

function normalizeSocialUrl(
  value: string | undefined,
  platform: "instagram" | "youtube" | "tiktok",
) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const cleaned = raw
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^youtube\.com\//i, "")
    .replace(/^www\.youtube\.com\//i, "")
    .replace(/^youtu\.be\//i, "")
    .replace(/^tiktok\.com\//i, "")
    .replace(/^www\.tiktok\.com\//i, "")
    .replace(/^\/+/, "");

  if (!cleaned) {
    return null;
  }

  if (platform === "instagram") {
    return `https://www.instagram.com/${cleaned.replace(/\/+$/, "")}`;
  }

  if (platform === "tiktok") {
    return `https://www.tiktok.com/${cleaned.startsWith("@") ? cleaned : `@${cleaned}`}`;
  }

  return `https://www.youtube.com/${cleaned.startsWith("@") ? cleaned : `@${cleaned}`}`;
}

function normalizeWebsiteUrl(value: string | undefined) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw.replace(/^\/+/, "")}`;
}
