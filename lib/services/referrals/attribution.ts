import { cookies } from "next/headers";
import type { ReferralPartnerRole } from "@prisma/client";

export const REFERRAL_ATTRIBUTION_COOKIE = "bluepass_ref";

export type ReferralAttribution = {
  code: string;
  referralLinkId?: string;
  referralPartnerId?: string;
  role?: ReferralPartnerRole;
  label?: string;
};

export function normalizeReferralCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

export function encodeReferralAttribution(attribution: ReferralAttribution) {
  return Buffer.from(JSON.stringify(attribution), "utf8").toString("base64url");
}

export function decodeReferralAttribution(value: string): ReferralAttribution | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;

    if (!isRecord(parsed) || typeof parsed.code !== "string") {
      return undefined;
    }

    const code = normalizeReferralCode(parsed.code);

    if (!code) {
      return undefined;
    }

    return {
      code,
      referralLinkId:
        typeof parsed.referralLinkId === "string" ? parsed.referralLinkId : undefined,
      referralPartnerId:
        typeof parsed.referralPartnerId === "string" ? parsed.referralPartnerId : undefined,
      role: isReferralRole(parsed.role) ? parsed.role : undefined,
      label: typeof parsed.label === "string" ? parsed.label : undefined,
    };
  } catch {
    return undefined;
  }
}

export async function getReferralAttributionFromCookies() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(REFERRAL_ATTRIBUTION_COOKIE)?.value;

  return raw ? decodeReferralAttribution(raw) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReferralRole(value: unknown): value is ReferralPartnerRole {
  return (
    value === "CREATOR" ||
    value === "OPERATOR" ||
    value === "DIVE_SHOP" ||
    value === "GROUP" ||
    value === "TRAVELLER"
  );
}
