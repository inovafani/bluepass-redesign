import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import PartnerApplyForm from "@/components/partners/PartnerApplyForm";
import PartnerApplyStatus from "@/components/partners/PartnerApplyStatus";
import Button from "@/components/ui/Button";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";

export const metadata = { title: "Claim your founding-partner link · Bluepass" };
export const dynamic = "force-dynamic";

const NEXT = "/partners/apply";

/**
 * Where "Claim my 5% founding link" on the marketing page actually goes.
 *
 * Three states, not two: signed out, signed in with no application yet, signed in with one
 * already filed. The signed-out state sends the visitor through the ordinary account flow
 * (`/register` or `/login`, both `?next=/partners/apply`) rather than re-implementing sign-up
 * here — this page's whole job is the application, not authentication.
 */
export default async function PartnersApplyPage() {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    return (
      <AuthShell
        eyebrow="Founding cohort 2026"
        headline={["Claim your", "founding-partner link."]}
        support="Lock 5% for the founding cohort, get your tracked link and operator catalogue, and put a reef-impact story in front of your clients."
        image="/reef-conservation3.jpg"
        imageAlt="Sunbeams through a coral reef"
        rail="Partners"
      >
        <p className="ds-body">
          One account first — it's how your referral link, clicks and commission all stay
          attached to you.
        </p>
        <div className="aactions">
          <Link href={`/register?next=${encodeURIComponent(NEXT)}`} style={{ textDecoration: "none" }}>
            <Button variant="primary" large magnetic={false}>
              Create an account
            </Button>
          </Link>
        </div>
        <p className="ds-micro aterms">
          Already have a Bluepass account?{" "}
          <Link href={`/login?next=${encodeURIComponent(NEXT)}`}>Sign in</Link>
        </p>
      </AuthShell>
    );
  }

  const account = await prisma.bluePassAccount.findUniqueOrThrow({
    where: { id: traveller.accountId },
    select: {
      displayName: true,
      phone: true,
      creatorProfile: { select: { status: true, handle: true } },
    },
  });

  if (account.creatorProfile) {
    return <PartnerApplyStatus status={account.creatorProfile.status} />;
  }

  return (
    <AuthShell
      eyebrow="Founding cohort 2026"
      headline={["Claim your", "founding-partner link."]}
      support="Tell us where to find you. No sales call — an admin reviews it and your tracked link goes live."
      image="/reef-conservation3.jpg"
      imageAlt="Sunbeams through a coral reef"
      rail="Partners"
    >
      <PartnerApplyForm defaultName={account.displayName ?? ""} defaultPhone={account.phone ?? ""} />
    </AuthShell>
  );
}
