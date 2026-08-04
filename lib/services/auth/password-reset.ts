import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { sendAuthEmail } from "@/lib/services/auth/email";
import { hashPassword } from "@/lib/services/auth/password";
import { isSafeNextPath } from "@/lib/services/auth/email-verification";

const RESET_TOKEN_MINUTES = 60;

export async function createAndSendPasswordReset(input: {
  email: string;
  baseUrl?: string;
  nextPath?: string | null;
}) {
  const account = await prisma.bluePassAccount.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, displayName: true },
  });

  // Always behave the same whether or not the account exists, so this endpoint can't be used to
  // discover which emails have a BluePass account.
  if (!account) {
    return { requested: true as const };
  }

  const token = randomBytes(32).toString("base64url");
  const resetUrl = buildResetUrl(token, input.baseUrl, input.nextPath);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

  await prisma.bluePassAccountPasswordResetToken.create({
    data: {
      accountId: account.id,
      tokenHash: hashResetToken(token),
      expiresAt,
    },
  });

  const delivery = await sendAuthEmail({
    to: account.email,
    subject: "Reset your BluePass password",
    text: buildResetText(resetUrl),
    html: buildResetHtml({ name: account.displayName, resetUrl }),
  });

  return {
    requested: true as const,
    delivery,
    developmentResetUrl: delivery.provider === "development" ? resetUrl : undefined,
  };
}

export async function resetPasswordWithToken(input: { token: string; newPassword: string }) {
  const tokenHash = hashResetToken(input.token);
  const reset = await prisma.bluePassAccountPasswordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, accountId: true, expiresAt: true, usedAt: true },
  });

  if (!reset) {
    return { ok: false as const, error: "Reset link is invalid or already used." };
  }

  if (reset.usedAt) {
    return { ok: false as const, error: "Reset link is invalid or already used." };
  }

  if (reset.expiresAt <= new Date()) {
    return { ok: false as const, error: "Reset link has expired. Please request a new one." };
  }

  const usedAt = new Date();
  const passwordHash = hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.bluePassAccount.update({
      where: { id: reset.accountId },
      data: { passwordHash },
    }),
    prisma.bluePassAccountPasswordResetToken.update({
      where: { id: reset.id },
      data: { usedAt },
    }),
    prisma.bluePassAccountPasswordResetToken.deleteMany({
      where: { accountId: reset.accountId, usedAt: null, id: { not: reset.id } },
    }),
    // A password reset is a reasonable time to sign out every other session for this account -
    // if the reset was needed because the old password leaked, this closes anything already open
    // with it.
    prisma.bluePassAccountSession.deleteMany({ where: { accountId: reset.accountId } }),
  ]);

  return { ok: true as const, accountId: reset.accountId };
}

function buildResetUrl(token: string, requestBaseUrl?: string, nextPath?: string | null) {
  const baseUrl =
    requestBaseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BLUEPASS_APP_URL?.trim() ||
    "http://localhost:3000";

  const url = new URL(`${baseUrl.replace(/\/$/, "")}/reset-password`);
  url.searchParams.set("token", token);

  if (isSafeNextPath(nextPath)) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetText(resetUrl: string) {
  return [
    "Reset your BluePass password",
    "",
    "Click this link to choose a new password:",
    resetUrl,
    "",
    `This link expires in ${RESET_TOKEN_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
  ].join("\n");
}

function buildResetHtml(input: { name?: string | null; resetUrl: string }) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #092033;">
      <p>${greeting}</p>
      <p>We received a request to reset your BluePass password.</p>
      <p>
        <a href="${input.resetUrl}" style="display:inline-block;background:#006f8e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">
          Reset password
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">This link expires in ${RESET_TOKEN_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
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
