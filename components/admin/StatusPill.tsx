/**
 * The page's colour vocabulary, in one place.
 *
 * The payouts page is meant to be read in three seconds, which only works if a given tone always
 * means the same thing: red is broken, amber is waiting on someone, green is done, grey is inert.
 * Mapping every status through here rather than per-call-site is what keeps that promise — a
 * PENDING ledger row and a FAILURE cron must not both be able to render as "some colour".
 */
export type PillTone = "bad" | "warn" | "good" | "muted";

const LEDGER_TONES: Record<string, PillTone> = {
  PENDING: "warn",
  FINALIZED: "good",
  VOIDED: "muted",
};

const CRON_TONES: Record<string, PillTone> = {
  SUCCESS: "good",
  PARTIAL: "warn",
  FAILURE: "bad",
  NEVER_RUN: "bad",
};

const PAYOUT_TONES: Record<string, PillTone> = {
  TRANSFERRED: "good",
  RELEASED: "good",
  PAID: "good",
  PENDING: "warn",
  FAILED: "bad",
  FAILURE: "bad",
};

export function ledgerTone(status: string): PillTone {
  return LEDGER_TONES[status] ?? "muted";
}

export function cronTone(status: string): PillTone {
  return CRON_TONES[status] ?? "muted";
}

export function payoutTone(status: string): PillTone {
  return PAYOUT_TONES[status.toUpperCase()] ?? "muted";
}

export default function StatusPill({
  tone,
  children,
  title,
}: {
  tone: PillTone;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span className={`ds-micro adm-status adm-status--${tone}`} title={title}>
      {children}
    </span>
  );
}
