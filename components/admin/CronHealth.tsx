import SectionError from "@/components/admin/SectionError";
import StatusPill, { cronTone } from "@/components/admin/StatusPill";
import { formatRelativeTime, type CronHealthRow, type SectionResult } from "@/lib/services/admin/payouts";

const SOURCE_LABEL = {
  kai: "Kai",
  local: "This app",
} as const;

const STATUS_LABEL: Record<CronHealthRow["status"], string> = {
  SUCCESS: "Success",
  PARTIAL: "Partial",
  FAILURE: "Failed",
  NEVER_RUN: "Never run",
};

/**
 * The "is anything broken right now" block, first on the page.
 *
 * `settle-pms-bookings` is the job that actually moves operator money; the rest are catalog syncs.
 * Both are shown because a stale catalog is a real problem too, but a failing settlement job is the
 * one that costs an operator their payout, so nothing here is allowed to be subtle.
 */
export default function CronHealth({
  kai,
  local,
}: {
  kai: SectionResult<CronHealthRow[]>;
  local: SectionResult<CronHealthRow[]>;
}) {
  const rows = [
    ...(kai.ok ? kai.data : []),
    ...(local.ok ? local.data : []),
  ];
  const broken = rows.filter((row) => row.status === "FAILURE" || row.status === "NEVER_RUN");

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Cron health</h2>
        <p className="ds-caption adm-block__note">
          {broken.length === 0 && rows.length > 0
            ? "Every job reported success on its most recent run."
            : broken.length > 0
              ? `${broken.length} ${broken.length === 1 ? "job needs" : "jobs need"} attention.`
              : "No run history available."}
        </p>
      </header>

      {!kai.ok ? (
        <SectionError
          message={kai.message}
          hint="Kai's settle-pms-bookings job is the one that releases operator payouts. While this is failing, nothing on this page can tell you whether payouts are running."
        />
      ) : null}
      {!local.ok ? <SectionError message={local.message} /> : null}

      {rows.length > 0 ? (
        <div className="adm-cron">
          {rows.map((row) => (
            <article
              key={`${row.source}-${row.jobName}`}
              className={`adm-card adm-cron__row ${
                row.status === "FAILURE" || row.status === "NEVER_RUN" ? "is-bad" : ""
              }`}
            >
              <div className="adm-cron__ident">
                <span className="ds-body-sm adm-cron__job">{row.jobName}</span>
                <span className="ds-micro adm-cron__source">{SOURCE_LABEL[row.source]}</span>
              </div>

              <StatusPill tone={cronTone(row.status)}>{STATUS_LABEL[row.status]}</StatusPill>

              <span className="ds-caption adm-cron__when">
                {row.status === "NEVER_RUN" ? "no run has ever been logged" : formatRelativeTime(row.finishedAt)}
              </span>

              {row.consecutiveFailures > 1 ? (
                <span className="ds-micro adm-cron__streak">{row.consecutiveFailures} in a row</span>
              ) : null}

              {row.errorMessage ? (
                <p className="ds-caption adm-cron__error" title={row.errorMessage}>
                  {row.errorMessage}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
