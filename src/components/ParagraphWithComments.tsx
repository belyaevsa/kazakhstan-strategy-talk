import { useState, useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const paragraphRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (paragraphRef.current) {
      const rect = paragraphRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      onClick(rect.top + scrollTop);
    } else {
      onClick(0);
    }
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
        isHovered && !isActive && "bg-muted/50"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderContent()}
      
      {/* Comment indicator */}
      {paragraph.commentCount > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium shadow-md">
          <MessageSquare className="h-3 w-3" />
          {paragraph.commentCount}
        </div>
      )}

      {/* Hover indicator */}
      {(isHovered || isActive) && paragraph.commentCount === 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-muted-foreground/20 text-foreground px-2 py-1 rounded-full text-xs">
          <MessageSquare className="h-3 w-3" />
          Comment
        </div>
      )}
    </div>
  );
};

export default ParagraphWithComments;
