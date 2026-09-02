"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Notice from "@/components/auth/Notice";
import StatusPill, { type PillTone } from "@/components/admin/StatusPill";
import Button from "@/components/ui/Button";
import {
  addLeadNoteAction,
  updateLeadStatusAction,
  type LeadActionState,
} from "@/app/crm/[id]/actions";
import {
  BD_LEAD_STATUSES,
  BD_STATUS_LABELS,
  type LeadDetailView,
} from "@/lib/services/admin/lead-outreach";

const IDLE: LeadActionState = { status: "idle" };

const STATUS_TONES: Record<string, PillTone> = {
  IMPORTED: "muted",
  CONTACTED: "warn",
  IN_DISCUSSION: "warn",
  APPROVED: "good",
  LIVE: "good",
  DECLINED: "bad",
};

export default function LeadOutreachForm({ lead }: { lead: LeadDetailView }) {
  return (
    <div className="adm-form">
      <section className="adm-form__section">
        <h2 className="ds-body-lg adm-form__legend">The business</h2>
        <dl className="adm-facts">
          <Fact label="Status">
            <StatusPill tone={STATUS_TONES[lead.status] ?? "muted"}>
              {BD_STATUS_LABELS[lead.status as keyof typeof BD_STATUS_LABELS] ?? lead.status}
            </StatusPill>
          </Fact>
          <Fact label="Phone">
            {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "Not found"}
          </Fact>
          <Fact label="Email">{lead.email ?? "Not found"}</Fact>
          <Fact label="Website">
            {lead.websiteUrl ? (
              <a href={lead.websiteUrl} target="_blank" rel="noreferrer">
                {lead.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : (
              "Not found"
            )}
          </Fact>
          <Fact label="Category">{lead.category ?? "—"}</Fact>
          <Fact label="Location">{lead.region ?? "—"}</Fact>
          <Fact label="Last contact">
            {lead.lastOutreachAt ? lead.lastOutreachAt.toISOString().slice(0, 10) : "Never"}
          </Fact>
        </dl>
      </section>

      <StatusSection lead={lead} />
      <NoteSection lead={lead} />
      <HistorySection lead={lead} />

      <Link href="/crm" className="ds-body-sm">
        ← Back to all leads
      </Link>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="adm-facts__row">
      <dt className="ds-micro adm-facts__label">{label}</dt>
      <dd className="ds-body-sm adm-facts__value">{children}</dd>
    </div>
  );
}

function StatusSection({ lead }: { lead: LeadDetailView }) {
  const action = updateLeadStatusAction.bind(null, lead.id);
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [status, setStatus] = useState<string>(
    BD_LEAD_STATUSES.includes(lead.status as (typeof BD_LEAD_STATUSES)[number])
      ? lead.status
      : "CONTACTED",
  );
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="adm-form__section">
      <h2 className="ds-body-lg adm-form__legend">Where this conversation stands</h2>
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

      <div className="adm-choice" role="radiogroup" aria-label="Outreach status">
        {BD_LEAD_STATUSES.map((value) => (
          <label key={value} className={`adm-choice__option ${status === value ? "is-active" : ""}`}>
            <input
              type="radio"
              name="status"
              value={value}
              checked={status === value}
              onChange={() => setStatus(value)}
              disabled={pending}
            />
            <span className="ds-body-sm adm-choice__label">{BD_STATUS_LABELS[value]}</span>
          </label>
        ))}
      </div>

      <label className="afield adm-form__row adm-form__row--wide">
        <span className="afield__top">
          <span className="ds-micro afield__label">What happened</span>
          <span className="ds-micro afield__hint">Optional</span>
        </span>
        <span className="afield__well">
          <textarea
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={pending}
            className="afield__input adm-textarea"
            placeholder="Spoke to the owner, wants a call back next week…"
          />
        </span>
      </label>

      <div className="adm-form__submit">
        <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
    </form>
  );
}

function NoteSection({ lead }: { lead: LeadDetailView }) {
  const action = addLeadNoteAction.bind(null, lead.id);
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="adm-form__section">
      <h2 className="ds-body-lg adm-form__legend">Add a note</h2>
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

      <label className="afield adm-form__row adm-form__row--wide">
        <span className="afield__top">
          <span className="ds-micro afield__label">Note</span>
        </span>
        <span className="afield__well">
          <textarea
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={pending}
            className="afield__input adm-textarea"
            placeholder="Rang twice, no answer — try the mobile on the website."
          />
        </span>
      </label>

      <div className="adm-form__submit">
        <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
      </div>
    </form>
  );
}

function HistorySection({ lead }: { lead: LeadDetailView }) {
  return (
    <section className="adm-form__section">
      <h2 className="ds-body-lg adm-form__legend">History</h2>
      {lead.events.length === 0 ? (
        <p className="ds-body-sm">Nothing logged yet.</p>
      ) : (
        <div className="adm-log">
          {lead.events.map((event) => (
            <div key={event.id} className="adm-log__row">
              <span className="ds-micro adm-log__when">{event.createdAt.toISOString().slice(0, 10)}</span>
              <span className="ds-body-sm adm-log__body">{event.message ?? event.type}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
