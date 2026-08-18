import SectionError from "@/components/admin/SectionError";
import StatusPill, { ledgerTone } from "@/components/admin/StatusPill";
import { formatDateTime, formatMoneyFromCents, type SectionResult } from "@/lib/services/admin/payouts";
import type { CommissionLedgerEntryRow } from "@/lib/services/referrals/commission-ledger";

/**
 * This app's own CommissionLedgerEntry rows — referral and creator commission specifically, written
 * by syncReferralCommissionLedger off booking inquiries.
 *
 * Context rather than an action surface: these are estimates against inquiries, not money Kai has
 * been told to move, so nothing here is releasable. Shown alongside the two real ledgers because a
 * commission estimate with no matching Kai-side line is itself worth noticing.
 */
export default function CommissionLedger({
  result,
}: {
  result: SectionResult<CommissionLedgerEntryRow[]>;
}) {
  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Local commission ledger</h2>
        <p className="ds-caption adm-block__note">
          This app&rsquo;s own referral/creator commission estimates, written against booking inquiries.
          Read-only — releasing money happens on the Kai side.
        </p>
      </header>

      {!result.ok ? (
        <SectionError message={result.message} />
      ) : result.data.length === 0 ? (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__body">No commission ledger entries recorded yet.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="ds-micro">Kind</th>
                <th className="ds-micro">Amount</th>
                <th className="ds-micro">Status</th>
                <th className="ds-micro">Role</th>
                <th className="ds-micro">Account</th>
                <th className="ds-micro">Created</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((entry) => (
                <tr key={entry.id}>
                  <td className="ds-body-sm">{entry.kind.toLowerCase().replace(/_/g, " ")}</td>
                  <td className="ds-body-sm adm-table__num">
                    {formatMoneyFromCents(entry.amountCents, entry.currency)}
                  </td>
                  <td>
                    <StatusPill tone={ledgerTone(entry.status)}>{entry.status}</StatusPill>
                  </td>
                  <td className="ds-body-sm">{entry.role ?? "—"}</td>
                  <td className="ds-body-sm">
                    {entry.account?.email ?? entry.account?.displayName ?? "—"}
                  </td>
                  <td className="ds-body-sm">{formatDateTime(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
