import type { ReactNode } from "react";
import { Footnote } from "@/components/Footnote";

/** Strip Markdown links `[text](url)` down to their text. Used for the TOC and nav. */
export function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

export interface ParseInlineOptions {
  /** Render `[text](url)` as anchors (default true). */
  links?: boolean;
  /** Render `[[term|def|url|label]]` footnotes (default false). */
  footnotes?: boolean;
  linkClassName?: string;
  boldClassName?: string;
  italicClassName?: string;
  /** Stop click propagation on links (used inside clickable paragraphs). */
  stopPropagation?: boolean;
}

interface Match {
  index: number;
  length: number;
  element: ReactNode;
}

/**
 * Parse inline Markdown (footnotes, links, bold, italic) into a React node array.
 * Shared by paragraph rendering, the suggestion diff view, and page descriptions;
 * each call site tunes which features and classes apply via options.
 */
export function parseInlineMarkdown(
  text: string,
  options: ParseInlineOptions = {}
): ReactNode {
  const {
    links = true,
    footnotes = false,
    linkClassName = "text-primary hover:underline",
    boldClassName,
    italicClassName,
    stopPropagation = false,
  } = options;

  const matches: Match[] = [];

  if (footnotes) {
    const footnoteRegex = /\[\[([^\|]+)\|([^\]]+?)(?:\|([^\]]+?))?(?:\|([^\]]+?))?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = footnoteRegex.exec(text)) !== null) {
      const url = m[3]?.trim();
      matches.push({
        index: m.index,
        length: m[0].length,
        element: (
          <Footnote
            key={`fn-${m.index}`}
            term={m[1].trim()}
            definition={m[2].trim()}
            link={url ? { url, label: m[4]?.trim() } : undefined}
          />
        ),
      });
    }
  }

  if (links) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(text)) !== null) {
      const href = m[2];
      const label = m[1];
      const index = m.index;
      matches.push({
        index,
        length: m[0].length,
        element: (
          <a
            key={`lnk-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
          >
            {label}
          </a>
        ),
      });
    }
  }

  const boldRegex = /\*\*([^*]+)\*\*/g;
  let bm: RegExpExecArray | null;
  while ((bm = boldRegex.exec(text)) !== null) {
    matches.push({
      index: bm.index,
      length: bm[0].length,
      element: (
        <strong key={`b-${bm.index}`} className={boldClassName}>
          {bm[1]}
        </strong>
      ),
    });
  }

  const italicRegex = /\*([^*]+)\*/g;
  let im: RegExpExecArray | null;
  while ((im = italicRegex.exec(text)) !== null) {
    // Skip markers that are part of a bold `**` sequence
    const isBoldMarker = text[im.index - 1] === "*" || text[im.index + im[0].length] === "*";
    if (!isBoldMarker) {
      matches.push({
        index: im.index,
        length: im[0].length,
        element: (
          <em key={`i-${im.index}`} className={italicClassName}>
            {im[1]}
          </em>
        ),
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of matches) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(match.element);
    lastIndex = match.index + match.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
