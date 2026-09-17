import type { Metadata } from "next";
import type { ReactNode } from "react";
import PartnerNav from "@/components/partner/PartnerNav";
import { currentPartnerPathname, requirePartnerOrRedirect } from "@/lib/services/partner/guard";

export const metadata: Metadata = {
  title: "Bluepass Partner",
  robots: { index: false, follow: false },
};

/* Same reason as the operator console: every page under here reads one specific partner's live
   rows and must never be served from a cache shared with another partner. */
export const dynamic = "force-dynamic";

/**
 * The partner area's frame, and the first of the two places the partner check happens — the mirror
 * of OperatorLayout. Any server action added under here must call `requirePartnerOrRedirect` again
 * for itself; this check has already finished by the time a button is pressed.
 */
export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const pathname = await currentPartnerPathname();
  const { account, profile } = await requirePartnerOrRedirect(pathname);

  return (
    /* Deliberately the same console shell as admin/operator — see OperatorLayout for why a third
       visual language for this area would be pure cost. */
    <div className="adm">
      <aside className="adm__rail">
        <PartnerNav handle={profile.handle} email={account.email} />
      </aside>
      <main className="adm__main">
        <div className="adm__inner">{children}</div>
      </main>
    </div>
  );
}
