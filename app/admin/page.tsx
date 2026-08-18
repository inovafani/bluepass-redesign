import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { ADMIN_SECTIONS } from "@/lib/services/admin/sections";
import { countPendingApprovals } from "@/lib/services/admin/review-queue";

/**
 * The section index — the door, not a dashboard. It lists what the console can
 * do and how much of it is waiting, and deliberately reports nothing it would
 * have to invent: the one number here is a real count of pending rows.
 */
export default async function AdminIndexPage() {
  const pendingApprovals = await countPendingApprovals();
  const counters = { pendingApprovals };

  return (
    <>
      <AdminPageHeader
        eyebrow="Control plane"
        title="Admin"
        support="The parts of Bluepass that need a person: who gets to take money as an operator, who earns commission as a partner, and what their payouts are attached to."
      />

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
