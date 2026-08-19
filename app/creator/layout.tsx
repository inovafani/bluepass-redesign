import type { Metadata } from "next";
import type { ReactNode } from "react";
import CreatorNav from "@/components/creator/CreatorNav";
import { currentCreatorPathname, requireCreatorOrRedirect } from "@/lib/services/creator/guard";

export const metadata: Metadata = {
  title: "Bluepass Creator",
  robots: { index: false, follow: false },
};

/* Same reason as the operator console: every page under here reads one specific creator's live
   rows and must never be served from a cache shared with another creator. */
export const dynamic = "force-dynamic";

/**
 * The creator area's frame, and the first of the two places the creator check happens — the mirror
 * of OperatorLayout. Any server action added under here must call `requireCreatorOrRedirect` again
 * for itself; this check has already finished by the time a button is pressed.
 */
export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const pathname = await currentCreatorPathname();
  const { account, profile } = await requireCreatorOrRedirect(pathname);

  return (
    /* Deliberately the same console shell as admin/operator — see OperatorLayout for why a third
       visual language for this area would be pure cost. */
    <div className="adm">
      <aside className="adm__rail">
        <CreatorNav handle={profile.handle} email={account.email} />
      </aside>
      <main className="adm__main">
        <div className="adm__inner">{children}</div>
      </main>
    </div>
  );
}
