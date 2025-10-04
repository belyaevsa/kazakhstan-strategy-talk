import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ExternalLink } from "lucide-react";

interface FootnoteProps {
  term: string;
  definition: string;
  link?: {
    url: string;
    label?: string;
  };
}

/**
 * Footnote component for inline term explanations
 *
 * @example
 * <p>
 *   We recommend using{" "}
 *   <Footnote
 *     term="kubernetes"
 *     definition="Container orchestration platform for automating deployment, scaling, and management."
 *     link={{ url: "https://kubernetes.io", label: "Official docs" }}
 *   />
 *   {" "}for deployment.
 * </p>
 */
export function Footnote({ term, definition, link }: FootnoteProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="underline decoration-dotted decoration-blue-500/60 cursor-help font-medium text-blue-700 dark:text-blue-400 hover:decoration-blue-500">
          {term}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="space-y-2">
          <p className="text-sm text-foreground leading-relaxed">
            {definition}
          </p>
          {link && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {link.label || "Learn more"}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
