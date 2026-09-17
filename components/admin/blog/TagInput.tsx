"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * Tags as chips.
 *
 * Commits on Enter, comma or blur — the three things people actually do — because a tag left
 * sitting in the input when Publish is pressed is a tag silently lost. Duplicates are folded
 * case-insensitively so "Komodo" and "komodo" never both end up on the related-articles signal.
 */
export default function TagInput({
  tags,
  onChange,
  max = 12,
  placeholder = "Type a tag and press Enter",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const value = raw.trim().replace(/,+$/, "").trim();
    setDraft("");
    if (!value) return;
    if (tags.length >= max) return;
    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) return;
    onChange([...tags, value]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    // Backspace on an empty input removes the last chip — the standard gesture for this control.
    if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="bpe-tags">
      <div className="bpe-tags__well">
        {tags.map((tag) => (
          <span key={tag} className="ds-micro bpe-tag">
            {tag}
            <button
              type="button"
              className="bpe-tag__remove"
              onClick={() => onChange(tags.filter((entry) => entry !== tag))}
              aria-label={`Remove ${tag}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </span>
        ))}
        <input
          className="bpe-tags__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          placeholder={tags.length >= max ? `Maximum ${max} tags` : placeholder}
          disabled={tags.length >= max}
        />
      </div>
    </div>
  );
}
