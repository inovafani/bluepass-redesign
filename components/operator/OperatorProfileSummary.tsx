import StatusPill from "@/components/admin/StatusPill";
import type { OperatorProfileView } from "@/lib/services/operator/guard";

const PAYOUT_LABELS: Record<string, string> = {
  MANUAL_BANK_TRANSFER: "Manual bank transfer",
  STRIPE_CONNECT: "Stripe Connect",
  AIRWALLEX: "Airwallex",
};

/**
 * Who Bluepass thinks this operator is, and how it will pay them.
 *
 * The Stripe block is the part that earns its place: `stripeChargesEnabled` and
 * `stripePayoutsEnabled` are kept current by this app's `account.updated` webhook and have never
 * been shown to the operator they describe. An operator whose payouts are disabled because Stripe
 * is still waiting on a document has, until now, had no way to find that out except by noticing
 * money not arriving.
 */
export default function OperatorProfileSummary({ profile }: { profile: OperatorProfileView }) {
  const payoutMethod = PAYOUT_LABELS[profile.payoutMethod] ?? profile.payoutMethod;

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Your profile</h2>
        <p className="ds-caption adm-block__note">
          What travellers and the payouts run see. Anything wrong here is fixed by your Bluepass
          contact — this page is read-only for now.
        </p>
      </header>

      <div className="adm-card">
        <dl className="adm-facts">
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Company</dt>
            <dd className="ds-body-sm adm-facts__value">
              {profile.companyName ?? "Not set — tell your Bluepass contact"}
            </dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Profile status</dt>
            <dd className="ds-body-sm adm-facts__value">{profile.status}</dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Payout method</dt>
            <dd className="ds-body-sm adm-facts__value">{payoutMethod}</dd>
          </div>
          <div className="adm-facts__row">
            <dt className="ds-micro adm-facts__label">Payout contact</dt>
            <dd className="ds-body-sm adm-facts__value">{profile.payoutContactEmail ?? "Not set"}</dd>
          </div>
          {profile.country ? (
            <div className="adm-facts__row">
              <dt className="ds-micro adm-facts__label">Country</dt>
              <dd className="ds-body-sm adm-facts__value">{profile.country}</dd>
            </div>
          ) : null}
          {profile.websiteUrl ? (
            <div className="adm-facts__row">
              <dt className="ds-micro adm-facts__label">Website</dt>
              <dd className="ds-body-sm adm-facts__value">{profile.websiteUrl}</dd>
            </div>
          ) : null}
        </dl>

        {profile.payoutMethod === "STRIPE_CONNECT" ? (
          <StripeStatus profile={profile} />
        ) : (
          <p className="ds-caption adm-list__note">
            Payouts on this method are sent by hand against the bank details Bluepass holds for you.
            Those details are stored encrypted and are never displayed back, here or in the admin
            console — ask your Bluepass contact if you need to change them.
          </p>
        )}
      </div>
    </section>
  );
}

function StripeStatus({ profile }: { profile: OperatorProfileView }) {
  /* Both flags are Stripe's own answer about this connected account, mirrored here by the webhook.
     Neither is inferred from the other: Stripe routinely enables charges while payouts stay held
     pending verification, and collapsing the two would hide exactly that state. */
  const charges = profile.stripeChargesEnabled;
  const payouts = profile.stripePayoutsEnabled;

  return (
    <div className="adm-list">
      <div className="adm-ledger__pills">
        <StatusPill tone={charges ? "good" : "warn"}>
          charges {charges ? "enabled" : "not enabled"}
        </StatusPill>
        <StatusPill tone={payouts ? "good" : "warn"}>
          payouts {payouts ? "enabled" : "not enabled"}
        </StatusPill>
      </div>

      <p className="ds-caption adm-list__note">
        {charges && payouts
          ? "Stripe has your account fully enabled, so completed bookings can be paid out to it."
          : "Stripe has not enabled everything on your connected account yet, which is usually a document or a bank detail it is still waiting on. Until both read enabled, money can be held rather than paid out. Your Bluepass contact can send you back into Stripe onboarding."}
      </p>

      {profile.stripeConnectAccountId ? (
        <p className="ds-micro adm-list__note">Stripe account {profile.stripeConnectAccountId}</p>
      ) : null}
    </div>
  );
}
