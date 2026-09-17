"use client";

import { useActionState, useState } from "react";
import { createReferralLinkAction, type CreateReferralLinkState } from "@/app/partner-portal/actions";
import Field from "@/components/auth/Field";
import Notice from "@/components/auth/Notice";
import StatusPill, { type PillTone } from "@/components/admin/StatusPill";
import Button from "@/components/ui/Button";
import type { PartnerReferralLink } from "@/lib/services/partner/dashboard";
import type { PartnerProfileView } from "@/lib/services/partner/guard";

const IDLE: CreateReferralLinkState = { status: "idle" };

const STATUS_COPY: Record<string, { tone: PillTone; label: string; text: string }> = {
  PENDING_REVIEW: {
    tone: "warn",
    label: "Pending review",
    text: "Your application is waiting on Bluepass to review it. Your referral link appears here the moment it's approved.",
  },
  APPROVED: {
    tone: "good",
    label: "Live",
    text: "Every booking through this link earns you a commission.",
  },
  DECLINED: {
    tone: "bad",
    label: "Declined",
    text: "Reach out to your Bluepass contact if you think that's wrong.",
  },
};

/**
 * The one thing a partner actually came here for: the link to share, and whether it's live yet.
 *
 * `status` gates the whole section rather than the page — a declined or pending partner still has a
 * profile worth showing (PartnerProfileSettings), just nothing to refer with yet.
 */
export default function PartnerReferralLinks({
  status,
  links,
}: {
  status: PartnerProfileView["status"];
  links: PartnerReferralLink[];
}) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.PENDING_REVIEW;

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Your referral link</h2>
        <p className="ds-caption adm-block__note">
          Share it anywhere your audience already is. Anyone who books through it — Bluepass, an
          operator, a traveller — earns a commission on that trip, so this works the same way for you.
        </p>
      </header>

      <div className="adm-card">
        <div className="ptr-status-row">
          <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
          <p className="ds-body-sm">{copy.text}</p>
        </div>

        {status === "APPROVED" && links.length > 0 ? (
          <ul className="adm-list ptr-links">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
          </ul>
        ) : null}

        {status === "APPROVED" ? <NewLinkForm /> : null}
      </div>
    </section>
  );
}

/** One label field and a submit button — a partner minting a second link for a different channel
 * doesn't need more than that; createReferralLinkAction re-derives the account and caps the total. */
function NewLinkForm() {
  const [state, formAction, pending] = useActionState(createReferralLinkAction, IDLE);

  return (
    <form action={formAction} className="ptr-new-link">
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}

      <div className="ptr-new-link__row">
        <Field label="New link label (optional)" name="label" placeholder="e.g. Instagram bio" disabled={pending} />
        <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
          {pending ? "Creating…" : "Add another link"}
        </Button>
      </div>
    </form>
  );
}

function LinkRow({ link }: { link: PartnerReferralLink }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — the link text is still visible to copy by
      // hand, so this is a degraded affordance, not a broken one.
    }
  };

  return (
    <li className="ptr-link-row">
      <div className="ptr-link-row__main">
        <span className="ds-body-sm ptr-link-row__url">{link.shareUrl}</span>
        <span className="ds-micro ptr-link-row__meta">
          {link.label ?? "Main link"} · {link.clickCount} click{link.clickCount === 1 ? "" : "s"}
          {link.active ? "" : " · inactive"}
        </span>
      </div>
      <button type="button" className="ptr-copy" onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </li>
  );
}
