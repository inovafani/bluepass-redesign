import ReviewActions from "@/components/admin/ReviewActions";
import type { ReviewItem } from "@/lib/services/admin/review-queue";

const dateFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * One decision, with everything needed to make it on the card — contact
 * details, what is being claimed, the proof link, and whatever the applicant
 * wrote. An admin should never have to open Prisma Studio to decide.
 */
export default function ReviewCard({ item }: { item: ReviewItem }) {
  const waiting = daysWaiting(item.submittedAt);

  return (
    <article className="adm-card adm-review">
      <header className="adm-review__head">
        <div className="adm-review__ident">
          <h3 className="ds-headline adm-review__title">{item.title}</h3>
          <p className="ds-body-sm adm-review__subtitle">{item.subtitle}</p>
        </div>
        <div className="adm-review__when">
          <span className="ds-caption adm-review__date">{dateFormat.format(item.submittedAt)}</span>
          <span className={`ds-micro adm-pill ${waiting >= 7 ? "adm-pill--warn" : ""}`}>
            {waiting === 0 ? "Today" : waiting === 1 ? "1 day waiting" : `${waiting} days waiting`}
          </span>
        </div>
      </header>

      {item.facts.length ? (
        <dl className="adm-facts">
          {item.facts.map((fact) => (
            <div className="adm-facts__row" key={`${fact.label}-${fact.value}`}>
              <dt className="ds-micro adm-facts__label">{fact.label}</dt>
              <dd className="ds-body-sm adm-facts__value">
                {fact.href ? (
                  <a
                    href={fact.href}
                    target={fact.href.startsWith("http") ? "_blank" : undefined}
                    rel={fact.href.startsWith("http") ? "noreferrer noopener" : undefined}
                  >
                    {fact.value}
                  </a>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {item.notes ? (
        <div className="adm-review__notes">
          <span className="ds-micro adm-facts__label">Notes</span>
          <p className="ds-body-sm adm-review__notes-body">{item.notes}</p>
        </div>
      ) : null}

      <ReviewActions kind={item.kind} id={item.id} subject={item.title} />
    </article>
  );
}

function daysWaiting(submittedAt: Date) {
  return Math.max(0, Math.floor((Date.now() - submittedAt.getTime()) / 86_400_000));
}
