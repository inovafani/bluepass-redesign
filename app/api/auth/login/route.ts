import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/services/auth/password";
import { createTravellerSession } from "@/lib/services/auth/session";
import { authCredentialsSchema, normalizeEmail } from "@/lib/services/auth/validation";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = authCredentialsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email and password are required." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  let account = await prisma.bluePassAccount.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      emailVerifiedAt: true,
      email: true,
    },
  });

  if (!account) {
    const legacyTraveller = await prisma.traveller.findUnique({
      where: { email },
      select: {
        id: true,
        displayName: true,
        whatsappE164: true,
        passwordHash: true,
        emailVerifiedAt: true,
        email: true,
      },
    });

    if (
      legacyTraveller?.passwordHash &&
      verifyPassword(parsed.data.password, legacyTraveller.passwordHash)
    ) {
      account = await prisma.bluePassAccount.create({
        data: {
          email,
          emailVerifiedAt: legacyTraveller.emailVerifiedAt,
          passwordHash: legacyTraveller.passwordHash,
          displayName: legacyTraveller.displayName,
          phone: legacyTraveller.whatsappE164,
          roles: ["TRAVELLER"],
          travellerId: legacyTraveller.id,
        },
        select: {
          id: true,
          passwordHash: true,
          emailVerifiedAt: true,
          email: true,
        },
      });
    }
  }

  if (!account?.passwordHash || !verifyPassword(parsed.data.password, account.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  if (!account.emailVerifiedAt) {
    return NextResponse.json(
      {
        error: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        email: account.email,
      },
      { status: 403 },
    );
  }

  await createTravellerSession(account.id);

  return NextResponse.json({ ok: true });
}
