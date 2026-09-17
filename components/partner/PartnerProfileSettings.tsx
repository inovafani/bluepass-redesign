"use client";

import { useActionState } from "react";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import Field from "@/components/auth/Field";
import { updatePartnerProfileAction, type PartnerSettingsState } from "@/app/partner-portal/actions";
import type { PartnerProfileView } from "@/lib/services/partner/guard";

const IDLE: PartnerSettingsState = { status: "idle" };

/** A partner editing their own public-facing details — handle and socials. */
export default function PartnerProfileSettings({ profile }: { profile: PartnerProfileView }) {
  const [state, formAction, pending] = useActionState(updatePartnerProfileAction, IDLE);

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Your profile</h2>
        <p className="ds-caption adm-block__note">
          What Bluepass shows alongside your name when your work is credited.
        </p>
      </header>

      <form action={formAction} className="adm-form">
        {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
        {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}

        <section className="adm-form__section">
          <div className="adm-form__grid">
            <Field
              label="Handle"
              name="handle"
              defaultValue={profile.handle ?? ""}
              placeholder="@yourname"
              disabled={pending}
            />
            <Field
              label="Audience URL"
              name="audienceUrl"
              defaultValue={profile.audienceUrl ?? ""}
              placeholder="https://…"
              disabled={pending}
            />
            <Field
              label="Instagram"
              name="instagramUrl"
              defaultValue={profile.instagramUrl ?? ""}
              placeholder="https://instagram.com/…"
              disabled={pending}
            />
            <Field
              label="YouTube"
              name="youtubeUrl"
              defaultValue={profile.youtubeUrl ?? ""}
              placeholder="https://youtube.com/…"
              disabled={pending}
            />
            <Field
              label="TikTok"
              name="tiktokUrl"
              defaultValue={profile.tiktokUrl ?? ""}
              placeholder="https://tiktok.com/…"
              disabled={pending}
            />
          </div>
        </section>

        <div className="adm-form__submit">
          <Button type="submit" variant="primary" large magnetic={false} disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}
