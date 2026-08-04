import { NextResponse } from "next/server";
import { createAndSendPasswordReset } from "@/lib/services/auth/password-reset";
import { forgotPasswordSchema, normalizeEmail } from "@/lib/services/auth/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const result = await createAndSendPasswordReset({
    email,
    baseUrl: new URL(request.url).origin,
  });

  // Always the same response shape whether or not an account exists for this email - the request
  // itself must not reveal that.
  return NextResponse.json({
    ok: true,
    requested: result.requested,
    ...(result.developmentResetUrl ? { developmentResetUrl: result.developmentResetUrl } : {}),
  });
}
