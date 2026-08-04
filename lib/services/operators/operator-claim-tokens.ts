import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { sendAuthEmail } from "@/lib/services/auth/email";
import { normalizeSlug } from "@/lib/services/operators/operator-leads";

const CLAIM_TOKEN_DAYS = 7;

type ClaimTokenRequestInput = {
  operatorSlug: string;
  baseUrl?: string;
  now?: Date;
  tokenFactory?: () => string;
};

export async function requestOperatorClaimToken(
  input: ClaimTokenRequestInput,
) {
  const slug = normalizeSlug(input.operatorSlug);
  const now = input.now ?? new Date();
  const lead = await prisma.operatorLead.findUnique({
    where: { slug },
  });

  if (!lead) {
    throw new Error("Operator lead was not found.");
  }

  if (!lead.email) {
    await prisma.operatorOutreachEvent.create({
      data: {
        operatorLeadId: lead.id,
        operatorSlug: lead.slug,
        type: "CLAIM_LINK_MISSING_EMAIL",
        message: "Claim link could not be sent because this lead has no email.",
      },
    });

    return {
      ok: false as const,
      reason: "missing_email" as const,
    };
  }

  const token = input.tokenFactory?.() ?? randomBytes(32).toString("base64url");
  const claimUrl = buildOperatorClaimUrl(token, input.baseUrl);
  const expiresAt = new Date(
    now.getTime() + CLAIM_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.operatorClaimToken.create({
    data: {
      operatorLeadId: lead.id,
      email: lead.email,
      tokenHash: hashClaimToken(token),
      expiresAt,
    },
  });

  // The send is attempted before anything records "sent" - previously the lead status and
  // outreach event were written first, so a failed send still left the database claiming the
  // email went out. The token row above is created regardless of send outcome so a retry can
  // reuse it rather than minting a new one.
  let delivery: Awaited<ReturnType<typeof sendAuthEmail>>;
  try {
    delivery = await sendAuthEmail({
      to: lead.email,
      subject: `Claim ${lead.name} on BluePass`,
      text: buildClaimEmailText({ operatorName: lead.name, claimUrl }),
      html: buildClaimEmailHtml({ operatorName: lead.name, claimUrl }),
    });
  } catch (error) {
    await prisma.operatorOutreachEvent.create({
      data: {
        operatorLeadId: lead.id,
        operatorSlug: lead.slug,
        type: "CLAIM_LINK_SEND_FAILED",
        message: `Claim link email to ${lead.email} failed to send.`,
        metadata: {
          email: lead.email,
          error: error instanceof Error ? error.message : String(error),
        },
      },
    });

    return {
      ok: false as const,
      reason: "send_failed" as const,
    };
  }

  await prisma.operatorLead.update({
    where: { id: lead.id },
    data: {
      status: "CLAIM_LINK_REQUESTED",
      lastOutreachAt: now,
    },
  });
  await prisma.operatorOutreachEvent.create({
    data: {
      operatorLeadId: lead.id,
      operatorSlug: lead.slug,
      type: "CLAIM_LINK_REQUESTED",
      message: `Claim link sent to ${lead.email}.`,
      metadata: {
        email: lead.email,
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  return {
    ok: true as const,
    claimUrl,
    expiresAt,
    delivery,
  };
}

export async function resolveOperatorClaimToken(token: string, now = new Date()) {
  const tokenHash = hashClaimToken(token);
  const claimToken = await prisma.operatorClaimToken.findUnique({
    where: { tokenHash },
    include: { operatorLead: true },
  });

  if (!claimToken || claimToken.usedAt) {
    return {
      ok: false as const,
      error: "Claim link is invalid or already used.",
    };
  }

  if (claimToken.expiresAt <= now) {
    return {
      ok: false as const,
      error: "Claim link has expired. Please request a new one.",
    };
  }

  return {
    ok: true as const,
    claimToken,
    operatorLead: claimToken.operatorLead,
  };
}

function buildOperatorClaimUrl(token: string, requestBaseUrl?: string) {
  const baseUrl =
    requestBaseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BLUEPASS_APP_URL?.trim() ||
    "http://localhost:3000";
  const url = new URL(
    `${baseUrl.replace(/\/$/, "")}/operator/claim/verify`,
  );
  url.searchParams.set("token", token);
  return url.toString();
}

function hashClaimToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildClaimEmailText(input: {
  operatorName: string;
  claimUrl: string;
}) {
  return [
    `Claim ${input.operatorName} on BluePass`,
    "",
    "BluePass built a starter listing from public information so travellers can discover better ocean trips.",
    "Use this secure link to claim the business, correct the listing, add real trips, and connect booking tools:",
    input.claimUrl,
    "",
    `This link expires in ${CLAIM_TOKEN_DAYS} days.`,
  ].join("\n");
}

function buildClaimEmailHtml(input: {
  operatorName: string;
  claimUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #092033;">
      <p>Hi,</p>
      <p>BluePass built a starter listing for <strong>${escapeHtml(input.operatorName)}</strong> from public information so travellers can discover better ocean trips.</p>
      <p>Use this secure link to claim the business, correct the listing, add real trips, and connect booking tools.</p>
      <p>
        <a href="${input.claimUrl}" style="display:inline-block;background:#006f8e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">
          Claim ${escapeHtml(input.operatorName)}
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">This link expires in ${CLAIM_TOKEN_DAYS} days.</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
