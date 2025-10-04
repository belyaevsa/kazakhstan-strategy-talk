import { useState, useRef, useEffect } from "react";
import { MessageSquare, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ParagraphWithCommentsProps {
  paragraph: {
    id: string;
    content: string;
    commentCount: number;
    type: string;
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

  const renderContent = () => {
    switch (paragraph.type) {
      case 'Header':
        return <h2 className="text-2xl font-bold text-foreground mb-2">{paragraph.content}</h2>;
      case 'Code':
        return (
          <pre className="bg-muted p-4 rounded-md overflow-x-auto">
            <code className="text-sm font-mono">{paragraph.content}</code>
          </pre>
        );
      case 'Quote':
        return (
          <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
            {paragraph.content}
          </blockquote>
        );
      case 'Image':
        return (
          <div className="my-4">
            <img src={paragraph.content} alt="" className="max-w-full h-auto rounded-lg" />
          </div>
        );
      default:
        return <p className="document-content text-foreground leading-relaxed">{paragraph.content}</p>;
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
