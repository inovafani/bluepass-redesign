import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { createAndSendPasswordReset } from "@/lib/services/auth/password-reset";
import { approveReferralApplication } from "@/lib/services/referrals/application-approval";
import { CREDIT_CURRENCY } from "@/lib/services/onboarding/credits";
import { stopOutreachQuietly } from "@/lib/services/outreach/stop";
import { hostOf, slugify, type NewCreator } from "@/lib/services/admin/creator-input";

/**
 * What the Bluepass team does in creator onboarding: see which picked creators still have no
 * invite (most get one email through Instantly; an Instagram message stays by hand), link a
 * creator to their account when it is not obvious, and settle a post an operator questioned.
 */

/** Researched creators that operators picked and nobody has invited yet, most wanted first. */
export async function invitesToSend() {
  const creators = await prisma.creator.findMany({
    where: { partnerProfileId: null, hidden: false, campaigns: { some: { status: "REQUESTED" } } },
    include: {
      campaigns: { where: { status: "REQUESTED" }, select: { operatorName: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      enrolments: { select: { status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return creators
    .map((c) => ({
      id: c.id, name: c.name, brand: c.brand, website: c.website, instagram: c.instagram, contactEmail: c.contactEmail,
      base: [c.baseTown, c.baseState].filter(Boolean).join(", ") || null, invitedAt: c.invitedAt, invitedBy: c.invitedBy,
      pickedBy: c.campaigns.map((p) => p.operatorName), firstPickedAt: c.campaigns[0]?.createdAt ?? null,
      emailed: c.enrolments[0] ? { at: c.enrolments[0].createdAt, status: c.enrolments[0].status } : null,
    }))
    .sort((a, b) => Number(Boolean(a.invitedAt)) - Number(Boolean(b.invitedAt)) || b.pickedBy.length - a.pickedBy.length);
}

/**
 * Adds a creator by hand to the directory operators pick from, for someone not on the research
 * list. Stored like a researched creator (source "research"), so one who later signs up with the
 * same email or Instagram is linked on approval. Refuses a repeat of a website, Instagram or name.
 */
export async function addCreator(input: NewCreator) {
  const host = hostOf(input.website);
  const slug = slugify(input.name);
  const same = await prisma.creator.findFirst({
    where: {
      OR: [
        { slug },
        ...(host ? [{ website: { contains: host, mode: "insensitive" as const } }] : []),
        ...(input.instagram ? [{ instagram: { equals: input.instagram, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { name: true },
  });
  if (same) return { ok: false as const, message: `${same.name} is already in the directory.` };
  const created = await prisma.creator.create({ data: { ...input, slug, source: "research", sourceUrl: input.website }, select: { id: true } });
  return { ok: true as const, creatorId: created.id };
}

/**
 * Gives a creator Bluepass added by hand their own login, the way createManualOperator does for
 * operators: an approved creator account with an unusable password, tied to their directory entry,
 * and the same single-use "set your password" link a forgotten password uses. Whoever adds them is
 * the vetting step, so there is no application to approve. The address comes from the creator's row,
 * never from the caller, and an email that already has an account is refused rather than taken over.
 */
export async function createCreatorLogin(
  input: { creatorId: string; baseUrl?: string },
  createReset: typeof createAndSendPasswordReset = createAndSendPasswordReset,
) {
  const creator = await prisma.creator.findUnique({ where: { id: input.creatorId } });
  if (!creator) return { ok: false as const, message: "That creator is no longer in the directory." };
  if (creator.partnerProfileId) return { ok: false as const, message: `${creator.name} already has a login.` };
  const email = creator.contactEmail?.trim().toLowerCase();
  if (!email) return { ok: false as const, message: `${creator.name} has no email, so there is nowhere to send a login. Add one first.` };
  if (await prisma.bluePassAccount.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false as const, message: `${email} already has a Bluepass account. If it is theirs, link it with "They joined as…" on this page.` };
  }

  const profile = await prisma.$transaction(async (tx) => {
    const account = await tx.bluePassAccount.create({
      // Unusable by design; they choose their own through the link below.
      data: { email, passwordHash: randomBytes(32).toString("hex"), displayName: creator.name, roles: ["PARTNER"] },
      select: { id: true },
    });
    const created = await tx.partnerProfile.create({
      data: {
        accountId: account.id, status: "PENDING_REVIEW", partnerCategory: "CREATOR", handle: creator.instagram,
        audienceUrl: creator.website, instagramUrl: creator.instagram ? `https://www.instagram.com/${creator.instagram}/` : null,
        youtubeUrl: creator.youtube, tiktokUrl: creator.tiktok,
      },
      select: { id: true },
    });
    // Linked before approval so the directory sync never mints a second entry for this account.
    await tx.creator.update({ where: { id: creator.id }, data: { partnerProfileId: created.id } });
    return created;
  });
  await approveReferralApplication({ kind: "partner", id: profile.id });
  await stopOutreachQuietly({ creatorId: creator.id }, "was given a Bluepass login");

  try {
    const sent = await createReset({ email, baseUrl: input.baseUrl });
    return { ok: true as const, email, emailed: !sent.developmentResetUrl, developmentResetUrl: sent.developmentResetUrl };
  } catch (error) {
    // The account exists; only the email failed. Say so, so nobody adds them a second time.
    return { ok: true as const, email, emailed: false, emailError: error instanceof Error ? error.message : "The email could not be sent." };
  }
}

export async function markInvited(input: { creatorId: string; by: string; now?: Date }) {
  await prisma.creator.update({ where: { id: input.creatorId }, data: { invitedAt: input.now ?? new Date(), invitedBy: input.by } });
}

/** Creators with an approved creator account who are not yet tied to a researched creator. */
export async function linkableCreatorAccounts() {
  const partners = await prisma.partnerProfile.findMany({
    where: { partnerCategory: "CREATOR", status: { in: ["APPROVED", "LIVE"] } },
    select: { id: true, handle: true, account: { select: { email: true, displayName: true } }, creator: { select: { id: true, source: true, _count: { select: { campaigns: true } } } } },
  });
  // A creator account's own entry, made when it was approved, can be replaced while nobody has picked it.
  return partners
    .filter((p) => !p.creator || (p.creator.source === "partner" && p.creator._count.campaigns === 0))
    .map((p) => ({ id: p.id, label: [p.account.displayName ?? p.handle, p.account.email].filter(Boolean).join(" · ") }));
}

/**
 * Ties a researched creator to the account they signed up with, so the picks waiting for
 * them appear in their portal. The account's own placeholder entry, unpicked, gives way.
 */
export async function linkCreatorAccount(input: { creatorId: string; partnerProfileId: string }) {
  const own = await prisma.creator.findUnique({ where: { partnerProfileId: input.partnerProfileId }, include: { _count: { select: { campaigns: true } } } });
  if (own && own.id !== input.creatorId) {
    if (own._count.campaigns > 0 || own.source !== "partner") return { ok: false as const, message: "That account is already tied to a creator operators have picked." };
    await prisma.creator.delete({ where: { id: own.id } });
  }
  await prisma.creator.update({ where: { id: input.creatorId }, data: { partnerProfileId: input.partnerProfileId } });
  // They joined, which is all the invite emails asked for.
  await stopOutreachQuietly({ creatorId: input.creatorId }, "joined Bluepass as a creator");
  return { ok: true as const };
}

function handleOf(url: string | null | undefined) {
  const m = url?.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  return (m ? m[1] : url ?? "").replace(/^@/, "").replace(/\/$/, "").trim().toLowerCase() || null;
}

/**
 * When a creator's partner application is approved, ties it to the researched creator it
 * plainly is: the same email as the one on their site, or the same Instagram account. Anything
 * less certain is left for a person in /admin/creators.
 */
export async function autoLinkCreator(partnerProfileId: string) {
  const partner = await prisma.partnerProfile.findUnique({
    where: { id: partnerProfileId },
    select: { partnerCategory: true, instagramUrl: true, account: { select: { email: true } }, creator: { select: { source: true } } },
  });
  if (!partner || partner.partnerCategory !== "CREATOR" || partner.creator?.source === "research") return { linked: false as const };
  const email = partner.account.email.trim().toLowerCase();
  const handle = handleOf(partner.instagramUrl);
  const matches = await prisma.creator.findMany({
    where: {
      source: "research", partnerProfileId: null,
      OR: [{ contactEmail: { equals: email, mode: "insensitive" } }, ...(handle ? [{ instagram: { equals: handle, mode: "insensitive" as const } }] : [])],
    },
    select: { id: true },
  });
  if (matches.length !== 1) return { linked: false as const };
  const done = await linkCreatorAccount({ creatorId: matches[0].id, partnerProfileId });
  return { linked: done.ok, creatorId: matches[0].id };
}

/** Posts an operator said did not feature them. */
export async function disputedPosts() {
  return prisma.creatorCampaign.findMany({
    where: { status: "DISPUTED" },
    orderBy: { disputedAt: "asc" },
    select: { id: true, operatorName: true, postUrl: true, creditCents: true, currency: true, disputedAt: true, creator: { select: { name: true } } },
  });
}

/**
 * Settles a questioned post: paid, the credit goes to the creator as though never questioned;
 * not paid, the pick ends and the credit returns to the operator.
 */
export async function resolveDispute(input: { campaignId: string; pay: boolean; now?: Date }) {
  const now = input.now ?? new Date();
  const campaign = await prisma.creatorCampaign.findFirst({ where: { id: input.campaignId, status: "DISPUTED" } });
  if (!campaign) return { ok: false as const, message: "That post is no longer in question." };
  if (input.pay) {
    await prisma.creatorCampaign.update({ where: { id: campaign.id }, data: { status: "FEATURED" } });
    return { ok: true as const };
  }
  await prisma.$transaction([
    prisma.creatorCampaign.update({ where: { id: campaign.id }, data: { status: "CANCELLED" } }),
    prisma.operatorCreditEntry.create({
      data: { operatorAccountId: campaign.operatorAccountId, kind: "CAMPAIGN_RELEASE", amountCents: campaign.creditCents, currency: CREDIT_CURRENCY, campaignId: campaign.id, onceKey: `release:${campaign.id}:${now.getTime()}`, createdAt: now },
    }),
  ]);
  return { ok: true as const };
}

export async function creatorDirectoryCounts() {
  const [total, joined, invited, picks] = await Promise.all([
    prisma.creator.count({ where: { hidden: false } }),
    prisma.creator.count({ where: { hidden: false, partnerProfileId: { not: null } } }),
    prisma.creator.count({ where: { invitedAt: { not: null } } }),
    prisma.creatorCampaign.groupBy({ by: ["status"], _count: true }),
  ]);
  return { total, joined, invited, picks: Object.fromEntries(picks.map((p) => [p.status, p._count])) as Record<string, number> };
}
