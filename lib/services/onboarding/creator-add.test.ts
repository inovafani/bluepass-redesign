import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { addCreator, createCreatorLogin } from "@/lib/services/onboarding/creator-admin";
import { resetRailsTables } from "@/lib/services/rails/test-fixtures";

const rae = { name: "Rae Shooter", brand: null, website: "https://reefshooter.com/", instagram: "reefshooter", contactEmail: null, baseState: "QLD", baseTown: null, specialties: ["reef"], summary: null };

beforeEach(async () => {
  await resetRailsTables();
  await prisma.$executeRawUnsafe(`TRUNCATE "Creator", "CreatorCampaign" CASCADE`);
});

describe("adding a creator by hand", () => {
  it("stores them as a researched creator operators can pick", async () => {
    expect(await addCreator(rae)).toEqual({ ok: true });
    const c = await prisma.creator.findUniqueOrThrow({ where: { slug: "rae-shooter" } });
    expect(c).toMatchObject({ source: "research", hidden: false, partnerProfileId: null, instagram: "reefshooter" });
  });

  it("refuses a repeat by name, website or Instagram", async () => {
    await addCreator(rae);
    expect((await addCreator({ ...rae, website: null, instagram: null, contactEmail: "a@b.co" })).ok).toBe(false);
    expect((await addCreator({ ...rae, name: "Other Person", instagram: null })).ok).toBe(false);
    expect((await addCreator({ ...rae, name: "Other Person", website: null })).ok).toBe(false);
    expect(await prisma.creator.count()).toBe(1);
  });
});

describe("giving a hand-added creator a login", () => {
  const withEmail = { ...rae, contactEmail: "rae@reefshooter.com" };
  const noMail = async () => ({ requested: true as const });

  it("makes an approved creator account tied to their entry and sends the set-password link", async () => {
    const added = await addCreator(withEmail);
    if (!added.ok) throw new Error("not added");
    const sent: string[] = [];
    const result = await createCreatorLogin({ creatorId: added.creatorId }, (async ({ email }: { email: string }) => { sent.push(email); return { requested: true as const }; }) as never);
    expect(result).toMatchObject({ ok: true, email: "rae@reefshooter.com", emailed: true });
    expect(sent).toEqual(["rae@reefshooter.com"]);
    const c = await prisma.creator.findUniqueOrThrow({ where: { id: added.creatorId }, include: { partnerProfile: { include: { account: true } } } });
    expect(c.partnerProfile).toMatchObject({ status: "APPROVED", partnerCategory: "CREATOR" });
    expect(c.partnerProfile?.referralPartnerId).not.toBeNull();
    expect(c.partnerProfile?.account.roles).toEqual(["PARTNER"]);
    expect(await prisma.creator.count()).toBe(1);
  });

  it("refuses an email that already has an account, or no email, or a second login", async () => {
    const a = await addCreator(withEmail);
    const b = await addCreator({ ...rae, name: "No Mail", website: "https://nomail.com/", instagram: null });
    if (!a.ok || !b.ok) throw new Error("not added");
    expect((await createCreatorLogin({ creatorId: b.creatorId }, noMail as never)).ok).toBe(false);
    await prisma.bluePassAccount.create({ data: { email: "rae@reefshooter.com", passwordHash: "x", roles: ["TRAVELLER"] } });
    expect((await createCreatorLogin({ creatorId: a.creatorId }, noMail as never)).ok).toBe(false);
    expect(await prisma.partnerProfile.count()).toBe(0);
  });

  it("keeps the account when only the email fails", async () => {
    const a = await addCreator(withEmail);
    if (!a.ok) throw new Error("not added");
    const result = await createCreatorLogin({ creatorId: a.creatorId }, (async () => { throw new Error("mail down"); }) as never);
    expect(result).toMatchObject({ ok: true, emailed: false, emailError: "mail down" });
    expect((await createCreatorLogin({ creatorId: a.creatorId }, noMail as never)).ok).toBe(false);
  });
});
