import Link from "next/link";

/**
 * The CRM's own header — deliberately not AdminNav. This tool has exactly one job (work the
 * outreach list), so it gets a slim top bar instead of a sidebar built for switching between many
 * unrelated admin sections. Kept as its own component so the visual pass this page is still waiting
 * on has somewhere to land without touching the real admin console.
 */
export default function CrmTopbar({ adminEmail }: { adminEmail: string }) {
  return (
    <header className="crm-topbar">
      <Link href="/crm" className="crm-topbar__brand">
        <span className="ds-body-sm crm-topbar__wordmark">Bluepass</span>
        <span className="ds-micro crm-topbar__eyebrow">Outreach CRM</span>
      </Link>

      <div className="crm-topbar__meta">
        <span className="ds-micro crm-topbar__signed-in">{adminEmail}</span>
        <Link href="/admin" className="ds-micro crm-topbar__exit">
          Admin console
        </Link>
      </div>
    </header>
  );
}
