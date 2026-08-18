"use client";

import { useState, type ReactNode } from "react";

export type AdminTab = {
  id: string;
  label: string;
  count: number;
  content: ReactNode;
};

/**
 * The queue's section switch.
 *
 * `content` arrives already rendered on the server, so switching tabs costs
 * nothing and neither list is refetched — the client component only decides
 * which of the two server-rendered trees is on screen.
 */
export default function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div className="adm-tabs">
      <div className="adm-tabs__bar" role="tablist" aria-label="Queue sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`adm-tab-${tab.id}`}
            aria-selected={tab.id === active?.id}
            aria-controls={`adm-panel-${tab.id}`}
            className={`adm-tabs__tab ds-body-sm ${tab.id === active?.id ? "is-active" : ""}`}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
            <span className="ds-micro adm-tabs__count">{tab.count}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`adm-panel-${active?.id}`}
        aria-labelledby={`adm-tab-${active?.id}`}
        className="adm-tabs__panel"
      >
        {active?.content}
      </div>
    </div>
  );
}
