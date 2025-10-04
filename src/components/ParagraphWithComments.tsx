import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Link2, ExternalLink, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authService } from "@/services/authService";

interface ParagraphWithCommentsProps {
  paragraph: {
    id: string;
    content: string;
    commentCount: number;
    type: string;
    caption?: string;
  };
  isActive: boolean;
  onClick: (position: number) => void;
}

const ParagraphWithComments = ({ paragraph, isActive, onClick }: ParagraphWithCommentsProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const paragraphRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if this paragraph is in the URL hash on mount and when hash changes
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === `#paragraph-${paragraph.id}`) {
        setIsHighlighted(true);
        // Scroll to paragraph
        paragraphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after 3 seconds
        setTimeout(() => setIsHighlighted(false), 3000);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [paragraph.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (paragraphRef.current) {
      const rect = paragraphRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      onClick(rect.top + scrollTop);
    } else {
      onClick(0);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#paragraph-${paragraph.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Paragraph link copied!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 2000);
  };

  // Parse Markdown-style links [text](url)
  const parseMarkdownLinks = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the link
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {match[1]}
        </a>
      );

      lastIndex = linkRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderContent = () => {
    switch (paragraph.type) {
      case 'Header':
        return <h2 className="text-2xl font-bold text-foreground mb-2">{parseMarkdownLinks(paragraph.content)}</h2>;
      case 'Code':
        return (
          <pre className="bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
            <code className="text-sm font-mono">{paragraph.content}</code>
          </pre>
        );
      case 'Quote':
        return (
          <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
            {parseMarkdownLinks(paragraph.content)}
          </blockquote>
        );
      case 'Image':
        return (
          <div className="my-6 space-y-3">
            <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
              <a
                href={paragraph.content}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={paragraph.content}
                  alt={paragraph.caption || "Image"}
                  className="w-full h-auto max-h-[600px] object-contain hover:opacity-90 transition-opacity cursor-pointer"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E";
                  }}
                />
              </a>
            </div>
            {paragraph.caption && (
              <p className="text-sm text-center text-muted-foreground italic px-4">
                {paragraph.caption}
              </p>
            )}
            <div className="flex justify-center">
              <a
                href={paragraph.content}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Open in new tab
              </a>
            </div>
          </div>
        );
      case 'List':
        const items = paragraph.content.split('\n').filter(line => line.trim());
        return (
          <ul className="list-disc list-inside space-y-1 text-foreground">
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed">{parseMarkdownLinks(item)}</li>
            ))}
          </ul>
        );
      default:
        return <p className="document-content text-foreground leading-relaxed">{parseMarkdownLinks(paragraph.content)}</p>;
    }
  };

  return (
    <div
      id={`paragraph-${paragraph.id}`}
      ref={paragraphRef}
      className={cn(
        "relative group py-4 px-6 pr-20 rounded-lg transition-all cursor-pointer",
        isActive && "bg-accent/50 shadow-sm",
        isHovered && !isActive && "bg-muted/50",
        isHighlighted && "bg-primary/20 shadow-lg ring-2 ring-primary/50"
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderContent()}

      {/* Share link button - shows on hover, positioned outside left at top */}
      {isHovered && (
        <button
          onClick={handleCopyLink}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute -left-10 top-4 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy paragraph link"
        >
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Comment indicator */}
      {paragraph.commentCount > 0 && (
        <div className="absolute right-4 top-4 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium shadow-md">
          <MessageSquare className="h-3 w-3" />
          {paragraph.commentCount}
        </div>
      )}

      {/* Hover indicator */}
      {(isHovered || isActive) && paragraph.commentCount === 0 && (
        <div className="absolute right-4 top-4 flex items-center gap-1 bg-muted-foreground/20 text-foreground px-2 py-1 rounded-full text-xs">
          <MessageSquare className="h-3 w-3" />
          Comment
        </div>
      )}
    </div>
  );
};

export default ParagraphWithComments;
