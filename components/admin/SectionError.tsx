/**
 * What a section renders instead of rows when its data source failed.
 *
 * Deliberately loud and never collapsible. An empty table on this page would be read as "no money is
 * waiting"; this block exists so an unreachable Kai, a missing admin token or a 401 can never be
 * mistaken for good news.
 */
export default function SectionError({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="adm-card adm-fault" role="alert">
      <span className="adm-fault__glyph" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 8v5M12 16.5v.5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <div className="adm-fault__body">
        <p className="ds-body-sm adm-fault__title">This section could not be loaded, so it is not showing you the truth.</p>
        <p className="ds-caption adm-fault__detail">{message}</p>
        {hint ? <p className="ds-caption adm-fault__hint">{hint}</p> : null}
      </div>
    </div>
  );
}
