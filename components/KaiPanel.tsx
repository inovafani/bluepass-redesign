"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { useSession } from "./auth/SessionProvider";

/* Shapes transcribed from `app/api/kai/web-chat/route.ts`. */
type Suggested = { label: string; message: string };
type Region = "indonesia" | "australia";

/** A yacht Kai matched. The route already maps Kai Core's shape onto this. */
type Match = {
  slug: string;
  name: string;
  region: string;
  tier: string;
  maxGuests: number;
  cabins: number;
  pricePerCabin: string;
  charterPrice: string | null;
  matchingReasons: string[];
  productUrl: string | null;
  heroImageUrl?: string;
};

type ContactRequest = {
  conversationId: string;
  fields: ["name", "email", "phone"];
  status: "CONTACT_DETAILS_REQUIRED";
};

type PaymentRequest = {
  conversationId: string;
  productTitle: string | null;
  dateText: string | null;
  guests: number | null;
  checkoutUrl: string | null;
  status: "PAYMENT_PENDING";
};

type PaymentIntent = {
  provider: string;
  publishableKey: string;
  conversationId: string;
};

type Msg = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  matches?: Match[];
};

/* Minimal surface of Stripe.js — loaded from the CDN at runtime, never bundled. */
type StripeCardElement = { mount: (selector: string) => void; unmount?: () => void };
type StripeLike = {
  elements: () => { create: (kind: "card", opts: { hidePostalCode: boolean }) => StripeCardElement };
  createToken: (
    el: StripeCardElement,
    data: { name?: string },
  ) => Promise<{ error?: { message?: string }; token?: { id?: string } }>;
};
declare global {
  interface Window {
    Stripe?: (key: string) => StripeLike;
  }
}

const SESSION_KEY = "bp_kai_session";
const LOG_KEY = "bp_kai_log";
/** The route accepts at most 12 items of context. */
const CONTEXT_MAX = 12;
/** Same real contact link as Hero.tsx's CTA - kai-conversation-flow-notes.md finding #17: the old
 * error copy offered WhatsApp with no link at all. */
const WHATSAPP_HREF = "https://wa.me/628213143343";
/** Tenant flag: when set, the payment step is a hosted checkout redirect, not a card form. */
const HOSTED_CHECKOUT_FEATURE = "bluepass_stripe_pms_checkout";

/* Names no region, so it never goes stale as operators come and go. Shown at once,
   then replaced by buildOpener() as soon as the live catalog's regions land.
   kai-conversation-flow-notes.md's greeting rewrite: the panel header already says
   "Kai · Bluepass concierge" and the visitor just clicked a button labelled "Ask
   Kai", so the old self-description was the third impression, not the first. The
   5% line is already on the hero, every trip tile, and the "How booking works"
   section - repeating it here was the fourth. It now surfaces once, attached to a
   real price, from Kai's own grounded reply (see buildBluePassValueReply /
   buildBluePassConservationReply in Kai core) - not as a greeting preamble. */
const OPENER = "Hi, I'm Kai. Where do you want to go?";

/**
 * Narrates whatever regions the catalog actually has today — the same source of
 * truth Kai's own reply engine uses — rather than a hardcoded destination list
 * that silently goes stale the moment a new region's operators go live. A
 * "Somewhere else" chip always rides alongside the real regions: per
 * kai-conversation-flow-notes.md finding #2, Kai must never make the one region it
 * can actually transact today read like the only option that exists.
 */
function buildOpener(regions: string[]): { content: string; suggested: Suggested[] } {
  const shortlist = regions.slice(0, 3);
  const regionChips: Suggested[] = shortlist.map((region) => ({
    label: `${region} · live availability`,
    message: `I'm looking for a trip in ${region}`,
  }));

  return {
    content: OPENER,
    suggested: [...regionChips, { label: "Somewhere else", message: "Somewhere else - what do you have?" }],
  };
}

function loadStripeScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Secure payment can only start in a browser."));
  }
  if (window.Stripe) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.stripe.com/v3/"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Secure payment could not load.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Secure payment could not load."));
    document.head.appendChild(script);
  });
}

/**
 * The Ask Kai conversation.
 *
 * Anchored to the pill it opens from rather than centred: the visitor is mid-page
 * and mid-thought, and a full-screen takeover on desktop would throw away the
 * context they were reading. Below 620px it does go full-screen, because a
 * 380px panel inside a 390px viewport is just a worse full screen.
 *
 * The route can answer with more than prose — matched yachts, a request for contact
 * details, or a payment step. Each of those is rendered here in the redesign's own
 * design language; only the sequence and field names come from the shared backend.
 */
