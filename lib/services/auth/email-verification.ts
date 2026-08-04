import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendAuthEmail } from "@/lib/services/auth/email";

const VERIFICATION_HOURS = 24;

export async function createAndSendEmailVerification(input: {
  accountId: string;
  email: string;
  name?: string | null;
  baseUrl?: string;
  nextPath?: string | null;
}) {
  const token = randomBytes(32).toString("base64url");
  const verificationUrl = buildVerificationUrl(
    token,
    input.baseUrl,
    input.nextPath,
  );
  const expiresAt = new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);

  await prisma.bluePassAccountEmailVerificationToken.create({
    data: {
      accountId: input.accountId,
      email: input.email,
      tokenHash: hashVerificationToken(token),
      expiresAt,
    },
  });

  const delivery = await sendAuthEmail({
    to: input.email,
    subject: "Verify your BluePass email",
    text: buildVerificationText(verificationUrl),
    html: buildVerificationHtml({
      name: input.name,
      verificationUrl,
    }),
  });

  return {
    delivery,
    expiresAt,
    verificationUrl:
      delivery.provider === "development" ? verificationUrl : undefined,
  };
}

export async function verifyTravellerEmail(token: string) {
  const tokenHash = hashVerificationToken(token);
  const verification =
    await prisma.bluePassAccountEmailVerificationToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        accountId: true,
        email: true,
        expiresAt: true,
        usedAt: true,
        account: {
          select: {
            travellerId: true,
          },
        },
      },
    });

  if (!verification) {
    return verifyLegacyTravellerEmail(tokenHash);
  }

  if (verification.usedAt) {
    return {
      ok: false as const,
      error: "Verification link is invalid or already used.",
    };
  }

  if (verification.expiresAt <= new Date()) {
    return {
      ok: false as const,
      error: "Verification link has expired. Please request a new one.",
    };
  }

  const verifiedAt = new Date();
  const transaction: Prisma.PrismaPromise<unknown>[] = [
    prisma.bluePassAccount.update({
      where: { id: verification.accountId },
      data: {
        emailVerifiedAt: verifiedAt,
        email: verification.email,
      },
    }),
    prisma.bluePassAccountEmailVerificationToken.update({
      where: { id: verification.id },
      data: { usedAt: verifiedAt },
    }),
    prisma.bluePassAccountEmailVerificationToken.deleteMany({
      where: {
        accountId: verification.accountId,
        usedAt: null,
        id: { not: verification.id },
      },
    }),
  ];

  if (verification.account.travellerId) {
    transaction.push(
      prisma.traveller.update({
        where: { id: verification.account.travellerId },
        data: {
          emailVerifiedAt: verifiedAt,
          email: verification.email,
        },
      }),
    );
  }

  await prisma.$transaction([...transaction]);

  return { ok: true as const, accountId: verification.accountId };
}

async function verifyLegacyTravellerEmail(tokenHash: string) {
  const verification = await prisma.travellerEmailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      travellerId: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      traveller: {
        select: {
          id: true,
          displayName: true,
          whatsappE164: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!verification || verification.usedAt) {
    return {
      ok: false as const,
      error: "Verification link is invalid or already used.",
    };
  }

  if (verification.expiresAt <= new Date()) {
    return {
      ok: false as const,
      error: "Verification link has expired. Please request a new one.",
    };
  }

  const verifiedAt = new Date();
  const account = await prisma.bluePassAccount.upsert({
    where: { email: verification.email },
    create: {
      email: verification.email,
      emailVerifiedAt: verifiedAt,
      passwordHash: verification.traveller.passwordHash ?? "",
      displayName: verification.traveller.displayName,
      phone: verification.traveller.whatsappE164,
      travellerId: verification.travellerId,
      roles: ["TRAVELLER"],
    },
    update: {
      emailVerifiedAt: verifiedAt,
      displayName: verification.traveller.displayName,
      phone: verification.traveller.whatsappE164,
      travellerId: verification.travellerId,
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.traveller.update({
      where: { id: verification.travellerId },
      data: {
        emailVerifiedAt: verifiedAt,
        email: verification.email,
      },
    }),
    prisma.travellerEmailVerificationToken.update({
      where: { id: verification.id },
      data: { usedAt: verifiedAt },
    }),
    prisma.travellerEmailVerificationToken.deleteMany({
      where: {
        travellerId: verification.travellerId,
        usedAt: null,
        id: { not: verification.id },
      },
    }),
  ]);

  return { ok: true as const, accountId: account.id };
}

function buildVerificationUrl(
  token: string,
  requestBaseUrl?: string,
  nextPath?: string | null,
) {
  const baseUrl =
    requestBaseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BLUEPASS_APP_URL?.trim() ||
    "http://localhost:3000";

  const url = new URL(`${baseUrl.replace(/\/$/, "")}/api/auth/verify-email`);
  url.searchParams.set("token", token);

  if (isSafeNextPath(nextPath)) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildVerificationText(verificationUrl: string) {
  return [
    "Verify your BluePass email",
    "",
    "Click this link to verify your traveller profile:",
    verificationUrl,
    "",
    `This link expires in ${VERIFICATION_HOURS} hours.`,
  ].join("\n");
}

function buildVerificationHtml(input: {
  name?: string | null;
  verificationUrl: string;
}) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #092033;">
      <p>${greeting}</p>
      <p>Verify your email so Kai can safely remember your BluePass traveller profile.</p>
      <p>
        <a href="${input.verificationUrl}" style="display:inline-block;background:#006f8e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">
          Verify email
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">This link expires in ${VERIFICATION_HOURS} hours.</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isSafeNextPath(
  nextPath: string | null | undefined,
): nextPath is string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return false;
  }

  return !/^\/[^/\\]*:/.test(nextPath);
}
