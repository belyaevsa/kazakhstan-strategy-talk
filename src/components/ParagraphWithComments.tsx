import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Link2, ExternalLink, Maximize2, FileText, Info, AlertTriangle, CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseInlineMarkdown } from "@/lib/markdown";
import { SuggestionEditor } from "@/components/SuggestionEditor";
import { SuggestionsCarousel } from "@/components/SuggestionsCarousel";
import { authService } from "@/services/authService";
import reactionService from "@/services/reactionService";
import { t } from "@/lib/i18n";
import type { ReactionType, ParagraphReactions } from "@/lib/api/types";

const REACTIONS: { type: ReactionType; label: string }[] = [
  { type: "👍", label: "Agree" },
  { type: "👎", label: "Disagree" },
  { type: "💡", label: "Insightful" },
  { type: "🔥", label: "Important" },
];

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
  suggestionCount?: number;
  onSuggestionsChanged?: () => void;
  reactions?: ParagraphReactions;
  onReactionChanged?: () => void;
}

const ParagraphWithComments = ({ paragraph, isActive, onClick, chapters, suggestionCount = 0, onSuggestionsChanged, reactions, onReactionChanged }: ParagraphWithCommentsProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [tableZoomOpen, setTableZoomOpen] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [suggestionEditorOpen, setSuggestionEditorOpen] = useState(false);
  const [suggestionsCarouselOpen, setSuggestionsCarouselOpen] = useState(false);
  const paragraphRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = authService.isAuthenticated();

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
      toast.success(t("message.paragraphLinkCopied"));
    } catch (err) {
      toast.error(t("message.linkCopyFailed"));
    }
  };

  const getShareUrl = () =>
    `${window.location.origin}${window.location.pathname}#paragraph-${paragraph.id}`;

  const handleShare = (platform: "twitter" | "telegram" | "whatsapp") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(paragraph.content.substring(0, 200));
    if (platform === "twitter") {
      window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener");
    } else if (platform === "telegram") {
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener");
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${text}%20${url}`, "_blank", "noopener");
    }
  };

  const handleReaction = async (e: React.MouseEvent, reactionType: ReactionType) => {
    e.stopPropagation();
    if (reacting) return;
    setReacting(true);
    try {
      await reactionService.react(paragraph.id, { reactionType });
      onReactionChanged?.();
    } catch {
      toast.error("Failed to react");
    } finally {
      setReacting(false);
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
    }, 400);
  };

  // Parse inline Markdown (footnotes, links, bold, italic) into React nodes
  const parseMarkdownLinks = (text: string) =>
    parseInlineMarkdown(text, {
      footnotes: true,
      stopPropagation: true,
      linkClassName: "text-primary hover:underline break-words",
      boldClassName: "font-bold",
      italicClassName: "italic",
    });

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
                  loading="lazy"
                  decoding="async"
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
                    loading="lazy"
                    decoding="async"
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
            border: "border-l-4 border-blue-500",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            icon: Info,
            iconColor: "text-blue-600 dark:text-blue-400"
          },
          warning: {
            border: "border-l-4 border-amber-500",
            bg: "bg-amber-50 dark:bg-amber-950/30",
            icon: AlertTriangle,
            iconColor: "text-amber-600 dark:text-amber-400"
          },
          success: {
            border: "border-l-4 border-green-500",
            bg: "bg-green-50 dark:bg-green-950/30",
            icon: CheckCircle,
            iconColor: "text-green-600 dark:text-green-400"
          },
          error: {
            border: "border-l-4 border-red-500",
            bg: "bg-red-50 dark:bg-red-950/30",
            icon: AlertCircle,
            iconColor: "text-red-600 dark:text-red-400"
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

      {/* Left-side actions: copy link + social share */}
      {!isDivider && isHovered && (
        <div
          className="hidden sm:flex absolute -left-10 top-4 flex-col gap-0.5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title={t("chapter.copyLink")}
          >
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={handleShare("twitter")}
            className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Share on X / Twitter"
          >
            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </button>
          <button
            onClick={handleShare("telegram")}
            className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Share on Telegram"
          >
            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </button>
          <button
            onClick={handleShare("whatsapp")}
            className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Share on WhatsApp"
          >
            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </div>
      )}

      {/* Quick emoji reactions - single "Reactions" button that opens a popover */}
      {!isDivider && (isHovered || isActive) && (
        <div
          className="hidden sm:flex absolute right-1 sm:right-4 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ top: paragraph.commentCount > 0 ? "36px" : suggestionCount > 0 ? "36px" : "28px" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all",
                  reactions?.userReaction
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/50"
                )}
              >
                {reactions?.userReaction || "😀"}
                <span className="text-[10px] text-muted-foreground">
                  {Object.values(reactions?.reactions || {}).reduce((a, b) => a + b, 0) || null}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              className="w-auto p-1.5"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex gap-0.5">
                {REACTIONS.map((r) => {
                  const count = reactions?.reactions?.[r.type] || 0;
                  const isActiveReaction = reactions?.userReaction === r.type;
                  return (
                    <button
                      key={r.type}
                      onClick={(e) => handleReaction(e, r.type)}
                      disabled={reacting}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-all",
                        isActiveReaction
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                      title={r.label}
                    >
                      <span>{r.type}</span>
                      {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
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
        onSuccess={() => {
          // Refresh the page-level suggestions (updates this paragraph's count)
          onSuggestionsChanged?.();
        }}
      />

      {/* Suggestions Carousel Modal */}
      <SuggestionsCarousel
        open={suggestionsCarouselOpen}
        onOpenChange={(open) => {
          setSuggestionsCarouselOpen(open);
          if (!open) onSuggestionsChanged?.();
        }}
        paragraphId={paragraph.id}
        originalContent={paragraph.content}
      />
    </div>
  );
};

export default ParagraphWithComments;
