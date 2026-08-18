import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/services/auth/password";
import { resetPasswordWithToken } from "./password-reset";

/**
 * Only the redeem half is exercised here. `createAndSendPasswordReset` mails a live
 * password-setting link, and a suite that could put one in a real inbox by running is not worth the
 * extra coverage — the token it writes is the same row these tests create directly.
 */
const EMAIL_PREFIX = "password-reset-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

/** Mirrors the module's own `hashResetToken`, which is private to it. */
function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function accountWithToken(input: { emailVerifiedAt: Date | null }) {
  const token = randomBytes(16).toString("base64url");

  const account = await prisma.bluePassAccount.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
      /* The unusable placeholder `createManualOperator` and the Rezdy sync write. */
      passwordHash: randomBytes(32).toString("hex"),
      emailVerifiedAt: input.emailVerifiedAt,
      roles: ["OPERATOR"],
      passwordResetTokens: {
        create: {
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    },
    select: { id: true },
  });

  return { accountId: account.id, token };
}

describe("resetPasswordWithToken", () => {
  it("sets a first password on an operator account and verifies its email", async () => {
    const { accountId, token } = await accountWithToken({ emailVerifiedAt: null });

    const result = await resetPasswordWithToken({ token, newPassword: "a-real-password" });

    expect(result.ok).toBe(true);
    const account = await prisma.bluePassAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { passwordHash: true, emailVerifiedAt: true },
    });

    expect(verifyPassword("a-real-password", account.passwordHash)).toBe(true);
    /**
     * The whole operator login flow turns on this. Every operator account is minted with
     * `emailVerifiedAt: null`, and `/api/auth/login` 403s `EMAIL_NOT_VERIFIED` — so without the
     * reset counting as a verification, an operator sets a password and still cannot sign in.
     * Opening a link that only ever went to their inbox is the same proof verification asks for.
     */
    expect(account.emailVerifiedAt).not.toBeNull();
  });

  it("leaves an already-verified account's original timestamp alone", async () => {
    const verifiedAt = new Date("2026-01-01T00:00:00.000Z");
    const { accountId, token } = await accountWithToken({ emailVerifiedAt: verifiedAt });

    await resetPasswordWithToken({ token, newPassword: "another-password" });

    const account = await prisma.bluePassAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { emailVerifiedAt: true },
    });

    expect(account.emailVerifiedAt?.toISOString()).toBe(verifiedAt.toISOString());
  });

  it("refuses a token that has already been used", async () => {
    const { token } = await accountWithToken({ emailVerifiedAt: null });

    expect((await resetPasswordWithToken({ token, newPassword: "first-password" })).ok).toBe(true);
    const second = await resetPasswordWithToken({ token, newPassword: "second-password" });

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toContain("already used");
  });

  it("refuses an expired token", async () => {
    const token = randomBytes(16).toString("base64url");
    await prisma.bluePassAccount.create({
      data: {
        email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
        passwordHash: randomBytes(32).toString("hex"),
        roles: ["OPERATOR"],
        passwordResetTokens: {
          create: {
            tokenHash: hashResetToken(token),
            expiresAt: new Date(Date.now() - 1000),
          },
        },
      },
    });

    const result = await resetPasswordWithToken({ token, newPassword: "too-late-password" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("expired");
  });
});
