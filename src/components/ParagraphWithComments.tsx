import { useState, useRef, useEffect } from "react";
import { MessageSquare, Link2, ExternalLink, Maximize2, FileText, Info, AlertTriangle, CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Footnote } from "@/components/Footnote";
import { SuggestionEditor } from "@/components/SuggestionEditor";
import { SuggestionsCarousel } from "@/components/SuggestionsCarousel";
import { suggestionService } from "@/services/suggestionService";
import { authService } from "@/services/authService";
import { t } from "@/lib/i18n";

interface ParagraphWithCommentsProps {
  paragraph: {
    id: string;
    content: string;
    commentCount: number;
    type: string;
    caption?: string;
    linkedPageId?: string;
  };
  isActive: boolean;
  onClick: () => void;
  chapters?: any[];
}

const ParagraphWithComments = ({ paragraph, isActive, onClick, chapters }: ParagraphWithCommentsProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [tableZoomOpen, setTableZoomOpen] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [suggestionEditorOpen, setSuggestionEditorOpen] = useState(false);
  const [suggestionsCarouselOpen, setSuggestionsCarouselOpen] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const paragraphRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = authService.isAuthenticated();

  // Load suggestion count
  useEffect(() => {
    const loadSuggestionCount = async () => {
      try {
        const suggestions = await suggestionService.getSuggestionsByParagraph(paragraph.id);
        setSuggestionCount(suggestions.length);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };
    loadSuggestionCount();
  }, [paragraph.id]);

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
    onClick();
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

  // Parse Markdown-style links [text](url), footnotes [[term|definition]], bold **text**, and italic *text*
  const parseMarkdownLinks = (text: string) => {
    const parts: (string | JSX.Element)[] = [];

    // Combined regex for links, footnotes, bold, and italic
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const footnoteRegex = /\[\[([^\|]+)\|([^\]]+?)(?:\|([^\]]+?))?(?:\|([^\]]+?))?\]\]/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;

    // Combine all matches
    const allMatches: Array<{ index: number; length: number; element: JSX.Element }> = [];
    let match: RegExpExecArray | null;

    // Find all footnotes
    while ((match = footnoteRegex.exec(text)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      const url = match[3]?.trim();
      const label = match[4]?.trim();

      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: (
          <Footnote
            key={match.index}
            term={term}
            definition={definition}
            link={url ? { url, label } : undefined}
          />
        )
      });
    }

    // Find all regular links
    while ((match = linkRegex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: (
          <a
            key={match.index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-words"
            onClick={(e) => e.stopPropagation()}
          >
            {match[1]}
          </a>
        )
      });
    }

    // Find all bold text
    while ((match = boldRegex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: (
          <strong key={match.index} className="font-bold">
            {match[1]}
          </strong>
        )
      });
    }

    // Find all italic text (but skip if it's part of bold)
    while ((match = italicRegex.exec(text)) !== null) {
      // Check if this is part of a bold marker (**)
      const isBoldMarker = text[match.index - 1] === '*' || text[match.index + match[0].length] === '*';
      if (!isBoldMarker) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          element: (
            <em key={match.index} className="italic">
              {match[1]}
            </em>
          )
        });
      }
    }

    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);

    // Build the parts array
    let lastIndex = 0;
    for (const match of allMatches) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the element
      parts.push(match.element);
      lastIndex = match.index + match.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderContent = () => {
    switch (paragraph.type) {
      case 'Header1':
      case 'Header':
        return <h1 className="text-3xl font-bold text-foreground mb-1">{parseMarkdownLinks(paragraph.content)}</h1>;
      case 'Header2':
        return <h2 className="text-2xl font-bold text-foreground mb-1">{parseMarkdownLinks(paragraph.content)}</h2>;
      case 'Header3':
        return <h3 className="text-base font-bold text-foreground mb-0">{parseMarkdownLinks(paragraph.content)}</h3>;
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
          <>
            <div className="my-2 space-y-2">
              <div
                className="rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageZoomOpen(true);
                }}
              >
                <img
                  src={paragraph.content}
                  alt={paragraph.caption || "Image"}
                  className="w-full h-auto max-h-[600px] object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E";
                  }}
                />
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
                  {t("document.openInNewTab")}
                </a>
              </div>
            </div>

            {/* Image Zoom Dialog */}
            <Dialog open={imageZoomOpen} onOpenChange={setImageZoomOpen}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
                <div className="flex items-center justify-center w-full h-full">
                  <img
                    src={paragraph.content}
                    alt={paragraph.caption || "Image"}
                    className="max-w-full max-h-[90vh] object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </>
        );
      case 'List':
        // Split by newlines and filter empty lines
        const items = paragraph.content.split('\n').filter(line => line.trim());
        return (
          <ul className="list-disc pl-6 space-y-1 text-foreground document-content -mt-2">
            {items.map((item, i) => {
              // Remove bullet if present (content has •, but we use CSS bullets in view mode)
              const cleanItem = item.trim().replace(/^•\s*/, '');
              return (
                <li key={i} className="leading-relaxed">{parseMarkdownLinks(cleanItem)}</li>
              );
            })}
          </ul>
        );
      case 'Table':
        return renderTable(paragraph.content);
      case 'Link':
        const linkedPage = chapters?.flatMap(c => c.pages).find(p => p.id === paragraph.linkedPageId);
        if (!linkedPage) {
          return <p className="text-muted-foreground italic">Link not configured</p>;
        }
        const linkedChapter = chapters?.find(c => c.id === linkedPage.chapterId);
        const currentLang = window.location.pathname.split('/')[1] || 'ru';
        return (
          <div className="my-4 p-4 border rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors">
            <a
              href={linkedChapter ? `/${currentLang}/${linkedChapter.slug}/${linkedPage.slug}` : `/${currentLang}/${linkedPage.slug}`}
              className="block"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="flex items-center gap-2 text-primary hover:underline">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{linkedPage.title}</span>
              </div>
              {paragraph.caption && (
                <p className="text-sm text-muted-foreground mt-2">{paragraph.caption}</p>
              )}
            </a>
          </div>
        );
      case 'Divider':
        return <hr className="my-0 border-t-2 border-border" />;
      case 'Callout':
        const variant = paragraph.caption || "info";
        const variantStyles = {
          info: {
            border: "border-l-4 border-gray-600",
            bg: "bg-gray-50 dark:bg-gray-900/20",
            icon: Info,
            iconColor: "text-gray-600 dark:text-gray-400"
          },
          warning: {
            border: "border-l-4 border-dashed border-gray-500",
            bg: "bg-gray-50 dark:bg-gray-900/20",
            icon: AlertTriangle,
            iconColor: "text-gray-600 dark:text-gray-400"
          },
          success: {
            border: "border-l-4 border-gray-700",
            bg: "bg-gray-50 dark:bg-gray-900/20",
            icon: CheckCircle,
            iconColor: "text-gray-700 dark:text-gray-300"
          },
          error: {
            border: "border-l-[6px] border-gray-900 dark:border-gray-100",
            bg: "bg-gray-100 dark:bg-gray-900/40",
            icon: AlertCircle,
            iconColor: "text-gray-900 dark:text-gray-100"
          },
        };
        const style = variantStyles[variant as keyof typeof variantStyles] || variantStyles.info;
        const IconComponent = style.icon;

        return (
          <div className={`p-4 my-4 ${style.border} ${style.bg} rounded-r flex gap-3`}>
            <IconComponent className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
            <p className="text-foreground leading-relaxed flex-1">{parseMarkdownLinks(paragraph.content)}</p>
          </div>
        );
      default:
        return <p className="document-content text-foreground leading-relaxed">{parseMarkdownLinks(paragraph.content)}</p>;
    }
  };

  const renderTable = (markdown: string) => {
    // Parse Markdown table
    const lines = markdown.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return <p className="text-muted-foreground italic">Invalid table format</p>;

    // Parse header
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);

    // Skip separator line (line 1)
    const rows = lines.slice(2).map(line =>
      line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    );

    return (
      <div className="my-4">
        <div
          className="relative overflow-x-auto border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
          onClick={(e) => {
            e.stopPropagation();
            setTableZoomOpen(true);
          }}
        >
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted">
              <tr>
                {headers.map((header, i) => (
                  <th key={i} className="px-6 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b hover:bg-muted/50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-4">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="absolute top-2 right-2 bg-background/80 rounded p-1">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Zoom Dialog */}
        <Dialog open={tableZoomOpen} onOpenChange={setTableZoomOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted">
                  <tr>
                    {headers.map((header, i) => (
                      <th key={i} className="px-6 py-3">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-6 py-4">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const isDivider = paragraph.type === 'Divider';

  return (
    <div
      id={`paragraph-${paragraph.id}`}
      ref={paragraphRef}
      className={cn(
        "relative group transition-all cursor-pointer",
        isDivider ? "py-1 px-2 sm:px-6 pr-12 sm:pr-20" : paragraph.type === 'List' ? "py-1 sm:py-1 px-2 sm:px-6 pr-12 sm:pr-20 rounded-lg" : "py-1 sm:py-2 px-2 sm:px-6 pr-12 sm:pr-20 rounded-lg",
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
      {!isDivider && isHovered && (
        <button
          onClick={handleCopyLink}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="hidden sm:block absolute -left-10 top-4 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy paragraph link"
        >
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Comment indicator */}
      {!isDivider && paragraph.commentCount > 0 && (
        <div className="absolute right-1 sm:right-4 top-2 sm:top-4 flex items-center gap-1 bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium shadow-md">
          <MessageSquare className="h-3 w-3" />
          <span className="hidden sm:inline">{paragraph.commentCount}</span>
        </div>
      )}

      {/* Hover indicator */}
      {!isDivider && (isHovered || isActive) && paragraph.commentCount === 0 && suggestionCount === 0 && (
        <div className="absolute right-1 sm:right-4 top-2 sm:top-4 flex items-center gap-1 bg-muted-foreground/20 text-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs">
          <MessageSquare className="h-3 w-3" />
        </div>
      )}

      {/* Suggestion indicator - below comment indicator */}
      {!isDivider && suggestionCount > 0 && (
        <div
          className="absolute right-1 sm:right-4 top-12 sm:top-14 flex items-center gap-1 bg-yellow-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium shadow-md cursor-pointer hover:bg-yellow-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSuggestionsCarouselOpen(true);
          }}
        >
          <Lightbulb className="h-3 w-3" />
          <span className="hidden sm:inline">{suggestionCount}</span>
        </div>
      )}

      {/* Suggest edit button - shown on hover for authenticated users */}
      {!isDivider && isAuthenticated && isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSuggestionEditorOpen(true);
          }}
          className={cn(
            "hidden sm:flex absolute items-center gap-1 bg-background/80 hover:bg-background border border-border shadow-sm px-2 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity",
            suggestionCount > 0
              ? "right-1 sm:right-4 top-20 sm:top-22"
              : "right-1 sm:right-4 top-12 sm:top-14"
          )}
          title="Suggest an edit"
        >
          <Lightbulb className="h-3 w-3" />
          <span>{t("suggestions.suggestEdit")}</span>
        </button>
      )}

      {/* Suggestion Editor Modal */}
      <SuggestionEditor
        open={suggestionEditorOpen}
        onOpenChange={setSuggestionEditorOpen}
        paragraphId={paragraph.id}
        originalContent={paragraph.content}
        onSuccess={async () => {
          // Reload suggestion count
          const suggestions = await suggestionService.getSuggestionsByParagraph(paragraph.id);
          setSuggestionCount(suggestions.length);
        }}
      />

      {/* Suggestions Carousel Modal */}
      <SuggestionsCarousel
        open={suggestionsCarouselOpen}
        onOpenChange={setSuggestionsCarouselOpen}
        paragraphId={paragraph.id}
        originalContent={paragraph.content}
      />
    </div>
  );
};

export default ParagraphWithComments;
