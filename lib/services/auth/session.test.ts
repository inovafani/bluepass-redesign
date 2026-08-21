import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";

const EMAIL_PREFIX = "session-test+";

/** Mirrors the module's own `hashSessionToken`, which is private to it. */
function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * `getCurrentTraveller()` runs from plain Server Component page renders, where Next.js throws if
 * anything tries to mutate cookies - this is the exact shape of the real error (confirmed live,
 * 2026-08-21: a real expired session crashed /account with this before the fix in session.ts).
 * `next/headers`'s `cookies()` can't be exercised for real outside an actual request, so this is
 * the one legitimate framework-boundary mock in an otherwise real-DB test suite.
 */
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

describe("getCurrentTraveller", () => {
  it("returns undefined instead of crashing when the session is expired and the cookie can't be mutated from this render", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentTraveller, TRAVELLER_SESSION_COOKIE } = await import("./session");

    const token = randomBytes(32).toString("base64url");
    await prisma.bluePassAccount.create({
      data: {
        email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
        passwordHash: randomBytes(32).toString("hex"),
        emailVerifiedAt: new Date(),
        roles: ["TRAVELLER"],
        sessions: {
          create: {
            tokenHash: hashSessionToken(token),
            expiresAt: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      },
    });

    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === TRAVELLER_SESSION_COOKIE ? { value: token } : undefined),
      delete: () => {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options",
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(getCurrentTraveller()).resolves.toBeUndefined();
  });

  it("returns undefined instead of crashing when the session belongs to an unverified account", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentTraveller, TRAVELLER_SESSION_COOKIE } = await import("./session");

    const token = randomBytes(32).toString("base64url");
    await prisma.bluePassAccount.create({
      data: {
        email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
        passwordHash: randomBytes(32).toString("hex"),
        emailVerifiedAt: null,
        roles: ["TRAVELLER"],
        sessions: {
          create: {
            tokenHash: hashSessionToken(token),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        },
      },
    });

    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === TRAVELLER_SESSION_COOKIE ? { value: token } : undefined),
      delete: () => {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options",
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(getCurrentTraveller()).resolves.toBeUndefined();
  });
});
