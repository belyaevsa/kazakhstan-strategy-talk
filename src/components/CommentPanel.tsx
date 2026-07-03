import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { commentService, type PagedComments } from "@/services/commentService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import CommentItem from "@/components/CommentItem";
import type { Comment } from "@/lib/api/types";

interface CommentPanelProps {
  paragraphId?: string;
  pageId?: string;
  mode: "paragraph" | "page";
  // When set (floating paragraph panel), caps the scrollable comment list to this pixel
  // height so the panel fits the viewport instead of pushing the whole panel off-position.
  maxListHeight?: number;
}

// Immutably insert a comment into the (possibly nested) comment tree.
function insertComment(tree: Comment[], comment: Comment, parentId?: string): Comment[] {
  if (!parentId) return [...tree, comment];
  return tree.map((c) =>
    c.id === parentId
      ? { ...c, replies: [...(c.replies || []), comment] }
      : { ...c, replies: insertComment(c.replies || [], comment, parentId) }
  );
}

const CommentPanel = ({ paragraphId, pageId, mode, maxListHeight }: CommentPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [pageSize, setPageSize] = useState(20);
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

  const { data, isLoading } = useQuery({
    queryKey: ["comments", paragraphId, pageId, mode, pageSize],
    queryFn: async (): Promise<PagedComments> => {
      if (mode === "paragraph" && paragraphId) {
        return commentService.getByParagraph(paragraphId, 1, pageSize);
      } else if (mode === "page" && pageId) {
        return commentService.getByPage(pageId, 1, pageSize);
      }
      return { items: [], total: 0, page: 1, pageSize, hasMore: false };
    },
    enabled: !!(paragraphId || pageId),
  });

  const comments = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;

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
    // Optimistically show the new comment immediately, then reconcile on settle.
    onMutate: async ({ content, parentId }) => {
      const key = ["comments", paragraphId, pageId, mode, pageSize];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PagedComments>(key);

      const currentUser = authService.getUser();
      if (currentUser) {
        const optimistic: Comment = {
          id: `temp-${Date.now()}`,
          content,
          agreeCount: 0,
          disagreeCount: 0,
          createdAt: new Date().toISOString(),
          isDeleted: false,
          user: currentUser as unknown as Comment["user"],
          parentId,
          replies: [],
        };
        queryClient.setQueryData<PagedComments>(key, (old) =>
          old ? { ...old, items: insertComment(old.items, optimistic, parentId), total: old.total + 1 } : old
        );
      }

      setNewComment("");
      return { previous, key };
    },
    onSuccess: async () => {
      // Refresh user data to get updated lastCommentAt (drives the post throttle)
      await authService.getCurrentUser();
      toast.success(t("message.commentPosted"));
      window.dispatchEvent(new Event('storage'));
    },
    onError: (error: any, _vars, context) => {
      // Roll back the optimistic insert
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
      if (error.response?.data?.error === "AccountFrozen") {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.error === "TooManyRequests") {
        toast.error(error.response.data.message);
      } else {
        toast.error(t("message.commentAddFailed"));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      if (paragraphId) {
        queryClient.invalidateQueries({ queryKey: ["paragraphs"] });
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
      toast.error(t("message.voteFailed"));
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return commentService.delete(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast.success(t("message.commentDeleted"));
    },
    onError: () => {
      toast.error(t("message.commentDeleteFailed"));
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      return commentService.update(commentId, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast.success(t("message.commentUpdated"));
    },
    onError: () => {
      toast.error(t("message.commentUpdateFailed"));
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
        <p>{t("document.selectParagraph")}</p>
      </div>
    );
  }

  const handleScrollToParagraph = () => {
    if (paragraphId) {
      const paragraphElement = document.getElementById(`paragraph-${paragraphId}`);
      if (paragraphElement) {
        paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {mode === "paragraph" ? (
            <span>
              {t("comments.paragraphComments").split(" ")[0]}{" "}
              <button
                onClick={handleScrollToParagraph}
                className="text-primary hover:underline cursor-pointer"
                title={t("comments.scrollToParagraph")}
              >
                {t("comments.paragraphComments").split(" ").slice(1).join(" ")}
              </button>
            </span>
          ) : (
            t("comments.generalDiscussion")
          )}
        </h3>
      </div>

      <div
        className={maxListHeight == null ? "p-4 space-y-4 max-h-[600px] overflow-y-auto" : "p-4 space-y-4 overflow-y-auto"}
        style={maxListHeight == null ? undefined : { maxHeight: `${maxListHeight}px` }}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("document.loadingComments")}</p>
        ) : !comments || comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("document.noComments")}</p>
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
                onEdit={(commentId, content) => editCommentMutation.mutate({ commentId, content })}
                isVoting={voteMutation.isPending}
                isReplying={addCommentMutation.isPending}
                isDeleting={deleteCommentMutation.isPending}
                isSavingEdit={editCommentMutation.isPending}
              />
            </div>
          ))
        )}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setPageSize((s) => s + 20)}
          >
            {t("comments.loadMore")}
          </Button>
        )}
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="p-4 border-t space-y-2">
          {isFrozen && !isEditorOrAdmin && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-200">
              🔒 {t("document.accountFrozen")} {new Date(user.frozenUntil!).toLocaleString()}.
            </div>
          )}
          {countdown > 0 && !isEditorOrAdmin && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {t("document.waitBeforePosting", { seconds: countdown.toString() })}
            </div>
          )}
          <Textarea
            placeholder={t("document.shareThoughts")}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="resize-none"
            rows={3}
            disabled={(isFrozen && !isEditorOrAdmin) || addCommentMutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={
                !newComment.trim() ||
                addCommentMutation.isPending ||
                (countdown > 0 && !isEditorOrAdmin) ||
                (isFrozen && !isEditorOrAdmin)
              }
              title={t("comments.submit")}
              aria-label={t("comments.submit")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 border-t text-center text-sm text-muted-foreground">
          {t("document.signInToComment")}
        </div>
      )}
    </div>
  );
};

export default CommentPanel;
