import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", paragraphId, pageId, mode],
    queryFn: async () => {
      let query = supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          comment_votes (vote_type, user_id)
        `)
        .order("created_at", { ascending: true });

      if (mode === "paragraph" && paragraphId) {
        query = query.eq("paragraph_id", paragraphId).is("parent_id", null);
      } else if (mode === "page" && pageId) {
        query = query.eq("page_id", pageId).is("parent_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(paragraphId || pageId),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session?.user?.id) throw new Error("Must be logged in");

      const commentData: any = {
        content,
        user_id: session.user.id,
        parent_id: replyTo,
      };

      if (mode === "paragraph" && paragraphId) {
        commentData.paragraph_id = paragraphId;
      } else if (mode === "page" && pageId) {
        commentData.page_id = pageId;
      }

      const { error } = await supabase.from("comments").insert(commentData);
      if (error) throw error;
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
      if (!session?.user?.id) throw new Error("Must be logged in");

      // Check if already voted
      const { data: existingVote } = await supabase
        .from("comment_votes")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await supabase.from("comment_votes").delete().eq("id", existingVote.id);
        } else {
          // Update vote
          await supabase
            .from("comment_votes")
            .update({ vote_type: voteType })
            .eq("id", existingVote.id);
        }
      } else {
        // Add new vote
        await supabase.from("comment_votes").insert({
          comment_id: commentId,
          user_id: session.user.id,
          vote_type: voteType,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const getUserVote = (comment: any) => {
    if (!session?.user?.id) return null;
    return comment.comment_votes?.find((v: any) => v.user_id === session.user.id)?.vote_type;
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
          comments.map((comment: any) => {
            const userVote = getUserVote(comment);
            return (
              <div key={comment.id} className="space-y-2 pb-4 border-b last:border-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.profiles?.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 gap-1", userVote === "agree" && "text-green-600")}
                        onClick={() => voteMutation.mutate({ commentId: comment.id, voteType: "agree" })}
                        disabled={!session}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span className="text-xs">{comment.agree_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 gap-1", userVote === "disagree" && "text-red-600")}
                        onClick={() => voteMutation.mutate({ commentId: comment.id, voteType: "disagree" })}
                        disabled={!session}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        <span className="text-xs">{comment.disagree_count}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {session ? (
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
