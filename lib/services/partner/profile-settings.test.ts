import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { updatePartnerProfileDetails } from "./profile-settings";

const EMAIL_PREFIX = "partner-profile-settings-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function partnerProfile() {
  const profile = await prisma.partnerProfile.create({
    data: {
      status: "APPROVED",
      handle: "@before",
      account: {
        create: {
          email: `${EMAIL_PREFIX}${randomUUID()}@partners.bluepass.co`,
          passwordHash: "unusable-placeholder",
          roles: ["PARTNER"],
        },
      },
    },
    select: { id: true },
  });

  return profile.id;
}

describe("updatePartnerProfileDetails", () => {
  it("saves every field, trimmed, on a valid submission", async () => {
    const profileId = await partnerProfile();

    const result = await updatePartnerProfileDetails({
      partnerProfileId: profileId,
      handle: "  @after  ",
      audienceUrl: "https://example.com/audience",
      instagramUrl: "https://instagram.com/after",
      youtubeUrl: "https://youtube.com/@after",
      tiktokUrl: "https://www.tiktok.com/@after",
    });

    expect(result.ok).toBe(true);

    const profile = await prisma.partnerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { handle: true, audienceUrl: true, instagramUrl: true, youtubeUrl: true, tiktokUrl: true },
    });
    expect(profile).toEqual({
      handle: "@after",
      audienceUrl: "https://example.com/audience",
      instagramUrl: "https://instagram.com/after",
      youtubeUrl: "https://youtube.com/@after",
      tiktokUrl: "https://www.tiktok.com/@after",
    });
  });

  it("clears a field when it's submitted empty rather than leaving the old value", async () => {
    const profileId = await partnerProfile();
    await updatePartnerProfileDetails({
      partnerProfileId: profileId,
      handle: "@has-instagram",
      audienceUrl: "",
      instagramUrl: "https://instagram.com/has-instagram",
      youtubeUrl: "",
      tiktokUrl: "",
    });

    const result = await updatePartnerProfileDetails({
      partnerProfileId: profileId,
      handle: "@has-instagram",
      audienceUrl: "",
      instagramUrl: "",
      youtubeUrl: "",
      tiktokUrl: "",
    });

    expect(result.ok).toBe(true);
    const profile = await prisma.partnerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { instagramUrl: true },
    });
    expect(profile.instagramUrl).toBeNull();
  });

  it("rejects an implausible URL and changes nothing", async () => {
    const profileId = await partnerProfile();

    const result = await updatePartnerProfileDetails({
      partnerProfileId: profileId,
      handle: "@bad-url",
      audienceUrl: "",
      instagramUrl: "not-a-url",
      youtubeUrl: "",
      tiktokUrl: "",
    });

    expect(result).toMatchObject({ ok: false, field: "instagramUrl" });
    const profile = await prisma.partnerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { handle: true, instagramUrl: true },
    });
    // Still "@before" - the whole update is rejected, not applied field-by-field.
    expect(profile.handle).toBe("@before");
    expect(profile.instagramUrl).toBeNull();
  });
});
