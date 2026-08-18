import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { CONSOLE_PATHNAME_HEADER } from "@/lib/services/pathname";

export type AdminAccount = NonNullable<Awaited<ReturnType<typeof requireCurrentAdmin>>>;

/** The pathname of the admin page currently rendering, per `middleware.ts`. */
export async function currentAdminPathname(fallback = "/admin") {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(CONSOLE_PATHNAME_HEADER);

  return pathname && pathname.startsWith("/admin") ? pathname : fallback;
}

/**
 * The gate every admin surface sits behind.
 *
 * Call this from the layout *and* from every server action — the layout's check
 * only proves the account was an admin at page-load time. A tab left open after
 * the account was demoted (role removed, or the email dropped from
 * `BLUEPASS_ADMIN_EMAILS`) still holds a fully rendered page with live Approve
 * buttons on it; without the per-action re-check those buttons would still
 * mutate real money-bearing records.
 */
export async function requireAdminOrRedirect(next: string): Promise<AdminAccount> {
  const admin = await requireCurrentAdmin();

  if (!admin) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return admin;
}
