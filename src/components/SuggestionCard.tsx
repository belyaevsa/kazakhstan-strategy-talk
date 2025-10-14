import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2, Check, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { suggestionService } from '@/services/suggestionService';
import { ParagraphSuggestion } from '@/lib/api/types';
import { authService } from '@/services/authService';
import { formatDistanceToNow } from 'date-fns';

interface SuggestionCardProps {
  suggestion: ParagraphSuggestion;
  onUpdate: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

export const SuggestionCard = ({ suggestion, onUpdate, onEdit, showActions = true }: SuggestionCardProps) => {
  const { t } = useTranslation();
  const [isVoting, setIsVoting] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const currentUser = authService.getUser();
  const isAdmin = authService.isAdmin();
  const isAuthor = currentUser?.id === suggestion.userId;
  const canEdit = isAuthor && suggestion.status === 'Pending';
  const canDelete = isAdmin || isAuthor;
  const canApprove = isAdmin && suggestion.status === 'Pending';

  // Parse markdown text to JSX with formatting
  const parseMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;

    const allMatches: Array<{ index: number; length: number; element: JSX.Element }> = [];
    let match: RegExpExecArray | null;

    // Find all links
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
            className="text-primary hover:underline"
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
        element: <strong key={match.index}>{match[1]}</strong>
      });
    }

    // Find all italic text
    while ((match = italicRegex.exec(text)) !== null) {
      const isBoldMarker = text[match.index - 1] === '*' || text[match.index + match[0].length] === '*';
      if (!isBoldMarker) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          element: <em key={match.index}>{match[1]}</em>
        });
      }
    }

    allMatches.sort((a, b) => a.index - b.index);

    let lastIndex = 0;
    for (const match of allMatches) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(match.element);
      lastIndex = match.index + match.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleVote = async (voteType: 'Upvote' | 'Downvote') => {
    if (!currentUser) {
      toast.error(t('auth.signIn'));
      return;
    }

    setIsVoting(true);
    try {
      await suggestionService.voteOnSuggestion(suggestion.id, { voteType });
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suggestions.voteError'));
    } finally {
      setIsVoting(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(t('suggestions.approveConfirm'))) return;

    setIsActioning(true);
    try {
      await suggestionService.approveSuggestion(suggestion.id);
      toast.success(t('suggestions.approveSuccess'));
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suggestions.approveError'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(t('suggestions.rejectConfirm'))) return;

    setIsActioning(true);
    try {
      await suggestionService.rejectSuggestion(suggestion.id);
      toast.success(t('suggestions.rejectSuccess'));
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suggestions.rejectError'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('suggestions.deleteConfirm'))) return;

    setIsActioning(true);
    try {
      await suggestionService.deleteSuggestion(suggestion.id);
      toast.success(t('suggestions.deleteSuccess'));
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suggestions.deleteError'));
    } finally {
      setIsActioning(false);
    }
  };

  const getStatusBadge = () => {
    const statusMap = {
      Pending: { variant: 'secondary' as const, label: t('suggestions.pending') },
      Approved: { variant: 'default' as const, label: t('suggestions.approved') },
      Rejected: { variant: 'destructive' as const, label: t('suggestions.rejected') },
    };

    const status = statusMap[suggestion.status];
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('suggestions.suggestedBy')}
            </span>
            <span className="font-medium">
              {suggestion.user.displayName || suggestion.user.username}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-1">
            {canEdit && onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                disabled={isActioning}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleApprove}
                  disabled={isActioning}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReject}
                  disabled={isActioning}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isActioning}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Suggested content */}
      <div className="border rounded-md p-4 bg-muted/30">
        <p className="document-content text-foreground leading-relaxed whitespace-pre-wrap">
          {parseMarkdown(suggestion.suggestedContent)}
        </p>
      </div>

      {/* Explanation */}
      {suggestion.comment && (
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('suggestions.explanation')}:</p>
          <p className="text-sm text-muted-foreground">{suggestion.comment}</p>
        </div>
      )}

      {/* Vote and comment stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={suggestion.userVote === 'Upvote' ? 'default' : 'outline'}
            onClick={() => handleVote('Upvote')}
            disabled={isVoting || !currentUser}
            className="gap-1"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{suggestion.upvotes}</span>
          </Button>
          <Button
            size="sm"
            variant={suggestion.userVote === 'Downvote' ? 'default' : 'outline'}
            onClick={() => handleVote('Downvote')}
            disabled={isVoting || !currentUser}
            className="gap-1"
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{suggestion.downvotes}</span>
          </Button>
        </div>

        {suggestion.commentCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>{suggestion.commentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
