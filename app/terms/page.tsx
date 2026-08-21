import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service | Bluepass",
};

/**
 * Same drafting basis as `app/privacy/page.tsx` - grounded in what the product actually does
 * (marketplace connecting travellers to vetted operators, Stripe payment, no markup on the
 * operator's own rate, 5% conservation share, tiered cancellation refunds) rather than generic
 * boilerplate. Still a draft pending the founders'/a lawyer's sign-off on the bracketed fields.
 */
export default function TermsPage() {
  return (
    <main className="acctpage">
      <div className="acctpage__inner legalpage__inner">
        <header className="acctpage__head">
          <span className="ds-micro acctpage__eyebrow">Legal</span>
          <h1 className="ds-display-md acctpage__title">Terms of Service</h1>
          <p className="ds-body acctpage__support">Last updated 20 August 2026.</p>
        </header>

        <div className="legalpage__draft-note" role="note">
          <p className="ds-body-sm">
            <strong>Draft — pending review.</strong> The bracketed fields below (company details,
            jurisdiction, liability specifics) have not yet been filled in by Bluepass's own team
            and should be treated as placeholders until they are.
          </p>
        </div>

        <div className="legalpage__body">
          <section>
            <h2 className="ds-headline">1. Who you're agreeing with</h2>
            <p className="ds-body">
              Bluepass is operated by <strong>[Bluepass legal entity name, ABN/company number]</strong>,
              registered at <strong>[registered address]</strong>. By creating an account or booking
              a trip through bluepass.co, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">2. What Bluepass is</h2>
            <p className="ds-body">
              Bluepass is a booking platform connecting travellers with independent, vetted boat,
              dive, and wildlife operators. The trip itself — the boat, the crew, the experience —
              is delivered by the operator, not by Bluepass. Bluepass handles discovery, booking,
              and payment on the operator's behalf.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">3. Pricing — no markup</h2>
            <p className="ds-body">
              The price shown on Bluepass is the operator's own rate. Bluepass does not add a markup
              on top of it. Bluepass's revenue comes from a commission the operator agrees to when
              they join the platform, not from charging travellers more than the operator's direct
              price.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">4. The 5% conservation commitment</h2>
            <p className="ds-body">
              A fixed 5% of every fare is allocated to ocean and reef conservation partners, funded
              from Bluepass's own commission — it is not an extra charge added to your total.
              Conservation reporting is published on the{" "}
              <a href="/conservation">Conservation page</a>.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">5. Payment</h2>
            <p className="ds-body">
              Payments are processed by Stripe. Bluepass does not store your full card details.
              Charging happens at checkout, in the currency shown.{" "}
              <strong>[Bluepass to confirm accepted currencies and any conversion-fee handling.]</strong>
            </p>
          </section>

          <section>
            <h2 className="ds-headline">6. Cancellations and refunds</h2>
            <p className="ds-body">
              Unless a specific operator publishes a different policy at checkout, the following
              platform-default tiers apply to a traveller-initiated cancellation, based on how far
              ahead of the trip date you cancel:
            </p>
            <ul className="ds-body legalpage__list">
              <li>14 days or more before the trip: full refund.</li>
              <li>3–13 days before the trip: 50% refund.</li>
              <li>Less than 3 days before the trip: no refund.</li>
            </ul>
            <p className="ds-body">
              If the operator cancels, you receive a full refund regardless of timing. Refunds are
              returned to your original payment method via Stripe.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">7. Your account</h2>
            <p className="ds-body">
              You're responsible for keeping your login details secure and for the accuracy of the
              booking details you provide (traveller name, contact details, guest count). Bluepass
              may suspend an account used for fraud, abuse, or to circumvent an operator's own
              booking terms.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">8. Creators and referral partners</h2>
            <p className="ds-body">
              If you join Bluepass's referral or creator program, your commission terms are set out
              in the founding-partner terms you're shown when you apply. Bluepass tracks
              attribution (which link a traveller arrived through) to calculate what's owed; a
              disputed attribution is resolved by Bluepass acting in good faith on the data it
              actually recorded.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">9. Operators</h2>
            <p className="ds-body">
              Operators listed on Bluepass are independent businesses, not Bluepass employees or
              agents. Bluepass vets operators before listing them but does not operate the vessels,
              certify crew, or control how a trip is run day to day — that responsibility sits with
              the operator.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">10. Limitation of liability</h2>
            <p className="ds-body">
              To the extent permitted by law, Bluepass is not liable for the conduct of an
              independent operator, for weather or safety decisions made during a trip, or for
              indirect losses arising from a booking.{" "}
              <strong>
                [Bluepass/legal to set specific liability caps and any consumer-law carve-outs for
                the relevant jurisdiction.]
              </strong>
            </p>
          </section>

          <section>
            <h2 className="ds-headline">11. Governing law</h2>
            <p className="ds-body">
              These terms are governed by the laws of <strong>[jurisdiction, e.g. Australia]</strong>,
              and any dispute is subject to the exclusive jurisdiction of its courts.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">12. Changes to these terms</h2>
            <p className="ds-body">
              If these terms change materially, we will update the date at the top of this page.
              Continuing to use Bluepass after a change means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">13. Contact</h2>
            <p className="ds-body">
              Questions about these terms: <strong>[legal/support contact email]</strong>.
            </p>
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
