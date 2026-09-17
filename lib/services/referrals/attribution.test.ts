import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolveReferralAttribution } from "./attribution";

const CODE_PREFIX = "attr-test-";
const NAME_PREFIX = "Attribution Test ";

afterAll(async () => {
  const partners = await prisma.referralPartner.findMany({
    where: { name: { startsWith: NAME_PREFIX } },
    select: { id: true },
  });
  const partnerIds = partners.map((p) => p.id);

  if (partnerIds.length > 0) {
    await prisma.referralClick.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.partnerProfile.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.operatorProfile.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.bluePassAccount.deleteMany({
      where: { partnerProfile: { referralPartnerId: { in: partnerIds } } },
    });
    await prisma.referralLink.deleteMany({ where: { partnerId: { in: partnerIds } } });
    await prisma.referralPartner.deleteMany({ where: { id: { in: partnerIds } } });
  }
});

/** A ReferralPartner + ReferralLink, with an optional PartnerProfile at the given status attached -
 * exactly the shape `approveReferralApplication` produces, minus the parts irrelevant to
 * resolution (account fields, handle, etc). */
async function seedPartner(input: { active?: boolean; profileStatus?: "PENDING_REVIEW" | "APPROVED" | "DECLINED" | "LIVE" }) {
  const code = `${CODE_PREFIX}${randomUUID()}`;
  const partner = await prisma.referralPartner.create({
    data: {
      role: "PARTNER",
      name: `${NAME_PREFIX}${randomUUID()}`,
      links: { create: { code, active: input.active ?? true } },
    },
    select: { id: true },
  });

  if (input.profileStatus) {
    const email = `${CODE_PREFIX}${randomUUID()}@partners.bluepass.co`;
    const phone = `+61${randomUUID()}`;
    const account = await prisma.bluePassAccount.create({
      data: { email, passwordHash: randomUUID(), roles: ["PARTNER"], phone },
      select: { id: true },
    });
    await prisma.partnerProfile.create({
      data: { accountId: account.id, referralPartnerId: partner.id, status: input.profileStatus },
    });
  }

  return { code, partnerId: partner.id };
}

describe("resolveReferralAttribution", () => {
  it("resolves a link whose partner profile is APPROVED", async () => {
    const { code, partnerId } = await seedPartner({ profileStatus: "APPROVED" });

    const { attribution, resolvedLinkId } = await resolveReferralAttribution(code);

    expect(attribution.referralPartnerId).toBe(partnerId);
    expect(resolvedLinkId).toBeDefined();
  });

  it("does NOT resolve a link whose partner profile is still PENDING_REVIEW", async () => {
    const { code } = await seedPartner({ profileStatus: "PENDING_REVIEW" });

    const { attribution, resolvedLinkId } = await resolveReferralAttribution(code);

    expect(attribution.referralPartnerId).toBeUndefined();
    expect(resolvedLinkId).toBeUndefined();
  });

  it("does NOT resolve a link whose partner profile was DECLINED", async () => {
    const { code } = await seedPartner({ profileStatus: "DECLINED" });

    const { attribution } = await resolveReferralAttribution(code);

    expect(attribution.referralPartnerId).toBeUndefined();
  });

  it("does NOT resolve an active link with no partner/operator profile at all", async () => {
    const { code } = await seedPartner({});

    const { attribution } = await resolveReferralAttribution(code);

    expect(attribution.referralPartnerId).toBeUndefined();
  });

  it("does NOT resolve an approved partner's link if the link itself is inactive", async () => {
    const { code } = await seedPartner({ active: false, profileStatus: "APPROVED" });

    const { attribution } = await resolveReferralAttribution(code);

    expect(attribution.referralPartnerId).toBeUndefined();
  });

  it("returns the normalized code, unresolved, for a code that matches no link at all", async () => {
    const { attribution, resolvedLinkId } = await resolveReferralAttribution("no-such-code-at-all");

    expect(attribution).toEqual({ code: "no-such-code-at-all" });
    expect(resolvedLinkId).toBeUndefined();
  });

  /**
   * The cookie used to carry a base64 JSON blob with referralPartnerId/role baked in and no
   * signature - anyone could set `bluepass_ref` to their own forged value in devtools and have Kai
   * pay commission on a partner id they picked themselves. getReferralAttributionFromCookies now
   * treats the whole cookie value as nothing but a `?ref=` code and always re-resolves it here, so a
   * forged value (a real approved partner's raw id, or an old-style encoded blob) never has a
   * matching ReferralLink row and can never come back with a referralPartnerId attached.
   */
  it("never attaches a referralPartnerId for a raw id or an old-style encoded blob passed as the code", async () => {
    const { partnerId } = await seedPartner({ profileStatus: "APPROVED" });

    const forgedAsRawId = await resolveReferralAttribution(partnerId);
    expect(forgedAsRawId.attribution.referralPartnerId).toBeUndefined();

    const forgedAsEncodedBlob = await resolveReferralAttribution(
      Buffer.from(JSON.stringify({ code: "anything", referralPartnerId: partnerId }), "utf8").toString(
        "base64url",
      ),
    );
    expect(forgedAsEncodedBlob.attribution.referralPartnerId).toBeUndefined();
  });
});
