"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";
import Notice, { type NoticeTone } from "@/components/auth/Notice";
import PhoneField from "@/components/auth/PhoneField";
import Button from "@/components/ui/Button";
import { PASSWORD_MIN, register, resendVerification } from "@/lib/auth-client";

/** Same rule as the login page's `safeNext` — only a single-slash relative path is trusted. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/**
 * Create an account.
 *
 * Registration never returns a session — the route always requires email
 * verification first. So success is its own screen rather than a redirect: the
 * only useful next step is "go open your inbox", and pushing the visitor to a
 * signed-out page would read as failure.
 *
 * Field requirements mirror `registerTravellerSchema`: name ≥2, phone ≥6,
 * password ≥8. Phone is required by the schema because the whole platform
 * reaches travellers over WhatsApp.
 */
export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  /* Where the emailed verification link should land, when this registration is step 1 of a
     specific flow (e.g. the partner application) rather than a plain sign-up. */
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  // `phone` is E.164 straight from PhoneField, or "" while it is incomplete —
  // the length floor is `registerTravellerSchema.phone.min(6)`.
  const valid =
    name.trim().length >= 2 &&
    email.trim().length > 3 &&
    phone.length >= 6 &&
    password.length >= PASSWORD_MIN;

  const onSubmit = async () => {
    setBusy(true);
    setNotice(null);

    const res = await register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      ...(next ? { next } : {}),
    });

    setBusy(false);

    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return;
    }

    setSentTo(res.email ?? email.trim());

    if (res.developmentVerificationUrl) {
      // eslint-disable-next-line no-console
      console.info("[dev] verification URL:", res.developmentVerificationUrl);
    }
  };

  if (sentTo) {
    return (
      <AuthShell
        eyebrow="One step left"
        headline={["Check your", "inbox."]}
        support="Open the link we just sent and you’ll be signed in. No password to type again."
        image="/great-barrier.jpg"
        imageAlt="Aerial view of the Great Barrier Reef"
        rail="Verify"
        footer={
          <>
            Already verified? <Link href="/login">Sign in</Link>
          </>
        }
      >
        <Notice tone="success">Verification sent to {sentTo}.</Notice>

        <div className="averify">
          <span className="averify__ring" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18v12H3zM3 7l9 7 9-7" />
            </svg>
          </span>
          <p className="ds-body averify__copy">
            The link expires, so it’s worth opening now. Nothing else is needed from you here.
            You can close this tab.
          </p>
        </div>

        <button
          type="button"
          className="alink-btn ds-body-sm"
          onClick={async () => {
            setBusy(true);
            await resendVerification(sentTo);
            setBusy(false);
            setNotice({ tone: "info", text: `Sent again to ${sentTo}.` });
          }}
          disabled={busy}
        >
          {busy ? "Sending…" : "Didn’t arrive? Send it again →"}
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Join Bluepass"
      headline={["Book the ocean.", "Leave it better."]}
      support="One account, every vetted operator. You pay the operator’s own rate, and a fixed 5% goes to the waters you visit."
      image="/reef-conservation3.jpg"
      imageAlt="Sunbeams through a coral reef"
      rail="Join"
      footer={
        <>
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link>
        </>
      }
    >
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <Field
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Your name"
        autoComplete="name"
        required
        disabled={busy}
      />
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        required
        disabled={busy}
      />
      <PhoneField
        label="WhatsApp number"
        value={phone}
        onChange={setPhone}
        hint="How Kai reaches you"
        required
        disabled={busy}
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder={`At least ${PASSWORD_MIN} characters`}
        autoComplete="new-password"
        hint={`Min ${PASSWORD_MIN}`}
        required
        disabled={busy}
        reveal
      />

      <div className="aactions">
        <Button variant="primary" large magnetic={false} onClick={onSubmit}>
          {busy ? "Creating…" : "Create account"}
        </Button>
        {!valid && !busy ? (
          <span className="ds-micro aactions__hint">
            Name, email, WhatsApp number and a {PASSWORD_MIN}-character password.
          </span>
        ) : null}
      </div>

      <p className="ds-micro aterms">
        We’ll email you a link to verify the address. No card, no markup, ever.
      </p>
    </AuthShell>
  );
}
