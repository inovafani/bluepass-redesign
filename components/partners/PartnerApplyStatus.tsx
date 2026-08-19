import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";

/**
 * `support` sits on the photo panel next to the headline; `detail` sits in the form column next to
 * the button. AuthShell was built for forms, whose fields fill that column on their own — a status
 * page has no fields, so without its own line of copy here the button ends up floating alone under
 * the eyebrow with nothing explaining it.
 */
const COPY: Record<string, { headline: string[]; support: string; detail: string }> = {
  PENDING_REVIEW: {
    headline: ["You're in the", "review queue."],
    support:
      "An admin reviews applications by hand — no bulk approval, so a real person is looking at yours.",
    detail:
      "Your tracked link goes live the moment it's approved. There's nothing else for you to do here — check back later, or we'll be in touch on WhatsApp.",
  },
  APPROVED: {
    headline: ["You're a", "founding partner."],
    support: "Your tracked link, clicks and commission are waiting for you.",
    detail: "Head to your dashboard to grab your link and start sharing it.",
  },
  DECLINED: {
    headline: ["This application", "was declined."],
    support: "If that doesn't sound right, reach out to your Bluepass contact directly.",
    detail: "Nothing further happens on this account automatically — it's worth a direct message.",
  },
};

/** What a signed-in visitor sees on `/partners/apply` once a `CreatorProfile` already exists. */
export default function PartnerApplyStatus({ status }: { status: string }) {
  const copy = COPY[status] ?? COPY.PENDING_REVIEW;

  return (
    <AuthShell
      eyebrow="Founding cohort 2026"
      headline={copy.headline}
      support={copy.support}
      image="/reef-conservation3.jpg"
      imageAlt="Sunbeams through a coral reef"
      rail="Partners"
    >
      <p className="ds-body">{copy.detail}</p>

      <div className="aactions">
        {status === "APPROVED" ? (
          <Link href="/creator" style={{ textDecoration: "none" }}>
            <Button variant="primary" large magnetic={false}>
              Go to your dashboard
            </Button>
          </Link>
        ) : (
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="translucent" large magnetic={false}>
              Back to the site
            </Button>
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
