"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Field from "@/components/auth/Field";
import Button from "@/components/ui/Button";
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
const EMPTY = { name: "", brand: "", instagram: "", website: "", contactEmail: "", baseState: "", baseTown: "", summary: "" };

/** The topic list is long, so it is read in four short groups of equal-width options rather than one wrapping row. */
const TOPIC_GROUPS: { label: string; topics: string[] }[] = [
  { label: "Marine life and places", topics: ["whales", "sharks", "manta", "whale-shark", "dolphins", "seals-sea-lions", "turtles", "reef", "wrecks", "macro"] },
  { label: "Activities", topics: ["dive", "freedive", "snorkel", "swim-with-wildlife", "kayak", "sail", "surf", "boating", "fishing"] },
  { label: "Angles", topics: ["marine-science", "conservation", "family", "adventure", "travel"] },
  { label: "What they make", topics: ["photo", "video", "writing", "workshops", "hosted-trips"] },
];

/**
 * Adds a creator who is not on the research list, so operators can pick them. Controlled like the
 * operator onboarding form: React resets a form once its action resolves, so a rejected submission
 * would otherwise empty everything the admin just typed.
 */
export function AddCreatorForm({ add, specialties }: { add: (prev: CreatorAdminState, form: FormData) => Promise<CreatorAdminState>; specialties: readonly string[] }) {
  const [state, action, pending] = useActionState(add, IDLE);
  const [values, setValues] = useState(EMPTY);
  const [topics, setTopics] = useState<string[]>([]);
  const [createLogin, setCreateLogin] = useState(false);
  const set = (field: keyof typeof EMPTY) => (value: string) => setValues((v) => ({ ...v, [field]: value }));
  const toggle = (topic: string) => setTopics((t) => (t.includes(topic) ? t.filter((x) => x !== topic) : [...t, topic]));

  useEffect(() => {
    if (state.status !== "done") return;
    setValues(EMPTY);
    setTopics([]);
    setCreateLogin(false);
  }, [state]);

  // A topic added to SPECIALTIES later still shows up, in a last group, instead of silently vanishing.
  const grouped = new Set(TOPIC_GROUPS.flatMap((g) => g.topics));
  const groups = [...TOPIC_GROUPS, { label: "Other", topics: specialties.filter((t) => !grouped.has(t)) }]
    .map((g) => ({ ...g, topics: g.topics.filter((t) => specialties.includes(t)) }))
    .filter((g) => g.topics.length);

  return (
    <form action={action} className="adm-form">
      {state.status !== "idle" ? <Notice tone={state.status === "done" ? "success" : "error"}>{state.message}</Notice> : null}

      <section className="adm-form__section">
        <div className="adm-form__grid ca-grid">
          <div className="adm-form__row ca-span-2">
            <Field label="Name" name="name" value={values.name} onChange={set("name")} placeholder="Rae Shooter" autoComplete="off" required disabled={pending} />
          </div>
          <div className="adm-form__row ca-span-2">
            <Field label="Brand" name="brand" value={values.brand} onChange={set("brand")} hint="Optional" autoComplete="off" disabled={pending} />
          </div>
          <div className="adm-form__row">
            <Field label="Instagram" name="instagram" value={values.instagram} onChange={set("instagram")} placeholder="reefshooter" hint="Handle or link" autoComplete="off" disabled={pending} />
          </div>
          <div className="adm-form__row">
            <Field label="Website" name="website" value={values.website} onChange={set("website")} inputMode="url" placeholder="reefshooter.com" autoComplete="off" disabled={pending} />
          </div>
          <div className="adm-form__row ca-span-2">
            <Field label="Email" name="contactEmail" value={values.contactEmail} onChange={set("contactEmail")} type="email" inputMode="email" placeholder="rae@reefshooter.com" hint="Their invite and login go here" autoComplete="off" disabled={pending} />
          </div>
        </div>
        <p className="ds-body-sm adm-form__help">Add at least one of Instagram, website or email, so we can reach them.</p>

        <hr className="adm-form__rule" />

        <div className="adm-form__grid ca-grid">
          <label className="afield adm-form__row" htmlFor="ca-state">
            <span className="afield__top"><span className="ds-micro afield__label">State</span><span className="ds-micro afield__hint">Optional</span></span>
            <span className="afield__well">
              <select id="ca-state" name="baseState" className="afield__input" value={values.baseState} onChange={(e) => set("baseState")(e.target.value)} disabled={pending}>
                <option value="">Not set</option>
                {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </span>
          </label>
          <div className="adm-form__row">
            <Field label="Town" name="baseTown" value={values.baseTown} onChange={set("baseTown")} hint="Optional" autoComplete="off" disabled={pending} />
          </div>
          <div className="adm-form__row ca-span-2">
            <Field label="One line about their work" name="summary" value={values.summary} onChange={set("summary")} hint="Optional" autoComplete="off" disabled={pending} />
          </div>
        </div>

        <hr className="adm-form__rule" />

        <fieldset className="adm-topics" disabled={pending}>
          <legend className="ds-micro afield__label">They make content about</legend>
          <p className="ds-body-sm adm-form__help">Optional. When an operator joins, we suggest creators who cover what their trips are about, so these decide who gets suggested. Photo, video, writing and the other formats never match on their own.</p>
          {groups.map((g) => (
            <div key={g.label} className="adm-topics__group">
              <span className="ds-micro adm-topics__label">{g.label}</span>
              <div className="adm-topics__grid">
                {g.topics.map((topic) => (
                  <label key={topic} className={`ds-body-sm adm-topic ${topics.includes(topic) ? "is-active" : ""}`}>
                    <input type="checkbox" name="specialties" value={topic} checked={topics.includes(topic)} onChange={() => toggle(topic)} />
                    {topic.replace(/-/g, " ")}
                    <svg className="adm-topic__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <hr className="adm-form__rule" />

        <label className="ds-body-sm adm-form__check">
          <input type="checkbox" name="createLogin" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} disabled={pending} />
          <span>Also create their login and email them a link to set a password. Needs their email.</span>
        </label>

        <div className="adm-form__submit">
          <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add creator"}</Button>
        </div>
      </section>
    </form>
  );
}
