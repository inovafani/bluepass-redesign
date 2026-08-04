import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/services/auth/password-reset";
import { resetPasswordSchema } from "@/lib/services/auth/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A reset link and 8+ character password are required." },
      { status: 400 },
    );
  }

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    newPassword: parsed.data.password,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
