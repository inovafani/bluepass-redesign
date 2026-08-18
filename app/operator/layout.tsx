import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import OperatorNav from "@/components/operator/OperatorNav";
import { currentOperatorPathname, requireOperatorOrRedirect } from "@/lib/services/operator/guard";

export const metadata: Metadata = {
  title: "Bluepass Operator",
  robots: { index: false, follow: false },
};

/* Same reason as the admin console: every page under here reads one specific operator's live rows
   and must never be served from a cache shared with another operator. */
export const dynamic = "force-dynamic";

/**
 * The operator area's frame, and the first of the two places the operator check happens.
 *
 * This gate protects the *rendering* — it is what stops a traveller, or an operator without a
 * profile of their own, ever seeing a payout ledger. Any server action added under here must call
 * `requireOperatorOrRedirect` again for itself and re-check that the row it is about to touch
 * belongs to *that* operator; this check has already finished by the time such a button is pressed.
 */
export default async function OperatorLayout({ children }: { children: ReactNode }) {
  const pathname = await currentOperatorPathname();
  const { account, profile } = await requireOperatorOrRedirect(pathname);

  return (
    /* `adm` for the shell's structure, `opr` for its skin. The operator area shares the admin
       console's markup and components deliberately — see OperatorNav — but an operator is a partner
       being shown their own business, not staff working a queue, so this one wears the site's
       photography the way /login and /register do. Every `.opr` rule in globals.css is scoped to
       this class; /admin renders from the same components and is unaffected. */
    <div className="adm opr">
      <div className="opr__bg" aria-hidden>
        {/* Decorative, so no alt text and no priority — the operator came here for their payouts,
            and this must never be what the page is waiting on to paint. */}
        <Image src="/great-barrier.jpg" alt="" fill sizes="100vw" quality={70} />
        <span className="opr__scrim" />
      </div>

      <aside className="adm__rail">
        <OperatorNav companyName={profile.companyName} email={account.email} />
      </aside>
      <main className="adm__main">
        <div className="adm__inner">{children}</div>
      </main>
    </div>
  );
}