export default function KaiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { traveller } = useSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closingRef = useRef(false);
  const seqRef = useRef(0);
  /* Region is decided by Kai Core on the first message and must ride along on every
     follow-up call, including payment — it selects the tenant. */
  const regionRef = useRef<Region | undefined>(undefined);
  const stripeRef = useRef<StripeLike | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  /* Cached so "new conversation" reopens with the same destination-aware opener
     rather than falling back to the generic one. */
  const regionsRef = useRef<string[]>([]);

  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggested, setSuggested] = useState<Suggested[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  const [contactRequest, setContactRequest] = useState<ContactRequest | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "" });
  const [contactError, setContactError] = useState<string | null>(null);

  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "starting" | "ready" | "confirming">(
    "idle",
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cardholder, setCardholder] = useState("");
  const [hostedCheckout, setHostedCheckout] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Restore the thread so closing the panel isn't the same as ending the chat. */
  useEffect(() => {
    try {
      const storedId = window.localStorage.getItem(SESSION_KEY) ?? undefined;
      const storedLog = window.localStorage.getItem(LOG_KEY);
      if (storedId) setSessionId(storedId);
      if (storedLog) {
        const parsed = JSON.parse(storedLog) as Msg[];
        if (Array.isArray(parsed) && parsed.length) {
          seqRef.current = parsed.length;
          setMessages(parsed);
          return;
        }
      }
    } catch {
      /* A cleared or blocked localStorage just means we start fresh. */
    }
    seqRef.current = 1;
    setMessages([{ id: 0, role: "assistant", content: OPENER }]);
  }, []);

  /* Swap in the destination-aware opener once the catalog's regions land. Guarded so it
     never overwrites a thread the traveller has already started. */
  useEffect(() => {
    let active = true;

    fetch("/api/kai/regions")
      .then((r) => (r.ok ? r.json() : { regions: [] }))
      .then((data: { regions?: string[] }) => {
        if (!active) return;
        regionsRef.current = data.regions ?? [];
        const built = buildOpener(regionsRef.current);
        if (!built.suggested.length) return;
        setMessages((current) =>
          current.length === 1 && current[0].role === "assistant"
            ? [{ id: current[0].id, role: "assistant", content: built.content }]
            : current,
        );
        setSuggested((current) => (current.length ? current : built.suggested));
      })
      .catch(() => {
        /* No regions endpoint, no problem — the generic opener already stands. */
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    try {
      window.localStorage.setItem(LOG_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* Non-fatal — the thread just won't survive a reload. */
    }
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      window.localStorage.setItem(SESSION_KEY, sessionId);
    } catch {
      /* As above. */
    }
  }, [sessionId]);

  /* Full-screen on small viewports is the only case that needs the page frozen. */
  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    const fullScreen = window.matchMedia("(max-width: 620px)").matches;
    if (fullScreen) lockScroll();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 420);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      if (fullScreen) unlockScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scrollToEnd = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduced() ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => scrollToEnd(false));
  }, [open, scrollToEnd]);

  useEffect(() => {
    if (open) scrollToEnd();
  }, [messages, thinking, contactRequest, paymentRequest, open, scrollToEnd]);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = rootRef.current;
    if (!el || reduced()) {
      onClose();
      return;
    }
    gsap
      .timeline({ onComplete: onClose })
      .to(el.querySelector(".kpanel__shell"), {
        opacity: 0,
        y: 20,
        scale: 0.97,
        duration: 0.28,
        ease: "power2.in",
        transformOrigin: "bottom right",
      })
      .to(el.querySelector(".kpanel__veil"), { opacity: 0, duration: 0.25 }, 0);
  };

  /* Entrance grows out of the pill's own corner, so the panel reads as the pill
     unfolding rather than a separate window arriving. */
  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el || !open || reduced()) return;
      gsap
        .timeline()
        .fromTo(el.querySelector(".kpanel__veil"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0)
        .fromTo(
          el.querySelector(".kpanel__shell"),
          { opacity: 0, y: 26, scale: 0.94, transformOrigin: "bottom right" },
          { opacity: 1, y: 0, scale: 1, duration: 0.62, ease: "bp-out" },
          0.04,
        )
        .fromTo(
          el.querySelectorAll(".kmsg"),
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.05 },
          0.22,
        );
    },
    { dependencies: [open] },
  );

  const push = (role: Msg["role"], content: string, matches?: Match[]) => {
    const id = seqRef.current++;
    setMessages((m) => [...m, { id, role, content, ...(matches?.length ? { matches } : {}) }]);
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;

    push("user", message);
    setDraft("");
    setSuggested([]);
    setContactError(null);
    setThinking(true);

    const context = messages
      .filter((m) => m.role !== "system")
      .slice(-CONTEXT_MAX)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await fetch("/api/kai/web-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(sessionId ? { sessionId } : {}),
          ...(regionRef.current ? { region: regionRef.current } : {}),
          ...(context.length ? { recentMessages: context } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        region?: Region;
        reply?: string;
        matches?: Match[];
        suggestedReplies?: Suggested[];
        contactRequest?: ContactRequest | null;
        paymentRequest?: PaymentRequest | null;
        error?: string;
      };

      if (!res.ok || !data.reply) {
        /* The most likely cause is the Kai Core bridge being unreachable, which
           is a deployment/config state — say so plainly instead of pretending
           Kai answered. kai-conversation-flow-notes.md finding #17: the old copy
           said "booking brain" (an internal module name, meaningless to a
           traveller) and offered WhatsApp with no actual link to tap or copy. */
        push(
          "system",
          `I'm having trouble reaching availability right now. Nothing you typed was lost — try again, or message us on WhatsApp: ${WHATSAPP_HREF}`,
        );
        return;
      }

      if (data.sessionId) setSessionId(data.sessionId);
      if (data.region) regionRef.current = data.region;
      push("assistant", data.reply, data.matches);
      setSuggested(Array.isArray(data.suggestedReplies) ? data.suggestedReplies.slice(0, 4) : []);

      /* Both are latch-style: absent in a reply means that step is no longer pending. */
      setContactRequest(data.contactRequest ?? null);
      if (!data.contactRequest) setContactForm({ name: "", email: "", phone: "" });
      setPaymentRequest(data.paymentRequest ?? null);
    } catch {
      push("system", "That didn’t send — check your connection and try again.");
    } finally {
      setThinking(false);
    }
  };

  /* ---- contact details -------------------------------------------------
     Kai asks for these in prose; the form just spares the visitor from typing
     three things into a chat box. It answers as a normal message, which is what
     the backend expects — there is no separate submit endpoint. */
  const submitContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = contactForm.name.trim();
    const email = contactForm.email.trim();
    const phone = contactForm.phone.trim();

    if (name.length < 2) {
      setContactError("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setContactError("Please enter a valid email.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      setContactError("Please enter a valid WhatsApp number.");
      return;
    }

    setContactError(null);
    void send(`My name is ${name}, email is ${email}, and WhatsApp number is ${phone}`);
  };

  /* ---- payment ---------------------------------------------------------
     Whether this tenant takes a card here or hands off to a hosted checkout is
     Kai Core's call, not ours — ask before rendering either. */
  useEffect(() => {
    setPaymentStatus("idle");
    setPaymentError(null);
    setPaymentIntent(null);
    setCardholder("");

    if (!paymentRequest) {
      setHostedCheckout(false);
      return;
    }

    let active = true;
    const region = regionRef.current ?? "indonesia";
    fetch(`/api/kai/web-chat/capabilities?region=${region}`)
      .then((r) => (r.ok ? r.json() : { enabledFeatures: [] }))
      .then((data: { enabledFeatures?: string[] }) => {
        if (active) setHostedCheckout(Boolean(data.enabledFeatures?.includes(HOSTED_CHECKOUT_FEATURE)));
      })
      .catch(() => {
        if (active) setHostedCheckout(false);
      });

    return () => {
      active = false;
    };
  }, [paymentRequest]);

  const startPayment = useCallback(async () => {
    if (!paymentRequest) return;
    try {
      setPaymentStatus("starting");
      setPaymentError(null);
      const res = await fetch("/api/kai/web-chat/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: paymentRequest.conversationId,
          region: regionRef.current ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Secure payment is not available yet.");
      setPaymentIntent((await res.json()) as PaymentIntent);
    } catch (error) {
      setPaymentStatus("idle");
      setPaymentError(
        error instanceof Error ? error.message : "Secure payment is not available yet.",
      );
    }
  }, [paymentRequest]);

  /* The card field is Stripe's own iframe — it only ever mounts once an intent exists. */
  useEffect(() => {
    let active = true;

    async function mountCard() {
      if (!paymentIntent) return;
      try {
        setPaymentError(null);
        await loadStripeScript();
        if (!active) return;

        const stripe = window.Stripe?.(paymentIntent.publishableKey) ?? null;
        if (!stripe) throw new Error("Secure payment could not initialize.");

        const card = stripe.elements().create("card", { hidePostalCode: true });
        stripeRef.current = stripe;
        cardElementRef.current = card;
        card.mount("#kai-card-element");
        setPaymentStatus("ready");
      } catch (error) {
        if (!active) return;
        setPaymentStatus("idle");
        setPaymentError(
          error instanceof Error ? error.message : "Secure payment could not load.",
        );
      }
    }

    void mountCard();

    return () => {
      active = false;
      cardElementRef.current?.unmount?.();
      cardElementRef.current = null;
      stripeRef.current = null;
    };
  }, [paymentIntent]);

  const confirmPayment = useCallback(async () => {
    if (!paymentRequest || !paymentIntent || !stripeRef.current || !cardElementRef.current) return;
    try {
      setPaymentStatus("confirming");
      setPaymentError(null);

      const tokenResult = await stripeRef.current.createToken(cardElementRef.current, {
        name: cardholder.trim() || undefined,
      });
      if (tokenResult.error || !tokenResult.token?.id) {
        throw new Error(tokenResult.error?.message ?? "Card details could not be verified.");
      }

      const res = await fetch("/api/kai/web-chat/payment-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: paymentIntent.conversationId,
          cardToken: tokenResult.token.id,
          region: regionRef.current ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Payment could not be completed.");

      const confirmation = (await res.json()) as { externalBookingId: string };
      push(
        "assistant",
        `Payment received and your booking is confirmed. Confirmation reference: ${confirmation.externalBookingId}.`,
      );
      setPaymentRequest(null);
      setPaymentIntent(null);
      setPaymentStatus("idle");
    } catch (error) {
      setPaymentStatus("ready");
      setPaymentError(error instanceof Error ? error.message : "Payment could not be completed.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentRequest, paymentIntent, cardholder]);

  const resetThread = () => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(LOG_KEY);
    } catch {
      /* Nothing to clean up. */
    }
    setSessionId(undefined);
    regionRef.current = undefined;
    seqRef.current = 1;
    const built = buildOpener(regionsRef.current);
    setMessages([{ id: 0, role: "assistant", content: built.content }]);
    setSuggested(built.suggested);
    setContactRequest(null);
    setContactForm({ name: "", email: "", phone: "" });
    setContactError(null);
    setPaymentRequest(null);
    inputRef.current?.focus();
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div ref={rootRef} className="kpanel" role="dialog" aria-modal="true" aria-label="Chat with Kai">
      <button type="button" className="kpanel__veil" aria-label="Close chat" onClick={close} />

      <div className="kpanel__shell">
        <header className="kpanel__head">
          <span className="kpanel__id">
            <span className="kpanel__avatar" aria-hidden>
              K<span className="kpanel__dot" />
            </span>
            <span className="kpanel__id-text">
              <span className="ds-body-sm kpanel__name">Kai</span>
              <span className="ds-micro kpanel__status">
                {thinking ? "Typing…" : "Online · Bluepass concierge"}
              </span>
            </span>
          </span>

          <span className="kpanel__head-acts">
            <button
              type="button"
              className="kpanel__icon"
              onClick={resetThread}
              aria-label="Start a new conversation"
              title="New conversation"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12a8 8 0 0 1 13-6M20 4v4h-4M20 12a8 8 0 0 1-13 6M4 20v-4h4" />
              </svg>
            </button>
            <button type="button" className="kpanel__icon" onClick={close} aria-label="Close chat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        </header>

        <div ref={scrollRef} className="kpanel__log" data-lenis-prevent>
          {traveller ? (
            <span className="ds-micro kpanel__who">
              Signed in as {traveller.name ?? traveller.email} — Kai can pick up your enquiries.
            </span>
          ) : null}

          {messages.map((m) => (
            <div key={m.id} className={`kmsg kmsg--${m.role}`}>
              {m.role === "assistant" ? (
                <span className="kmsg__mark" aria-hidden>
                  K
                </span>
              ) : null}
              <span className="kmsg__bubble ds-body-sm">
                {m.content}

                {m.matches?.length ? (
                  <span className="kmatches">
                    {m.matches.map((match) => (
                      <a
                        key={match.slug}
                        className="kmatch"
                        href={match.productUrl ?? `/yachts/${match.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {match.heroImageUrl ? (
                          // The catalog can point at assets this app doesn't carry (the yacht
                          // photos live in bluepass-app), so a miss hides the thumbnail rather
                          // than leaving a broken-image box in the card. Plain img, not
                          // next/image, because Kai Core may return absolute foreign URLs.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="kmatch__img"
                            src={match.heroImageUrl}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <span className="kmatch__body">
                          <span className="ds-body-sm kmatch__name">{match.name}</span>
                          <span className="ds-micro kmatch__meta">
                            {[
                              match.tier,
                              match.region,
                              match.cabins ? `${match.cabins} cabins` : null,
                              match.maxGuests ? `up to ${match.maxGuests}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          <span className="ds-micro kmatch__price">
                            {match.charterPrice ?? match.pricePerCabin}
                          </span>
                          {match.matchingReasons?.length ? (
                            <span className="ds-micro kmatch__why">
                              {match.matchingReasons.slice(0, 2).join(" · ")}
                            </span>
                          ) : null}
                        </span>
                        <span className="kmatch__go" aria-hidden>
                          →
                        </span>
                      </a>
                    ))}
                  </span>
                ) : null}
              </span>
            </div>
          ))}

          {thinking ? (
            <div className="kmsg kmsg--assistant">
              <span className="kmsg__mark" aria-hidden>
                K
              </span>
              <span className="kmsg__bubble kmsg__bubble--typing" aria-label="Kai is typing">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : null}

          {contactRequest && !thinking ? (
            <form className="kform" onSubmit={submitContact}>
              <span className="ds-micro kform__lede">
                Kai needs these to send your enquiry to the operator.
              </span>
              <input
                className="kform__input ds-body-sm"
                value={contactForm.name}
                onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                aria-label="Full name"
                autoComplete="name"
              />
              <input
                className="kform__input ds-body-sm"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
              />
              <input
                className="kform__input ds-body-sm"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="WhatsApp number"
                aria-label="WhatsApp number"
                autoComplete="tel"
              />
              {contactError ? <span className="ds-micro kform__err">{contactError}</span> : null}
              <button type="submit" className="kform__go ds-body-sm">
                Send to Kai
              </button>
            </form>
          ) : null}

          {paymentRequest && !thinking ? (
            <div className="kpay">
              <span className="ds-body-sm kpay__title">
                {paymentRequest.productTitle ?? "Your booking"}
              </span>
              {paymentRequest.dateText || paymentRequest.guests ? (
                <span className="ds-micro kpay__meta">
                  {[
                    paymentRequest.dateText,
                    paymentRequest.guests ? `${paymentRequest.guests} guests` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}

              {hostedCheckout ? (
                paymentRequest.checkoutUrl ? (
                  <button
                    type="button"
                    className="kpay__go ds-body-sm"
                    onClick={() => {
                      window.location.href = paymentRequest.checkoutUrl as string;
                    }}
                  >
                    Pay securely →
                  </button>
                ) : (
                  <span className="ds-micro kpay__note">
                    Kai is preparing your secure checkout link.
                  </span>
                )
              ) : (
                <>
                  {!paymentIntent ? (
                    <button
                      type="button"
                      className="kpay__go ds-body-sm"
                      onClick={() => void startPayment()}
                      disabled={paymentStatus === "starting"}
                    >
                      {paymentStatus === "starting" ? "Opening…" : "Pay by card"}
                    </button>
                  ) : (
                    <>
                      <input
                        className="kform__input ds-body-sm"
                        value={cardholder}
                        onChange={(e) => setCardholder(e.target.value)}
                        placeholder="Name on card"
                        aria-label="Name on card"
                        autoComplete="cc-name"
                      />
                      <div id="kai-card-element" className="kpay__card" />
                      <button
                        type="button"
                        className="kpay__go ds-body-sm"
                        onClick={() => void confirmPayment()}
                        disabled={paymentStatus !== "ready"}
                      >
                        {paymentStatus === "confirming" ? "Confirming…" : "Confirm payment"}
                      </button>
                    </>
                  )}
                </>
              )}

              {paymentError ? <span className="ds-micro kform__err">{paymentError}</span> : null}
            </div>
          ) : null}
        </div>

        {suggested.length && !thinking ? (
          <div className="kpanel__chips">
            {suggested.map((s) => (
              <button key={s.label} type="button" className="kchip" onClick={() => void send(s.message)}>
                {s.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="kpanel__compose">
          <textarea
            ref={inputRef}
            className="kpanel__input ds-body-sm"
            rows={1}
            value={draft}
            // kai-conversation-flow-notes.md finding #12: the greeting promises surf, sail
            // *and* dive, but this narrowed the ask to diving only. Also teaches the input
            // format by example, per the greeting rewrite's own placeholder proposal.
            placeholder='Try "Gold Coast, 2 people, Saturday"'
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            aria-label="Message Kai"
          />
          <button
            type="button"
            className="kpanel__send"
            onClick={() => void send(draft)}
            disabled={!draft.trim() || thinking}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <span className="ds-micro kpanel__foot">
          Kai answers with real availability. Enter to send, Shift + Enter for a new line.
        </span>
      </div>
    </div>,
    document.body,
  );
}
