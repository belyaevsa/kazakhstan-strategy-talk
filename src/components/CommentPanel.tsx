import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { commentService } from "@/services/commentService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import CommentItem from "@/components/CommentItem";

interface CommentPanelProps {
  paragraphId?: string;
  pageId?: string;
  mode: "paragraph" | "page";
}

const CommentPanel = ({ paragraphId, pageId, mode }: CommentPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [userState, setUserState] = useState(authService.getUser());
  const queryClient = useQueryClient();
  const isAuthenticated = authService.isAuthenticated();

  // Listen for localStorage changes to update user state
  useEffect(() => {
    const handleStorageChange = () => {
      setUserState(authService.getUser());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const user = userState;
  const isEditorOrAdmin = user?.roles.includes("Editor") || user?.roles.includes("Admin");
  const isFrozen = user?.frozenUntil && new Date(user.frozenUntil) > new Date();

  // Update countdown timer
  useEffect(() => {
    if (!user || isEditorOrAdmin || !user.lastCommentAt) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const lastCommentTime = new Date(user.lastCommentAt!).getTime();
      const now = Date.now();
      const elapsed = (now - lastCommentTime) / 1000; // seconds
      const remaining = Math.max(0, 30 - elapsed);
      setCountdown(Math.ceil(remaining));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [user, isEditorOrAdmin]);

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
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!isAuthenticated) throw new Error("Must be logged in");

      const commentData: any = {
        content,
        parentId,
      };

      if (mode === "paragraph" && paragraphId) {
        commentData.paragraphId = paragraphId;
      } else if (mode === "page" && pageId) {
        commentData.pageId = pageId;
      }

      return commentService.create(commentData);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      if (paragraphId) {
        queryClient.invalidateQueries({ queryKey: ["paragraphs"] });
      }
      // Refresh user data to get updated lastCommentAt
      await authService.getCurrentUser();
      setNewComment("");
      toast.success("Comment added!");
      // Force re-render by triggering a state update
      window.dispatchEvent(new Event('storage'));
    },
    onError: (error: any) => {
      if (error.response?.data?.error === "AccountFrozen") {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.error === "TooManyRequests") {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to add comment");
      }
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

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return commentService.delete(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleReply = (parentId: string, content: string) => {
    addCommentMutation.mutate({ content, parentId });
  };

  const handleVote = (commentId: string, voteType: "agree" | "disagree") => {
    voteMutation.mutate({ commentId, voteType });
  };

  const handleDelete = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
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
            <div key={comment.id} className="pb-4 border-b last:border-0">
              <CommentItem
                comment={comment}
                depth={0}
                isAuthenticated={isAuthenticated}
                onVote={handleVote}
                onReply={handleReply}
                onDelete={handleDelete}
                isVoting={voteMutation.isPending}
                isReplying={addCommentMutation.isPending}
                isDeleting={deleteCommentMutation.isPending}
              />
            </div>
          ))
        )}
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="p-4 border-t space-y-2">
          {isFrozen && !isEditorOrAdmin && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-200">
              🔒 Your account is frozen. You cannot post comments until {new Date(user.frozenUntil!).toLocaleString()}.
            </div>
          )}
          {countdown > 0 && !isEditorOrAdmin && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Wait {countdown}s before posting another comment
            </div>
          )}
          <Textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="resize-none"
            rows={3}
            disabled={(isFrozen && !isEditorOrAdmin) || addCommentMutation.isPending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={
              !newComment.trim() ||
              addCommentMutation.isPending ||
              (countdown > 0 && !isEditorOrAdmin) ||
              (isFrozen && !isEditorOrAdmin)
            }
          >
            <Send className="h-3 w-3 mr-2" />
            {addCommentMutation.isPending ? "Posting..." : countdown > 0 && !isEditorOrAdmin ? `Wait ${countdown}s` : "Post Comment"}
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
