import type { ReactNode } from "react";

/** The masthead every admin page opens with — title, one line of orientation. */
export default function AdminPageHeader({
  eyebrow,
  title,
  support,
  aside,
}: {
  eyebrow?: string;
  title: string;
  support?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="adm-head">
      <div className="adm-head__copy">
        {eyebrow ? <span className="ds-micro adm-head__eyebrow">{eyebrow}</span> : null}
        <h1 className="ds-display-md adm-head__title">{title}</h1>
        {support ? <p className="ds-body adm-head__support">{support}</p> : null}
      </div>
      {aside ? <div className="adm-head__aside">{aside}</div> : null}
    </header>
  );
}
