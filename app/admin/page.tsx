import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import OverviewStats from "@/components/admin/OverviewStats";
import { ADMIN_SECTIONS } from "@/lib/services/admin/sections";
import { loadAdminOverviewStats } from "@/lib/services/admin/overview";
import { countPendingApprovals } from "@/lib/services/admin/review-queue";

/**
 * The section index plus, as of 2026-08-19, a real overview above it: what Kai has actually
 * settled, in real money, across both regions. Still reports nothing it would have to invent — an
 * unreachable Kai shows as unreachable (OverviewStats), not as zero revenue.
 */
export default async function AdminIndexPage() {
  const [pendingApprovals, overviewStats] = await Promise.all([
    countPendingApprovals(),
    loadAdminOverviewStats(),
  ]);
  const counters = { pendingApprovals };

  return (
    <>
      <AdminPageHeader
        eyebrow="Control plane"
        title="Admin"
        support="The parts of Bluepass that need a person: who gets to take money as an operator, who earns commission as a partner, and what their payouts are attached to."
      />

      <OverviewStats stats={overviewStats} />

      <div className="adm-grid">
        {ADMIN_SECTIONS.map((section) => {
          const count = section.counter ? counters[section.counter] : 0;

          return (
            <Link key={section.href} href={section.href} className="adm-card adm-card--link">
              <span className="adm-card__top">
                <span className="ds-headline adm-card__title">{section.label}</span>
                {section.counter ? (
                  <span className={`ds-micro adm-pill ${count > 0 ? "adm-pill--live" : ""}`}>
                    {count > 0 ? `${count} waiting` : "All clear"}
                  </span>
                ) : null}
              </span>
              <span className="ds-body-sm adm-card__blurb">{section.blurb}</span>
              <span className="ds-caption adm-card__go">Open →</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
