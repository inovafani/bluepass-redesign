"use client";

import { useMemo, useRef, useState } from "react";
import { renderArticle } from "@/lib/services/blog/markdown";

/**
 * The body editor.
 *
 * Markdown with a toolbar rather than a WYSIWYG surface, and that is a deliberate trade. A
 * contentEditable rich-text field would feel friendlier for ten minutes and then start producing
 * the thing that actually hurts an SEO blog: nested spans, pasted Word styling, and headings that
 * look like headings without being H2s. Markdown cannot express any of that — what you type is
 * what the crawler reads.
 *
 * The preview runs the same `renderArticle` the public page runs, so "looks right here" and "looks
 * right on /blog" cannot drift apart.
 */

type ToolbarAction =
  | { kind: "wrap"; before: string; after: string }
  | { kind: "line"; prefix: string }
  | { kind: "insert"; text: string };

const TOOLS: { id: string; label: string; title: string; action: ToolbarAction; wide?: boolean }[] = [
  { id: "h2", label: "H2", title: "Section heading — the outline Google reads", action: { kind: "line", prefix: "## " } },
  { id: "h3", label: "H3", title: "Sub-heading", action: { kind: "line", prefix: "### " } },
  { id: "bold", label: "B", title: "Bold", action: { kind: "wrap", before: "**", after: "**" } },
  { id: "italic", label: "I", title: "Italic", action: { kind: "wrap", before: "_", after: "_" } },
  { id: "link", label: "Link", title: "Link — internal links are what turn readers into bookings", action: { kind: "wrap", before: "[", after: "](https://)" } },
  { id: "ul", label: "List", title: "Bulleted list", action: { kind: "line", prefix: "- " } },
  { id: "ol", label: "1.", title: "Numbered list", action: { kind: "line", prefix: "1. " } },
  { id: "quote", label: "Quote", title: "Quote", action: { kind: "line", prefix: "> " } },
  { id: "code", label: "Code", title: "Inline code", action: { kind: "wrap", before: "`", after: "`" } },
  { id: "image", label: "Image", title: "Image", action: { kind: "insert", text: "![Describe the image](https://)" } },
  { id: "rule", label: "—", title: "Divider", action: { kind: "insert", text: "\n---\n" } },
];

export default function MarkdownField({
  value,
  onChange,
  minutes,
  words,
}: {
  value: string;
  onChange: (value: string) => void;
  minutes: number;
  words: number;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");

  // Only parsed when the preview is actually open — this runs on a keystroke-driven value.
  const preview = useMemo(() => (mode === "preview" ? renderArticle(value) : null), [mode, value]);

  const apply = (action: ToolbarAction) => {
    const area = areaRef.current;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end);
    let next = value;
    let caret = end;

    if (action.kind === "wrap") {
      next = `${value.slice(0, start)}${action.before}${selected}${action.after}${value.slice(end)}`;
      // With nothing selected, land the caret between the markers so typing continues inside them.
      caret = selected ? end + action.before.length + action.after.length : start + action.before.length;
    } else if (action.kind === "line") {
      // Prefix every line the selection touches, starting from the true beginning of the first one
      // — otherwise clicking H2 mid-sentence buries the hashes inside the text.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const prefixed = block
        .split("\n")
        .map((line) => (line.startsWith(action.prefix) ? line : `${action.prefix}${line}`))
        .join("\n");
      next = `${value.slice(0, lineStart)}${prefixed}${value.slice(end)}`;
      caret = lineStart + prefixed.length;
    } else {
      next = `${value.slice(0, start)}${action.text}${value.slice(end)}`;
      caret = start + action.text.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="bpe-body">
      <div className="bpe-body__bar">
        <div className="bpe-body__tools" role="toolbar" aria-label="Formatting">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`ds-micro bpe-tool bpe-tool--${tool.id}`}
              title={tool.title}
              onClick={() => apply(tool.action)}
              disabled={mode === "preview"}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <div className="bpe-seg" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "write"}
            className={`ds-micro bpe-seg__btn${mode === "write" ? " is-active" : ""}`}
            onClick={() => setMode("write")}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={`ds-micro bpe-seg__btn${mode === "preview" ? " is-active" : ""}`}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === "write" ? (
        <textarea
          ref={areaRef}
          className="bpe-body__area"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck
          placeholder={
            "Open with the answer, then earn the rest.\n\nUse ## for each section — those headings are the outline Google reads, and the skim path a reader takes.\n\nLink to the Bluepass pages that convert: [our Komodo trips](/explore)."
          }
        />
      ) : (
        <div
          className="bp-article bpe-body__preview"
          // Safe by construction: renderArticle escapes everything and emits only the tags it
          // writes itself. See lib/services/blog/markdown.ts.
          dangerouslySetInnerHTML={{ __html: preview?.html ?? "" }}
        />
      )}

      <div className="bpe-body__foot">
        <span className="ds-micro">{words.toLocaleString()} words</span>
        <span className="bpe-body__dot" aria-hidden />
        <span className="ds-micro">{minutes} min read</span>
        <span className="bpe-body__dot" aria-hidden />
        <span className="ds-micro">Markdown — ## heading, **bold**, [text](/link)</span>
      </div>
    </div>
  );
}
