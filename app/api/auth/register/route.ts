import { NextResponse } from "next/server";
import { BluePassAccountRole, Prisma } from "@prisma/client";
import { createAndSendEmailVerification } from "@/lib/services/auth/email-verification";
import { hashPassword } from "@/lib/services/auth/password";
import {
  normalizeEmail,
  registerTravellerSchema,
} from "@/lib/services/auth/validation";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerTravellerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Name, valid email, phone, and 8+ character password are required.",
      },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const phone = parsed.data.phone.trim();
  const passwordHash = hashPassword(parsed.data.password);

  const existingEmail = await prisma.bluePassAccount.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, roles: true },
  });

  if (existingEmail?.passwordHash) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  try {
    const name = parsed.data.name.trim();
    const traveller = await prisma.traveller.upsert({
      where: { whatsappE164: phone },
      create: {
        displayName: name,
        email,
        whatsappE164: phone,
        emailVerifiedAt: null,
        passwordHash,
      },
      update: {
        displayName: name,
        email,
        emailVerifiedAt: null,
        passwordHash,
      },
      select: { id: true },
    });

    const nextRoles = Array.from(
      new Set<BluePassAccountRole>([
        ...(existingEmail?.roles ?? []),
        BluePassAccountRole.TRAVELLER,
      ]),
    );
    const account = existingEmail
      ? await prisma.bluePassAccount.update({
          where: { id: existingEmail.id },
          data: {
            emailVerifiedAt: null,
            passwordHash,
            displayName: name,
            phone,
            roles: { set: nextRoles },
            travellerId: traveller.id,
          },
          select: { id: true },
        })
      : await prisma.bluePassAccount.create({
          data: {
            email,
            emailVerifiedAt: null,
            passwordHash,
            displayName: name,
            phone,
            roles: ["TRAVELLER"],
            travellerId: traveller.id,
          },
          select: { id: true },
        });

    await prisma.traveller.update({
      where: { id: traveller.id },
      data: {
        displayName: name,
        whatsappE164: phone,
        emailVerifiedAt: null,
        passwordHash,
      },
    });

    const verification = await createAndSendEmailVerification({
      accountId: account.id,
      email,
      name,
      baseUrl: new URL(request.url).origin,
      nextPath: parsed.data.next,
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "That email or phone number is already linked to another account.",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
