// Three test accounts for the STAGING database only: an admin, an operator and a traveller.
//   node --env-file=.env.staging scripts/staging-accounts.mjs
// Re-running resets their passwords. The passwords are random, written to .env.staging-accounts
// (ignored by git, readable only by you) and never printed.
import { randomBytes, scryptSync } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Refuses to run against anything but the staging database, so a wrong env file cannot touch production.
const STAGING_REF = "pgokeuohsizttfgbrgar";
const PRODUCTION_REF = "zjtkzjlnxzzboqpynfmj";
const url = process.env.DATABASE_URL ?? "";
if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) {
  console.error("Stopped: DATABASE_URL is not the staging database. Run with --env-file=.env.staging.");
  process.exit(1);
}

const prisma = new PrismaClient();
const SECRET_FILE = ".env.staging-accounts";

const ACCOUNTS = [
  { key: "ADMIN", email: "staging-admin@ops.bluepass.co", displayName: "Staging Admin", roles: ["TRAVELLER", "ADMIN"] },
  { key: "OPERATOR", email: "staging-operator@ops.bluepass.co", displayName: "Staging Operator", roles: ["TRAVELLER", "OPERATOR"] },
  { key: "TRAVELLER", email: "staging-traveller@ops.bluepass.co", displayName: "Staging Traveller", roles: ["TRAVELLER"] },
];

// Same format as lib/services/auth/password.ts: scrypt$<salt>$<key>
const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
};

async function main() {
  const lines = [`# Staging test logins (created ${new Date().toISOString()}). Keep private.`];
  const report = [];

  for (const a of ACCOUNTS) {
    const password = randomBytes(12).toString("base64url");
    const data = { passwordHash: hashPassword(password), displayName: a.displayName, roles: a.roles, emailVerifiedAt: new Date() };
    const account = await prisma.bluePassAccount.upsert({ where: { email: a.email }, create: { email: a.email, ...data }, update: data });

    if (a.key === "OPERATOR") {
      await prisma.operatorProfile.upsert({
        where: { accountId: account.id },
        create: {
          accountId: account.id,
          companyName: "Staging Marine Tours (test)",
          status: "LIVE",
          country: "AU",
          payoutContactEmail: a.email,
          notes: "Staging test operator created by scripts/staging-accounts.mjs. Safe to delete.",
        },
        update: { status: "LIVE" },
      });
    }

    lines.push(`${a.key}_EMAIL=${a.email}`, `${a.key}_PASSWORD=${password}`);
    const stored = await prisma.bluePassAccount.findUniqueOrThrow({ where: { id: account.id }, select: { passwordHash: true, roles: true, operatorProfile: { select: { status: true } } } });
    const [, salt, key] = stored.passwordHash.split("$");
    report.push({ email: a.email, roles: stored.roles, passwordVerifies: scryptSync(password, salt, 64).toString("hex") === key, operatorProfile: stored.operatorProfile?.status ?? null });
  }

  writeFileSync(SECRET_FILE, `${lines.join("\n")}\n`);
  chmodSync(SECRET_FILE, 0o600);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Login details saved to ${SECRET_FILE}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
