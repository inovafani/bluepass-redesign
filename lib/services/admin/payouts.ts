import {
  listKaiCoreBluePassLedger,
  listKaiCoreCronRuns,
  listKaiCorePmsBookingLedger,
  type KaiCoreBluePassLedgerEntry,
  type KaiCorePmsBookingLedgerEntry,
} from "@/lib/services/kai-core/client";
import { listCronRuns } from "@/lib/services/monitoring/cron-run-log";
import {
  listCommissionLedgerEntries,
  type CommissionLedgerEntryRow,
} from "@/lib/services/referrals/commission-ledger";

/**
 * Every section on the payouts page loads independently and reports its own failure.
 *
 * This matters more here than anywhere else in the console. The page exists because nobody can
 * currently see whether operator payouts are moving; a section that swallowed an error and rendered
 * an empty table would read as "nothing is pending" — a confident, wrong answer to exactly the
 * question being asked. An unreachable Kai must look unreachable, not calm.
 */
export type SectionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/**
 * Exported because the operator dashboard shows the same ledger data scoped to one operator, and it
 * needs the same promise: a Kai that cannot be reached renders as unreachable rather than as "you
 * have no bookings". An operator reading that as their own booking history is the worse of the two
 * wrong answers.
 */
export async function section<T>(load: () => Promise<T>): Promise<SectionResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "This section could not be loaded.",
    };
  }
}

export const LEDGER_STATUSES = ["PENDING", "FINALIZED", "VOIDED"] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];
export type LedgerStatusFilter = LedgerStatus | "ALL";

export function isLedgerStatusFilter(value: unknown): value is LedgerStatusFilter {
  return value === "ALL" || LEDGER_STATUSES.includes(value as LedgerStatus);
}

/**
 * Both AU tenants are queried and labelled rather than one being picked as canonical. `bluepass-au`
 * is a second Kai tenant also named "Boattime Yacht Charters"; which of the two is authoritative is
 * an open question, and quietly showing only one would hide real money from whichever is the other.
 */
export const AUSTRALIA_TENANT_SLUGS = ["boattime", "bluepass-au"] as const;
export const INDONESIA_TENANT_SLUG = "bluepass";

/** The kind that actually represents money owed to an operator, and so the only overridable one. */
export const OPERATOR_PAYOUT_KIND = "OPERATOR_PAYOUT_PLACEHOLDER";

export type TenantSection<T> = { tenantSlug: string; result: SectionResult<T[]> };

export type CronHealthRow = {
  source: "kai" | "local";
  jobName: string;
  /** NEVER_RUN is synthesised for an expected job with no log rows at all. */
  status: "SUCCESS" | "PARTIAL" | "FAILURE" | "NEVER_RUN";
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  /** Consecutive failures ending at the latest run — one bad night reads differently from five. */
  consecutiveFailures: number;
};

/* Jobs we expect to exist. Listing them explicitly is what lets a job that has never logged a single
   run be rendered as NEVER_RUN instead of simply being absent from the page. */
const EXPECTED_KAI_JOBS = ["settle-pms-bookings"];
const EXPECTED_LOCAL_JOBS = ["rezdy-agent-sync", "bokun-sync"];

type RawRun = {
  jobName: string;
  status: string;
  startedAt: Date | string;
  finishedAt: Date | string;
  errorMessage: string | null;
};

/**
 * Collapses a run log to one row per job: the most recent run, plus how many failures immediately
 * precede it. Jobs never seen in the log but expected are appended as NEVER_RUN.
 */
