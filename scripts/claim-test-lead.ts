/**
 * One throwaway lead for testing the operator-claim flow without touching a real business.
 *
 *   npx tsx --env-file=.env.local scripts/claim-test-lead.ts create <lead-inbox>
 *   npx tsx --env-file=.env.local scripts/claim-test-lead.ts report
 *   npx tsx --env-file=.env.local scripts/claim-test-lead.ts remove [--delete-account]
 *
 * There is no separate test database, so this lead lives in the same database as production and
 * its page is reachable at https://bluepass.co/operators/bluepass-claim-test. The claim email goes
 * only to the address given to `create`, so it must be an inbox you control.
 *
 * Sign in for the test with a FRESH account made only for it. Filing a claim upserts the signed-in
 * account's OperatorProfile (company name, claimed slug), so an account that already runs a real
 * or dummy operator would have that profile overwritten.
 *
 * `report` is read-only: it lists every row that `remove` would delete, so the cleanup can be
 * checked before it runs. Everything is found through the test slug, never through a name match.
 * `remove` deletes, in one transaction: the lead, its claim tokens, outreach events and
 * enrolments, claims filed for the slug, the OperatorProfile claimed for the slug, and the
 * ReferralPartner (with its links) that approving the claim created. The claimant's
 * BluePassAccount is kept unless `--delete-account` is given, and `remove` refuses outright if the
 * claimed profile has listings, or the claimant also holds a claim on any other operator.
 */
import { prisma } from "@/lib/db/prisma";

const SLUG = "bluepass-claim-test";
const NAME = "Bluepass Claim Test (test)";
const [command, ...flags] = process.argv.slice(2);

/** Everything tied to the test slug, gathered once so `report` and `remove` cannot disagree. */
async function scope() {
  const lead = await prisma.operatorLead.findUnique({ where: { slug: SLUG }, select: { id: true, status: true, email: true } });
  const claims = await prisma.operatorClaim.findMany({ where: { operatorSlug: SLUG }, select: { id: true, status: true, accountId: true } });
  const profiles = await prisma.operatorProfile.findMany({
    where: { claimedOperatorSlug: SLUG },
    select: { id: true, accountId: true, referralPartnerId: true },
  });
  const profileIds = profiles.map((p) => p.id);
  const partnerIds = profiles.flatMap((p) => (p.referralPartnerId ? [p.referralPartnerId] : []));
  const accountIds = [...new Set([...claims.map((c) => c.accountId), ...profiles.map((p) => p.accountId)])];

  const [events, enrolments, tokens, links, listings, otherClaims, ledger] = await Promise.all([
    prisma.operatorOutreachEvent.count({ where: { OR: [{ operatorSlug: SLUG }, ...(lead ? [{ operatorLeadId: lead.id }] : [])] } }),
    lead ? prisma.outreachEnrolment.count({ where: { operatorLeadId: lead.id } }) : 0,
    lead ? prisma.operatorClaimToken.count({ where: { operatorLeadId: lead.id } }) : 0,
    partnerIds.length ? prisma.referralLink.count({ where: { partnerId: { in: partnerIds } } }) : 0,
    profileIds.length ? prisma.operatorListing.count({ where: { operatorProfileId: { in: profileIds } } }) : 0,
    accountIds.length ? prisma.operatorClaim.count({ where: { accountId: { in: accountIds }, operatorSlug: { not: SLUG } } }) : 0,
    partnerIds.length ? prisma.commissionLedgerEntry.count({ where: { referralPartnerId: { in: partnerIds } } }) : 0,
  ]);

  return { lead, claims, profiles, profileIds, partnerIds, accountIds, events, enrolments, tokens, links, listings, otherClaims, ledger };
}

async function create(inbox: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inbox)) throw new Error("Give an email address you control: create <email>");
  const lead = await prisma.operatorLead.upsert({
    where: { slug: SLUG },
    create: { slug: SLUG, name: NAME, category: "Test", region: "Test", email: inbox.toLowerCase(), source: "claim-test", status: "IMPORTED" },
    update: { name: NAME, email: inbox.toLowerCase(), status: "IMPORTED" },
  });
  console.log(`Test lead ready: https://bluepass.co/operators/${lead.slug}`);
  console.log(`Claim start:     https://bluepass.co/operator/claim/start/${lead.slug}`);
  console.log("The claim email goes to the address you gave. Sign in with a fresh account made for this test.");
  console.log("Run `report` to see what cleanup would cover, `remove` when the test is done.");
}

async function report() {
  const s = await scope();
  console.log(`lead:               ${s.lead ? `1 (status ${s.lead.status})` : "0"}`);
  console.log(`claim tokens:       ${s.tokens}`);
  console.log(`outreach events:    ${s.events}`);
  console.log(`enrolments:         ${s.enrolments}`);
  console.log(`claims:             ${s.claims.length}${s.claims.length ? ` (${s.claims.map((c) => c.status).join(", ")})` : ""}`);
  console.log(`operator profiles:  ${s.profiles.length}`);
  console.log(`referral partners:  ${s.partnerIds.length} (+ ${s.links} links, ${s.ledger} ledger entries)`);
  console.log(`accounts involved:  ${s.accountIds.length} (kept unless --delete-account)`);
  console.log(`blockers:           ${s.listings} listings on the profile, ${s.otherClaims} claims on other operators`);
}

async function remove(deleteAccount: boolean) {
  const s = await scope();
  if (s.listings) throw new Error(`Refusing: the claimed profile has ${s.listings} listing(s). Archive or remove them first.`);
  if (deleteAccount && s.otherClaims) throw new Error("Refusing --delete-account: the claimant also holds a claim on another operator.");
  if (s.ledger) throw new Error(`Refusing: the test partner has ${s.ledger} commission ledger entr(ies). That is not test data.`);

  await prisma.$transaction(async (tx) => {
    await tx.operatorOutreachEvent.deleteMany({ where: { OR: [{ operatorSlug: SLUG }, ...(s.lead ? [{ operatorLeadId: s.lead.id }] : [])] } });
    if (s.lead) await tx.outreachEnrolment.deleteMany({ where: { operatorLeadId: s.lead.id } });
    await tx.operatorClaim.deleteMany({ where: { operatorSlug: SLUG } });
    await tx.operatorProfile.deleteMany({ where: { id: { in: s.profileIds } } });
    await tx.referralPartner.deleteMany({ where: { id: { in: s.partnerIds } } }); // links cascade
    if (deleteAccount) await tx.bluePassAccount.deleteMany({ where: { id: { in: s.accountIds } } });
    if (s.lead) await tx.operatorLead.delete({ where: { id: s.lead.id } }); // claim tokens cascade
  });

  console.log("Removed the test data. Run `report` to confirm everything reads 0.");
  if (!deleteAccount && s.accountIds.length) console.log("The claimant's account was kept. Delete it from the admin, or rerun with --delete-account.");
}

async function main() {
  if (command === "create" && flags[0]) return create(flags[0]);
  if (command === "report") return report();
  if (command === "remove") return remove(flags.includes("--delete-account"));
  throw new Error("Usage: claim-test-lead.ts create <email> | report | remove [--delete-account]");
}

main().finally(() => prisma.$disconnect());
