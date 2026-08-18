import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { currentAdminPathname, requireAdminOrRedirect } from "@/lib/services/admin/guard";
import { countPendingApprovals } from "@/lib/services/admin/review-queue";

export const metadata: Metadata = {
  title: "Bluepass Admin",
  robots: { index: false, follow: false },
};

/* Every page under here reads live rows and must never be served from a cache
   shared between admins — an approvals queue rendered once and replayed would
   show work that has already been done. */
export const dynamic = "force-dynamic";

/**
 * The console frame, and the first of the two places the admin check happens.
 *
 * This gate protects the *rendering* — it stops a non-admin ever seeing
 * claimant contact details or payout fields. It does not protect the writes:
 * every server action calls `requireCurrentAdmin()` again for itself, because
 * this check has already finished by the time those buttons are pressed.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = await currentAdminPathname();
  const admin = await requireAdminOrRedirect(pathname);
  const pendingApprovals = await countPendingApprovals();

  return (
    <div className="adm">
      <aside className="adm__rail">
        <AdminNav adminEmail={admin.email} counters={{ pendingApprovals }} />
      </aside>
      <main className="adm__main">
        <div className="adm__inner">{children}</div>
      </main>
    </div>
  );
}
