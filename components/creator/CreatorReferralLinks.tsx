"use client";

import { useState } from "react";
import StatusPill, { type PillTone } from "@/components/admin/StatusPill";
import type { CreatorReferralLink } from "@/lib/services/creator/dashboard";
import type { CreatorProfileView } from "@/lib/services/creator/guard";

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
 * The one thing a creator actually came here for: the link to share, and whether it's live yet.
 *
 * `status` gates the whole section rather than the page — a declined or pending creator still has a
 * profile worth showing (CreatorProfileSettings), just nothing to refer with yet.
 */
export default function CreatorReferralLinks({
  status,
  links,
}: {
  status: CreatorProfileView["status"];
  links: CreatorReferralLink[];
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
        <div className="crt-status-row">
          <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
          <p className="ds-body-sm">{copy.text}</p>
        </div>

        {status === "APPROVED" && links.length > 0 ? (
          <ul className="adm-list crt-links">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function LinkRow({ link }: { link: CreatorReferralLink }) {
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
    <li className="crt-link-row">
      <div className="crt-link-row__main">
        <span className="ds-body-sm crt-link-row__url">{link.shareUrl}</span>
        <span className="ds-micro crt-link-row__meta">
          {link.label ?? "Main link"} · {link.clickCount} click{link.clickCount === 1 ? "" : "s"}
          {link.active ? "" : " · inactive"}
        </span>
      </div>
      <button type="button" className="crt-copy" onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </li>
  );
}
