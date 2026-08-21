import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const TRAVELLER_SESSION_COOKIE = "bluepass_traveller_session";

const SESSION_DAYS = 30;
const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

export type CurrentTraveller = {
  accountId: string;
  id: string;
  travellerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  roles: string[];
};

/**
 * `getCurrentTraveller()` runs from plain Server Component page renders (e.g. every page that
 * calls `requireSignedInOrRedirect`), not just Route Handlers/Server Actions - and Next.js only
 * allows cookie mutation from the latter two. A dead cookie (expired or tied to an unverified
 * account) used to crash the entire page with "Cookies can only be modified in a Server Action or
 * Route Handler" instead of just being treated as signed-out. The delete is a nice-to-have (stop
 * resending an already-invalid cookie); it isn't required for the auth check itself, which already
 * returns undefined regardless of whether this succeeds. Swallow the error rather than let a
 * best-effort cleanup take the whole page down with it - a real Route Handler/Server Action call
 * (e.g. actual sign-out) still deletes it for real.
 */
function tryDeleteSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  try {
    cookieStore.delete(TRAVELLER_SESSION_COOKIE);
  } catch {
    // Not in a context that can mutate cookies (plain Server Component render) - fine, the
    // caller already treats this session as invalid regardless.
  }
}

export async function createTravellerSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.bluePassAccountSession.create({
    data: {
      accountId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(TRAVELLER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getCurrentTraveller(): Promise<CurrentTraveller | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TRAVELLER_SESSION_COOKIE)?.value;

  if (!token) {
    return undefined;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.bluePassAccountSession.findUnique({
    where: { tokenHash },
    select: {
      tokenHash: true,
      expiresAt: true,
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          emailVerifiedAt: true,
          phone: true,
          roles: true,
          traveller: {
            select: {
              id: true,
              displayName: true,
              email: true,
              emailVerifiedAt: true,
              whatsappE164: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return getCurrentTravellerFromLegacySession(tokenHash, cookieStore);
  }

  if (session.expiresAt <= new Date()) {
    await prisma.bluePassAccountSession.deleteMany({
      where: { tokenHash: session.tokenHash },
    });
    tryDeleteSessionCookie(cookieStore);
    return undefined;
  }

  if (!session.account.emailVerifiedAt) {
    await prisma.bluePassAccountSession.deleteMany({
      where: { tokenHash: session.tokenHash },
    });
    tryDeleteSessionCookie(cookieStore);
    return undefined;
  }

  const traveller = session.account.traveller;

  return {
    accountId: session.account.id,
    id: traveller?.id ?? session.account.id,
    travellerId: traveller?.id,
    name: traveller?.displayName ?? session.account.displayName ?? undefined,
    email: session.account.email ?? traveller?.email ?? undefined,
    phone: traveller?.whatsappE164 ?? session.account.phone ?? undefined,
    roles: session.account.roles,
  };
}

export async function clearTravellerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TRAVELLER_SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    await prisma.bluePassAccountSession.deleteMany({
      where: { tokenHash },
    });
    await prisma.travellerSession.deleteMany({
      where: { tokenHash },
    });
  }

  cookieStore.delete(TRAVELLER_SESSION_COOKIE);
}

async function getCurrentTravellerFromLegacySession(
  tokenHash: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<CurrentTraveller | undefined> {
  const legacySession = await prisma.travellerSession.findUnique({
    where: { tokenHash },
    select: {
      tokenHash: true,
      expiresAt: true,
      traveller: {
        select: {
          id: true,
          displayName: true,
          email: true,
          emailVerifiedAt: true,
          passwordHash: true,
          whatsappE164: true,
        },
      },
    },
  });

  if (!legacySession || legacySession.expiresAt <= new Date()) {
    if (legacySession) {
      await prisma.travellerSession.deleteMany({
        where: { tokenHash: legacySession.tokenHash },
      });
    }
    tryDeleteSessionCookie(cookieStore);
    return undefined;
  }

  if (!legacySession.traveller.emailVerifiedAt) {
    await prisma.travellerSession.deleteMany({
      where: { tokenHash: legacySession.tokenHash },
    });
    tryDeleteSessionCookie(cookieStore);
    return undefined;
  }

  const legacyEmail =
    legacySession.traveller.email ?? `${legacySession.traveller.id}@legacy.bluepass.local`;
  const account = await prisma.bluePassAccount.upsert({
    where: { email: legacyEmail },
    create: {
      email: legacyEmail,
      emailVerifiedAt: legacySession.traveller.emailVerifiedAt,
      passwordHash: legacySession.traveller.passwordHash ?? "",
      displayName: legacySession.traveller.displayName,
      phone: legacySession.traveller.whatsappE164,
      travellerId: legacySession.traveller.id,
      roles: ["TRAVELLER"],
    },
    update: {
      emailVerifiedAt: legacySession.traveller.emailVerifiedAt,
      displayName: legacySession.traveller.displayName,
      phone: legacySession.traveller.whatsappE164,
      travellerId: legacySession.traveller.id,
    },
    select: {
      id: true,
      roles: true,
    },
  });

  return {
    accountId: account.id,
    id: legacySession.traveller.id,
    travellerId: legacySession.traveller.id,
    name: legacySession.traveller.displayName ?? undefined,
    email: legacySession.traveller.email ?? undefined,
    phone: legacySession.traveller.whatsappE164 ?? undefined,
    roles: account.roles,
  };
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
