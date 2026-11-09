"use client";

import { useActionState, useState, useTransition } from "react";
import Notice from "@/components/auth/Notice";
import "@/app/creators.css";
import type { CreatorAdminState } from "@/app/admin/creators/actions";

const IDLE: CreatorAdminState = { status: "idle" };

/** The buttons on one invite: mark it sent, and tie the creator to their account once they join. */
export function InviteActions({ creatorId, invited, accounts, markInvited, link }: {
  creatorId: string;
  invited: boolean;
  accounts: { id: string; label: string }[];
  markInvited: (id: string) => Promise<CreatorAdminState>;
  link: (id: string, prev: CreatorAdminState, form: FormData) => Promise<CreatorAdminState>;
}) {
  const [notice, setNotice] = useState<CreatorAdminState>(IDLE);
  const [pending, start] = useTransition();
  const [linkState, linkAction, linking] = useActionState(link.bind(null, creatorId), IDLE);
  return (
    <div className="ca-actions">
      {!invited ? (
        <button type="button" className="bpe__btn bpe__btn--primary ca-btn" disabled={pending} onClick={() => start(async () => setNotice(await markInvited(creatorId)))}>Mark invited</button>
      ) : null}
      {accounts.length ? (
        <form action={linkAction} className="ca-link">
          <select name="partnerProfileId" className="cr-input" defaultValue="" aria-label="Their creator account">
            <option value="" disabled>They joined as…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <button type="submit" className="ob-text-btn" disabled={linking}>Link</button>
        </form>
      ) : null}
      {notice.status !== "idle" ? <Notice tone={notice.status === "done" ? "success" : "error"}>{notice.message}</Notice> : null}
      {linkState.status !== "idle" ? <Notice tone={linkState.status === "done" ? "success" : "error"}>{linkState.message}</Notice> : null}
    </div>
  );
}

export function DisputeActions({ campaignId, resolve }: { campaignId: string; resolve: (id: string, pay: boolean) => Promise<CreatorAdminState> }) {
  const [notice, setNotice] = useState<CreatorAdminState>(IDLE);
  const [pending, start] = useTransition();
  return (
    <div className="ca-actions">
      <button type="button" className="bpe__btn bpe__btn--primary ca-btn" disabled={pending} onClick={() => start(async () => setNotice(await resolve(campaignId, true)))}>It features them, pay</button>
      <button type="button" className="ob-text-btn" disabled={pending} onClick={() => start(async () => setNotice(await resolve(campaignId, false)))}>Return the credit</button>
      {notice.status !== "idle" ? <Notice tone={notice.status === "done" ? "success" : "error"}>{notice.message}</Notice> : null}
    </div>
  );
}

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

/** Adds a creator who is not on the research list, so operators can pick them. */
export function AddCreatorForm({ add, specialties }: { add: (prev: CreatorAdminState, form: FormData) => Promise<CreatorAdminState>; specialties: readonly string[] }) {
  const [state, action, pending] = useActionState(add, IDLE);
  return (
    <form action={action} className="ca-add" key={state.status === "done" ? state.message : "form"}>
      <input name="name" className="cr-input" placeholder="Name" aria-label="Name" required />
      <input name="brand" className="cr-input" placeholder="Brand (optional)" aria-label="Brand" />
      <input name="website" className="cr-input" placeholder="Website" aria-label="Website" />
      <input name="instagram" className="cr-input" placeholder="Instagram handle" aria-label="Instagram handle" />
      <input name="contactEmail" type="email" className="cr-input" placeholder="Email (only used for their invite)" aria-label="Email" />
      <select name="baseState" className="cr-input" defaultValue="" aria-label="State">
        <option value="">State (optional)</option>
        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input name="baseTown" className="cr-input" placeholder="Town (optional)" aria-label="Town" />
      <input name="summary" className="cr-input ca-add__wide" placeholder="One line on what they make (optional)" aria-label="Summary" />
      <fieldset className="ca-add__wide ca-add__tags">
        <legend className="ds-caption">What they make content about</legend>
        {specialties.map((s) => (
          <label key={s} className="ca-add__tag"><input type="checkbox" name="specialties" value={s} /> {s.replace(/-/g, " ")}</label>
        ))}
      </fieldset>
      <label className="ca-add__wide ca-add__tag">
        <input type="checkbox" name="createLogin" /> Also create their login and email them a link to set a password (needs their email)
      </label>
      <div className="ca-add__wide ca-add__submit">
        <button type="submit" className="bpe__btn bpe__btn--primary ca-btn" disabled={pending}>Add creator</button>
        {state.status !== "idle" ? <Notice tone={state.status === "done" ? "success" : "error"}>{state.message}</Notice> : null}
      </div>
    </form>
  );
}
