// A test referral partner for the STAGING database only, to try referral commission end to end.
//   node --env-file=.env.staging scripts/staging-partner.mjs
// Re-running resets its password. The password is random, appended to .env.staging-accounts (ignored
// by git) and never printed. The referral link is /?ref=staging-partner-test.
import { randomBytes, scryptSync } from "node:crypto";
import { appendFileSync, chmodSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const STAGING_REF = "pgokeuohsizttfgbrgar";
const PRODUCTION_REF = "zjtkzjlnxzzboqpynfmj";
const url = process.env.DATABASE_URL ?? "";
if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) {
  console.error("Stopped: DATABASE_URL is not the staging database. Run with --env-file=.env.staging.");
  process.exit(1);
}

const prisma = new PrismaClient();
const EMAIL = "staging-partner@ops.bluepass.co";
const NAME = "Staging Partner (test)";
const HANDLE = "stagingpartner";
const CODE = "staging-partner-test";
const SECRET_FILE = ".env.staging-accounts";

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
};

async function main() {
  const password = randomBytes(12).toString("base64url");
  const data = { passwordHash: hashPassword(password), displayName: NAME, roles: ["TRAVELLER", "PARTNER"], emailVerifiedAt: new Date() };
  const account = await prisma.bluePassAccount.upsert({ where: { email: EMAIL }, create: { email: EMAIL, ...data }, update: data });

  const existing = await prisma.partnerProfile.findUnique({ where: { accountId: account.id }, select: { referralPartnerId: true } });
  const referralPartnerId =
    existing?.referralPartnerId ??
    (await prisma.referralPartner.create({
      data: { role: "PARTNER", name: NAME, handle: HANDLE, email: EMAIL, links: { create: { code: CODE, label: `${NAME} main link`, targetPath: "/" } } },
    })).id;

  await prisma.partnerProfile.upsert({
    where: { accountId: account.id },
    create: { accountId: account.id, referralPartnerId, status: "APPROVED", handle: HANDLE, partnerCategory: "CREATOR", notes: "Staging test partner created by scripts/staging-partner.mjs. Safe to delete." },
    update: { status: "APPROVED", referralPartnerId },
  });

  appendFileSync(SECRET_FILE, `PARTNER_EMAIL=${EMAIL}\nPARTNER_PASSWORD=${password}\nPARTNER_REF_CODE=${CODE}\n`);
  chmodSync(SECRET_FILE, 0o600);

  const stored = await prisma.bluePassAccount.findUniqueOrThrow({
    where: { id: account.id },
    select: { passwordHash: true, roles: true, partnerProfile: { select: { status: true, referralPartner: { select: { links: { select: { code: true, active: true } } } } } } },
  });
  const [, salt, key] = stored.passwordHash.split("$");
  console.log(JSON.stringify({ email: EMAIL, roles: stored.roles, passwordVerifies: scryptSync(password, salt, 64).toString("hex") === key, profile: stored.partnerProfile }));
  console.log(`Login details appended to ${SECRET_FILE}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
