"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Field from "@/components/auth/Field";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import StatusPill, { type PillTone } from "@/components/admin/StatusPill";
import { updatePartnerAdminInfoAction, type PartnerAdminEditState } from "@/app/admin/partners/[id]/actions";
import type { PartnerEditView } from "@/lib/services/admin/partner-directory";

const IDLE: PartnerAdminEditState = { status: "idle" };

const STATUS_TONES: Record<string, PillTone> = {
  LIVE: "good",
  APPROVED: "good",
  PENDING_REVIEW: "warn",
  DECLINED: "bad",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "— none set —" },
  { value: "CREATOR", label: "Creator" },
  { value: "DIVE_SHOP", label: "Dive shop" },
  { value: "TRAVEL_AGENCY", label: "Travel agency" },
  { value: "TRIP_LEADER", label: "Trip leader" },
  { value: "DIVE_INSTRUCTOR", label: "Dive instructor" },
  { value: "ADVISOR", label: "Advisor" },
  { value: "OCEAN_PARTNER", label: "Ocean partner" },
];

/**
 * Edits a real, already-existing partner profile — the counterpart to `OperatorEditForm`. Only
 * covers category and admin notes; payout details are self-managed on `/partner-portal` and payout
 * *requests* have their own admin surface on `/admin/payouts`, so neither belongs in this form.
 */
export default function PartnerAdminEditForm({ partner }: { partner: PartnerEditView }) {
  const action = updatePartnerAdminInfoAction.bind(null, partner.id);
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [category, setCategory] = useState(partner.partnerCategory ?? "");
  const [notes, setNotes] = useState(partner.notes ?? "");

  return (
    <div className="adm-form" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section className="adm-form__section">
        <h2 className="ds-body-lg adm-form__legend">Status</h2>
        <dl className="adm-facts">
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Status</dt>
            <dd className="ds-body-sm adm-facts__value">
              <StatusPill tone={STATUS_TONES[partner.status] ?? "muted"}>{partner.status}</StatusPill>
            </dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Account email</dt>
            <dd className="ds-body-sm adm-facts__value">{partner.accountEmail}</dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Referral partner</dt>
            <dd className="ds-body-sm adm-facts__value">{partner.referralPartnerName ?? "—"}</dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Payout details on file</dt>
            <dd className="ds-body-sm adm-facts__value">{partner.hasPayoutDetails ? "Yes" : "No"}</dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Social / audience links</dt>
            <dd className="ds-body-sm adm-facts__value">
              {[partner.audienceUrl, partner.instagramUrl, partner.youtubeUrl, partner.tiktokUrl].filter(Boolean)
                .length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {partner.audienceUrl ? <li>{partner.audienceUrl}</li> : null}
                  {partner.instagramUrl ? <li>{partner.instagramUrl}</li> : null}
                  {partner.youtubeUrl ? <li>{partner.youtubeUrl}</li> : null}
                  {partner.tiktokUrl ? <li>{partner.tiktokUrl}</li> : null}
                </ul>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <form action={formAction} className="adm-form__section">
        <h2 className="ds-body-lg adm-form__legend">Category and notes</h2>
        {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}
        {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

        <div className="adm-form__grid">
          <div className="adm-form__row">
            <label className="afield">
              <span className="afield__top">
                <span className="ds-micro afield__label">Category</span>
              </span>
              <span className="afield__well">
                <select
                  name="partnerCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={pending}
                  className="afield__input"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>

          <div className="adm-form__row adm-form__row--wide">
            <Field
              label="Admin notes"
              name="notes"
              value={notes}
              onChange={setNotes}
              hint="Only visible here — never shown to the partner"
              autoComplete="off"
              disabled={pending}
            />
          </div>
        </div>

        <div className="adm-form__submit">
          <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      <Link href="/admin/partners" className="ds-body-sm">
        ← Back to all partners
      </Link>
    </div>
  );
}
