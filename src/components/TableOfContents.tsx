import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { stripMarkdownLinks } from "@/lib/markdown";
import type { Paragraph } from "@/lib/api/types";

interface TableOfContentsProps {
  paragraphs?: Paragraph[];
  /** Called after a heading is clicked (e.g. to close a mobile sheet). */
  onNavigate?: () => void;
  className?: string;
}

const HEADER_TYPES = ["Header", "Header1", "Header2", "Header3"];

const headerLevel = (type: string) =>
  type === "Header" || type === "Header1" ? 1 : type === "Header2" ? 2 : 3;

const TableOfContents = ({ paragraphs, onNavigate, className }: TableOfContentsProps) => {
  const headers = (paragraphs || []).filter((p) => HEADER_TYPES.includes(p.type));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scroll-spy: highlight the heading currently in view.
  useEffect(() => {
    if (headers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id.replace("paragraph-", ""));
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headers.forEach((h) => {
      const el = document.getElementById(`paragraph-${h.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headers.map((h) => h.id).join(",")]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(`paragraph-${id}`)?.scrollIntoView({ behavior: "smooth" });
    onNavigate?.();
  };

  return (
    <nav className={cn("space-y-2", className)} aria-label={t("document.tableOfContents")}>
      {headers.length > 0 ? (
        headers.map((paragraph) => {
          const level = headerLevel(paragraph.type);
          const indentation = level === 1 ? "pl-2" : level === 2 ? "pl-6" : "pl-10";
          const fontSize = level === 1 ? "text-sm font-medium" : level === 2 ? "text-sm" : "text-xs";
          const isActive = activeId === paragraph.id;

          return (
            <a
              key={paragraph.id}
              href={`#paragraph-${paragraph.id}`}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "block transition-colors border-l-2",
                indentation,
                fontSize,
                isActive
                  ? "text-primary border-primary font-medium"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:border-primary"
              )}
              onClick={(e) => handleClick(e, paragraph.id)}
            >
              {stripMarkdownLinks(paragraph.content)}
            </a>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground italic">{t("message.noHeadersFound")}</p>
      )}
    </nav>
  );
};

export default TableOfContents;
