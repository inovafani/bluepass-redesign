/**
 * Read-only mapping of every operator Bluepass has a page for, for sharing with a partner's
 * assistant: name, public page, claim-start link and current status. Nothing is written.
 *
 *   npx tsx --env-file=.env.local scripts/export-operator-mapping.ts <out.csv>
 *
 * Every OperatorLead has a public page at /operators/[slug] (a placeholder until a prepared page
 * is approved or the operator claims it), so the lead table is the list.
 *
 * Deliberately left out: email, phone and OperatorClaimToken. The claim-start link only begins the
 * flow (a one-time link goes to the business's own inbox); the token is what grants control, so it
 * never appears here. `claim_email_on_file` is a yes/no so a tester knows which leads can complete
 * the flow without learning the address.
 */
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";

const BASE = "https://bluepass.co";
const out = process.argv[2];
if (!out) throw new Error("Usage: export-operator-mapping.ts <out.csv>");

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main() {
  const [leads, prepared] = await Promise.all([
    prisma.operatorLead.findMany({
      select: { slug: true, name: true, category: true, region: true, source: true, status: true, email: true },
      orderBy: [{ source: "asc" }, { name: "asc" }],
    }),
    prisma.preparedOperatorPage.findMany({ select: { slug: true, qcStatus: true } }),
  ]);
  const qc = new Map(prepared.map((p) => [p.slug, p.qcStatus]));

  const header = ["name", "slug", "category", "region", "source", "lead_status", "page_state", "public_page", "claim_start_link", "claim_email_on_file"];
  const rows = leads.map((l) => {
    const claimed = l.status === "APPROVED" || l.status === "LIVE";
    const pageState = claimed ? "claimed" : qc.get(l.slug) === "approved" ? "prepared_live" : "placeholder";
    return [
      l.name, l.slug, l.category ?? "", l.region ?? "", l.source, l.status, pageState,
      `${BASE}/operators/${l.slug}`,
      claimed ? "" : `${BASE}/operator/claim/start/${l.slug}`,
      l.email ? "yes" : "no",
    ];
  });

  writeFileSync(out, [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
  console.log(`${rows.length} operators written to ${out}`);
}

main().finally(() => prisma.$disconnect());
