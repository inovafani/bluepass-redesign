import { NextResponse } from "next/server";
import { createAndSendEmailVerification } from "@/lib/services/auth/email-verification";
import { normalizeEmail, resendVerificationSchema } from "@/lib/services/auth/validation";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = resendVerificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const account = await prisma.bluePassAccount.findUnique({
    where: { email },
    select: {
      id: true,
      displayName: true,
      emailVerifiedAt: true,
      traveller: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ ok: true });
  }

  if (account.emailVerifiedAt) {
    return NextResponse.json({
      ok: true,
      alreadyVerified: true,
    });
  }

  const verification = await createAndSendEmailVerification({
    accountId: account.id,
    email,
    name: account.displayName ?? account.traveller?.displayName,
    baseUrl: new URL(request.url).origin,
  });

  return NextResponse.json({
    ok: true,
    requiresEmailVerification: true,
    email,
    verificationDelivery: verification.delivery,
    ...(verification.verificationUrl
      ? { developmentVerificationUrl: verification.verificationUrl }
      : {}),
  });
}
