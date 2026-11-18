import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendAuthEmail } from "@/lib/services/auth/email";

/* Investor access requests from public/invest-vip/index.html. Sent as fetch (JSON reply) or as a plain form post without JS (redirect back). */

const CHEQUES = ["$10K to $25K", "$25K to $50K", "$50K to $100K", "$100K+", "Still deciding"] as const;

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  cheque: z.enum(CHEQUES),
});

const escape = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: NextRequest) {
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const reply = (status: number, error?: string) =>
    wantsJson
      ? NextResponse.json(error ? { error } : { ok: true }, { status })
      : NextResponse.redirect(new URL(error ? "/invest-vip#access" : "/invest-vip?sent=1#access", request.url), 303);

  const form = await request.formData().catch(() => null);
  if (!form) return reply(400, "Please fill in the form and try again.");
  // Honeypot: bots fill the hidden field; pretend success so they move on.
  if (String(form.get("company-website") ?? "").trim()) return reply(200);

  const parsed = schema.safeParse({ name: form.get("name"), email: form.get("email"), cheque: form.get("cheque") });
  if (!parsed.success) return reply(400, "Please enter your name and a valid email.");
  const { name, email, cheque } = parsed.data;

  const to = process.env.INVEST_EMAIL_TO?.trim() || "invest@bluepass.co";
  const text = `New investor access request\n\nName: ${name}\nEmail: ${email}\nIndicative cheque: ${cheque}\n`;
  try {
    const result = await sendAuthEmail({
      to,
      replyTo: email,
      subject: `Investor request: ${name} (${cheque})`,
      text,
      html: `<p><strong>New investor access request</strong></p><p>Name: ${escape(name)}<br>Email: ${escape(email)}<br>Indicative cheque: ${escape(cheque)}</p>`,
    });
    // Not delivered means no mail provider is configured; never tell an investor it worked when it did not.
    if (!result.delivered) throw new Error(result.reason);
  } catch (error) {
    console.error("invest.request_failed", { error: error instanceof Error ? error.message : error });
    return reply(502, "Could not send right now. Please email invest@bluepass.co.");
  }
  return reply(200);
}
