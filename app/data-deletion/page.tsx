import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Delete your data | Bluepass",
  description: "How to ask Bluepass to delete the personal data we hold about you.",
};

/**
 * The "user data deletion instructions" page Meta asks for before it will review the WhatsApp app.
 * It restates what /privacy section 7 already promises (ask by email; legally required records stay)
 * and adds no new commitment - in particular no deadline, because a time limit is the company's
 * decision to make, not something to invent for an app-review form.
 */
export default function DataDeletionPage() {
  return (
    <main className="acctpage">
      <div className="acctpage__inner legalpage__inner">
        <header className="acctpage__head">
          <span className="ds-micro acctpage__eyebrow">Legal</span>
          <h1 className="ds-display-md acctpage__title">Delete your data</h1>
          <p className="ds-body acctpage__support">
            You can ask Bluepass to delete the personal data we hold about you at any time.
          </p>
        </header>

        <div className="legalpage__body">
          <section>
            <h2 className="ds-headline">How to ask</h2>
            <p className="ds-body">
              Email <a href="mailto:admin@bluepass.co">admin@bluepass.co</a> with the subject
              &ldquo;Delete my data&rdquo; and include:
            </p>
            <ul className="legalpage__list">
              <li>your name, and the email address on your Bluepass account (if you have one);</li>
              <li>
                the phone number you used to message Bluepass on WhatsApp, in international format
                (for example +61 412 345 678), if you chatted with Kai that way;
              </li>
              <li>whether you want everything deleted, or only some of it.</li>
            </ul>
            <p className="ds-body">
              We use these details to find your records, and we may reply to confirm the request
              comes from you before we delete anything.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">What we delete</h2>
            <p className="ds-body">
              The personal data we hold about you: your account details, and your conversations with
              Kai, including messages you sent on WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">What we may have to keep</h2>
            <p className="ds-body">
              Deleting your data does not remove records we are legally required to keep, such as
              completed transaction records. See section 7 of our{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="ds-headline">Questions</h2>
            <p className="ds-body">
              Write to <a href="mailto:admin@bluepass.co">admin@bluepass.co</a>.
            </p>
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
