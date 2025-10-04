import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Reply, Send, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import type { Comment } from "@/lib/api/types";

interface CommentItemProps {
  comment: Comment;
  depth: number;
  isAuthenticated: boolean;
  onVote: (commentId: string, voteType: "agree" | "disagree") => void;
  onReply: (parentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isVoting: boolean;
  isReplying: boolean;
  isDeleting: boolean;
}

const CommentItem = ({
  comment,
  depth,
  isAuthenticated,
  onVote,
  onReply,
  onDelete,
  isVoting,
  isReplying,
  isDeleting,
}: CommentItemProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const canReply = isAuthenticated;
  const visualDepth = Math.min(depth, 1); // Cap visual indentation at 1 level
  const isAdmin = authService.isAdmin();
  const isDeleted = comment.isDeleted;

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent);
    setReplyContent("");
    setShowReplyForm(false);
  };

  return (
    <div className={cn("space-y-2", visualDepth > 0 && "ml-6 mt-3 pl-4 border-l-2 border-border")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          {isDeleted ? (
            <p className="text-sm text-muted-foreground italic">This comment was deleted by an admin</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.user.username}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {comment.updatedAt && (
                  <span className="text-xs text-muted-foreground italic">(edited)</span>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 ml-auto text-destructive hover:text-destructive"
                    onClick={() => onDelete(comment.id)}
                    disabled={isDeleting}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </>
          )}

          {!isDeleted && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2"
                onClick={() => onVote(comment.id, "agree")}
                disabled={!isAuthenticated || isVoting}
              >
                <ThumbsUp className="h-3 w-3" />
                <span className="text-xs">{comment.agreeCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2"
                onClick={() => onVote(comment.id, "disagree")}
                disabled={!isAuthenticated || isVoting}
              >
                <ThumbsDown className="h-3 w-3" />
                <span className="text-xs">{comment.disagreeCount}</span>
              </Button>

              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <Reply className="h-3 w-3" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
            </div>
          )}

          {/* Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="resize-none text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyContent.trim() || isReplying}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {isReplying ? "Posting..." : "Post Reply"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-3 mt-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  isAuthenticated={isAuthenticated}
                  onVote={onVote}
                  onReply={onReply}
                  onDelete={onDelete}
                  isVoting={isVoting}
                  isReplying={isReplying}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
