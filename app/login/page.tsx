"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";
import Notice, { type NoticeTone } from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import { useSession } from "@/components/auth/SessionProvider";
import { forgotPassword, login, resendVerification } from "@/lib/auth-client";

/**
 * Sign in, plus the two dead ends that hang off it:
 *
 * - an unverified account (login answers 403 `EMAIL_NOT_VERIFIED`) needs a
 *   resend, not just an error, or the visitor is stuck;
 * - `/api/auth/verify-email` bounces failures here as `?verification=…`.
 *
 * Forgot-password lives in this page as a mode swap rather than its own route.
 * It is one field and one call, and keeping it here means the visitor never
 * loses the email they already typed.
 */
type Mode = "signin" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  /** Set when login 403s — drives the resend affordance. */
  const [unverified, setUnverified] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("verification");
    if (!reason) return;
    setNotice({
      tone: "error",
      text:
        reason === "invalid-token"
          ? "That verification link has expired or was already used. Sign in and we’ll send a fresh one."
          : "That verification link was incomplete. Sign in and we’ll send a fresh one.",
    });
  }, []);

  const onSignIn = async () => {
    setBusy(true);
    setNotice(null);
    setUnverified(null);

    const res = await login(email.trim(), password);

    if (!res.ok) {
      if (res.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(res.email ?? email.trim());
        setNotice({ tone: "info", text: res.error });
      } else {
        setNotice({ tone: "error", text: res.error });
      }
      setBusy(false);
      return;
    }

    /* The cookie is set — pull the session before navigating so the nav is
       already showing the signed-in state when the next page paints. */
    await refresh();
    router.push("/");
    router.refresh();
  };

  const onResend = async () => {
    if (!unverified) return;
    setBusy(true);
    await resendVerification(unverified);
    setBusy(false);
    setNotice({
      tone: "success",
      text: `Verification sent to ${unverified}. Open it and you’ll be signed straight in.`,
    });
    setUnverified(null);
  };

  const onForgot = async () => {
    setBusy(true);
    setNotice(null);
    const res = await forgotPassword(email.trim());
    setBusy(false);

    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return;
    }

    /* The route answers identically whether or not the account exists, so the
       copy must not imply one — it would leak which emails are registered. */
    setNotice({
      tone: "success",
      text: `If ${email.trim()} has a Bluepass account, a reset link is on its way.`,
    });

    if (res.developmentResetUrl) {
      // eslint-disable-next-line no-console
      console.info("[dev] password reset URL:", res.developmentResetUrl);
    }
  };

  const canSignIn = email.trim().length > 3 && password.length >= 8 && !busy;
  const canForgot = email.trim().length > 3 && !busy;

  return (
    <AuthShell
      eyebrow={mode === "signin" ? "Welcome back" : "Reset your password"}
      headline={mode === "signin" ? ["Back to the", "water."] : ["Let’s get you", "back in."]}
      support={
        mode === "signin"
          ? "Your saved trips, your enquiries, and every booking’s 5% — all where you left them."
          : "We’ll email you a link. It expires shortly, so use it while it’s warm."
      }
      image="/whitsundays-1.jpg"
      imageAlt="Whitehaven sandbar, Whitsundays"
      rail={mode === "signin" ? "Sign in" : "Reset"}
      footer={
        <>
          New to Bluepass? <Link href="/register">Create an account</Link>
        </>
      }
    >
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {unverified ? (
        <button type="button" className="alink-btn ds-body-sm" onClick={onResend} disabled={busy}>
          Resend the verification email →
        </button>
      ) : null}

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

      {mode === "signin" ? (
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="current-password"
          required
          disabled={busy}
          reveal
          hint="Min 8"
        />
      ) : null}

      <div className="aactions">
        <Button
          variant="primary"
          large
          magnetic={false}
          onClick={mode === "signin" ? onSignIn : onForgot}
        >
          {busy
            ? "One moment…"
            : mode === "signin"
              ? "Sign in"
              : "Email me a reset link"}
        </Button>
        {mode === "signin" && !canSignIn && !busy ? (
          <span className="ds-micro aactions__hint">Enter your email and password to continue.</span>
        ) : null}
        {mode === "forgot" && !canForgot && !busy ? (
          <span className="ds-micro aactions__hint">Enter the email on your account.</span>
        ) : null}
      </div>

      <button
        type="button"
        className="alink-btn alink-btn--quiet ds-body-sm"
        onClick={() => {
          setMode((m) => (m === "signin" ? "forgot" : "signin"));
          setNotice(null);
          setUnverified(null);
        }}
      >
        {mode === "signin" ? "Forgot your password?" : "← Back to sign in"}
      </button>
    </AuthShell>
  );
}
