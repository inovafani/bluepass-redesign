import PayoutActions from "@/components/admin/PayoutActions";
import SectionError from "@/components/admin/SectionError";
import StatusPill, { ledgerTone, payoutTone } from "@/components/admin/StatusPill";
import {
  formatDateTime,
  formatMoneyFromCents,
  humaniseLedgerKind,
  OPERATOR_PAYOUT_KIND,
  type LedgerRowView,
  type SectionResult,
} from "@/lib/services/admin/payouts";

export type LedgerTenantView = {
  tenantSlug: string;
  result: SectionResult<LedgerRowView[]>;
};

/**
 * One country's ledger, split by tenant.
 *
 * Each tenant renders its own success or failure: on the AU side two separate Kai tenants carry
 * traffic, and one of them being unreachable must not make the other look empty.
 */
export default function LedgerSection({
  title,
  blurb,
  tenants,
  hint,
}: {
  title: string;
  blurb: string;
  tenants: LedgerTenantView[];
  hint?: string;
}) {
  const total = tenants.reduce((sum, t) => sum + (t.result.ok ? t.result.data.length : 0), 0);

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">{title}</h2>
        <p className="ds-caption adm-block__note">{blurb}</p>
      </header>

      {tenants.map((tenant) => (
        <div className="adm-tenant" key={tenant.tenantSlug}>
          <div className="adm-tenant__head">
            <span className="ds-micro adm-tenant__slug">{tenant.tenantSlug}</span>
            {tenant.result.ok ? (
              <span className="ds-micro adm-tenant__count">
                {tenant.result.data.length} {tenant.result.data.length === 1 ? "line" : "lines"}
              </span>
            ) : null}
          </div>

          {!tenant.result.ok ? (
            <SectionError message={tenant.result.message} hint={hint} />
          ) : tenant.result.data.length === 0 ? (
            <div className="adm-card adm-empty">
              <p className="ds-body-sm adm-empty__body">
                No ledger lines for <strong>{tenant.tenantSlug}</strong> at this status filter.
              </p>
            </div>
          ) : (
            <div className="adm-ledger">
              {tenant.result.data.map((row) => (
                <LedgerRow key={row.id} row={row} />
              ))}
            </div>
          )}
        </div>
      ))}

      {total === 0 && tenants.every((t) => t.result.ok) ? (
        <p className="ds-caption adm-block__note">
          An empty list is not the same as nothing owed — it only means no line matches the status
          filter above. Check the other statuses before reading this as &ldquo;no money is waiting&rdquo;.
        </p>
      ) : null}
    </section>
  );
}

function LedgerRow({ row }: { row: LedgerRowView }) {
  const amount = formatMoneyFromCents(row.amountCents, row.currency);
  const isOperatorPayout = row.kind === OPERATOR_PAYOUT_KIND;

  return (
    <article className={`adm-card adm-ledger__row ${isOperatorPayout ? "is-payout" : ""}`}>
      <header className="adm-ledger__head">
        <div className="adm-ledger__ident">
          <h3 className="ds-body-lg adm-ledger__title">{row.title}</h3>
          <span className="ds-micro adm-ledger__kind">{humaniseLedgerKind(row.kind)}</span>
        </div>

        <div className="adm-ledger__money">
          <span className="ds-headline adm-ledger__amount">{amount}</span>
          <div className="adm-ledger__pills">
            <StatusPill tone={ledgerTone(row.status)}>{row.status}</StatusPill>
            {row.payoutStatus ? (
              <StatusPill tone={payoutTone(row.payoutStatus)} title={row.payoutDetail ?? undefined}>
                payout {row.payoutStatus.toLowerCase()}
              </StatusPill>
            ) : null}
          </div>
        </div>
      </header>

      {row.facts.length ? (
        <dl className="adm-facts">
          {row.facts.map((f) => (
            <div className="adm-facts__row" key={`${f.label}-${f.value}`}>
              <dt className="ds-micro adm-facts__label">{f.label}</dt>
              <dd className="ds-body-sm adm-facts__value">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <footer className="adm-ledger__foot">
        <span className="ds-micro adm-ledger__created">Created {formatDateTime(row.createdAt)}</span>
        {row.payoutDetail ? (
          <span className="ds-micro adm-ledger__detail">{row.payoutDetail}</span>
        ) : null}
        <PayoutActions row={row} amount={amount} />
      </footer>
    </article>
  );
}
