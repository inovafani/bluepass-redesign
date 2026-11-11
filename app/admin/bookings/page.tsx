import Link from "next/link";
import AdminCancelBooking from "@/components/admin/AdminCancelBooking";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusPill, { type PillTone } from "@/components/admin/StatusPill";
import { bookingMoneySummary, loadAdminBookings, type BookingView } from "@/lib/services/admin/bookings";
import { requireAdminOrRedirect } from "@/lib/services/admin/guard";
import { formatMoney } from "@/lib/services/rails/money";
import "../../rails.css";

export const metadata = { title: "Bookings · Bluepass Admin" };
export const dynamic = "force-dynamic";

const VIEWS: { key: BookingView; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "payout", label: "Waiting to be paid out" },
  { key: "disputes", label: "Disputes" },
];

const STATUS_TONE: Record<string, PillTone> = { CONFIRMED: "good", REQUESTED: "warn", PENDING_PAYMENT: "warn", CANCELLED: "muted", EXPIRED: "muted" };
const humanise = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

function when(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Every booking made on bluepass.co with its money: what was paid and refunded, where the operator's
 * payout stands, and a way to cancel and refund that keeps Stripe and the database in step.
 */
export default async function BookingsAdminPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requireAdminOrRedirect("/admin/bookings");
  const params = await searchParams;
  const view: BookingView = VIEWS.some((v) => v.key === params.view) ? (params.view as BookingView) : "recent";
  const [rows, summary] = await Promise.all([loadAdminBookings({ view, q: params.q }), bookingMoneySummary()]);
  const settlementOn = process.env.NATIVE_SETTLEMENT_ENABLED === "true";

  return (
    <>
      <AdminPageHeader
        title="Bookings"
        support="Bookings made on bluepass.co, with what was paid, what was refunded, and where each operator's payout stands."
      />

      <section className="adm-block">
        <div className="adm-card" style={{ padding: 20, display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div>
            <p className="ds-micro">Held for operators</p>
            <p className="ds-body-lg">
              {summary.owed.length ? summary.owed.map((o) => formatMoney(o._sum.operatorNetCents ?? 0, o.currency)).join(" + ") : "Nothing"}
            </p>
            <p className="ds-caption">{summary.owed.reduce((n, o) => n + o._count, 0)} booking(s) not yet paid out</p>
          </div>
          <div>
            <p className="ds-micro">Open disputes</p>
            <p className="ds-body-lg">{summary.openDisputes}</p>
          </div>
          <div>
            <p className="ds-micro">Operator payouts</p>
            <p className="ds-body-lg">{settlementOn ? "Switched on" : "Switched off"}</p>
            <p className="ds-caption">{settlementOn ? "The daily run pays operators 24 hours after each trip." : "Set NATIVE_SETTLEMENT_ENABLED=true to pay operators."}</p>
          </div>
        </div>
      </section>

      <section className="adm-block">
        <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }} aria-label="Booking views">
          {VIEWS.map((v) => (
            <Link key={v.key} href={`/admin/bookings?view=${v.key}`} className="ds-body-sm" aria-current={v.key === view ? "page" : undefined} style={{ fontWeight: v.key === view ? 600 : 400 }}>
              {v.label}
            </Link>
          ))}
          <form action="/admin/bookings" method="get" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input type="hidden" name="view" value={view} />
            <input name="q" defaultValue={params.q ?? ""} placeholder="Reference, name or email" className="rl-input" aria-label="Search bookings" />
            <button type="submit" className="rl-btn rl-btn--secondary">Search</button>
          </form>
        </nav>

        {rows.length === 0 ? (
          <div className="adm-card adm-empty">
            <p className="ds-body-sm adm-empty__body">No bookings match.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--cards">
              <thead>
                <tr>
                  <th className="ds-micro">Booking</th>
                  <th className="ds-micro">Trip</th>
                  <th className="ds-micro">Money</th>
                  <th className="ds-micro">Status</th>
                  <th className="ds-micro">Operator payout</th>
                  <th className="ds-micro">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const refundable = b.totalCents - b.refundedCents;
                  const canCancel = ["CONFIRMED", "REQUESTED", "PENDING_PAYMENT"].includes(b.status) && !b.settledAt && (b.dispute === "none" || b.dispute === "won");
                  return (
                    <tr key={b.id}>
                      <td className="ds-body-sm adm-cell--title">
                        <strong>{b.reference}</strong>
                        <br />
                        {b.leadName}
                        {b.leadEmail ? <><br /><span className="ds-caption">{b.leadEmail}</span></> : null}
                      </td>
                      <td className="ds-body-sm" data-label="Trip">
                        {b.listing.title}
                        <br />
                        <span className="ds-caption">{b.operatorProfile.companyName ?? "Operator"} · {b.guests} guest(s)</span>
                        <br />
                        <span className="ds-caption">{when(b.departsAt, b.timezone)}</span>
                      </td>
                      <td className="ds-body-sm adm-table__num" data-label="Money">
                        {formatMoney(b.totalCents, b.currency)}
                        {b.refundedCents > 0 ? <><br /><span className="ds-caption">refunded {formatMoney(b.refundedCents, b.currency)}</span></> : null}
                        {b.operatorNetCents > 0 ? <><br /><span className="ds-caption">operator gets {formatMoney(b.operatorNetCents, b.currency)}</span></> : null}
                      </td>
                      <td data-label="Status">
                        <StatusPill tone={STATUS_TONE[b.status] ?? "muted"}>{humanise(b.status)}</StatusPill>
                        <br />
                        <span className="ds-caption">{humanise(b.paymentStatus)}{b.channel !== "NATIVE" ? ` · ${humanise(b.channel)}` : ""}</span>
                      </td>
                      <td data-label="Operator payout">
                        <StatusPill tone={b.payout.tone}>{b.payout.label}</StatusPill>
                      </td>
                      <td data-label="Actions">
                        {canCancel ? (
                          <AdminCancelBooking
                            bookingId={b.id}
                            reference={b.reference}
                            refundText={refundable > 0 && b.paymentStatus !== "UNPAID" ? `Refunds ${formatMoney(refundable, b.currency)} to the guest's card in full.` : "No payment was taken, so nothing is refunded."}
                          />
                        ) : (
                          <span className="ds-caption">{b.settledAt ? "Paid out. Reverse the transfer in Stripe first." : b.dispute === "open" || b.dispute === "lost" ? "Dispute: handle in Stripe." : "—"}</span>
                        )}
                        <details style={{ marginTop: 8 }}>
                          <summary className="ds-caption">History</summary>
                          <ul className="ds-caption" style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                            {b.events.map((e, i) => (
                              <li key={i}>{when(e.createdAt, b.timezone)}: {e.type.replace(/_/g, " ")} ({e.actor}){e.message ? `, ${e.message}` : ""}</li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
