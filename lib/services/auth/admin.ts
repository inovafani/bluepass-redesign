import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";

export async function requireCurrentAdmin() {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    return undefined;
  }

  const account = await prisma.bluePassAccount.findUnique({
    where: { id: traveller.accountId },
    select: {
      id: true,
      email: true,
      roles: true,
      displayName: true,
    },
  });

  if (!account) {
    return undefined;
  }

  const adminEmails = parseAdminEmails(process.env.BLUEPASS_ADMIN_EMAILS);
  const isAdmin =
    account.roles.includes("ADMIN") ||
    (account.email ? adminEmails.includes(account.email.toLowerCase()) : false);

  return isAdmin ? account : undefined;
}

function parseAdminEmails(value?: string) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