function summariseRuns(runs: RawRun[], source: CronHealthRow["source"], expected: string[]): CronHealthRow[] {
  const byJob = new Map<string, RawRun[]>();

  for (const run of runs) {
    const list = byJob.get(run.jobName) ?? [];
    list.push(run);
    byJob.set(run.jobName, list);
  }

  const rows: CronHealthRow[] = [];

  for (const [jobName, jobRuns] of byJob) {
    const sorted = [...jobRuns].sort(
      (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
    );
    const latest = sorted[0];

    let consecutiveFailures = 0;
    for (const run of sorted) {
      if (run.status !== "FAILURE") break;
      consecutiveFailures += 1;
    }

    rows.push({
      source,
      jobName,
      status: (latest.status as CronHealthRow["status"]) ?? "FAILURE",
      startedAt: latest.startedAt ? new Date(latest.startedAt) : null,
      finishedAt: latest.finishedAt ? new Date(latest.finishedAt) : null,
      errorMessage: latest.errorMessage ?? null,
      consecutiveFailures,
    });
  }

  for (const jobName of expected) {
    if (!byJob.has(jobName)) {
      rows.push({
        source,
        jobName,
        status: "NEVER_RUN",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        consecutiveFailures: 0,
      });
    }
  }

  /* Worst first — this block is meant to be read in one glance, so anything broken sorts to the top
     regardless of which side of the system it runs on. */
  const severity = { FAILURE: 0, NEVER_RUN: 1, PARTIAL: 2, SUCCESS: 3 } as const;
  return rows.sort(
    (a, b) => severity[a.status] - severity[b.status] || a.jobName.localeCompare(b.jobName),
  );
}

export async function loadCronHealth() {
  const [kai, local] = await Promise.all([
    section(async () =>
      summariseRuns(await listKaiCoreCronRuns({ limit: 50 }), "kai", EXPECTED_KAI_JOBS),
    ),
    section(async () => summariseRuns(await listCronRuns({ limit: 50 }), "local", EXPECTED_LOCAL_JOBS)),
  ]);

  return { kai, local };
}

/**
 * Kai's ledger endpoints accept one status and default to FINALIZED when given none, so "all" has to
 * be three calls merged rather than an omitted parameter — omitting it would silently mean FINALIZED
 * and quietly hide every PENDING row, which is the opposite of what this filter promises.
 */
export async function listAcrossStatuses<T extends { createdAt: string }>(
  status: LedgerStatusFilter,
  load: (status: LedgerStatus) => Promise<T[]>,
): Promise<T[]> {
  if (status !== "ALL") {
    return load(status);
  }

  const batches = await Promise.all(LEDGER_STATUSES.map((value) => load(value)));
  return batches
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function loadAustraliaLedger(
  status: LedgerStatusFilter,
): Promise<TenantSection<KaiCorePmsBookingLedgerEntry>[]> {
  return Promise.all(
    AUSTRALIA_TENANT_SLUGS.map(async (tenantSlug) => ({
      tenantSlug,
      result: await section(() =>
        listAcrossStatuses(status, (value) =>
          listKaiCorePmsBookingLedger({ tenantSlug, status: value }),
        ),
      ),
    })),
  );
}

export async function loadIndonesiaLedger(
  status: LedgerStatusFilter,
): Promise<TenantSection<KaiCoreBluePassLedgerEntry>[]> {
  return [
    {
      tenantSlug: INDONESIA_TENANT_SLUG,
      result: await section(() =>
        listAcrossStatuses(status, (value) =>
          listKaiCoreBluePassLedger({ tenantSlug: INDONESIA_TENANT_SLUG, status: value }),
        ),
      ),
    },
  ];
}

export async function loadCommissionLedger(): Promise<SectionResult<CommissionLedgerEntryRow[]>> {
  return section(() => listCommissionLedgerEntries({ take: 100 }));
}

export type LedgerFact = { label: string; value: string };

/**
 * The two Kai ledgers flattened to one shape, the same way review-queue.ts flattens claims and
 * applications. The table then renders rows without knowing which country it is looking at.
 *
 * `action` is resolved here rather than in the component so that "can an admin override this line?"
 * is a decision with a test around it. Only an unpaid operator-payout line qualifies: the other
 * kinds (platform commission, conservation, creator share) are internal splits with nothing to
 * release, and releasing an already-FINALIZED line would double-pay a real operator.
 *
 * A zero amount is excluded too. Most PENDING lines in the Indonesia ledger currently carry
 * amountCents 0 (no budget was parsed off the inquiry), and a zero-value Stripe transfer is rejected
 * by Stripe — offering the button there can only ever produce a confusing failure against what looks
 * like a real payout.
 */
export type LedgerRowView = {
  id: string;
  tenantSlug: string;
  kind: string;
  amountCents: number;
  currency: string;
  status: LedgerStatus;
  createdAt: string;
  title: string;
  facts: LedgerFact[];
  payoutStatus: string | null;
  payoutDetail: string | null;
  action:
    | { type: "au-settle"; attemptId: string }
    | { type: "id-release"; entryId: string }
    | null;
};

/** The shared gate both countries' normalisers apply before offering a money-moving button. */
function isReleasable(status: LedgerStatus, kind: string, amountCents: number) {
  return status === "PENDING" && kind === OPERATOR_PAYOUT_KIND && amountCents > 0;
}

function fact(label: string, value: string | number | null | undefined): LedgerFact[] {
  if (value === null || value === undefined) return [];
  const text = String(value).trim();
  return text ? [{ label, value: text }] : [];
}

export function toAustraliaLedgerRow(
  entry: KaiCorePmsBookingLedgerEntry,
  tenantSlug: string,
): LedgerRowView {
  const settled = Boolean(entry.attempt?.settledAt);

  return {
    id: entry.id,
    tenantSlug,
    kind: entry.kind,
    amountCents: entry.amountCents,
    currency: entry.currency,
    status: entry.status,
    createdAt: entry.createdAt,
    title: entry.attempt?.productTitle ?? "Booking",
    facts: [
      ...fact("Traveller", entry.attempt?.travellerName),
      ...fact("Date", entry.attempt?.dateText),
      ...fact("Guests", entry.attempt?.guests),
      ...fact("Booking ref", entry.attempt?.externalBookingId),
      ...fact(
        "Gross",
        entry.attempt ? formatMoneyFromCents(entry.attempt.grossAmountCents, entry.currency) : null,
      ),
      ...fact("Settled", entry.attempt?.settledAt ? formatDateTime(entry.attempt.settledAt) : "not yet"),
      ...fact("Paid out ref", entry.paidOutReference),
    ],
    payoutStatus: entry.payout?.status ?? null,
    payoutDetail:
      entry.payout?.failureReason ??
      entry.payout?.stripeTransferId ??
      (entry.payout?.releasedAt ? `released ${formatDateTime(entry.payout.releasedAt)}` : null),
    action: isReleasable(entry.status, entry.kind, entry.amountCents) && !settled
      ? { type: "au-settle", attemptId: entry.pmsBookingPaymentAttemptId }
      : null,
  };
}

export function toIndonesiaLedgerRow(
  entry: KaiCoreBluePassLedgerEntry,
  tenantSlug: string,
): LedgerRowView {
  return {
    id: entry.id,
    tenantSlug,
    kind: entry.kind,
    amountCents: entry.amountCents,
    currency: entry.currency,
    status: entry.status,
    createdAt: entry.createdAt,
    title: entry.inquiry?.selectedYachtName ?? "Inquiry",
    facts: [
      ...fact("Operator", entry.inquiry?.operatorName),
      ...fact("Operator phone", entry.inquiry?.operatorPhone),
      ...fact("Destination", entry.inquiry?.destination),
      ...fact("Inquiry status", entry.inquiry?.status),
      ...fact("Paid out", entry.paidOutAt ? formatDateTime(entry.paidOutAt) : "not yet"),
      ...fact("Paid out ref", entry.paidOutReference),
      ...fact("Paid out by", entry.paidOutBy),
    ],
    payoutStatus: null,
    payoutDetail: null,
    action: isReleasable(entry.status, entry.kind, entry.amountCents)
      ? { type: "id-release", entryId: entry.id }
      : null,
  };
}

/**
 * OPERATOR_PAYOUT_PLACEHOLDER reads as a database constant; "Operator payout" reads as money.
 *
 * Shared by the admin ledger and the operator's own view of the same rows — the two must not drift
 * into describing one line by two different names.
 */
export function humaniseLedgerKind(kind: string) {
  return kind
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\bplaceholder\b/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function formatDateTime(value: Date | string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date)
    : "unknown";
}

/** Cents to a readable amount. Raw integers on a payouts page are how a 100x error goes unnoticed. */
export function formatMoneyFromCents(amountCents: number, currency: string) {
  const code = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
    }).format(amountCents / 100);
  } catch {
    /* An unrecognised currency code must not take the page down — show the number and the code. */
    return `${code} ${(amountCents / 100).toFixed(2)}`;
  }
}

export function formatRelativeTime(value: Date | string | null) {
  if (!value) {
    return "never";
  }

  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) {
    return "unknown";
  }

  const minutes = Math.round((Date.now() - then) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
