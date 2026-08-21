import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy | Bluepass",
};

/**
 * Real, drafted from what this codebase actually does (Stripe for payment, Rezdy for AU operator
 * bookings, Kai/WhatsApp for chat, Supabase for storage, session cookies, referral tracking) - not
 * boilerplate. Flagged as a draft because some entity-specific facts still need the founders/a
 * lawyer to fill in and sign off, not an engineering session - the entity itself is real (Bluepass
 * Pty Ltd, ACN 701 302 463, ASIC certificate of registration sighted 2026-08-21), but registered
 * address, exact data-retention periods, hosting regions, and a real privacy contact email are
 * still not filled in. Ships anyway because a dead Privacy link was P0-1 in Tony's 2026-08-12 audit
 * - "the site collects payment details with dead legal links" - and an honest draft beats a 404.
 */
export default function PrivacyPage() {
  return (
    <main className="acctpage">
      <div className="acctpage__inner legalpage__inner">
        <header className="acctpage__head">
          <span className="ds-micro acctpage__eyebrow">Legal</span>
          <h1 className="ds-display-md acctpage__title">Privacy Policy</h1>
          <p className="ds-body acctpage__support">Last updated 20 August 2026.</p>
        </header>

        <div className="legalpage__draft-note" role="note">
          <p className="ds-body-sm">
            <strong>Draft — pending review.</strong> This page describes what Bluepass actually
            collects and does with it today, in plain terms. The remaining bracketed fields below
            (registered address, retention periods, hosting regions, contact) have not yet been
            filled in by Bluepass's own team and should be treated as placeholders until they are.
          </p>
        </div>

        <div className="legalpage__body">
          <section>
            <h2 className="ds-headline">1. Who this policy covers</h2>
            <p className="ds-body">
              This policy applies to bluepass.co and the Bluepass booking service, operated by{" "}
              <strong>Bluepass Pty Ltd (ACN 701 302 463)</strong>, registered at{" "}
              <strong>[registered address]</strong> (&ldquo;Bluepass&rdquo;, &ldquo;we&rdquo;). It
              covers travellers booking trips, operators listed on Bluepass, and creators/referral
              partners.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">2. What we collect</h2>
            <p className="ds-body">We collect only what the service in front of you actually needs:</p>
            <ul className="ds-body legalpage__list">
              <li>
                <strong>Account details:</strong> name, email, phone number, and a hashed password
                when you register.
              </li>
              <li>
                <strong>Booking details:</strong> traveller name, email, and phone shared with the
                operator you book with, plus trip dates, guest count, and price — necessary to
                actually run your trip.
              </li>
              <li>
                <strong>Payment details:</strong> handled entirely by Stripe. Bluepass never receives
                or stores your card number — see §5.
              </li>
              <li>
                <strong>Conversations with Kai:</strong> messages you send our chat assistant,
                whether on bluepass.co or via WhatsApp, are stored so we can pick up where a
                conversation left off and so an operator can see the enquiry that led to a booking.
              </li>
              <li>
                <strong>Referral data:</strong> if you arrive via a partner's link, we record which
                link and which partner, so commission can be attributed correctly.
              </li>
              <li>
                <strong>Session cookie:</strong> one functional, HTTP-only cookie that keeps you
                signed in. No advertising or tracking cookies are set by Bluepass itself.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="ds-headline">3. Why we collect it</h2>
            <p className="ds-body">
              To create your account, process and fulfil a booking, let you message Kai and pick up
              a past conversation, pay operators and referral partners correctly, and meet our own
              legal and accounting obligations. We do not sell your data, and we do not use it for
              third-party advertising.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">4. Who we share it with</h2>
            <p className="ds-body">Only the parties needed to deliver the trip or run the platform:</p>
            <ul className="ds-body legalpage__list">
              <li>
                <strong>The operator you book with</strong> — your name, contact details, and trip
                details, so they can run your booking.
              </li>
              <li>
                <strong>Stripe</strong> — payment processing. Stripe's own privacy policy governs
                your card details.
              </li>
              <li>
                <strong>Rezdy</strong> — the booking/availability system some Australian operators
                use; trip and guest details pass through it to hold your spot.
              </li>
              <li>
                <strong>Supabase</strong> — our database host, where account and booking records are
                stored.
              </li>
              <li>
                <strong>WhatsApp Business (Meta)</strong> — only if you choose to message Kai over
                WhatsApp rather than the website.
              </li>
            </ul>
            <p className="ds-body">
              We do not share your data with data brokers or advertising networks.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">5. Payments</h2>
            <p className="ds-body">
              All payments are processed by Stripe. Bluepass's servers never see or store your full
              card number, expiry, or security code. Stripe's own privacy and security practices
              apply to that data — see{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
                stripe.com/privacy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="ds-headline">6. How long we keep it</h2>
            <p className="ds-body">
              We keep account and booking records for as long as your account is active and for a
              reasonable period after, to meet accounting, tax, and dispute-resolution obligations.{" "}
              <strong>[Bluepass to confirm an exact retention period per record type.]</strong>
            </p>
          </section>

          <section>
            <h2 className="ds-headline">7. Your rights</h2>
            <p className="ds-body">
              You can ask to see, correct, or delete the personal data we hold about you, or ask us
              to stop processing it, by contacting{" "}
              <strong>[privacy contact email]</strong>. Deleting your account does not retroactively
              remove records we are legally required to keep (e.g. completed transaction records).
            </p>
          </section>

          <section>
            <h2 className="ds-headline">8. Where your data is stored</h2>
            <p className="ds-body">
              Bluepass's databases are hosted on Supabase infrastructure. Depending on which part of
              the service you use, your data may be processed outside your home country.{" "}
              <strong>[Bluepass to confirm hosting regions and any cross-border transfer basis.]</strong>
            </p>
          </section>

          <section>
            <h2 className="ds-headline">9. Children</h2>
            <p className="ds-body">
              Bluepass accounts are for adults booking travel. The service is not directed at
              children, and we do not knowingly collect data from anyone under 18 who is not
              travelling as part of an adult's booking.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">10. Changes to this policy</h2>
            <p className="ds-body">
              If this policy changes materially, we will update the date at the top of this page. We
              encourage checking back periodically.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">11. Contact</h2>
            <p className="ds-body">
              Questions about this policy or your data: <strong>[privacy contact email]</strong>.
            </p>
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
