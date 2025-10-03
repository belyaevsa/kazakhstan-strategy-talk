import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParagraphWithCommentsProps {
  paragraph: {
    id: string;
    content: string;
    comment_count: number;
  };
  isActive: boolean;
  onClick: () => void;
}

const ParagraphWithComments = ({ paragraph, isActive, onClick }: ParagraphWithCommentsProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative group py-4 px-6 pr-20 rounded-lg transition-all cursor-pointer",
        isActive && "bg-accent/50 shadow-sm",
        isHovered && !isActive && "bg-muted/50"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="document-content text-foreground leading-relaxed">
        {paragraph.content}
      </p>
      
      {/* Comment indicator */}
      {paragraph.comment_count > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium shadow-md">
          <MessageSquare className="h-3 w-3" />
          {paragraph.comment_count}
        </div>
      )}

      {/* Hover indicator */}
      {(isHovered || isActive) && paragraph.comment_count === 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-muted-foreground/20 text-foreground px-2 py-1 rounded-full text-xs">
          <MessageSquare className="h-3 w-3" />
          Comment
        </div>
      )}
    </div>
  );
};

export default ParagraphWithComments;
