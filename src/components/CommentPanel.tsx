import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { commentService } from "@/services/commentService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommentPanelProps {
  paragraphId?: string;
  pageId?: string;
  mode: "paragraph" | "page";
}

const CommentPanel = ({ paragraphId, pageId, mode }: CommentPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", paragraphId, pageId, mode],
    queryFn: async () => {
      if (mode === "paragraph" && paragraphId) {
        return commentService.getByParagraph(paragraphId);
      } else if (mode === "page" && pageId) {
        return commentService.getByPage(pageId);
      }
      return [];
    },
    enabled: !!(paragraphId || pageId),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!isAuthenticated) throw new Error("Must be logged in");

      const commentData: any = {
        content,
        parentId: replyTo,
      };

      if (mode === "paragraph" && paragraphId) {
        commentData.paragraphId = paragraphId;
      } else if (mode === "page" && pageId) {
        commentData.pageId = pageId;
      }

      return commentService.create(commentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      if (paragraphId) {
        queryClient.invalidateQueries({ queryKey: ["paragraphs"] });
      }
      setNewComment("");
      setReplyTo(null);
      toast.success("Comment added!");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ commentId, voteType }: { commentId: string; voteType: "agree" | "disagree" }) => {
      if (!isAuthenticated) throw new Error("Must be logged in");
      return commentService.vote(commentId, voteType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: () => {
      toast.error("Failed to vote");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (!paragraphId && !pageId) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Select a paragraph to view comments</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {mode === "paragraph" ? "Paragraph Comments" : "General Discussion"}
        </h3>
      </div>

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : !comments || comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-2 pb-4 border-b last:border-0">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{comment.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => voteMutation.mutate({ commentId: comment.id, voteType: "agree" })}
                      disabled={!isAuthenticated}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span className="text-xs">{comment.agreeCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => voteMutation.mutate({ commentId: comment.id, voteType: "disagree" })}
                      disabled={!isAuthenticated}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      <span className="text-xs">{comment.disagreeCount}</span>
                    </Button>
                  </div>

                  {/* Render replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-6 mt-3 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="pb-3 border-b last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{reply.user.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <Textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-2 resize-none"
            rows={3}
          />
          <Button type="submit" size="sm" disabled={!newComment.trim() || addCommentMutation.isPending}>
            <Send className="h-3 w-3 mr-2" />
            {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </form>
      ) : (
        <div className="p-4 border-t text-center text-sm text-muted-foreground">
          Please sign in to comment
        </div>
      )}
    </div>
  );
};

export default CommentPanel;
