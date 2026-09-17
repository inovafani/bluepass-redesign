import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

/**
 * Anonymous, pre-account interest capture for the "we're still building this" popup - see
 * WaitlistSignup's own schema comment for why this is deliberately not `/api/signup` (that route
 * requires a signed-in account and immediately creates a real, reviewable OperatorProfile/
 * PartnerProfile; this is just a name on a list to email once the platform is ready).
 */
const waitlistSchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional(),
  role: z.enum(["OPERATOR", "PARTNER", "TRAVELLER"]),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = waitlistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form fields and try again." },
      { status: 400 },
    );
  }

  await prisma.waitlistSignup.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name?.trim() || null,
      role: parsed.data.role,
    },
  });

  return NextResponse.json({ ok: true });
}
